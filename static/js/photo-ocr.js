document.addEventListener("DOMContentLoaded", function () {

    const photoInput = document.getElementById("numberPhoto");
    const scanPhotoBtn = document.getElementById("scanPhotoBtn");

    const textarea = document.getElementById("numbers_input");

    const ocrStatus = document.getElementById("ocrStatus");
    const ocrStatusText = document.getElementById("ocrStatusText");

    const ocrSpinner = document.getElementById("ocrSpinner");
    const ocrProgressWrap = document.getElementById("ocrProgressWrap");
    const ocrProgress = document.getElementById("ocrProgress");

    const charCount = document.getElementById("charCount");
    const lineCount = document.getElementById("lineCount");

    const previewSection = document.getElementById("previewSection");
    const previewTotal = document.getElementById("previewTotal");
    const preview4D = document.getElementById("preview4D");
    const preview3D = document.getElementById("preview3D");
    const previewInvalid = document.getElementById("previewInvalid");


    // =========================================================
    // CLASSIFY
    // =========================================================

    function classifyNumber(number) {

        number = String(number).trim();

        if (/^\d{3}$/.test(number)) {
            return "3D";
        }

        if (/^\d{4}$/.test(number)) {
            return "4D";
        }

        if (/^\d+$/.test(number)) {
            return "Invalid";
        }

        return "Invalid";
    }


    // =========================================================
    // PARSE MANUAL INPUT
    // =========================================================

    function parseNumbers(text) {

        if (!text) {
            return [];
        }

        return text
            .replace(/,/g, " ")
            .split(/\s+/)
            .map(x => x.trim())
            .filter(x => /^\d+$/.test(x));
    }


    // =========================================================
    // UPDATE COUNTS
    // =========================================================

    function updateCounts() {

        const value = textarea.value;

        charCount.textContent = value.length;

        lineCount.textContent =
            value.trim().length === 0
                ? 0
                : value
                    .split("\n")
                    .filter(x => x.trim().length > 0)
                    .length;

        calculatePreview();
    }


    // =========================================================
    // PREVIEW
    // =========================================================

    function calculatePreview() {

        const numbers =
            parseNumbers(textarea.value);

        if (numbers.length === 0) {

            previewSection.style.display = "none";

            return;
        }

        let total = 0;
        let count3D = 0;
        let count4D = 0;
        let countInvalid = 0;


        numbers.forEach(function (number) {

            const type =
                classifyNumber(number);

            total++;

            if (type === "3D") {

                count3D++;

            } else if (type === "4D") {

                count4D++;

            } else {

                countInvalid++;
            }
        });


        previewTotal.textContent = total;
        preview3D.textContent = count3D;
        preview4D.textContent = count4D;
        previewInvalid.textContent = countInvalid;

        previewSection.style.display = "block";
    }


    // =========================================================
    // PREPROCESS IMAGE
    // =========================================================

    function preprocessImage(file, mode) {

        return new Promise(function (resolve, reject) {

            const img = new Image();

            const url =
                URL.createObjectURL(file);


            img.onload = function () {

                try {

                    /*
                     * 3x enlargement.
                     * Better for handwritten numbers.
                     */

                    const scale = 3;

                    const canvas =
                        document.createElement("canvas");

                    canvas.width =
                        img.width * scale;

                    canvas.height =
                        img.height * scale;


                    const ctx =
                        canvas.getContext(
                            "2d",
                            {
                                willReadFrequently: true
                            }
                        );


                    /*
                     * White background
                     */

                    ctx.fillStyle = "#ffffff";

                    ctx.fillRect(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    /*
                     * Draw enlarged image
                     */

                    ctx.drawImage(
                        img,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    const imageData =
                        ctx.getImageData(
                            0,
                            0,
                            canvas.width,
                            canvas.height
                        );


                    const data =
                        imageData.data;


                    for (
                        let i = 0;
                        i < data.length;
                        i += 4
                    ) {

                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];


                        let gray =
                            0.299 * r +
                            0.587 * g +
                            0.114 * b;


                        /*
                         * Normal
                         */

                        if (mode === "normal") {

                            gray = gray;
                        }


                        /*
                         * Contrast
                         */

                        else if (mode === "contrast") {

                            gray =
                                ((gray - 128) * 2) + 128;

                            gray =
                                Math.max(
                                    0,
                                    Math.min(255, gray)
                                );
                        }


                        /*
                         * Threshold
                         */

                        else if (mode === "threshold") {

                            gray =
                                gray < 175
                                    ? 0
                                    : 255;
                        }


                        /*
                         * Dark handwriting
                         */

                        else if (mode === "dark") {

                            gray =
                                gray < 195
                                    ? gray * 0.5
                                    : Math.min(
                                        255,
                                        gray + 20
                                    );
                        }


                        data[i] = gray;
                        data[i + 1] = gray;
                        data[i + 2] = gray;
                    }


                    ctx.putImageData(
                        imageData,
                        0,
                        0
                    );


                    URL.revokeObjectURL(url);


                    resolve(
                        canvas.toDataURL("image/png")
                    );


                } catch (error) {

                    URL.revokeObjectURL(url);

                    reject(error);
                }
            };


            img.onerror = function () {

                URL.revokeObjectURL(url);

                reject(
                    new Error("Image loading failed.")
                );
            };


            img.src = url;
        });
    }


    // =========================================================
    // OCR WITH WORD DATA
    // =========================================================

    async function runOCR(image, psm) {

        try {

            const result =
                await Tesseract.recognize(
                    image,
                    "eng",
                    {

                        logger: function (info) {

                            if (
                                info.status ===
                                "recognizing text"
                            ) {

                                const progress =
                                    Math.round(
                                        info.progress * 100
                                    );


                                ocrProgress.style.width =
                                    progress + "%";


                                ocrStatusText.textContent =
                                    "Reading numbers... " +
                                    progress +
                                    "%";
                            }
                        },


                        /*
                         * DIGITS ONLY
                         */

                        tessedit_char_whitelist:
                            "0123456789",


                        /*
                         * Sparse text.
                         *
                         * Good for scattered
                         * handwritten numbers.
                         */

                        tessedit_pageseg_mode:
                            psm
                    }
                );


            return result;

        } catch (error) {

            console.error(
                "OCR error:",
                error
            );

            return null;
        }
    }


    // =========================================================
    // EXTRACT NUMERIC GROUPS
    // =========================================================

    function extractNumericGroups(ocrResult) {

        if (
            !ocrResult ||
            !ocrResult.data
        ) {

            return [];
        }


        const words =
            ocrResult.data.words || [];


        const results = [];


        words.forEach(function (word) {

            if (!word || !word.text) {
                return;
            }


            /*
             * Remove spaces and symbols.
             */

            const original =
                word.text.trim();


            const cleaned =
                original.replace(
                    /[^0-9]/g,
                    ""
                );


            /*
             * If OCR detected letters only,
             * ignore them.
             */

            if (!cleaned) {
                return;
            }


            /*
             * IMPORTANT:
             *
             * Do NOT split long numbers.
             *
             * 1234567890
             * remains
             * 1234567890
             *
             * and becomes Invalid.
             */

            results.push({

                text: cleaned,

                confidence:
                    Number(word.confidence || 0),

                left:
                    word.bbox
                        ? word.bbox.x0
                        : 0,

                top:
                    word.bbox
                        ? word.bbox.y0
                        : 0,

                width:
                    word.bbox
                        ? word.bbox.x1 -
                          word.bbox.x0
                        : 0,

                height:
                    word.bbox
                        ? word.bbox.y1 -
                          word.bbox.y0
                        : 0
            });
        });


        return results;
    }


    // =========================================================
    // SORT BY PHOTO POSITION
    // =========================================================

    function sortByPosition(items) {

        return items.sort(
            function (a, b) {

                /*
                 * First compare vertical position.
                 */

                const yDifference =
                    a.top - b.top;


                /*
                 * If same line,
                 * compare horizontal position.
                 */

                if (
                    Math.abs(yDifference) < 50
                ) {

                    return a.left - b.left;
                }


                return yDifference;
            }
        );
    }


    // =========================================================
    // REMOVE DUPLICATES BETWEEN OCR PASSES
    // =========================================================

    function removeOCRDuplicates(items) {

        const finalItems = [];


        items.forEach(function (item) {

            /*
             * Same number + nearly same position
             * means same physical number.
             */

            const duplicate =
                finalItems.find(
                    function (existing) {

                        const sameText =
                            existing.text ===
                            item.text;


                        const closeX =
                            Math.abs(
                                existing.left -
                                item.left
                            ) < 100;


                        const closeY =
                            Math.abs(
                                existing.top -
                                item.top
                            ) < 100;


                        return (
                            sameText &&
                            closeX &&
                            closeY
                        );
                    }
                );


            if (!duplicate) {

                finalItems.push(item);

            } else {

                /*
                 * Keep the higher confidence result.
                 */

                if (
                    item.confidence >
                    duplicate.confidence
                ) {

                    duplicate.confidence =
                        item.confidence;
                }
            }

        });


        return finalItems;
    }


    // =========================================================
    // FILTER OCR RESULT
    // =========================================================

    function filterNumbers(items) {

        return items.filter(
            function (item) {

                /*
                 * Numeric only.
                 */

                if (
                    !/^\d+$/.test(item.text)
                ) {

                    return false;
                }


                /*
                 * Accept:
                 *
                 * 3 digits
                 * 4 digits
                 *
                 * Also keep other numeric lengths
                 * as INVALID.
                 *
                 * Example:
                 * 12345 -> Invalid
                 * 123456 -> Invalid
                 * 1234567890 -> Invalid
                 */

                return true;
            }
        );
    }


    // =========================================================
    // SCAN PHOTO
    // =========================================================

    scanPhotoBtn.addEventListener(
        "click",
        async function () {

            const file =
                photoInput.files[0];


            /*
             * Photo required.
             */

            if (!file) {

                ocrStatus.style.display =
                    "block";

                ocrStatusText.className =
                    "small text-danger";

                ocrStatusText.textContent =
                    "Please choose a photo first.";

                return;
            }


            /*
             * Image required.
             */

            if (
                !file.type.startsWith("image/")
            ) {

                ocrStatus.style.display =
                    "block";

                ocrStatusText.className =
                    "small text-danger";

                ocrStatusText.textContent =
                    "Please select an image file.";

                photoInput.value = "";

                return;
            }


            // =================================================
            // START SCAN
            // =================================================

            scanPhotoBtn.disabled = true;

            scanPhotoBtn.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>SCANNING...';


            ocrStatus.style.display =
                "block";


            ocrStatusText.className =
                "small text-muted";


            ocrProgressWrap.style.display =
                "block";


            ocrProgress.style.width =
                "0%";


            ocrSpinner.style.display =
                "inline-block";


            try {

                let allItems = [];


                // =============================================
                // PASS 1
                // =============================================

                ocrStatusText.textContent =
                    "Scanning handwritten numbers - 1/4";


                const normalImage =
                    await preprocessImage(
                        file,
                        "normal"
                    );


                const result1 =
                    await runOCR(
                        normalImage,
                        11
                    );


                allItems.push(
                    ...extractNumericGroups(
                        result1
                    )
                );


                // =============================================
                // PASS 2
                // =============================================

                ocrStatusText.textContent =
                    "Improving image - 2/4";


                const contrastImage =
                    await preprocessImage(
                        file,
                        "contrast"
                    );


                const result2 =
                    await runOCR(
                        contrastImage,
                        11
                    );


                allItems.push(
                    ...extractNumericGroups(
                        result2
                    )
                );


                // =============================================
                // PASS 3
                // =============================================

                ocrStatusText.textContent =
                    "Checking handwritten digits - 3/4";


                const thresholdImage =
                    await preprocessImage(
                        file,
                        "threshold"
                    );


                const result3 =
                    await runOCR(
                        thresholdImage,
                        11
                    );


                allItems.push(
                    ...extractNumericGroups(
                        result3
                    )
                );


                // =============================================
                // PASS 4
                // =============================================

                ocrStatusText.textContent =
                    "Final number scan - 4/4";


                const darkImage =
                    await preprocessImage(
                        file,
                        "dark"
                    );


                const result4 =
                    await runOCR(
                        darkImage,
                        11
                    );


                allItems.push(
                    ...extractNumericGroups(
                        result4
                    )
                );


                // =============================================
                // REMOVE OCR DUPLICATES
                // =============================================

                let finalItems =
                    removeOCRDuplicates(
                        allItems
                    );


                // =============================================
                // ONLY NUMERIC
                // =============================================

                finalItems =
                    filterNumbers(
                        finalItems
                    );


                // =============================================
                // SORT BY PHOTO POSITION
                // =============================================

                finalItems =
                    sortByPosition(
                        finalItems
                    );


                // =============================================
                // GET FINAL NUMBERS
                // =============================================

                const finalNumbers =
                    finalItems.map(
                        function (item) {

                            return item.text;
                        }
                    );


                // =============================================
                // NO RESULT
                // =============================================

                if (
                    finalNumbers.length === 0
                ) {

                    textarea.value = "";

                    ocrProgress.style.width =
                        "100%";

                    ocrStatusText.className =
                        "small text-danger";

                    ocrStatusText.textContent =
                        "No numbers detected. Try a clearer photo.";

                    updateCounts();

                    return;
                }


                // =============================================
                // PUT RESULT INTO TEXTAREA
                // =============================================

                textarea.value =
                    finalNumbers.join("\n");


                updateCounts();


                // =============================================
                // COUNTS
                // =============================================

                let count3D = 0;
                let count4D = 0;
                let countInvalid = 0;


                finalNumbers.forEach(
                    function (number) {

                        const type =
                            classifyNumber(
                                number
                            );


                        if (type === "3D") {

                            count3D++;

                        } else if (
                            type === "4D"
                        ) {

                            count4D++;

                        } else {

                            countInvalid++;
                        }
                    }
                );


                // =============================================
                // SUCCESS
                // =============================================

                ocrProgress.style.width =
                    "100%";


                ocrStatusText.className =
                    "small text-success";


                ocrStatusText.textContent =
                    "Detected " +
                    finalNumbers.length +
                    " numbers — " +
                    count3D +
                    " 3D, " +
                    count4D +
                    " 4D, " +
                    countInvalid +
                    " Invalid.";


            } catch (error) {

                console.error(
                    "Photo OCR failed:",
                    error
                );


                ocrStatusText.className =
                    "small text-danger";


                ocrStatusText.textContent =
                    "Could not read the photo. Please try again.";

            } finally {

                scanPhotoBtn.disabled =
                    false;


                scanPhotoBtn.innerHTML =
                    '<i class="fas fa-magic me-2"></i>SCAN PHOTO';


                ocrSpinner.style.display =
                    "none";
            }

        }
    );


    // =========================================================
    // MANUAL INPUT
    // =========================================================

    textarea.addEventListener(
        "input",
        updateCounts
    );


    // =========================================================
    // CLEAR
    // =========================================================

    window.clearTextarea =
        function () {

            textarea.value = "";

            photoInput.value = "";

            ocrStatus.style.display =
                "none";

            ocrProgressWrap.style.display =
                "none";

            ocrProgress.style.width =
                "0%";

            updateCounts();

            textarea.focus();
        };


    // =========================================================
    // INITIAL
    // =========================================================

    updateCounts();

});
