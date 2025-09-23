# 전체 데이터 저장 & Chat 응답 흐름 (Complete Data Storage & Chat Response Flow)

## 개요
서버 시작부터 사용자 채팅 응답까지의 완전한 RAG 시스템 워크플로우를 설명합니다.

## 전체 아키텍처

```
서버 시작
    ↓
문서 처리 & 임베딩 초기화
    ↓
벡터 스토어 저장
    ↓
사용자 채팅 요청
    ↓
RAG 검색 & 컨텍스트 생성
    ↓
Ollama Chat API 호출
    ↓
응답 반환
```

## 1. 서버 초기화 플로우

### 1.1 서버 시작 (`index.js`)
```javascript
async function startServer() {
  try {
    const embeddingService = new StartupEmbeddingService();
    await embeddingService.initializeEmbeddings();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize embeddings:', error);
    console.log('Starting server without embeddings...');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}
```

**특징**:
- 임베딩 초기화 실패 시에도 서버 시작
- 안정성 우선 설계

### 1.2 임베딩 초기화 (`startupEmbeddingService.js`)
```javascript
async initializeEmbeddings() {
  console.log('🚀 Starting embedding initialization...');

  // 히스토리 확인 (24시간 이내 초기화 시 스킵)
  if (await this.hasEmbeddingHistory()) {
    console.log('✅ Embedding history found - skipping initialization');
    return this.getEmbeddingStats();
  }

  // 문서 처리
  const documents = this.documentService.processAllDocuments();

  // 임베딩 생성 및 벡터 스토어 저장
  for (const doc of documents) {
    const embedding = await this.embeddingService.generateEmbedding(doc.content);
    doc.embedding = embedding;
    this.vectorStore.addDocument(doc);
  }

  // 저장 및 히스토리 기록
  this.vectorStore.saveVectorStore();
  await this.saveEmbeddingHistory();

  return this.vectorStore.getStats();
}
```

## 2. 데이터 처리 파이프라인

### 2.1 문서 → 청크 변환
```
docs/
├── README.md
├── api_guide.md
└── tutorial.md
    ↓
DocumentService.processAllDocuments()
    ↓
[
  { id: "README.md_chunk_0", content: "...", heading: "..." },
  { id: "README.md_chunk_1", content: "...", heading: "..." },
  { id: "api_guide.md_chunk_0", content: "...", heading: "..." },
  ...
]
```

### 2.2 청크 → 임베딩 변환
```
청크 텍스트
    ↓
EmbeddingService.generateEmbedding()
    ↓
Ollama API (/api/embeddings)
    ↓
768차원 벡터 [0.1234, -0.5678, ...]
```

### 2.3 벡터 스토어 저장
```
임베딩이 포함된 문서 객체
    ↓
VectorStore.addDocument()
    ↓
메모리 배열에 추가
    ↓
VectorStore.saveVectorStore()
    ↓
data/vector_store.json 파일 저장
```

## 3. 채팅 요청 처리 플로우

### 3.1 채팅 API 엔드포인트 (`routes/ollama.js`)
```javascript
router.post("/chat", async (req, res) => {
  const { model = "qwen-ko-Q2:latest", messages, stream = false } = req.body;

  // 마지막 사용자 메시지 추출
  const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();

  // RAG 서비스를 통해 컨텍스트와 함께 메시지 생성
  const ragResponse = await ragService.generateContextualResponse(
    lastUserMessage.content,
    model
  );

  // Ollama Chat API 호출
  const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
    model: model,
    messages: ragResponse.messages,
    stream: false,
  });

  res.json({
    ...response.data,
    relevantDocs: ragResponse.relevantDocs,
  });
});
```

### 3.2 RAG 서비스 컨텍스트 생성 (`ragService.js`)
```javascript
async generateContextualResponse(query, model = 'qwen-ko-Q2:latest') {
  // 1. 유사한 문서 검색 (상위 3개)
  const relevantDocs = await this.search(query, 3);

  // 2. 컨텍스트 문자열 생성
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

  // 3. 시스템 메시지와 사용자 메시지 구성
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
}
```

## 4. 상세 처리 단계

### 4.1 사용자 질문: "사용자 인증 어떻게 하나요?"

**Step 1: 쿼리 임베딩 생성**
```javascript
// EmbeddingService.generateEmbedding()
POST http://localhost:11434/api/embeddings
{
  "model": "nomic-embed-text:latest",
  "prompt": "사용자 인증 어떻게 하나요?"
}
// → [0.2345, -0.6789, 0.1234, ...]
```

**Step 2: 유사도 검색**
```javascript
// 모든 문서와 코사인 유사도 계산
documents.map(doc => ({
  ...doc,
  similarity: cosineSimilarity(queryEmbedding, doc.embedding)
}));

// 결과 (상위 3개)
[
  { filename: "api_guide.md", heading: "JWT 인증", similarity: 0.8967 },
  { filename: "security.md", heading: "보안 가이드", similarity: 0.7834 },
  { filename: "tutorial.md", heading: "로그인 구현", similarity: 0.7123 }
]
```

**Step 3: 컨텍스트 생성**
```javascript
const context = `
다음은 관련된 문서 내용입니다:

문서 1 (api_guide.md):
제목: JWT 인증
내용: JWT 토큰을 사용하여 사용자 인증을 구현합니다. 토큰은 헤더에 Bearer 형식으로 전달하며...

문서 2 (security.md):
제목: 보안 가이드
내용: 안전한 인증을 위해 HTTPS를 사용하고, 토큰 만료 시간을 적절히 설정해야 합니다...

문서 3 (tutorial.md):
제목: 로그인 구현
내용: 사용자 로그인 API는 POST /api/auth/login 엔드포인트를 사용합니다...

위 문서를 참고하여 질문에 답변해주세요.

질문: 사용자 인증 어떻게 하나요?
`;
```

**Step 4: Ollama Chat API 호출**
```javascript
POST http://localhost:11434/api/chat
{
  "model": "qwen-ko-Q2:latest",
  "messages": [
    {
      "role": "system",
      "content": "당신은 도움이 되는 AI 어시스턴트입니다..."
    },
    {
      "role": "user",
      "content": context
    }
  ],
  "stream": false
}
```

**Step 5: 응답 반환**
```json
{
  "message": {
    "role": "assistant",
    "content": "사용자 인증은 JWT 토큰을 사용하여 구현할 수 있습니다. 제공된 문서에 따르면:\n\n1. JWT 토큰 기반 인증:\n   - API 요청 시 헤더에 Bearer 토큰 형식으로 전달\n   - 토큰 만료 시간 적절히 설정\n\n2. 로그인 구현:\n   - POST /api/auth/login 엔드포인트 사용\n   - 사용자 credentials 검증 후 토큰 발급\n\n3. 보안 고려사항:\n   - HTTPS 사용 필수\n   - 토큰 저장 시 보안 저장소 활용\n\n이러한 방식으로 안전하고 표준적인 사용자 인증을 구현할 수 있습니다."
  },
  "relevantDocs": [
    {
      "filename": "api_guide.md",
      "heading": "JWT 인증",
      "similarity": 0.8967,
      "content": "JWT 토큰을 사용하여 사용자 인증을 구현합니다..."
    }
  ]
}
```

## 5. 데이터 흐름 다이어그램

```
[사용자]
    ↓ HTTP POST /api/chat
[Express Router]
    ↓ 메시지 추출
[RAGService]
    ↓ 검색 요청
[EmbeddingService] ← → [Ollama Embeddings API]
    ↓ 쿼리 임베딩
[VectorStore] → 유사도 계산 → 상위 문서 반환
    ↓ 컨텍스트 생성
[RAGService]
    ↓ 메시지 구성
[Ollama Chat API]
    ↓ AI 응답 생성
[Express Router]
    ↓ 응답 + 관련 문서
[사용자]
```

## 6. 파일 시스템 구조

```
02_server/
├── data/
│   ├── vector_store.json          # 벡터 스토어 데이터
│   └── embedding_history.json     # 초기화 히스토리
├── docs/                          # 원본 문서
│   ├── README.md
│   ├── api_guide.md
│   └── tutorial.md
├── services/
│   ├── documentService.js         # 문서 처리
│   ├── embeddingService.js        # 임베딩 생성
│   ├── vectorStore.js            # 벡터 저장
│   ├── ragService.js             # RAG 서비스
│   └── startupEmbeddingService.js # 초기화 서비스
└── routes/
    └── ollama.js                 # API 라우터
```

## 7. 성능 최적화 포인트

### 7.1 초기화 시간 단축
- 임베딩 히스토리 체크 (24시간 캐시)
- 배치 처리로 API 호출 최소화

### 7.2 검색 성능 향상
- 메모리 기반 벡터 스토어
- 코사인 유사도 계산 최적화

### 7.3 응답 시간 개선
- 비스트리밍 응답 우선 지원
- 관련 문서 수 제한 (상위 3개)

## 8. 에러 핸들링 전략

### 8.1 서버 레벨
- 임베딩 초기화 실패 시에도 서버 시작
- 각 단계별 try-catch 처리

### 8.2 RAG 레벨
- 벡터 스토어 비어있을 시 자동 초기화
- 검색 실패 시 빈 컨텍스트로 처리

### 8.3 API 레벨
- 요청 파라미터 검증
- 상세한 에러 메시지 반환

이러한 전체 흐름을 통해 사용자는 문서 기반의 정확하고 컨텍스트가 풍부한 AI 응답을 받을 수 있습니다.