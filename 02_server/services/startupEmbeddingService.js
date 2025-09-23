const fs = require('fs');
const path = require('path');
const DocumentService = require('./documentService');
const EmbeddingService = require('./embeddingService');
const VectorStore = require('./vectorStore');

class StartupEmbeddingService {
  constructor() {
    this.documentService = new DocumentService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.historyFilePath = path.join(__dirname, '../data/embedding_history.json');
  }

  async initializeEmbeddings() {
    try {
      console.log('🚀 Starting embedding initialization...');

      // 히스토리 확인
      if (await this.hasEmbeddingHistory()) {
        console.log('✅ Embedding history found - skipping initialization');
        return this.getEmbeddingStats();
      }

      console.log('📁 Processing documents for embedding...');
      const documents = this.documentService.processAllDocuments();

      if (documents.length === 0) {
        console.log('⚠️  No documents found to process');
        return { totalDocuments: 0, processedDocuments: 0 };
      }

      console.log(`📊 Found ${documents.length} document chunks to process`);

      let processedCount = 0;
      const totalCount = documents.length;

      for (const doc of documents) {
        try {
          console.log(`🔄 Processing [${processedCount + 1}/${totalCount}]: ${doc.id}`);
          console.log(`   📄 File: ${doc.filename}`);
          if (doc.heading) {
            console.log(`   📖 Section: ${doc.heading}`);
          }

          const embedding = await this.embeddingService.generateEmbedding(doc.content);
          doc.embedding = embedding;
          this.vectorStore.addDocument(doc);

          processedCount++;
          const progress = Math.round((processedCount / totalCount) * 100);
          console.log(`   ✅ Completed (${progress}%)`);

        } catch (error) {
          console.error(`   ❌ Failed to process document ${doc.id}:`, error.message);
        }
      }

      // 벡터 스토어 저장
      console.log('💾 Saving vector store...');
      this.vectorStore.saveVectorStore();

      // 히스토리 저장
      await this.saveEmbeddingHistory();

      const stats = this.vectorStore.getStats();
      console.log('🎉 Embedding initialization completed!');
      console.log(`📈 Stats: ${stats.totalDocuments} documents, ${stats.totalEmbeddings} embeddings`);

      return stats;

    } catch (error) {
      console.error('❌ Error during embedding initialization:', error);
      throw error;
    }
  }

  async hasEmbeddingHistory() {
    try {
      if (!fs.existsSync(this.historyFilePath)) {
        return false;
      }

      const historyData = JSON.parse(fs.readFileSync(this.historyFilePath, 'utf8'));
      const lastInitialized = new Date(historyData.lastInitialized);
      const now = new Date();

      // 24시간 이내에 초기화했다면 스킵
      const hoursDiff = (now - lastInitialized) / (1000 * 60 * 60);
      return hoursDiff < 24;

    } catch (error) {
      console.log('📝 No valid embedding history found');
      return false;
    }
  }

  async saveEmbeddingHistory() {
    try {
      const dataDir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const historyData = {
        lastInitialized: new Date().toISOString(),
        stats: this.vectorStore.getStats()
      };

      fs.writeFileSync(this.historyFilePath, JSON.stringify(historyData, null, 2));
      console.log('📝 Embedding history saved');

    } catch (error) {
      console.error('❌ Failed to save embedding history:', error);
    }
  }

  getEmbeddingStats() {
    return this.vectorStore.getStats();
  }

  // 강제 재초기화 메서드
  async forceReinitialize() {
    console.log('🔄 Force reinitializing embeddings...');

    // 히스토리 삭제
    if (fs.existsSync(this.historyFilePath)) {
      fs.unlinkSync(this.historyFilePath);
    }

    // 벡터 스토어 초기화
    this.vectorStore.clear();

    return await this.initializeEmbeddings();
  }
}

module.exports = StartupEmbeddingService;