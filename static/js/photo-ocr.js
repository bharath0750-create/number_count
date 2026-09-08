document.addEventListener("DOMContentLoaded", function () {

    const photoInput = document.getElementById("numberPhoto");
    const textarea = document.getElementById("numbers_input");

    const ocrStatus = document.getElementById("ocrStatus");
    const ocrStatusText = document.getElementById("ocrStatusText");

    const charCount = document.getElementById("charCount");
    const lineCount = document.getElementById("lineCount");

    const previewSection = document.getElementById("previewSection");
    const previewTotal = document.getElementById("previewTotal");
    const preview4D = document.getElementById("preview4D");
    const preview3D = document.getElementById("preview3D");
    const previewInvalid = document.getElementById("previewInvalid");


    // =========================================================
    // CLASSIFY NUMBER
    // =========================================================

    function classifyNumber(number) {

        number = String(number).trim();

        if (/^\d{3}$/.test(number)) {
            return "3D";
        }

        if (/^\d{4}$/.test(number)) {
            return "4D";
        }

        return "Invalid";
    }


    // =========================================================
    // PARSE NUMBERS
    // =========================================================

    function parseNumbers(text) {

        if (!text) {
            return [];
        }

        return text
            .replace(/,/g, " ")
            .split(/\s+/)
            .map(token => token.trim())
            .filter(token => /^\d+$/.test(token));
    }


    // =========================================================
    // UPDATE COUNTS
    // =========================================================

    function updateCounts() {

        const value = textarea.value;

        charCount.textContent = value.length;

        lineCount.textContent =
            value.length === 0
                ? 0
                : value.split("\n").filter(x => x.trim()).length;

        calculatePreview();
    }


    // =========================================================
    // PREVIEW
    // =========================================================

    function calculatePreview() {

        const numbers = parseNumbers(textarea.value);

        if (numbers.length === 0) {

            previewSection.style.display = "none";

            return;
        }

        let total = 0;
        let count3D = 0;
        let count4D = 0;
        let countInvalid = 0;


        numbers.forEach(function (number) {

            const type = classifyNumber(number);

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
    // IMAGE PREPROCESSING
    // =========================================================

    function preprocessImage(file, mode = "normal") {

        return new Promise(function (resolve, reject) {

            const img = new Image();
            const url = URL.createObjectURL(file);


            img.onload = function () {

                try {

                    /*
                     * Upscale image.
                     * Handwritten numbers become easier for OCR.
                     */

                    const scale = 2;

                    const canvas = document.createElement("canvas");

                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    const ctx = canvas.getContext("2d", {
                        willReadFrequently: true
                    });


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


                    const imageData = ctx.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const data = imageData.data;


                    for (let i = 0; i < data.length; i += 4) {

                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];


                        /*
                         * Convert to grayscale
                         */

                        let gray =
                            0.299 * r +
                            0.587 * g +
                            0.114 * b;


                        /*
                         * Different preprocessing modes
                         */

                        if (mode === "threshold") {

                            /*
                             * Strong black/white threshold
                             */

                            gray = gray < 170 ? 0 : 255;

                        } else if (mode === "dark") {

                            /*
                             * Increase dark handwriting
                             */

                            gray = gray < 200
                                ? gray * 0.65
                                : Math.min(255, gray + 20);

                        } else if (mode === "contrast") {

                            /*
                             * Strong contrast
                             */

                            gray =
                                ((gray - 128) * 1.8) + 128;

                            gray = Math.max(
                                0,
                                Math.min(255, gray)
                            );

                        }


                        data[i] = gray;
                        data[i + 1] = gray;
                        data[i + 2] = gray;
                    }


                    ctx.putImageData(imageData, 0, 0);

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
                    new Error("Unable to read image.")
                );
            };


            img.src = url;
        });
    }


    // =========================================================
    // CLEAN OCR TEXT
    // =========================================================

    function cleanOCRText(text) {

        if (!text) {
            return [];
        }


        /*
         * OCR sometimes returns spaces/new lines
         * between digits.
         *
         * Example:
         *
         * 2 3 5
         *
         * becomes
         *
         * 235
         */


        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);


        const numbers = [];


        lines.forEach(function (line) {

            /*
             * Remove everything except digits and spaces.
             *
             * Letters are NOT accepted.
             */

            const cleanedLine =
                line.replace(/[^0-9\s]/g, " ");


            /*
             * Split into groups
             */

            const groups =
                cleanedLine
                    .split(/\s+/)
                    .filter(Boolean);


            groups.forEach(function (group) {

                /*
                 * ONLY 3D and 4D numbers.
                 */

                if (/^\d{3}$/.test(group)) {

                    numbers.push(group);

                } else if (/^\d{4}$/.test(group)) {

                    numbers.push(group);
                }
            });
        });


        /*
         * Also look for standalone 3/4 digit
         * values in complete OCR text.
         */

        const normalized =
            text.replace(/[^0-9\s]/g, " ");


        const tokens =
            normalized
                .split(/\s+/)
                .filter(Boolean);


        tokens.forEach(function (token) {

            if (
                /^\d{3}$/.test(token) ||
                /^\d{4}$/.test(token)
            ) {

                numbers.push(token);
            }
        });


        return numbers;
    }


    // =========================================================
    // REMOVE DUPLICATES CREATED BY OCR PASSES
    // =========================================================

    function removeOCRDuplicates(numbers) {

        /*
         * Same OCR result may appear multiple times
         * because we scan the image using different
         * preprocessing methods.
         *
         * We remove only duplicate results produced
         * by the OCR process.
         */

        const result = [];

        numbers.forEach(function (number) {

            if (!result.includes(number)) {
                result.push(number);
            }
        });

        return result;
    }


    // =========================================================
    // RUN OCR
    // =========================================================

    async function runOCR(image, psm) {

        try {

            const result = await Tesseract.recognize(
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

                            ocrStatusText.textContent =
                                "Reading numbers... " +
                                progress +
                                "%";
                        }
                    },


                    /*
                     * Digits ONLY
                     */

                    tessedit_char_whitelist:
                        "0123456789",


                    /*
                     * Page segmentation mode.
                     *
                     * 11 = Sparse text
                     * Best for numbers scattered
                     * around the image.
                     */

                    tessedit_pageseg_mode: psm

                }
            );


            return result.data.text || "";

        } catch (error) {

            console.error(
                "OCR error:",
                error
            );

            return "";
        }
    }


    // =========================================================
    // PHOTO OCR
    // =========================================================

    photoInput.addEventListener(
        "change",
        async function () {

            const file =
                photoInput.files[0];


            if (!file) {
                return;
            }


            if (!file.type.startsWith("image/")) {

                alert(
                    "Please select an image file."
                );

                photoInput.value = "";

                return;
            }


            ocrStatus.style.display =
                "block";


            ocrStatusText.textContent =
                "Preparing photo...";


            try {

                /*
                 * -----------------------------------------
                 * PASS 1
                 * Original + enlarged
                 * -----------------------------------------
                 */

                const normalImage =
                    await preprocessImage(
                        file,
                        "normal"
                    );


                ocrStatusText.textContent =
                    "Scanning handwritten numbers...";


                let allNumbers = [];


                /*
                 * PSM 11
                 * Sparse text
                 *
                 * Best for your photo because
                 * numbers are located in different
                 * places.
                 */

                const text1 =
                    await runOCR(
                        normalImage,
                        11
                    );


                allNumbers.push(
                    ...cleanOCRText(text1)
                );


                /*
                 * -----------------------------------------
                 * PASS 2
                 * Strong contrast
                 * -----------------------------------------
                 */

                const contrastImage =
                    await preprocessImage(
                        file,
                        "contrast"
                    );


                const text2 =
                    await runOCR(
                        contrastImage,
                        11
                    );


                allNumbers.push(
                    ...cleanOCRText(text2)
                );


                /*
                 * -----------------------------------------
                 * PASS 3
                 * Threshold
                 * -----------------------------------------
                 */

                const thresholdImage =
                    await preprocessImage(
                        file,
                        "threshold"
                    );


                const text3 =
                    await runOCR(
                        thresholdImage,
                        11
                    );


                allNumbers.push(
                    ...cleanOCRText(text3)
                );


                /*
                 * -----------------------------------------
                 * PASS 4
                 * Dark handwriting
                 * -----------------------------------------
                 */

                const darkImage =
                    await preprocessImage(
                        file,
                        "dark"
                    );


                const text4 =
                    await runOCR(
                        darkImage,
                        11
                    );


                allNumbers.push(
                    ...cleanOCRText(text4)
                );


                /*
                 * Remove duplicate OCR results.
                 */

                const detectedNumbers =
                    removeOCRDuplicates(
                        allNumbers
                    );


                /*
                 * ONLY 3D / 4D
                 */

                const finalNumbers =
                    detectedNumbers.filter(
                        function (number) {

                            return (
                                /^\d{3}$/.test(number) ||
                                /^\d{4}$/.test(number)
                            );
                        }
                    );


                // =================================================
                // RESULT
                // =================================================

                if (
                    finalNumbers.length === 0
                ) {

                    textarea.value = "";

                    ocrStatusText.textContent =
                        "No 3D or 4D numbers detected.";

                    updateCounts();

                    return;
                }


                /*
                 * Put detected numbers
                 * one per line.
                 */

                textarea.value =
                    finalNumbers.join("\n");


                /*
                 * Trigger textarea update.
                 */

                textarea.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles: true
                        }
                    )
                );


                updateCounts();


                /*
                 * Count 3D / 4D
                 */

                const count3D =
                    finalNumbers.filter(
                        n => /^\d{3}$/.test(n)
                    ).length;


                const count4D =
                    finalNumbers.filter(
                        n => /^\d{4}$/.test(n)
                    ).length;


                ocrStatusText.textContent =
                    "Detected " +
                    finalNumbers.length +
                    " numbers — " +
                    count3D +
                    " 3D, " +
                    count4D +
                    " 4D.";


            } catch (error) {

                console.error(
                    "Photo OCR failed:",
                    error
                );


                ocrStatusText.textContent =
                    "Could not read the photo. Please try again.";
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

            updateCounts();

            textarea.focus();
        };


    // =========================================================
    // INITIAL
    // =========================================================

    updateCounts();

});
