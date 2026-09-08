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


    // ---------------------------------------
    // CLASSIFY NUMBER
    // ---------------------------------------

    function classifyNumber(number) {

        number = number.trim();

        if (/^\d{3}$/.test(number)) {
            return "3D";
        }

        if (/^\d{4}$/.test(number)) {
            return "4D";
        }

        return "Invalid";
    }


    // ---------------------------------------
    // PARSE ONLY NUMERIC TOKENS
    // ---------------------------------------

    function parseNumbers(text) {

        if (!text) {
            return [];
        }

        /*
         * Only complete numeric tokens are accepted.
         *
         * 123     -> accepted
         * 1234    -> accepted
         * 12345   -> accepted as Invalid
         *
         * ABC     -> ignored
         * A123    -> ignored
         * 123ABC  -> ignored
         */

        const tokens = text
            .replace(/,/g, " ")
            .split(/\s+/)
            .map(token => token.trim())
            .filter(token => /^\d+$/.test(token));

        return tokens;
    }


    // ---------------------------------------
    // UPDATE COUNTS
    // ---------------------------------------

    function updateCounts() {

        const value = textarea.value;

        charCount.textContent = value.length;

        lineCount.textContent =
            value.length === 0
                ? 0
                : value.split("\n").length;

        calculatePreview();
    }


    // ---------------------------------------
    // PREVIEW
    // ---------------------------------------

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


    // ---------------------------------------
    // PHOTO OCR
    // ---------------------------------------

    photoInput.addEventListener("change", async function () {

        const file = photoInput.files[0];

        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            alert("Please select an image file.");

            photoInput.value = "";

            return;
        }


        ocrStatus.style.display = "block";

        ocrStatusText.textContent =
            "Reading numbers from photo...";


        try {

            const result = await Tesseract.recognize(
                file,
                "eng",
                {
                    logger: function (info) {

                        if (info.status === "recognizing text") {

                            const progress =
                                Math.round(info.progress * 100);

                            ocrStatusText.textContent =
                                "Reading numbers... " +
                                progress +
                                "%";
                        }
                    },

                    /*
                     * Tell Tesseract that we only expect digits.
                     */
                    tessedit_char_whitelist:
                        "0123456789"
                }
            );


            const text = result.data.text;


            /*
             * Convert OCR result into lines.
             */
            const lines = text
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);


            const validNumericLines = [];


            lines.forEach(function (line) {

                /*
                 * ONLY accept a line if the complete OCR result
                 * contains digits only.
                 */

                if (/^\d+$/.test(line)) {

                    validNumericLines.push(line);
                }

            });


            /*
             * Also check whitespace-separated numeric values.
             */
            if (validNumericLines.length === 0) {

                const tokens = text
                    .replace(/,/g, " ")
                    .split(/\s+/)
                    .map(token => token.trim())
                    .filter(token => /^\d+$/.test(token));

                validNumericLines.push(...tokens);
            }


            if (validNumericLines.length === 0) {

                textarea.value = "";

                ocrStatusText.textContent =
                    "No numbers found in the photo.";

                updateCounts();

                return;
            }


            /*
             * Put ONLY numbers into textarea.
             */
            textarea.value =
                validNumericLines.join("\n");


            updateCounts();


            ocrStatusText.textContent =
                "Numbers read successfully.";


        } catch (error) {

            console.error(error);

            ocrStatusText.textContent =
                "Could not read the photo. Please try a clearer image.";

        }

    });


    // ---------------------------------------
    // TEXTAREA MANUAL INPUT
    // ---------------------------------------

    textarea.addEventListener(
        "input",
        updateCounts
    );


    // ---------------------------------------
    // CLEAR BUTTON
    // ---------------------------------------

    window.clearTextarea = function () {

        textarea.value = "";

        photoInput.value = "";

        ocrStatus.style.display = "none";

        updateCounts();

        textarea.focus();
    };


    // Initial count
    updateCounts();

});
