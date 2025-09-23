# 임베딩 데이터 저장 로직 (Embedding Data Storage)

## 개요
생성된 임베딩과 문서 메타데이터를 JSON 파일 기반 벡터 스토어에 저장하고 관리하는 시스템입니다.

## 구현 위치
- **파일**: `services/vectorStore.js`
- **주요 클래스**: `VectorStore`
- **저장 경로**: `data/vector_store.json`

## 데이터 구조

### 저장되는 문서 객체
```javascript
{
  id: "filename.md_chunk_0",           // 유니크 식별자
  filename: "filename.md",             // 원본 파일명
  chunkIndex: 0,                       // 청크 인덱스
  heading: "섹션 제목",                 // 섹션 헤딩
  content: "청크 내용...",              // 텍스트 내용
  embedding: [0.1234, -0.5678, ...],  // 임베딩 벡터
  metadata: {                          // 메타데이터
    filename: "filename.md",
    path: "/path/to/file.md",
    chunkIndex: 0,
    heading: "섹션 제목"
  }
}
```

## VectorStore 클래스 구현

### 생성자 및 초기화
```javascript
class VectorStore {
  constructor() {
    this.vectorStorePath = path.join(__dirname, '../data/vector_store.json');
    this.documents = [];
    this.loadVectorStore();
  }
}
```

### 1. `ensureDataDirectory()`
데이터 디렉터리 존재 확인 및 생성

```javascript
ensureDataDirectory() {
  const dataDir = path.dirname(this.vectorStorePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}
```

**기능**:
- data 디렉터리가 없으면 자동 생성
- 재귀적 디렉터리 생성 지원

### 2. `loadVectorStore()`
저장된 벡터 스토어 데이터 로드

```javascript
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
```

**특징**:
- 파일이 없으면 빈 배열로 초기화
- JSON 파싱 오류 시 안전하게 복구
- 로드된 문서 수 로깅

### 3. `saveVectorStore()`
벡터 스토어 데이터를 파일에 저장

```javascript
saveVectorStore() {
  try {
    this.ensureDataDirectory();
    fs.writeFileSync(this.vectorStorePath, JSON.stringify(this.documents, null, 2));
    console.log(`Saved ${this.documents.length} documents to vector store`);
  } catch (error) {
    console.error('Error saving vector store:', error);
  }
}
```

**특징**:
- JSON 형식으로 예쁘게 포맷 (들여쓰기 2칸)
- 저장된 문서 수 로깅
- 디렉터리 존재 확인 후 저장

## 문서 관리 메서드

### 1. `addDocument(document)`
단일 문서 추가 또는 업데이트

```javascript
addDocument(document) {
  const existingIndex = this.documents.findIndex(doc => doc.id === document.id);

  if (existingIndex !== -1) {
    this.documents[existingIndex] = document;
  } else {
    this.documents.push(document);
  }
}
```

**특징**:
- ID 기반 중복 확인
- 기존 문서는 업데이트, 새 문서는 추가
- 자동 저장하지 않음 (명시적 저장 필요)

### 2. `addDocuments(documents)`
여러 문서 배치 추가

```javascript
addDocuments(documents) {
  documents.forEach(doc => this.addDocument(doc));
  this.saveVectorStore();
}
```

**특징**:
- 배치 처리 후 한 번에 저장
- I/O 최적화

### 3. `removeDocument(documentId)`
ID로 문서 삭제

```javascript
removeDocument(documentId) {
  this.documents = this.documents.filter(doc => doc.id !== documentId);
  this.saveVectorStore();
}
```

### 4. `removeDocumentsByFilename(filename)`
파일명으로 관련 문서들 일괄 삭제

```javascript
removeDocumentsByFilename(filename) {
  this.documents = this.documents.filter(doc => doc.filename !== filename);
  this.saveVectorStore();
}
```

**사용 케이스**: 파일 업데이트 시 기존 청크들 삭제

## 조회 메서드

### 1. `getAllDocuments()`
모든 문서 반환

```javascript
getAllDocuments() {
  return this.documents;
}
```

### 2. `getDocumentById(id)`
ID로 특정 문서 조회

```javascript
getDocumentById(id) {
  return this.documents.find(doc => doc.id === id);
}
```

### 3. `getDocumentsByFilename(filename)`
파일명으로 관련 문서들 조회

```javascript
getDocumentsByFilename(filename) {
  return this.documents.filter(doc => doc.filename === filename);
}
```

### 4. `clear()`
모든 문서 삭제

```javascript
clear() {
  this.documents = [];
  this.saveVectorStore();
}
```

## 통계 정보

### `getStats()`
벡터 스토어 통계 정보 제공

```javascript
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
```

**반환 예시**:
```javascript
{
  totalDocuments: 15,
  fileStats: {
    "README.md": 3,
    "api_guide.md": 7,
    "tutorial.md": 5
  }
}
```

## 저장 파일 구조

### vector_store.json 예시
```json
[
  {
    "id": "README.md_chunk_0",
    "filename": "README.md",
    "chunkIndex": 0,
    "heading": "프로젝트 개요",
    "content": "이 프로젝트는 RAG 기반 챗봇입니다...",
    "embedding": [0.1234, -0.5678, 0.9012, ...],
    "metadata": {
      "filename": "README.md",
      "path": "/docs/README.md",
      "chunkIndex": 0,
      "heading": "프로젝트 개요"
    }
  },
  {
    "id": "README.md_chunk_1",
    "filename": "README.md",
    "chunkIndex": 1,
    "heading": "설치 방법",
    "content": "npm install을 실행하여...",
    "embedding": [0.5678, -0.1234, 0.3456, ...],
    "metadata": {
      "filename": "README.md",
      "path": "/docs/README.md",
      "chunkIndex": 1,
      "heading": "설치 방법"
    }
  }
]
```

## 초기화 프로세스

### StartupEmbeddingService 연동
```javascript
// services/startupEmbeddingService.js
async initializeEmbeddings() {
  const documents = this.documentService.processAllDocuments();

  for (const doc of documents) {
    const embedding = await this.embeddingService.generateEmbedding(doc.content);
    doc.embedding = embedding;
    this.vectorStore.addDocument(doc);  // VectorStore에 추가
  }

  this.vectorStore.saveVectorStore();   // 파일에 저장
}
```

## 히스토리 관리

### embedding_history.json
임베딩 초기화 이력 관리

```json
{
  "lastInitialized": "2024-01-15T10:30:00.000Z",
  "stats": {
    "totalDocuments": 15,
    "fileStats": {
      "README.md": 3,
      "api_guide.md": 7
    }
  }
}
```

**기능**:
- 24시간 이내 초기화 시 스킵
- 중복 초기화 방지
- 처리 시간 최적화

## 장점

### 1. 단순성
- JSON 기반으로 구조 이해 쉬움
- 별도 데이터베이스 불필요
- 파일 시스템 기반 저장

### 2. 이식성
- 파일 복사로 쉬운 백업/복원
- 버전 관리 시스템에 포함 가능
- 환경 간 이동 용이

### 3. 성능
- 메모리 기반 조회
- 빠른 검색 성능
- 단순한 I/O 구조

## 제한사항

### 1. 확장성
- 대용량 데이터 처리 한계
- 메모리 사용량 증가
- 동시성 제어 부족

### 2. 트랜잭션
- ACID 특성 미지원
- 파일 수준 잠금 없음
- 데이터 일관성 이슈 가능

## 향후 개선 방안

1. **데이터베이스 연동**: SQLite, PostgreSQL 등
2. **인덱싱**: 검색 성능 최적화
3. **압축**: 저장 공간 효율성
4. **백업**: 자동 백업 시스템