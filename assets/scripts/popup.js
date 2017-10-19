document.addEventListener('DOMContentLoaded', function() {

    // This is directly from https://github.com/sheetjs/js-xlsx
    var rABS = true; // true: readAsBinaryString ; false: readAsArrayBuffer
    function fixdata(data) {
        var o = "",
            l = 0,
            w = 10240;
        for (; l < data.byteLength / w; ++l) o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
        o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
        return o;
    }

    function handleFile(e) {
        var files = e.target.files;
        var i, f;
        for (i = 0; i != files.length; ++i) {
            f = files[i];
            var reader = new FileReader();
            var name = f.name;
            reader.onload = function(e) {
                var data = e.target.result;

                var workbook;
                if (rABS) {
                    /* if binary string, read with type 'binary' */
                    workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                } else {
                    /* if array buffer, convert to base64 */
                    var arr = fixdata(data);
                    workbook = XLSX.read(btoa(arr), {
                        type: 'base64'
                    });
                }

                /* DO SOMETHING WITH workbook HERE */
                validateContent(workbook);

            };
            reader.readAsBinaryString(f);
        }
    }
    // END content from https://github.com/sheetjs/js-xlsx

    function validateContent(workbook) {
        window.workbook = workbook;

        // Inject content CSS
        chrome.tabs.insertCSS(null, {
            file: "/assets/styles/content.css"
        });

        // Inject content script
        chrome.tabs.executeScript(null, {
            file: "/assets/scripts/libs/FileSaver.min.js"
        })
        chrome.tabs.executeScript(null, {
            file: "/assets/scripts/libs/jszip.js"
        });
        chrome.tabs.executeScript(null, {
            file: "/assets/scripts/libs/xlsx.js"
        });
        chrome.tabs.executeScript(null, {
            file: "/assets/scripts/content.js"
        });

        // Push workbook content to the current tab to be accessible by content script
        chrome.tabs.query({
            "active": true,
            "currentWindow": true
        }, function(tabArray) {
            var currentTabId = tabArray[0].id;
            chrome.tabs.sendMessage(currentTabId, workbook);
        });
    }

    // Bind event listener to file input field
    var fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFile, false);

    chrome.runtime.onMessage.addListener(function(msg, sender) {
        // First, validate the message's structure
        if ((msg.from === 'content') && (msg.subject === 'loading')) {
            // Enable the page-action for the requesting tab
            document.getElementById('content-validator').classList.add('loading');
        }

        if ((msg.from === 'content') && (msg.subject === 'complete')) {
            // Enable the page-action for the requesting tab
            document.getElementById('content-validator').classList.remove('loading');
        }

    });

}, false);