# RAG 서버 구동 로직 문서

## 개요

이 폴더는 02_server의 RAG (Retrieval-Augmented Generation) 시스템 구동 로직을 상세히 문서화한 자료들을 포함합니다.

## 문서 구성

### 📄 [01_chunk_separation.md](./01_chunk_separation.md)

**청크 분리 방식 및 코드**

- 마크다운 문서를 의미있는 청크로 분할하는 프로세스
- DocumentService 클래스의 구현 세부사항
- 헤딩 기반 및 크기 기반 분리 전략
- 생성되는 청크 구조와 메타데이터

### 🔗 [02_embedding_generation.md](./02_embedding_generation.md)

**임베딩 생성 방식 및 코드**

- Ollama의 nomic-embed-text 모델을 사용한 임베딩 생성
- EmbeddingService 클래스의 핵심 메서드들
- 코사인 유사도 계산 알고리즘
- API 요청 형식과 응답 구조

### 💾 [03_embedding_storage.md](./03_embedding_storage.md)

**임베딩 데이터 저장 로직 및 코드**

- JSON 파일 기반 벡터 스토어 구현
- VectorStore 클래스의 CRUD 操作
- 데이터 구조와 파일 시스템 레이아웃
- 히스토리 관리 및 초기화 최적화

### 🔍 [04_vector_search.md](./04_vector_search.md)

**벡터 스토어 데이터 검색 방법 및 코드**

- 사용자 쿼리와 문서 간 유사도 검색
- RAGService와 EmbeddingService의 검색 로직
- 검색 결과 랭킹 및 필터링
- API 엔드포인트와 성능 최적화

### 🌐 [05_complete_flow.md](./05_complete_flow.md)

**전체 데이터 저장 & Chat 응답 흐름**

- 서버 시작부터 사용자 응답까지의 완전한 워크플로우
- 각 컴포넌트 간의 상호작용
- 실제 사용 예시와 데이터 흐름
- 에러 핸들링 및 성능 최적화 전략

## 시스템 아키텍처

```
문서 처리 파이프라인:
docs/*.md → DocumentService → 청크 분할 → EmbeddingService → 벡터 생성 → VectorStore → JSON 저장

검색 및 응답 파이프라인:
사용자 쿼리 → 임베딩 생성 → 유사도 검색 → 컨텍스트 구성 → Ollama Chat → AI 응답
```

## 주요 기술 스택

- **Node.js**: 서버 런타임
- **Express**: 웹 프레임워크
- **Ollama**: 로컬 LLM 및 임베딩 모델
- **nomic-embed-text**: 임베딩 모델
- **JSON**: 벡터 스토어 저장 형식

## API 엔드포인트

### 채팅 API

- `POST /api/chat` - RAG 기능이 통합된 채팅

### 개발 도구

- `GET /api/models` - 사용 가능한 Ollama 모델 목록

## 데이터 플로우

### 초기화 (서버 시작 시)

1. **문서 읽기**: `docs/` 폴더의 마크다운 파일 스캔
2. **청크 분할**: 각 문서를 1000자 단위로 의미있는 청크로 분할
3. **임베딩 생성**: 각 청크를 768차원 벡터로 변환
4. **저장**: `data/vector_store.json`에 임베딩과 메타데이터 저장
5. **히스토리**: `data/embedding_history.json`에 초기화 이력 기록

### 실행 시 (사용자 요청)

1. **쿼리 수신**: 사용자의 채팅 메시지
2. **쿼리 임베딩**: 사용자 질문을 벡터로 변환
3. **유사도 검색**: 코사인 유사도로 관련 문서 찾기
4. **컨텍스트 구성**: 상위 3개 문서로 컨텍스트 생성
5. **AI 호출**: Ollama Chat API로 응답 생성
6. **결과 반환**: AI 응답 + 참조 문서 정보

## 성능 특성

### 초기화 시간

- 문서 수에 비례 (문서당 ~1-2초)
- 24시간 캐시로 중복 초기화 방지

### 검색 성능

- 1000개 문서 기준 ~50ms
- 메모리 기반으로 빠른 응답

### 확장성

- 소규모~중간 규모 문서에 최적화
- 대용량 데이터는 전용 벡터 DB 권장

## 개발자 가이드

### 새 문서 추가

1. `docs/` 폴더에 `.md` 파일 추가
2. 서버 재시작 또는 강제 재초기화 API 호출

### 임베딩 모델 변경

- `embeddingService.js`의 `embeddingModel` 수정
- 벡터 스토어 초기화 필요

### 청크 크기 조정

- `documentService.js`의 `maxChunkSize` 파라미터 수정

## 문제 해결

### 일반적인 이슈

1. **Ollama 연결 실패**: Ollama 서비스 실행 확인
2. **모델 없음**: `ollama pull nomic-embed-text` 실행
3. **임베딩 느림**: 문서 수 확인, 배치 처리 고려
4. **검색 결과 없음**: 벡터 스토어 초기화 상태 확인

### 로그 확인

- 서버 시작 시 임베딩 초기화 로그
- API 요청별 처리 시간 로그
- 에러 발생 시 상세 스택 트레이스

이 문서들을 통해 RAG 시스템의 전체적인 이해와 세부 구현을 파악할 수 있습니다.
