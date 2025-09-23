const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.embeddingModel = 'nomic-embed-text:latest';
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.embeddingModel,
        prompt: text
      });

      return response.data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateEmbeddings(texts) {
    const embeddings = [];

    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Error generating embedding for text: ${text.substring(0, 50)}...`);
        embeddings.push(null);
      }
    }

    return embeddings;
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async findSimilarDocuments(queryText, documents, topK = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);

      const similarities = documents.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities.slice(0, topK);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      return [];
    }
  }
}

module.exports = EmbeddingService;