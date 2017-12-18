var validationStatus = {},
  searchTerms = {};

// Utility to replace non-breaking space characters with regular when validating them
function cleanString(str, cleanForRegex) {
  // Replaces with a single space: 
  // - non-breaking space characters e.g. " "
  // - encoded non-breaking spaces e.g. "&nsbp;"
  // - double spaces e.g. "  "
  var newStr = "",
    nonBreakingSpaces = new RegExp(String.fromCharCode(160), "g");

  if (str && str.length > 0) {
    newStr = str;

    newStr = newStr.toString();
    newStr = newStr.trim();
    newStr = newStr.replace(nonBreakingSpaces, " ");
    newStr = newStr.replace(/\<br\/?\>/g, " ");
    newStr = newStr.replace(/<sup.*>(.*)<\/sup>/g, "$1");
    newStr = newStr.replace(/<small.*>(.*)<\/small>/g, "$1");
    newStr = newStr.replace(/\<\!\-\-.*\-\-\>/g, "");
    newStr = newStr.replace(/  /g, " ");
    newStr = newStr.replace(/&nbsp;/g, " ");
    newStr = newStr.replace(/• /g, " ");
    if (cleanForRegex) {
      // Escape all regex characters
      newStr = newStr.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

  }
  return newStr;
}

// Actual search functionality that iterates over all text nodes on a page and checks it against 
function searchPageNodes(startingNode) {
  var childNodes = (startingNode || document.body).childNodes,
    cnLength = childNodes.length,
    excludes = ['html', 'head', 'style', 'link', 'script', 'object', 'iframe', 'svg', 'symbol', 'br'],
    textEls = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span'];

  while (cnLength--) {
    var currentNode = childNodes[cnLength],
      origNodeText = currentNode.innerHTML;

    if (origNodeText && origNodeText.length > 0) {

      var currentNodeText = cleanString(origNodeText);

      var tag = currentNode.nodeName.toLowerCase();

      if (currentNode.nodeType === 1 && textEls.indexOf(tag) === -1 && excludes.indexOf(tag) === -1) {
        searchPageNodes(currentNode);
      } else if (textEls.indexOf(tag) > -1) {
        // If it is a text element (heading, p, a, span)
        console.log(currentNode, currentNodeText)
        var searchTerm = checkAgainstSearchTerms(currentNodeText);

        if (searchTerm !== null) {
          highlightMatch(currentNode, currentNodeText, '<span class="content-validated" title="Validated against cell ' + searchTerm.cell + '">' + currentNodeText + '</span>');
        }
      } else {
        continue;
      }

    }
  }

}

function checkAgainstSearchTerms(nodeText) {
  for (var cell in searchTerms) {
    var term = searchTerms[cell];
    // currentNode.nodeType !== 3 || !regex.test(currentNodeText) || currentNode.parentNode.className.indexOf('content-validated') > -1
    var regex = typeof term.searchString === 'string' ? new RegExp('^' + term.searchString + '$', 'gi') : term.searchString;

    if (term.searchString.length > 0 && !term.found && regex.test(nodeText)) {
      term.found = true;
      return term;
    }
  }

  return null;
}

function highlightMatch(node, nodeText, replacement) {
  var regex = typeof nodeText === 'string' ? new RegExp('^' + nodeText + '$', 'gi') : nodeText;

  var parent = node.parentNode,
    frag = (function() {
      var html = nodeText.replace(regex, replacement),
        wrap = document.createElement('span'),
        frag = document.createDocumentFragment();
      wrap.innerHTML = html;
      while (wrap.firstChild) {
        frag.appendChild(wrap.firstChild);
      }
      return frag;
    })();
  parent.insertBefore(frag, node);
  parent.removeChild(node);
}

function nextChar(c) {
  return String.fromCharCode(c.charCodeAt(0) + 1);
}

function createReport() {
  var report = [];
  // Add this item to the report
  for (var cell in searchTerms) {
    var term = searchTerms[cell];
    report.push([term.originalString, term.found])
  }
  return report;
}

function writeSpreadsheet(report) {
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
        let thisCell = sheetData[cell],
          value = thisCell.v;

        if (typeof value !== 'undefined' && value.length > 0) {
          // Check for this content on the page

          searchTerms[cell] = {
            "originalString": value,
            "searchString": cleanString(value, true),
            "found": false
          };

        }
      }
    })

    // Check for this content on the page
    searchPageNodes();

    // Write report
    report = createReport();

    console.log(report)

    chrome.runtime.sendMessage({
      from: 'content',
      subject: 'complete'
    });

    // Generate a new worksheet from the array of arrays we created
    writeSpreadsheet(report);

  }
})