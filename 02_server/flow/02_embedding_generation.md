# 임베딩 생성 방식 (Embedding Generation)

## 개요
텍스트 청크를 벡터 임베딩으로 변환하는 프로세스입니다. Ollama의 nomic-embed-text 모델을 사용하여 텍스트를 고차원 벡터로 변환합니다.

## 구현 위치
- **파일**: `services/embeddingService.js`
- **주요 클래스**: `EmbeddingService`

## 임베딩 모델 설정

```javascript
class EmbeddingService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.embeddingModel = 'nomic-embed-text:latest';
  }
}
```

## 주요 메서드

### 1. `generateEmbedding(text)`
단일 텍스트에 대한 임베딩을 생성합니다.

```javascript
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
```

**입력**: 텍스트 문자열
**출력**: 숫자 배열 (벡터)
**API 엔드포인트**: `POST /api/embeddings`

### 2. `generateEmbeddings(texts)`
여러 텍스트에 대한 임베딩을 배치로 생성합니다.

```javascript
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
```

**특징**:
- 순차적 처리로 안정성 확보
- 개별 실패 시 null 반환하여 전체 프로세스 중단 방지
- 오류 로깅으로 디버깅 지원

### 3. `cosineSimilarity(vecA, vecB)`
두 벡터 간의 코사인 유사도를 계산합니다.

```javascript
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
```

**수식**:
```
코사인 유사도 = (A · B) / (||A|| × ||B||)
```

**결과 범위**: -1 ~ 1 (1에 가까울수록 유사)

### 4. `findSimilarDocuments(queryText, documents, topK = 5)`
쿼리 텍스트와 가장 유사한 문서들을 찾습니다.

```javascript
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
```

**프로세스**:
1. 쿼리 텍스트를 임베딩으로 변환
2. 모든 문서와 코사인 유사도 계산
3. 유사도 기준으로 내림차순 정렬
4. 상위 topK개 문서 반환

## 임베딩 API 요청 형식

### Ollama Embeddings API
```http
POST http://localhost:11434/api/embeddings
Content-Type: application/json

{
  "model": "nomic-embed-text:latest",
  "prompt": "임베딩할 텍스트 내용"
}
```

### 응답 형식
```json
{
  "embedding": [0.1234, -0.5678, 0.9012, ...]
}
```

## 임베딩 모델 특성

### nomic-embed-text:latest
- **차원수**: 768차원 (일반적)
- **언어**: 다국어 지원 (한국어 포함)
- **최대 토큰**: 8192 토큰
- **특징**: 검색 최적화된 임베딩 모델

## 사용 예제

### 1. 단일 텍스트 임베딩
```javascript
const embeddingService = new EmbeddingService();
const text = "안녕하세요. 이것은 테스트 텍스트입니다.";
const embedding = await embeddingService.generateEmbedding(text);
console.log(`Embedding dimensions: ${embedding.length}`);
```

### 2. 문서 검색
```javascript
const query = "파이썬 설치 방법";
const documents = vectorStore.getAllDocuments();
const results = await embeddingService.findSimilarDocuments(query, documents, 3);

results.forEach((doc, index) => {
  console.log(`${index + 1}. ${doc.filename} (유사도: ${doc.similarity.toFixed(3)})`);
});
```

## 임베딩 프로세스 플로우

```
텍스트 입력
    ↓
Ollama API 호출
    ↓
nomic-embed-text 모델 처리
    ↓
벡터 임베딩 반환 (768차원)
    ↓
벡터 스토어에 저장
```

## 에러 처리

### 1. API 연결 실패
```javascript
// Ollama 서버가 실행되지 않은 경우
Error: connect ECONNREFUSED 127.0.0.1:11434
```

### 2. 모델 미설치
```javascript
// nomic-embed-text 모델이 설치되지 않은 경우
Error: model not found
```

### 3. 텍스트 길이 초과
```javascript
// 최대 토큰 길이 초과 시
Error: prompt too long
```

## 성능 최적화

### 1. 배치 처리
- 개별 요청보다는 배치 처리 사용
- 네트워크 오버헤드 감소

### 2. 캐싱
- 동일한 텍스트에 대한 중복 임베딩 방지
- 메모리 기반 캐시 구현 가능

### 3. 비동기 처리
- Promise.all 사용한 병렬 처리
- 처리 시간 단축

## 임베딩 품질 요소

1. **텍스트 정규화**: 불필요한 공백, 특수문자 제거
2. **적절한 청크 크기**: 너무 짧거나 긴 텍스트 방지
3. **컨텍스트 보존**: 의미있는 단위로 분할