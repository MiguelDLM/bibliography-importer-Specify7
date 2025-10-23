/**
 * Content Script to detect Specify 7 forms and add enhanced functionality
 */

(function() {
  'use strict';
  
  console.log('Specify7+: Extension loaded');
  
  // Feature flags loaded from storage
  let enabledFeatures = {
    bibtex: true,
    doi: true,
    viewer3d: true,
    selectAll: true
  };
  
  // Load feature states from storage
  function loadFeatureStates() {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['enabledFeatures'], (result) => {
        if (result && result.enabledFeatures) {
          enabledFeatures = result.enabledFeatures;
          console.log('Specify7+: Feature states loaded', enabledFeatures);
        }
      });
    }
  }
  
  // Load features on startup
  loadFeatureStates();
  
  /**
   * Detects if we are in a Specify 7 Reference Work form
   */
  function isSpecifyReferenceForm() {
    // Look for the modal title indicating it's a Reference Work form
    const modalHeader = document.querySelector('h2[id*="modal"][id*="header"]');
    if (modalHeader && modalHeader.textContent.includes('Reference Work')) {
      return true;
    }
    
    // Check for the presence of specific fields
    const titleField = document.querySelector('input[name="title"]');
    const publisherField = document.querySelector('input[name="publisher"]');
    const typeSelect = document.querySelector('select[name="ReferenceWorkType"]');
    
    return titleField && publisherField && typeSelect;
  }
  
  /**
   * Creates the BibTeX import button
   */
  function createBibtexButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bibtex-import-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
      <span>Import BibTeX</span>
    `;
    button.title = 'Import BibTeX entry from clipboard';
    
    button.addEventListener('click', handleBibtexImport);
    
    return button;
  }

  /**
   * Creates the DOI import button
   */
  function createDoiButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'doi-import-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20"></path>
        <path d="M5 7h14"></path>
        <path d="M5 17h14"></path>
      </svg>
      <span>Import DOI</span>
    `;
    button.title = 'Import metadata by DOI';
    button.addEventListener('click', showDoiInputModal);
    return button;
  }
  
  /**
   * Handles BibTeX import
   */
  async function handleBibtexImport() {
    try {
      // Try to read from clipboard
      const text = await navigator.clipboard.readText();
      
      if (!text.trim()) {
        showMessage('Clipboard is empty', 'warning');
        return;
      }
      
      // If it doesn't look like BibTeX, show modal
      if (!text.includes('@')) {
        showBibtexInputModal();
        return;
      }
      
      processBibtexInput(text);
      
    } catch (error) {
      // If clipboard access fails, show modal
      console.log('Could not access clipboard, showing modal:', error);
      showBibtexInputModal();
    }
  }
  
  /**
   * Processes BibTeX input and fills the form
   */
  function processBibtexInput(bibtexText) {
    try {
      const entries = BibtexParser.parse(bibtexText);
      
      if (entries.length === 0) {
        showMessage('No valid BibTeX entries found', 'error');
        return;
      }
      
      if (entries.length > 1) {
        showMessage(`Found ${entries.length} entries. Importing the first one.`, 'info');
      }
      
      const specifyData = BibtexParser.toSpecifyFormat(entries[0]);
      fillForm(specifyData);
      
      showMessage('BibTeX imported successfully!', 'success');
      
    } catch (error) {
      console.error('Error processing BibTeX:', error);
      showMessage('Error processing BibTeX: ' + error.message, 'error');
    }
  }

  /**
   * Shows modal to paste DOI and fetch metadata
   */
  function showDoiInputModal() {
    const modal = document.createElement('div');
    modal.className = 'bibtex-modal';
    modal.innerHTML = `
      <div class="bibtex-modal-content">
        <div class="bibtex-modal-header">
          <h3>Paste DOI</h3>
          <button class="bibtex-modal-close" title="Close">&times;</button>
        </div>
        <div class="bibtex-modal-body">
          <input id="doi-input" placeholder="10.1038/s41586-020-2649-2" />
          <p class="bibtex-hint">You can paste a DOI (e.g. 10.1038/...) and the extension will fetch metadata.</p>
        </div>
        <div class="bibtex-modal-footer">
          <button class="bibtex-btn bibtex-btn-secondary" id="doi-cancel">Cancel</button>
          <button class="bibtex-btn bibtex-btn-primary" id="doi-import">Fetch</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.bibtex-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#doi-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#doi-import').addEventListener('click', async () => {
      const doi = modal.querySelector('#doi-input').value.trim();
      modal.remove();
      if (!doi) {
        showMessage('Please enter a DOI', 'warning');
        return;
      }
      await fetchDoiAndFill(doi);
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    setTimeout(() => { modal.querySelector('#doi-input').focus(); }, 100);
  }

  /**
   * Fetches DOI metadata from CrossRef and fills the form
   * @param {string} doi
   */
  async function fetchDoiAndFill(doi) {
    try {
      showMessage('Fetching metadata for DOI...', 'info');
      const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`CrossRef returned ${resp.status}`);
      const json = await resp.json();
      const item = json.message;

      // Map CrossRef fields to specifyData
      const specifyData = {
        type: mapCrossrefType(item.type),
        title: (item.title && item.title[0]) || '',
        publisher: item.publisher || '',
        placeOfPublication: (item['publisher-location']) || '',
        workDate: (item.issued && item.issued['date-parts'] && item.issued['date-parts'][0] && item.issued['date-parts'][0][0]) || '',
        volume: item.volume || item.volume || '',
        pages: item.page || '',
        journal: (item['container-title'] && item['container-title'][0]) || '',
        libraryNumber: item.DOI || item.ISBN && item.ISBN[0] || '',
        authors: parseCrossrefAuthors(item.author || [])
      };

      fillForm(specifyData);
      showMessage('Metadata imported from DOI', 'success');
    } catch (err) {
      console.error('Error fetching DOI metadata:', err);
      showMessage('Error fetching DOI metadata: ' + err.message, 'error');
    }
  }

  function mapCrossrefType(crossrefType) {
    const map = {
      'book': 0,
      'book-chapter': 5,
      'journal-article': 2,
      'report': 3,
      'dissertation': 4,
      'monograph': 0,
      'reference-entry': 5,
      'proceedings-article': 2
    };
    return map[crossrefType] !== undefined ? map[crossrefType] : 0;
  }

  function parseCrossrefAuthors(authors) {
    if (!Array.isArray(authors)) return [];
    return authors.map((a, i) => ({
      orderNumber: i,
      firstName: (a.given || ''),
      lastName: (a.family || a.name || '')
    }));
  }
  
  /**
   * Fills the form with the data
   */
  function fillForm(data) {
    // Reference type
    const typeSelect = document.querySelector('select[name="ReferenceWorkType"]');
    if (typeSelect && data.type !== undefined) {
      typeSelect.value = data.type;
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      typeSelect.classList.remove('not-touched');
    }
    
    // Text fields
    const fieldMapping = {
      'title': data.title,
      'publisher': data.publisher,
      'placeOfPublication': data.placeOfPublication,
      'workDate': data.workDate,
      'volume': data.volume,
      'pages': data.pages,
      'libraryNumber': data.libraryNumber
    };
    
    for (const [fieldName, value] of Object.entries(fieldMapping)) {
      if (value) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.classList.remove('not-touched');
        }
      }
    }
    
    // Journal (special field with autocomplete)
    if (data.journal) {
      const journalInput = document.querySelector('input[role="combobox"][title*="Journal"]');
      if (journalInput) {
        journalInput.value = data.journal;
        journalInput.dispatchEvent(new Event('input', { bubbles: true }));
        journalInput.dispatchEvent(new Event('change', { bubbles: true }));
        journalInput.classList.remove('not-touched');
      }
    }
    
    // Handle authors - attempt auto-insertion
    if (data.authors && data.authors.length > 0) {
      console.log('Authors to import:', data.authors);
      
      // Try to auto-insert authors into the Authors subform
      addAuthorsToForm(data.authors).then((added) => {
        const existing = countExistingAuthors();
        if (added > 0) {
          showMessage(`Added ${added} author field(s). Total: ${existing}. Please create/select agents when prompted.`, 'info');
        } else if (existing > 0) {
          showMessage(`Using ${existing} existing author field(s). Please verify and create/select agents.`, 'info');
        } else {
          showMessage(`Note: Authors (${data.authors.length}) must be added manually.`, 'info');
        }
      }).catch((err) => {
        console.error('Error inserting authors:', err);
        showMessage('Could not insert authors automatically', 'warning');
      });
    }
  }


  /**
   * Utility sleep
   */
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  /**
   * Count existing author rows in the Authors fieldset
   */
  function countExistingAuthors() {
    const fieldsets = Array.from(document.querySelectorAll('fieldset'));
    const authorsFs = fieldsets.find(fs => {
      const h3 = fs.querySelector('h3');
      return h3 && /Authors\b/i.test(h3.textContent);
    });
    if (!authorsFs) return 0;

    // Count rows in the authors table/grid
    const rows = authorsFs.querySelectorAll('[role="row"]');
    // Subtract 1 for header row if present
    const headerRows = Array.from(rows).filter(r => r.querySelector('[role="columnheader"]'));
    return Math.max(0, rows.length - headerRows.length);
  }

  /**
   * Attempt to add authors into the Authors subform as agent rows.
   * This function calculates how many author fields are needed and only adds the difference.
   * Returns the number of authors actually inserted.
   * @param {Array<{firstName:string,lastName:string}>} authors
   */
  async function addAuthorsToForm(authors) {
    if (!Array.isArray(authors) || authors.length === 0) return 0;

    // Count how many author fields already exist
    const existingCount = countExistingAuthors();
    const neededCount = authors.length;
    const toAdd = neededCount - existingCount;

    console.log(`Authors: ${neededCount} needed, ${existingCount} existing, ${toAdd} to add`);

    // If we already have enough fields, just fill them
    if (toAdd <= 0) {
      await fillExistingAuthorFields(authors);
      return 0; // No new fields added
    }

    // Find the Authors fieldset by header text
    const fieldsets = Array.from(document.querySelectorAll('fieldset'));
    const authorsFs = fieldsets.find(fs => {
      const h3 = fs.querySelector('h3');
      return h3 && /Authors\b/i.test(h3.textContent);
    });
    if (!authorsFs) return 0;

    // Find the Add button inside the authors fieldset
    let addBtn = Array.from(authorsFs.querySelectorAll('button')).find(b => {
      const title = (b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '');
      return /add|añad|añadir/i.test(title) && !b.disabled;
    });

    if (!addBtn) return 0;

    // Add only the missing fields
    let inserted = 0;
    for (let i = 0; i < toAdd; i++) {
      try {
        // Click the add button to create a new row
        addBtn.click();
        inserted++;
        // Wait for the DOM to update
        await sleep(300);
      } catch (err) {
        console.error('Error while adding author row:', err);
      }
    }

    // Now fill all author fields (existing + newly added)
    if (inserted > 0) {
      await sleep(200); // Extra wait for DOM stabilization
      await fillExistingAuthorFields(authors);
    }

    return inserted;
  }

  /**
   * Fill existing author fields with author data
   * @param {Array<{firstName:string,lastName:string}>} authors
   */
  async function fillExistingAuthorFields(authors) {
    const fieldsets = Array.from(document.querySelectorAll('fieldset'));
    const authorsFs = fieldsets.find(fs => {
      const h3 = fs.querySelector('h3');
      return h3 && /Authors\b/i.test(h3.textContent);
    });
    if (!authorsFs) return;

    // Get all combobox inputs in the authors fieldset
    const comboboxes = Array.from(authorsFs.querySelectorAll('input[role="combobox"]'));
    
    // Fill each combobox with corresponding author data
    for (let i = 0; i < Math.min(comboboxes.length, authors.length); i++) {
      const input = comboboxes[i];
      const author = authors[i];
      
      const last = author.lastName || '';
      const first = author.firstName || '';
      const display = last && first ? `${last}, ${first}` : (last || first);

      if (display && input) {
        input.focus();
        input.value = display;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.classList.remove('not-touched');
        await sleep(100);
      }
    }
  }
  
  /**
   * Shows modal to paste BibTeX
   */
  function showBibtexInputModal() {
    const modal = document.createElement('div');
    modal.className = 'bibtex-modal';
    modal.innerHTML = `
      <div class="bibtex-modal-content">
        <div class="bibtex-modal-header">
          <h3>Paste BibTeX entry</h3>
          <button class="bibtex-modal-close" title="Close">&times;</button>
        </div>
        <div class="bibtex-modal-body">
          <textarea 
            id="bibtex-input" 
            placeholder="Paste your BibTeX entry here..."
            rows="15"
          ></textarea>
        </div>
        <div class="bibtex-modal-footer">
          <button class="bibtex-btn bibtex-btn-secondary" id="bibtex-cancel">Cancel</button>
          <button class="bibtex-btn bibtex-btn-primary" id="bibtex-import">Import</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.bibtex-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#bibtex-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#bibtex-import').addEventListener('click', () => {
      const text = modal.querySelector('#bibtex-input').value;
      modal.remove();
      processBibtexInput(text);
    });
    
    // Close when clicking outside the modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Focus on the textarea
    setTimeout(() => {
      modal.querySelector('#bibtex-input').focus();
    }, 100);
  }
  
  /**
   * Shows a temporary message
   */
  function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `bibtex-message bibtex-message-${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      message.classList.add('bibtex-message-fade');
      setTimeout(() => message.remove(), 300);
    }, 5000);
  }
  
  /**
   * Adds the button to the form
   */
  function addButtonToForm() {
    if (document.querySelector('.bibtex-import-button') || document.querySelector('.doi-import-button')) {
      return; // Already exists
    }
    
    // Look for the button container at the end of the modal
    const buttonContainer = document.querySelector('.flex.gap-2.justify-end');
    
    if (buttonContainer) {
      const firstButton = buttonContainer.querySelector('button');
      
      // Add BibTeX button if enabled
      if (enabledFeatures.bibtex !== false) {
        const bibtexButton = createBibtexButton();
        if (firstButton) {
          buttonContainer.insertBefore(bibtexButton, firstButton);
        } else {
          buttonContainer.appendChild(bibtexButton);
        }
      }
      
      // Add DOI button if enabled
      if (enabledFeatures.doi !== false) {
        const doiButton = createDoiButton();
        if (firstButton) {
          buttonContainer.insertBefore(doiButton, firstButton);
        } else {
          buttonContainer.appendChild(doiButton);
        }
      }
      
      console.log('Specify7+: Import buttons added');
    }
  }
  
  /**
   * Observes DOM changes to detect when the form opens
   */
  function observeFormChanges() {
    const observer = new MutationObserver((mutations) => {
      if (isSpecifyReferenceForm()) {
        addButtonToForm();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Intercepts clicks on 3D model links (.stl, .obj, .gltf, .glb files)
   * and opens them in the custom 3D viewer instead of downloading
   */
  function intercept3DModelLinks() {
    // Only intercept if 3D viewer feature is enabled
    if (enabledFeatures.viewer3d === false) {
      console.log('Specify7+: 3D Viewer disabled, skipping link interception');
      return;
    }
    
    document.addEventListener('click', function(event) {
      const target = event.target.closest('a');
      
      if (!target || !target.href) return;
      
      const url = target.href;
      const lowerUrl = url.toLowerCase();
      
      // Check if it's a 3D model file
      const is3DModel = lowerUrl.endsWith('.stl') || 
                        lowerUrl.endsWith('.obj') || 
                        lowerUrl.endsWith('.gltf') || 
                        lowerUrl.endsWith('.glb');
      
      if (!is3DModel) return;
      
      // Prevent default download behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Extract filename from URL or download attribute, sanitize common server prefixes
      let filename = target.getAttribute('downloadname') || target.download || url.split('/').pop().split('?')[0];
      filename = decodeURIComponent(filename || 'model');

      // Remove common server-side wrappers like 'fileget' or long GUID prefixes
      // e.g. 'fileget?coll=...&filename=Acinonyx...stl' -> extract basename
      // If filename contains '=', take part after last '='
      if (filename.includes('fileget') && url.includes('filename=')) {
        try {
          const params = new URLSearchParams(url.split('?')[1] || '');
          const fn = params.get('filename') || params.get('downloadname');
          if (fn) filename = decodeURIComponent(fn);
        } catch (e) {
          // ignore and fallback
        }
      }

      // If still contains query params, strip them
      filename = filename.split('?')[0];
      // If it looks like a server token or UUID-only, keep last path segment
      filename = filename.split('/').pop();

      // Final fallback
      if (!filename) filename = 'model';

      const viewerUrl = chrome.runtime.getURL('src/viewer/viewer.html') +
                        '?url=' + encodeURIComponent(url) +
                        '&name=' + encodeURIComponent(filename);
      
      // Open in new tab
      window.open(viewerUrl, '_blank');

      console.log('Specify7+: 3D Model opened in viewer -', filename);
    }, true); // Use capture phase to catch the event early
  }

  /**
   * Detects if we are in a Specify 7 query results page
   */
  function isSpecifyQueryPage() {
    // Check if the URL matches the query pattern
    return window.location.pathname.includes('/specify/query/');
  }

  /**
   * Creates the "Select All" button for query results
   */
  function createSelectAllButton() {
    // Button style classes matching Specify 7 UI
    const buttonClasses = [
      'button', 'rounded', 'cursor-pointer', 'active:brightness-80', 'px-4', 'py-2',
      'disabled:bg-gray-200', 'disabled:dark:ring-neutral-500', 'disabled:ring-gray-400', 'disabled:text-gray-500',
      'dark:disabled:!bg-neutral-700', 'gap-2', 'inline-flex', 'items-center', 'capitalize', 'justify-center',
      'shadow-sm', '!py-1', '!px-2', 'hover:brightness-90', 'dark:hover:brightness-125',
      'bg-[color:var(--secondary-button-color)]', 'text-gray-800', 'dark:text-gray-100',
      'ring-1', 'ring-gray-400', 'dark:ring-0', 'disabled:ring-gray-400', 'disabled:dark:ring-neutral-500'
    ];

    const button = document.createElement('button');
    button.id = 'specify7plus-select-all-btn';
    button.type = 'button';
    button.textContent = 'Select All';
    button.classList.add(...buttonClasses);
    button.title = 'Select all records in the current query results';

    button.addEventListener('click', () => {
      // Attempt to find the nearest results container relative to the button
      // Prefer elements that act as the results table: [role="table"] or .grid-table
      function findResultsContainer(startEl) {
        let el = startEl;
        while (el) {
          try {
            const found = el.querySelector('[role="table"], .grid-table');
            if (found) return found;
          } catch (e) {
            // ignore read-only / cross-origin issues and continue
          }
          el = el.parentElement;
        }
        // Fallback: try to find a global results container in the document
        return document.querySelector('[role="table"], .grid-table');
      }

      const toolbar = button.closest('div.flex.items-center.items-stretch.gap-2');
      const resultsContainer = findResultsContainer(toolbar || button);

      if (!resultsContainer) {
        console.log('Specify7+: No results container found — Select All will not toggle any checkboxes');
        return;
      }

      // Select only enabled, visible checkboxes inside the results container
      const allCbs = Array.from(resultsContainer.querySelectorAll('input[type="checkbox"]:not([disabled])'));
      const visibleCbs = allCbs.filter(cb => {
        try {
          // offsetParent null often indicates display:none; getClientRects covers visibility in some shadowed cases
          return cb.offsetParent !== null || cb.getClientRects().length > 0;
        } catch (e) {
          return true; // if any error, keep the checkbox
        }
      });

      let selectedCount = 0;
      visibleCbs.forEach(cb => {
        if (!cb.checked) {
          // Simulate real click event so Specify recognizes the selection
          cb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          selectedCount++;
        }
      });

      console.log(`Specify7+: Selected ${selectedCount} records (scoped to results)`);
    });

    return button;
  }

  /**
   * Adds the "Select All" button to the query results toolbar
   */
  function addSelectAllButton() {
    // Check if button already exists
    if (document.getElementById('specify7plus-select-all-btn')) {
      return;
    }

    // Check if Select All feature is enabled
    if (enabledFeatures.selectAll === false) {
      console.log('Specify7+: Select All feature disabled');
      return;
    }

    // Find the button toolbar
    const buttonToolbar = document.querySelector('div.flex.items-center.items-stretch.gap-2');
    
    if (buttonToolbar) {
      const selectAllButton = createSelectAllButton();
      buttonToolbar.appendChild(selectAllButton);
      console.log('Specify7+: Select All button added to query results');
    }
  }

  /**
   * Observes for query results toolbar to appear
   */
  function observeQueryPage() {
    const observer = new MutationObserver(() => {
      if (isSpecifyQueryPage()) {
        addSelectAllButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize
  function init() {
    // Check if the form is already there
    if (isSpecifyReferenceForm()) {
      addButtonToForm();
    }
    
    // Observe changes
    observeFormChanges();
    
    // Intercept 3D model links
    intercept3DModelLinks();

    // Add Select All button to query pages
    if (isSpecifyQueryPage()) {
      addSelectAllButton();
      observeQueryPage();
    }
  }
  
  // Wait for the DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
