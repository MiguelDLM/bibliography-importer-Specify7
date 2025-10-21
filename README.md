# BibTeX to Specify 7

Edge/Chromium browser extension that allows importing bibliography in BibTeX format directly into Specify 7 forms.

## 🚀 Features

- ✅ Automatic detection of Reference Work forms in Specify 7
- ✅ Import from clipboard or manual entry
- ✅ Import metadata by DOI (fetches from CrossRef)
- ✅ Automatic mapping of BibTeX/CrossRef fields to Specify 7
- ✅ Support for multiple reference types (Book, Paper, Thesis, etc.)
- ✅ Intelligent author parsing
- ✅ Modern interface with dark mode
- ✅ Visual notifications of import status

## 📋 Compatible Fields

### BibTeX Reference Types → Specify 7

| BibTeX | Specify 7 |
|--------|-----------|
| `@book` | Book (0) |
| `@article` | Paper (2) |
| `@inbook`, `@incollection` | Section in Book (5) |
| `@techreport` | Technical Report (3) |
| `@phdthesis`, `@mastersthesis` | Thesis (4) |
| `@misc`, `@online` | Electronic Media (1) |

### Field Mapping

| BibTeX/CrossRef Field | Specify 7 Field |
|--------------|-----------------|
| `title` | Title |
| `publisher` | Publisher |
| `address`, `location` | Place Of Publication |
| `year`, `date` | Work Date |
| `volume` | Volume |
| `pages` | Pages |
| `journal`, `booktitle`, `container-title` | Journal |
| `number`, `isbn`, `doi` | Library Number |
| `author`, `editor` | Authors |

## 📦 Installation

(installation steps unchanged — see original file)

## 🎯 Usage

1. **Open Specify 7** in your browser

2. **Navigate to a Reference Work form:**
   - Go to any collection
   - Create or edit a record
   - Open the "New Reference Work" form

3. **Import by DOI:**
   - Click the new **Import DOI** button in the form
   - Paste a DOI (for example, `10.1038/s41586-020-2649-2`) in the modal
   - The extension will fetch metadata from CrossRef and fill the form fields

4. **Or import BibTeX:**
   - Copy a BibTeX entry to the clipboard and click **Import BibTeX**, or paste it in the modal

5. **Review and Save**

### Notes on DOI import

- The extension uses the CrossRef REST API (`https://api.crossref.org/works/:doi`) to fetch metadata.
- If CrossRef doesn't have the DOI or returns an error, you'll see an error message.
- Authors are parsed from CrossRef but might still need manual verification in the authors subform.

## 🔧 Development

(Development section unchanged)

## 📝 TODO / Future Improvements

- [x] DOI import and CrossRef mapping
- [ ] Full support for automatically adding authors
- [ ] Batch import (multiple BibTeX entries)
- [ ] Export references from Specify to BibTeX
- [ ] Support for more specialized fields
- [ ] Customizable field mapping configuration
- [ ] Import history
- [ ] Advanced data validation
- [ ] Automated tests

---

**Version:** 1.0.1  
**Last update:** October 2025
