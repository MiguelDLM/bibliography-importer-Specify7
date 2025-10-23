# Disclaimer

This extension was designed to satisfy my personal needs with Specify 7. Each user is responsible for their own use and configuration. Although it is unlikely to cause damage to your Specify installation, the author is not responsible for any issues, data loss, or malfunction.

This is a personal-use project and is not affiliated with or related to the official development of Specify 7 or its creators. Use at your own risk.

---

# Specify7+

Specify7+ is a browser extension for Chromium-based browsers that enhances Specify 7 with powerful productivity tools.

## 🚀 Features

### 📚 Bibliography Import
- ✅ Import BibTeX entries from clipboard or manual entry
- ✅ Import metadata by DOI (CrossRef API)
- ✅ Automatic mapping from BibTeX/CrossRef to Specify 7 fields
- ✅ Smart author parsing and field population

### 🔬 3D Model Viewer
- ✅ Classic Three.js 3D viewer with lighting and material controls
- ✅ Support for STL, OBJ, GLTF, GLB formats
- ✅ Reliable handling of large files via blob streaming
- ✅ Wireframe mode, rotation controls, fit-to-view

### ⚡ Query Tools
- ✅ **Select All** button for query results
- ✅ Simulates real click events for proper Specify 7 integration
- ✅ Works with all query result pages

### 🎛️ Feature Toggles
- ✅ Enable/disable features individually from the popup
- ✅ Persistent settings via `chrome.storage.sync`

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

Follow the usual steps for loading unpacked extensions in Chromium:

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select this repository folder

The extension will add a popup and content-script hooks into Specify 7 pages.

## 🎯 Usage

### Bibliography Import

1. **Navigate to a Reference Work form** in Specify 7
2. **Import by DOI:**
   - Click the **Import DOI** button
   - Paste a DOI (e.g., `10.1038/s41586-020-2649-2`)
   - Metadata is fetched from CrossRef and fills the form
3. **Or import BibTeX:**
   - Copy a BibTeX entry and click **Import BibTeX**
   - Or paste it manually in the modal
4. **Review and Save**

### 3D Viewer

- Click any 3D model link (`.stl`, `.obj`, `.gltf`, `.glb`) in Specify 7
- The model opens in a new tab with the viewer
- Use mouse to rotate, zoom, and explore
- Adjust lighting and materials via the settings panel

### Query Tools

- Open any query results page in Specify 7
- Click the **Select All** button in the toolbar
- All checkboxes are selected with simulated click events
- Specify 7 recognizes the selection without page refresh

### Feature Toggles

- Click the extension icon to open the popup
- Toggle individual features on/off
- Settings are saved automatically

### Notes on DOI import

- Uses CrossRef REST API (`https://api.crossref.org/works/:doi`)
- Authors may need manual verification in the subform

## 🔧 Development

### Project Structure

```
bibliography-importer-Specify7/
├── manifest.json           # Extension manifest (MV3)
├── icons/                  # Extension icons
├── lib/                    # External libraries
│   └── three/              # Three.js and loaders
│       ├── three.min.js
│       ├── STLLoader.js
│       └── OrbitControls.js
└── src/                    # Source code
    ├── popup/              # Extension popup
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js
    ├── content/            # Content scripts
    │   ├── content-script.js
    │   └── content-styles.css
    ├── viewer/             # 3D viewer
    │   ├── viewer.html
    │   ├── viewer.css
    │   └── viewer.js
    └── utils/              # Utilities
        └── bibtex-parser.js
```

### Building & Testing

1. Make changes to files in `src/`
2. Reload the extension in `chrome://extensions`
3. Test the feature in a Specify 7 instance

### Adding New Features

Features are toggled via the popup. To add a new feature:

1. Add a checkbox in `src/popup/popup.html`
2. Update `src/popup/popup.js` to save the preference
3. Update `src/content/content-script.js` to respect the toggle



**Version:**1.0.0  
**Last update:** October 2025
