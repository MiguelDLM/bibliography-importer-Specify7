/**
 * BibTeX to JavaScript objects parser
 */

class BibtexParser {
  /**
   * Parses a BibTeX entry and converts it to an object
   * @param {string} bibtexString - String in BibTeX format
   * @returns {Array<Object>} Array of objects with parsed data
   */
  static parse(bibtexString) {
    const entries = [];
    
    // Regex to find BibTeX entries
    // Format: @type{key, field1 = {value1}, field2 = {value2}, ...}
    const entryRegex = /@(\w+)\s*{\s*([^,]+)\s*,\s*([\s\S]*?)\n\s*}/gi;
    
    let match;
    while ((match = entryRegex.exec(bibtexString)) !== null) {
      const [, entryType, citationKey, fieldsString] = match;
      
      const entry = {
        type: entryType.toLowerCase(),
        citationKey: citationKey.trim(),
        fields: {}
      };
      
      // Parse the fields
      const fieldRegex = /(\w+)\s*=\s*(?:{([^{}]*(?:{[^{}]*}[^{}]*)*)}|"([^"]*)"|(\w+))\s*,?/gi;
      
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsString)) !== null) {
        const fieldName = fieldMatch[1].toLowerCase();
        // The value can be in braces {}, quotes "", or be a number
        const fieldValue = fieldMatch[2] || fieldMatch[3] || fieldMatch[4];
        
        if (fieldValue) {
          entry.fields[fieldName] = this.cleanValue(fieldValue);
        }
      }
      
      entries.push(entry);
    }
    
    return entries;
  }
  
  /**
   * Cleans BibTeX values (removes basic LaTeX commands, etc.)
   * @param {string} value - Value to clean
   * @returns {string} Clean value
   */
  static cleanValue(value) {
    return value
      .trim()
      // Remove common LaTeX commands
      .replace(/\\textbf{([^}]*)}/g, '$1')
      .replace(/\\textit{([^}]*)}/g, '$1')
      .replace(/\\emph{([^}]*)}/g, '$1')
      .replace(/\\'{([^}]*)}/g, '$1')
      .replace(/\\`{([^}]*)}/g, '$1')
      .replace(/\\~{([^}]*)}/g, '$1')
      .replace(/\\_/g, '_')
      .replace(/\\&/g, '&')
      // Remove extra braces
      .replace(/[{}]/g, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Converts BibTeX entry to Specify 7 format
   * @param {Object} bibtexEntry - Parsed BibTeX entry
   * @returns {Object} Object with fields mapped to Specify 7
   */
  static toSpecifyFormat(bibtexEntry) {
    const fields = bibtexEntry.fields;
    const type = bibtexEntry.type;
    
    // Mapping of BibTeX types to Specify types
    const typeMap = {
      'book': 0,              // Book
      'inbook': 5,            // Section in Book
      'incollection': 5,      // Section in Book
      'article': 2,           // Paper
      'techreport': 3,        // Technical Report
      'phdthesis': 4,         // Thesis
      'mastersthesis': 4,     // Thesis
      'misc': 1,              // Electronic Media
      'online': 1,            // Electronic Media
      'electronic': 1         // Electronic Media
    };
    
    const specifyData = {
      type: typeMap[type] !== undefined ? typeMap[type] : 0,
      title: fields.title || '',
      publisher: fields.publisher || '',
      placeOfPublication: fields.address || fields.location || '',
      workDate: fields.year || fields.date || '',
      volume: fields.volume || '',
      pages: fields.pages || '',
      journal: fields.journal || fields.booktitle || '',
      libraryNumber: fields.number || fields.isbn || fields.doi || '',
      authors: this.parseAuthors(fields.author || fields.editor || '')
    };
    
    return specifyData;
  }
  
  /**
   * Parses the BibTeX authors field
   * @param {string} authorString - String with authors in BibTeX format
   * @returns {Array<Object>} Array of author objects
   */
  static parseAuthors(authorString) {
    if (!authorString) return [];
    
    // Authors in BibTeX can be separated by 'and'
    const authors = authorString.split(/\s+and\s+/i);
    
    return authors.map((author, index) => {
      author = author.trim();
      
      // Format: "LastName, FirstName" or "FirstName LastName"
      let lastName = '';
      let firstName = '';
      
      if (author.includes(',')) {
        // Format: "LastName, FirstName"
        const parts = author.split(',').map(p => p.trim());
        lastName = parts[0];
        firstName = parts[1] || '';
      } else {
        // Format: "FirstName LastName" (we assume the last is the surname)
        const parts = author.split(/\s+/);
        if (parts.length > 1) {
          lastName = parts.pop();
          firstName = parts.join(' ');
        } else {
          lastName = author;
        }
      }
      
      return {
        orderNumber: index,
        lastName: lastName,
        firstName: firstName
      };
    });
  }
}

// Make globally available
window.BibtexParser = BibtexParser;
