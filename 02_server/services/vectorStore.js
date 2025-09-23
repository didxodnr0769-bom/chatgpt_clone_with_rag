const fs = require('fs');
const path = require('path');

class VectorStore {
  constructor() {
    this.vectorStorePath = path.join(__dirname, '../data/vector_store.json');
    this.documents = [];
    this.loadVectorStore();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.vectorStorePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadVectorStore() {
    try {
      this.ensureDataDirectory();
      if (fs.existsSync(this.vectorStorePath)) {
        const data = fs.readFileSync(this.vectorStorePath, 'utf-8');
        this.documents = JSON.parse(data);
        console.log(`Loaded ${this.documents.length} documents from vector store`);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
      this.documents = [];
    }
  }

  saveVectorStore() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(this.vectorStorePath, JSON.stringify(this.documents, null, 2));
      console.log(`Saved ${this.documents.length} documents to vector store`);
    } catch (error) {
      console.error('Error saving vector store:', error);
    }
  }

  addDocument(document) {
    const existingIndex = this.documents.findIndex(doc => doc.id === document.id);

    if (existingIndex !== -1) {
      this.documents[existingIndex] = document;
    } else {
      this.documents.push(document);
    }
  }

  addDocuments(documents) {
    documents.forEach(doc => this.addDocument(doc));
    this.saveVectorStore();
  }

  removeDocument(documentId) {
    this.documents = this.documents.filter(doc => doc.id !== documentId);
    this.saveVectorStore();
  }

  removeDocumentsByFilename(filename) {
    this.documents = this.documents.filter(doc => doc.filename !== filename);
    this.saveVectorStore();
  }

  getAllDocuments() {
    return this.documents;
  }

  getDocumentById(id) {
    return this.documents.find(doc => doc.id === id);
  }

  getDocumentsByFilename(filename) {
    return this.documents.filter(doc => doc.filename === filename);
  }

  search(query, limit = 10) {
    return this.documents.slice(0, limit);
  }

  clear() {
    this.documents = [];
    this.saveVectorStore();
  }

  getStats() {
    const stats = {
      totalDocuments: this.documents.length,
      fileStats: {}
    };

    this.documents.forEach(doc => {
      const filename = doc.filename || 'unknown';
      if (!stats.fileStats[filename]) {
        stats.fileStats[filename] = 0;
      }
      stats.fileStats[filename]++;
    });

    return stats;
  }
}

module.exports = VectorStore;