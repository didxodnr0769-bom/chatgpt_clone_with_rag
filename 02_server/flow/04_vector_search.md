# 벡터 스토어 데이터 검색 방법 (Vector Store Data Retrieval)

## 개요
사용자 쿼리와 가장 유사한 문서를 벡터 스토어에서 검색하는 시스템입니다. 코사인 유사도 기반으로 관련 문서를 찾아 랭킹합니다.

## 구현 위치
- **주요 파일**: `services/ragService.js`, `services/embeddingService.js`
- **주요 클래스**: `RAGService`, `EmbeddingService`

## 검색 프로세스 플로우

```
사용자 쿼리
    ↓
쿼리 임베딩 생성
    ↓
벡터 스토어에서 모든 문서 로드
    ↓
코사인 유사도 계산
    ↓
유사도 기준 정렬
    ↓
상위 K개 문서 반환
```

## RAGService 검색 구현

### 1. `search(query, topK = 5)`
메인 검색 메서드

```javascript
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
```

**특징**:
- 벡터 스토어가 비어있으면 자동 초기화
- 오류 시 빈 배열 반환으로 안정성 확보
- 유연한 topK 설정

### 2. EmbeddingService의 `findSimilarDocuments()`
유사도 검색 핵심 로직

```javascript
async findSimilarDocuments(queryText, documents, topK = 5) {
  try {
    // 1. 쿼리 임베딩 생성
    const queryEmbedding = await this.generateEmbedding(queryText);

    // 2. 모든 문서와 유사도 계산
    const similarities = documents.map(doc => ({
      ...doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // 3. 유사도 기준 내림차순 정렬
    similarities.sort((a, b) => b.similarity - a.similarity);

    // 4. 상위 topK개 반환
    return similarities.slice(0, topK);
  } catch (error) {
    console.error('Error finding similar documents:', error);
    return [];
  }
}
```

## 코사인 유사도 계산

### 수학적 원리
```
코사인 유사도 = (A · B) / (||A|| × ||B||)

여기서:
- A · B = 내적 (dot product)
- ||A|| = A의 크기 (magnitude)
- ||B|| = B의 크기 (magnitude)
```

### 구현 코드
```javascript
cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // 내적과 각 벡터의 제곱합 계산
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // 벡터 크기 계산
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // 0으로 나누기 방지
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
```

## 검색 결과 구조

### 반환되는 문서 객체
```javascript
{
  id: "filename.md_chunk_0",
  filename: "filename.md",
  chunkIndex: 0,
  heading: "섹션 제목",
  content: "청크 내용...",
  embedding: [0.1234, -0.5678, ...],
  similarity: 0.8567,                // 추가된 유사도 점수
  metadata: {
    filename: "filename.md",
    path: "/path/to/file.md",
    chunkIndex: 0,
    heading: "섹션 제목"
  }
}
```

### 검색 결과 예시
```javascript
[
  {
    id: "api_guide.md_chunk_3",
    filename: "api_guide.md",
    heading: "사용자 인증",
    content: "사용자 인증은 JWT 토큰을 사용합니다...",
    similarity: 0.9234,
    metadata: { ... }
  },
  {
    id: "tutorial.md_chunk_1",
    filename: "tutorial.md",
    heading: "로그인 구현",
    content: "로그인 기능을 구현하려면...",
    similarity: 0.8567,
    metadata: { ... }
  },
  {
    id: "faq.md_chunk_5",
    filename: "faq.md",
    heading: "보안 관련",
    content: "보안을 위해 HTTPS를 사용하세요...",
    similarity: 0.7891,
    metadata: { ... }
  }
]
```

## API 엔드포인트

### 1. `/api/rag/search`
순수 검색 기능

```javascript
router.post("/rag/search", async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await ragService.search(query, topK);
    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search documents" });
  }
});
```

**요청 예시**:
```bash
curl -X POST http://localhost:4000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "사용자 인증 방법",
    "topK": 3
  }'
```

**응답 예시**:
```json
{
  "results": [
    {
      "id": "api_guide.md_chunk_3",
      "filename": "api_guide.md",
      "heading": "사용자 인증",
      "content": "사용자 인증은 JWT 토큰을 사용합니다...",
      "similarity": 0.9234
    }
  ]
}
```

### 2. `/api/rag/stats`
벡터 스토어 통계 정보

```javascript
router.get("/rag/stats", async (req, res) => {
  try {
    const stats = ragService.getStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});
```

**응답 예시**:
```json
{
  "totalDocuments": 15,
  "fileStats": {
    "README.md": 3,
    "api_guide.md": 7,
    "tutorial.md": 5
  }
}
```

## 검색 최적화 전략

### 1. 임계값 필터링
유사도가 특정 값 이하인 문서 제외

```javascript
const threshold = 0.3;
const filteredResults = similarities.filter(doc => doc.similarity > threshold);
```

### 2. 다양성 보장
같은 파일에서 너무 많은 결과 방지

```javascript
const diverseResults = [];
const fileCount = {};

for (const doc of similarities) {
  const filename = doc.filename;
  if (!fileCount[filename]) fileCount[filename] = 0;

  if (fileCount[filename] < 2) {  // 파일당 최대 2개
    diverseResults.push(doc);
    fileCount[filename]++;
  }

  if (diverseResults.length >= topK) break;
}
```

### 3. 캐싱
자주 검색되는 쿼리 결과 캐싱

```javascript
class SearchCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(query) {
    return this.cache.get(query);
  }

  set(query, results) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(query, results);
  }
}
```

## 성능 분석

### 시간 복잡도
- **O(n × d)**: n개 문서, d차원 벡터
- **O(n log n)**: 정렬
- **전체**: O(n × d + n log n)

### 공간 복잡도
- **O(n × d)**: 모든 문서의 임베딩 저장
- **O(n)**: 유사도 계산 결과

### 실제 성능 (예시)
- 1000개 문서 (768차원): ~50ms
- 10000개 문서 (768차원): ~500ms

## 검색 품질 개선

### 1. 쿼리 전처리
```javascript
function preprocessQuery(query) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣]/g, ' ')  // 특수문자 제거
    .replace(/\s+/g, ' ');          // 중복 공백 제거
}
```

### 2. 컨텍스트 확장
관련 청크의 앞뒤 청크도 포함

```javascript
function expandContext(selectedChunks, allDocuments) {
  const expanded = new Set();

  selectedChunks.forEach(chunk => {
    const { filename, chunkIndex } = chunk;

    // 현재 청크
    expanded.add(chunk);

    // 이전 청크
    const prevChunk = allDocuments.find(doc =>
      doc.filename === filename && doc.chunkIndex === chunkIndex - 1
    );
    if (prevChunk) expanded.add(prevChunk);

    // 다음 청크
    const nextChunk = allDocuments.find(doc =>
      doc.filename === filename && doc.chunkIndex === chunkIndex + 1
    );
    if (nextChunk) expanded.add(nextChunk);
  });

  return Array.from(expanded);
}
```

### 3. 가중치 적용
파일 타입, 섹션별 가중치

```javascript
function applyWeights(doc) {
  let weight = 1.0;

  // 파일 타입별 가중치
  if (doc.filename.includes('README')) weight *= 1.2;
  if (doc.filename.includes('guide')) weight *= 1.1;

  // 섹션별 가중치
  if (doc.heading && doc.heading.includes('API')) weight *= 1.15;

  return doc.similarity * weight;
}
```

## 오류 처리

### 1. 빈 벡터 스토어
```javascript
if (documents.length === 0) {
  console.log('No documents in vector store, initializing...');
  await this.initializeDocuments();
  return this.vectorStore.getAllDocuments().slice(0, topK);
}
```

### 2. 임베딩 생성 실패
```javascript
try {
  const queryEmbedding = await this.generateEmbedding(queryText);
} catch (error) {
  console.error('Failed to generate query embedding:', error);
  return [];
}
```

### 3. 유사도 계산 오류
```javascript
similarity: this.cosineSimilarity(queryEmbedding, doc.embedding) || 0
```

이러한 검색 시스템을 통해 사용자 쿼리와 가장 관련성 높은 문서를 효율적으로 찾을 수 있습니다.