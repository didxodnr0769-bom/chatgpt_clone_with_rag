const DocumentService = require('./documentService');
const EmbeddingService = require('./embeddingService');
const VectorStore = require('./vectorStore');

class RAGService {
  constructor() {
    this.documentService = new DocumentService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
  }

  async initializeDocuments() {
    try {
      console.log('Initializing documents...');
      const documents = this.documentService.processAllDocuments();

      console.log(`Processing ${documents.length} document chunks...`);

      for (const doc of documents) {
        console.log(`Generating embedding for: ${doc.id}`);
        try {
          const embedding = await this.embeddingService.generateEmbedding(doc.content);
          doc.embedding = embedding;
          this.vectorStore.addDocument(doc);
        } catch (error) {
          console.error(`Failed to process document ${doc.id}:`, error.message);
        }
      }

      this.vectorStore.saveVectorStore();
      console.log('Document initialization complete');

      return this.vectorStore.getStats();
    } catch (error) {
      console.error('Error initializing documents:', error);
      throw error;
    }
  }

  async refreshDocuments() {
    console.log('Refreshing document store...');
    this.vectorStore.clear();
    return await this.initializeDocuments();
  }

  async search(query, topK = 5) {
    try {
      const documents = this.vectorStore.getAllDocuments();

      if (documents.length === 0) {
        console.log('No documents in vector store, initializing...');
        await this.initializeDocuments();
        return this.vectorStore.getAllDocuments().slice(0, topK);
      }

      const results = await this.embeddingService.findSimilarDocuments(
        query,
        documents,
        topK
      );

      return results;
    } catch (error) {
      console.error('Error during search:', error);
      return [];
    }
  }

  async generateContextualResponse(query, model = 'qwen-ko-Q2:latest') {
    try {
      const relevantDocs = await this.search(query, 3);

      let context = '';
      if (relevantDocs.length > 0) {
        context = '다음은 관련된 문서 내용입니다:\n\n';
        relevantDocs.forEach((doc, index) => {
          context += `문서 ${index + 1} (${doc.filename}):\n`;
          if (doc.heading) {
            context += `제목: ${doc.heading}\n`;
          }
          context += `내용: ${doc.content}\n\n`;
        });
        context += '위 문서를 참고하여 질문에 답변해주세요.\n\n';
      }

      const messages = [
        {
          role: 'system',
          content: '당신은 도움이 되는 AI 어시스턴트입니다. 제공된 문서 내용을 바탕으로 정확하고 도움이 되는 답변을 제공해주세요.'
        },
        {
          role: 'user',
          content: context + `질문: ${query}`
        }
      ];

      return {
        messages,
        relevantDocs: relevantDocs.map(doc => ({
          filename: doc.filename,
          heading: doc.heading,
          similarity: doc.similarity,
          content: doc.content.substring(0, 200) + '...'
        }))
      };
    } catch (error) {
      console.error('Error generating contextual response:', error);
      throw error;
    }
  }

  getStats() {
    return this.vectorStore.getStats();
  }
}

module.exports = RAGService;