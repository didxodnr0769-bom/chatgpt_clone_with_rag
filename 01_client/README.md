# Local LLM을 활용한 Chat GPT Clone 코딩

## 개요

Local LLM을 활용한 Chat GPT Clone 코딩입니다.  
인터넷이 되지 않는 상황에서 GPT와 유사한 대화형 웹 서비스를 구현합니다.

## 목표

- Local LLM을 활용하여 Chat GPT와 유사한 대화형 웹 서비스 구현
- 클라우드 의존도를 줄이고 오프라인 상태에서도 활용 가능
- 기본적인 대화 기억 및 모델 선택 기능 제공

## 기능

- 실시간 채팅 인터페이스(메시지 리스트 + 입력창)
- Ollama API 호출 결과를 Stream 형태로 출력
- LocalStorage를 사용하여 이전 대화 기록 저장/불러오기
- 대화 검색 기능
- 드롭다운을 통한 모델 선택 기능
- 응답 코드블럭 복사 및 텍스트 클립보드 복사 기능
- MD 형식 메시지 출력 기능

## 기술 스택

- Frontend: React
- API 연동: Axios
- LLM Backend(Local): Ollama (http://localhost:11434/api/)
- 저장소: LocalStorage

## 프로젝트 구조

```bash
08_chat_gpt_clone/
├── public/
├── src/
│   ├── components/ # 컴포넌트
│   ├── pages/ # 페이지 컴포넌트
│   ├── lib/
│   │    ├── lib/encryption/ # 암호화
│   │    ├── lib/axios/ # Axios 모듈 설정
│   │    ├── lib/storage/ # LocalStorage
│   ├── service/ # 서비스
```

## 실행

1. Ollama 서버 실행
2. 프로젝트 의존성 설치 및 실행
   ```bash
   npm install
   npm start
   ```
3. 브라우저 접속
   ```bash
   http://localhost:3000
   ```

## 사용법

1. 상단 헤더의 모델을 선택합니다.
   - 모델 목록은 Ollama 서버에 등록된 모델 목록을 활용합니다.
2. 채팅 입력
   - 채팅 입력창에 메시지를 입력하고 전송 버튼을 클릭하여 채팅을 전송합니다.
3. 채팅 전송 후 응답 메시지가 실시간으로 출력됩니다.
4. 채팅 검색
   - 좌측 패널의 검색창에 검색어를 입력하여 채팅을 검색할 수 있습니다.
   - 타이틀과 메시지를 포함하여 검색할 수 있습니다.
5. 채팅 복사
   - LLM이 응답한 메시지 상단에 복사 버튼을 클릭하여 클립보드에 복사 할 수 있습니다.
6. 채팅 코드블럭 복사
   - 채팅 코드블럭 상단의 복사 버튼을 클릭하여 채팅 코드블럭을 복사합니다.
