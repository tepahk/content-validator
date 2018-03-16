var validationStatus = {};

// Utility to replace non-breaking space characters with regular when validating them
function cleanString(str, cleanForRegex) {
    // Replaces with a single space: 
    // - non-breaking space characters e.g. " "
    // - encoded non-breaking spaces e.g. "&nsbp;"
    // - double spaces e.g. "  "

    var newStr = str,
        regex = new RegExp(String.fromCharCode(160), "g");

    newStr = newStr.toString();
    newStr = newStr.trim();
    newStr = newStr.replace(regex, " ");
    newStr = newStr.replace(/  /g, " ");
    newStr = newStr.replace(/&nbsp;/g, " ");
    if (cleanForRegex) {
        // Escape all regex characters
        newStr = newStr.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    return newStr;
}

function isMatch(string, cellId){
    var $textEls = $('h1, h2, h3, h4, h5, h6, p, li');

    var $results = $textEls.filter(':contains("'+string+'")');

    $results.addClass('content-validated');

    if( cellId ){
        $results.each(function(){
            $(this).attr('title', 'Validated against cell ' + cellId)
        })
    }

    console.log( $results );
}

// Modified from https://j11y.io/javascript/find-and-replace-text-with-javascript/
// TODO this should iterate through all nodes and see if it matches one of the items in the list, not the opposite - we need to be able to track negatives as well 
function findAndReplace(searchText, searchNode, id, cell) {
    if (!searchText) {
        // Throw error here if you want...
        return;
    }

    isMatch(searchText);

    // This regex current ignores case!!
    // var regex = typeof searchText === 'string' ?
    //     new RegExp('^' + searchText + '$', 'gi') : searchText,
    //     childNodes = (searchNode || document.body).childNodes,
    //     cnLength = childNodes.length,
    //     excludes = ['html', 'head', 'style', 'title', 'link', 'meta', 'script', 'object', 'iframe'],
    //     textEls = [];

    // while (cnLength--) {
    //     var currentNode = childNodes[cnLength],
    //         currentNodeText = currentNode.textContent,
    //         currentNodeTag = currentNode.nodeName === '#text' ? 'span' : currentNode.nodeName.toLowerCase(),
    //         isTextNode = currentNode.nodeType === 3 || textEls.indexOf( currentNode.nodeName.toLowerCase() ) > -1;

    //         // TODO "is text node" should be determined by if childnodes are ONLY a's, ems, strongs, or spans basically

    //     currentNodeText = cleanString(currentNodeText);

    //     if ( !isTextNode && excludes.indexOf(currentNode.nodeName.toLowerCase()) === -1) {
    //         findAndReplace(searchText, currentNode, id);
    //     }

    //     // Checks if node is NOT text
    //     // Checks if node does not match the search string regex
    //     // Checks if node has already been validated (TODO) - this is an issue because its not actually searching the page vertically since it has to loop through each node in the DOM
    //     if ( !isTextNode  || !regex.test(currentNodeText) || currentNode.parentNode.className.indexOf('content-validated') > -1) {
    //         // || currentNode.parentNode.className.indexOf('content-validated') > -1 - checks if this content has already been validated
    //         //     - this still allows for one cell to find multiple matches though!!!
    //         // || typeof validationStatus[id] !== 'undefined' - checks if this cell string has already been searched for and found
    //         // Abandon ship and move on to the next item in the loop
    //         continue;
    //     }

    //     // Update validation status to show number of matches
    //     if (typeof validationStatus[id] == 'undefined') {
    //         validationStatus[id] = 1;
    //     } else {
    //         validationStatus[id] = validationStatus[id] + 1;
    //     }

    //     //validationStatus[id] = true;

    //     // Actually replace content with decorative span
    //     var parent = currentNode.parentNode,
    //         frag = (function() {
    //             var html = currentNodeText,
    //                 wrap = document.createElement(currentNodeTag),
    //                 frag = document.createDocumentFragment();
    //             wrap.className = 'content-validated';
    //             wrap.title = 'Validated against cell ' + id;
    //             wrap.innerHTML = html;
    //             return wrap;
    //         })();
    //     parent.insertBefore(frag, currentNode);
    //     parent.removeChild(currentNode);

    // }
}

function nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

chrome.runtime.onMessage.addListener(function(workbook) {

    if (workbook) {
        var report = [],
            bodyContent = document.getElementsByTagName('body')[0].innerHTML,
            sheets = workbook["SheetNames"];

        chrome.runtime.sendMessage({
            from: 'content',
            subject: 'loading'
        });

        sheets.forEach(function(sheetName) {
            var sheetData = workbook["Sheets"][sheetName];
            for (var cell in sheetData) {
                let thisCell = sheetData[cell];
                if (thisCell.v) {
                    // Check for this content on the page
                    var value = thisCell.v;
                    findAndReplace(cleanString(value, true), null, cell);

                    // Add this item to the report
                    report.push([value, validationStatus[cell]])

                    // TODO: still not finding the 4 words in the intro section?
                    // TODO: still not finding contnet in the global nav
                    // TODO: style status cells in workbook for strings that are not found
                    // TODO:  only find the first instance of a string, if it has already been found ingore it and find the next instance  
                }
            }
        })


        chrome.runtime.sendMessage({
            from: 'content',
            subject: 'complete'
        });

        // Generate a new worksheet from the array of arrays we created
        var ws = XLSX.utils.aoa_to_sheet(report);
        var ws_name = "Sheet1";

        function Workbook() {
            if (!(this instanceof Workbook)) return new Workbook();
            this.SheetNames = [];
            this.Sheets = {};
        }

        var wb = new Workbook();

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;
        var wbout = XLSX.write(wb, {
            bookType: 'xlsx',
            bookSST: true,
            type: 'binary'
        });

        function s2ab(s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }

        // TODO add button to download report?
        saveAs(new Blob([s2ab(wbout)], {
            type: "application/octet-stream"
        }), document.title + " - Content Validation Report.xlsx")

    }
})