Content Validator 
=====
This *Content Validator* tool is a Chrome-only extension to compare an Excel (.xlsx) spreadsheet with a given webpage's text content.

### Installation
_(Developers only)_
1. Download the entire content-validator directory  
   On GitHub: 
    - Click **Clone or download**
    - Click **Download ZIP**
2. Unzip the downloaded folder
3. Go to [chrome://extensions/](chrome://extensions/)
4. Click **Load unpacked extension**
5. Navigate to the unzipped downloaded folder
6. That's it! You should see a new icon ![alt text](https://github.com/tepahk/content-validator/raw/master/assets/images/icon.png "Content Validator icon") pop into the top right corner of your browser.


### Usage
1. Navigate to the page you want to content validate
2. Click the *Content Validator* icon ![alt text](https://github.com/tepahk/content-validator/raw/master/assets/images/icon.png "Content Validator icon")
3. Click the Choose File input
4. Select your Excel spreadsheet (see [example.xlsx](https://github.com/tepahk/content-validator/raw/master/example.xlsx) for correct formatting)
5. *Content Validator* will automatically do the following:
    - Highlight validated strings in green with a checkmark to the left
    - Output a report of text with the number of matching strings
