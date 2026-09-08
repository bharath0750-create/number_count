document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const photoInput =
        document.getElementById("numberPhoto");

    const scanPhotoBtn =
        document.getElementById("scanPhotoBtn");

    const textarea =
        document.getElementById("numbers_input");

    const ocrStatus =
        document.getElementById("ocrStatus");

    const ocrStatusText =
        document.getElementById("ocrStatusText");

    const ocrSpinner =
        document.getElementById("ocrSpinner");

    const ocrProgressWrap =
        document.getElementById("ocrProgressWrap");

    const ocrProgress =
        document.getElementById("ocrProgress");

    const charCount =
        document.getElementById("charCount");

    const lineCount =
        document.getElementById("lineCount");

    const previewSection =
        document.getElementById("previewSection");

    const previewTotal =
        document.getElementById("previewTotal");

    const preview4D =
        document.getElementById("preview4D");

    const preview3D =
        document.getElementById("preview3D");

    const previewInvalid =
        document.getElementById("previewInvalid");



    // =========================================================
    // CHECK ELEMENTS
    // =========================================================

    if (
        !photoInput ||
        !scanPhotoBtn ||
        !textarea
    ) {

        console.error(
            "Photo OCR elements not found."
        );

        return;
    }



    // =========================================================
    // CLASSIFY NUMBER
    // =========================================================

    function classifyNumber(number) {

        number =
            String(number).trim();


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

            .map(function (token) {

                return token.trim();

            })

            .filter(function (token) {

                return /^\d+$/.test(token);

            });
    }



    // =========================================================
    // UPDATE COUNTS
    // =========================================================

    function updateCounts() {

        const value =
            textarea.value;


        charCount.textContent =
            value.length;


        lineCount.textContent =
            value.length === 0
                ? 0
                : value
                    .split("\n")
                    .filter(function (x) {
                        return x.trim();
                    })
                    .length;


        calculatePreview();
    }



    // =========================================================
    // PREVIEW
    // =========================================================

    function calculatePreview() {

        const numbers =
            parseNumbers(
                textarea.value
            );


        if (numbers.length === 0) {

            previewSection.style.display =
                "none";

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

            }

            else if (type === "4D") {

                count4D++;

            }

            else {

                countInvalid++;
            }

        });


        previewTotal.textContent =
            total;

        preview3D.textContent =
            count3D;

        preview4D.textContent =
            count4D;

        previewInvalid.textContent =
            countInvalid;


        previewSection.style.display =
            "block";
    }



    // =========================================================
    // IMAGE PREPROCESSING
    // =========================================================

    function preprocessImage(
        file,
        mode
    ) {

        return new Promise(
            function (resolve, reject) {

                const img =
                    new Image();


                const url =
                    URL.createObjectURL(file);


                img.onload =
                    function () {

                        try {

                            /*
                             * Enlarge handwritten image.
                             */

                            const scale = 2;


                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


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
                             * White background.
                             */

                            ctx.fillStyle =
                                "#ffffff";


                            ctx.fillRect(
                                0,
                                0,
                                canvas.width,
                                canvas.height
                            );


                            /*
                             * Draw image.
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


                            /*
                             * Process pixels.
                             */

                            for (
                                let i = 0;
                                i < data.length;
                                i += 4
                            ) {

                                const r =
                                    data[i];

                                const g =
                                    data[i + 1];

                                const b =
                                    data[i + 2];


                                /*
                                 * Grayscale.
                                 */

                                let gray =
                                    (
                                        0.299 * r +
                                        0.587 * g +
                                        0.114 * b
                                    );


                                /*
                                 * Normal.
                                 */

                                if (
                                    mode === "normal"
                                ) {

                                    gray =
                                        gray;

                                }


                                /*
                                 * Strong contrast.
                                 */

                                else if (
                                    mode === "contrast"
                                ) {

                                    gray =
                                        (
                                            (gray - 128)
                                            * 1.8
                                        ) + 128;


                                    gray =
                                        Math.max(
                                            0,
                                            Math.min(
                                                255,
                                                gray
                                            )
                                        );
                                }


                                /*
                                 * Threshold.
                                 */

                                else if (
                                    mode === "threshold"
                                ) {

                                    gray =
                                        gray < 175
                                            ? 0
                                            : 255;
                                }


                                /*
                                 * Dark handwriting.
                                 */

                                else if (
                                    mode === "dark"
                                ) {

                                    if (
                                        gray < 190
                                    ) {

                                        gray =
                                            gray * 0.55;

                                    } else {

                                        gray =
                                            Math.min(
                                                255,
                                                gray + 25
                                            );
                                    }
                                }


                                data[i] =
                                    gray;

                                data[i + 1] =
                                    gray;

                                data[i + 2] =
                                    gray;
                            }


                            ctx.putImageData(
                                imageData,
                                0,
                                0
                            );


                            URL.revokeObjectURL(
                                url
                            );


                            resolve(
                                canvas.toDataURL(
                                    "image/png"
                                )
                            );


                        }

                        catch (error) {

                            URL.revokeObjectURL(
                                url
                            );

                            reject(error);
                        }
                    };


                img.onerror =
                    function () {

                        URL.revokeObjectURL(
                            url
                        );

                        reject(
                            new Error(
                                "Unable to read image."
                            )
                        );
                    };


                img.src = url;

            }
        );
    }



    // =========================================================
    // OCR
    // =========================================================

    async function runOCR(
        image,
        psm
    ) {

        try {

            const result =
                await Tesseract.recognize(
                    image,
                    "eng",
                    {

                        logger:
                            function (info) {

                                if (
                                    info.status ===
                                    "recognizing text"
                                ) {

                                    const progress =
                                        Math.round(
                                            info.progress *
                                            100
                                        );


                                    ocrProgress.style.width =
                                        progress + "%";


                                    ocrStatusText.textContent =
                                        "Reading handwritten numbers... "
                                        +
                                        progress
                                        +
                                        "%";
                                }
                            },


                        /*
                         * DIGITS ONLY.
                         */

                        tessedit_char_whitelist:
                            "0123456789",


                        /*
                         * Sparse text.
                         *
                         * Important for your photo
                         * because numbers are in
                         * different positions.
                         */

                        tessedit_pageseg_mode:
                            psm

                    }
                );


            return result.data.text || "";

        }

        catch (error) {

            console.error(
                "OCR error:",
                error
            );


            return "";
        }
    }



    // =========================================================
    // EXTRACT 3D / 4D NUMBERS
    // =========================================================

    function extractNumbers(text) {

        if (!text) {

            return [];
        }


        const result = [];


        /*
         * Split OCR into lines.
         */

        const lines =
            text
                .split(/\r?\n/)
                .map(function (line) {

                    return line.trim();

                })
                .filter(Boolean);


        lines.forEach(
            function (line) {

                /*
                 * Remove letters and symbols.
                 */

                const cleaned =
                    line.replace(
                        /[^0-9\s]/g,
                        " "
                    );


                /*
                 * Separate number groups.
                 */

                const groups =
                    cleaned
                        .split(/\s+/)
                        .filter(Boolean);


                groups.forEach(
                    function (group) {

                        /*
                         * ONLY 3D.
                         */

                        if (
                            /^\d{3}$/.test(
                                group
                            )
                        ) {

                            result.push(group);
                        }


                        /*
                         * ONLY 4D.
                         */

                        else if (
                            /^\d{4}$/.test(
                                group
                            )
                        ) {

                            result.push(group);
                        }

                    }
                );

            }
        );


        /*
         * Search entire OCR output
         * for standalone 3/4 digit values.
         */

        const normalized =
            text.replace(
                /[^0-9\s]/g,
                " "
            );


        const tokens =
            normalized
                .split(/\s+/)
                .filter(Boolean);


        tokens.forEach(
            function (token) {

                if (
                    /^\d{3}$/.test(token) ||
                    /^\d{4}$/.test(token)
                ) {

                    result.push(token);
                }

            }
        );


        return result;
    }



    // =========================================================
    // REMOVE DUPLICATES
    // =========================================================

    function removeDuplicates(
        numbers
    ) {

        const unique = [];


        numbers.forEach(
            function (number) {

                if (
                    !unique.includes(number)
                ) {

                    unique.push(number);
                }

            }
        );


        return unique;
    }



    // =========================================================
    // SCAN PHOTO BUTTON
    // =========================================================

    scanPhotoBtn.addEventListener(
        "click",
        async function () {

            /*
             * Photo must be selected first.
             */

            const file =
                photoInput.files[0];


            if (!file) {

                ocrStatus.style.display =
                    "block";


                ocrStatusText.textContent =
                    "Please choose a photo first.";


                ocrStatusText.className =
                    "small text-danger";


                return;
            }


            /*
             * Check image.
             */

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                ocrStatus.style.display =
                    "block";


                ocrStatusText.textContent =
                    "Please select an image file.";


                ocrStatusText.className =
                    "small text-danger";


                photoInput.value =
                    "";


                return;
            }



            // =================================================
            // START
            // =================================================

            scanPhotoBtn.disabled =
                true;


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


            ocrStatusText.textContent =
                "Preparing handwritten photo...";



            try {

                let allNumbers = [];



                // =================================================
                // PASS 1 - NORMAL
                // =================================================

                ocrStatusText.textContent =
                    "Scanning photo - Pass 1...";


                const normalImage =
                    await preprocessImage(
                        file,
                        "normal"
                    );


                const text1 =
                    await runOCR(
                        normalImage,
                        11
                    );


                allNumbers.push(
                    ...extractNumbers(
                        text1
                    )
                );



                // =================================================
                // PASS 2 - CONTRAST
                // =================================================

                ocrStatusText.textContent =
                    "Improving handwriting - Pass 2...";


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
                    ...extractNumbers(
                        text2
                    )
                );



                // =================================================
                // PASS 3 - THRESHOLD
                // =================================================

                ocrStatusText.textContent =
                    "Checking numbers - Pass 3...";


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
                    ...extractNumbers(
                        text3
                    )
                );



                // =================================================
                // PASS 4 - DARK
                // =================================================

                ocrStatusText.textContent =
                    "Final number scan - Pass 4...";


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
                    ...extractNumbers(
                        text4
                    )
                );



                // =================================================
                // FINAL RESULT
                // =================================================

                const detectedNumbers =
                    removeDuplicates(
                        allNumbers
                    );


                /*
                 * ONLY 3D and 4D.
                 */

                const finalNumbers =
                    detectedNumbers.filter(
                        function (number) {

                            return (
                                /^\d{3}$/.test(
                                    number
                                ) ||

                                /^\d{4}$/.test(
                                    number
                                )
                            );
                        }
                    );



                // =================================================
                // NO RESULT
                // =================================================

                if (
                    finalNumbers.length === 0
                ) {

                    textarea.value =
                        "";


                    ocrProgress.style.width =
                        "100%";


                    ocrStatusText.textContent =
                        "No 3D or 4D numbers detected. Try a clearer photo.";


                    ocrStatusText.className =
                        "small text-danger";


                    updateCounts();


                    return;
                }



                // =================================================
                // PUT NUMBERS INTO TEXTAREA
                // =================================================

                textarea.value =
                    finalNumbers.join(
                        "\n"
                    );


                textarea.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles: true
                        }
                    )
                );


                updateCounts();



                // =================================================
                // COUNTS
                // =================================================

                const count3D =
                    finalNumbers.filter(
                        function (number) {

                            return /^\d{3}$/.test(
                                number
                            );
                        }
                    ).length;


                const count4D =
                    finalNumbers.filter(
                        function (number) {

                            return /^\d{4}$/.test(
                                number
                            );
                        }
                    ).length;



                // =================================================
                // SUCCESS
                // =================================================

                ocrProgress.style.width =
                    "100%";


                ocrStatusText.textContent =
                    "Detected " +
                    finalNumbers.length +
                    " numbers — " +
                    count3D +
                    " 3D, " +
                    count4D +
                    " 4D.";


                ocrStatusText.className =
                    "small text-success";


            }

            catch (error) {

                console.error(
                    "Photo OCR failed:",
                    error
                );


                ocrStatusText.textContent =
                    "OCR failed. Please try another clear photo.";


                ocrStatusText.className =
                    "small text-danger";
            }


            finally {

                /*
                 * Enable scan button again.
                 */

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
    // MANUAL TEXT INPUT
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

            textarea.value =
                "";

            photoInput.value =
                "";


            ocrStatus.style.display =
                "none";


            ocrProgressWrap.style.display =
                "none";


            ocrProgress.style.width =
                "0%";


            scanPhotoBtn.disabled =
                false;


            scanPhotoBtn.innerHTML =
                '<i class="fas fa-magic me-2"></i>SCAN PHOTO';


            updateCounts();


            textarea.focus();
        };



    // =========================================================
    // INITIAL
    // =========================================================

    updateCounts();

});
