var validationStatus = {};

// Utility to replace non-breaking space characters with regular when validating them
function replaceNbsps(str) {
    // Replaces with a single space: 
    // - non-breaking space characters e.g. " "
    // - encoded non-breaking spaces e.g. "&nsbp;"
    // - double spaces e.g. "  "

    var newStr = str,
        regex = new RegExp(String.fromCharCode(160), "g");
    newStr = newStr.replace(regex, " ");
    newStr = newStr.replace(/  /g, " ");
    newStr = newStr.replace(/&nbsp;/g, " ");
    newStr = newStr.trim();

    return newStr;
}

// Modified from https://j11y.io/javascript/find-and-replace-text-with-javascript/
function findAndReplace(searchText, replacement, searchNode, id) {
    if (!searchText || typeof replacement === 'undefined') {
        // Throw error here if you want...
        return;
    }

    searchText = replaceNbsps(searchText);

    // This regex current ignores case!!
    var regex = typeof searchText === 'string' ?
        new RegExp('^'+searchText+'$', 'gi') : searchText,
        childNodes = (searchNode || document.body).childNodes,
        cnLength = childNodes.length,
        excludes = 'html,head,style,title,link,meta,script,object,iframe';

    while (cnLength--) {
        var currentNode = childNodes[cnLength],
            currentNodeText = currentNode.textContent;

        currentNodeText = replaceNbsps(currentNodeText);
        if (currentNode.nodeType === 1 && (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') === -1) {
            findAndReplace(searchText, replacement, currentNode, id);
        }
        if (currentNode.nodeType !== 3 || !regex.test(currentNodeText)) {
            continue;
        }

        if (currentNodeText.match(regex)) {
            //console.log(currentNodeText)

            if( id ){
                console.log(id, currentNode, currentNode.parentNode)
                validationStatus[id] = true;
            }

            // TODO ensure it matches the WHOLE THING not just one word e.g. "about"

            // Actually replace content
            var parent = currentNode.parentNode,
                frag = (function() {
                    var html = currentNodeText.replace(regex, replacement),
                        wrap = document.createElement('span'),
                        frag = document.createDocumentFragment();
                    wrap.innerHTML = html;
                    while (wrap.firstChild) {
                        frag.appendChild(wrap.firstChild);
                    }
                    return frag;
                })();
            parent.insertBefore(frag, currentNode);
            parent.removeChild(currentNode);

        }
    }
}

function nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

chrome.runtime.onMessage.addListener(function(workbook) {

    if (workbook) {
        var report = [],
            bodyContent = document.getElementsByTagName('body')[0].innerHTML,
            sheets = workbook["SheetNames"];

        sheets.forEach(function(sheetName) {
            var sheetData = workbook["Sheets"][sheetName];
            for (var cell in sheetData) {
                let thisCell = sheetData[cell];
                if (thisCell.v) {
                    // Check for this content on the page
                    var value = thisCell.v;
                    findAndReplace(value, '<span class="content-validated" title="' + cell + '">' + value + '</span>', null, cell);

                    // Add this item to the report
                    var stringWasFound = false;

                    console.log( validationStatus[cell] )

                    // if( nodesFound.length == 0 ){
                    //     console.warn( 'Did not find', cell, ' - ', '"'+thisCell.v+'"' )
                    // }

                    // TODO Only push exists if it does exist
                    report.push( [value, validationStatus[cell]] )
  
                }
            }
        })

        // Generate a new worksheet from the array of arrays we created
        var ws = XLSX.utils.aoa_to_sheet(report);
        var ws_name = "Sheet1";

        function Workbook() {
            if(!(this instanceof Workbook)) return new Workbook();
            this.SheetNames = [];
            this.Sheets = {};
        }
         
        var wb = new Workbook();
         
        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;
        var wbout = XLSX.write(wb, {bookType:'xlsx', bookSST:true, type: 'binary'});
        function s2ab(s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }

        // TODO add button to download report?
        saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), document.title + " - Content Validation Report.xlsx")

    }
})