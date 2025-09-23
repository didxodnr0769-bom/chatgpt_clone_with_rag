import axios from "axios";

// Ollama API 기본 설정
const OLLAMA_BASE_URL =
  process.env.REACT_APP_OLLAMA_URL || "http://localhost:11434";

// Axios 인스턴스 생성
const ollamaApi = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 30000, // 30초 타임아웃
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 (로깅용)
ollamaApi.interceptors.request.use(
  (config) => {
    console.log("Ollama API 요청:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("Ollama API 요청 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
ollamaApi.interceptors.response.use(
  (response) => {
    console.log("Ollama API 응답:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error(
      "Ollama API 응답 오류:",
      error.response?.status,
      error.message
    );
    return Promise.reject(error);
  }
);

// Ollama API 함수들
export const ollamaApiService = {
  // 모델 목록 조회
  async listModels() {
    try {
      const response = await ollamaApi.get("/api/tags");
      return response.data;
    } catch (error) {
      throw new Error(`모델 목록 조회 실패: ${error.message}`);
    }
  },

  // 스트리밍 채팅 요청
  async chatCompletionStream(
    messages,
    model = "llama2",
    options = {},
    onChunk,
    abortController = null
  ) {
    try {
      const requestData = {
        model: model,
        messages: messages,
        stream: true,
        ...options,
      };

      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      };

      // AbortController가 제공된 경우 signal 추가
      if (abortController) {
        fetchOptions.signal = abortController.signal;
      }

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 스트림 응답을 처리하기 위한 reader와 decoder 설정
      // reader: 응답 본문을 청크 단위로 읽기 위한 ReadableStreamDefaultReader 객체
      // decoder: 바이너리 데이터를 텍스트로 변환하기 위한 TextDecoder 객체
      while (true) {
        // AbortController가 abort된 경우 확인
        if (abortController && abortController.signal.aborted) {
          reader.cancel();
          throw new Error("요청이 사용자에 의해 취소되었습니다.");
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          const { message, done } = JSON.parse(line);
          if (message) {
            if (done) {
              return;
            }

            try {
              if (onChunk && message) {
                onChunk(message.content);
              }
            } catch (parseError) {
              console.warn("스트림 데이터 파싱 오류:", parseError);
            }
          }
        }
      }
    } catch (error) {
      // AbortError인 경우 별도 처리
      if (error.name === "AbortError" || error.message.includes("취소")) {
        throw new Error("스트리밍이 정지되었습니다.");
      }
      throw new Error(`스트리밍 채팅 요청 실패: ${error.message}`);
    }
  },
};

// API 관련 유틸리티 함수들
export const ollamaUtils = {
  // 기본 채팅 옵션
  getDefaultChatOptions() {
    return {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
      num_predict: 2048,
    };
  },

  // 에러 메시지 처리
  handleError(error) {
    if (error.response) {
      // 서버 응답이 있는 경우
      const status = error.response.status;
      const message = error.response.data?.error || error.message;

      switch (status) {
        case 404:
          return "요청한 리소스를 찾을 수 없습니다.";
        case 500:
          return "서버 내부 오류가 발생했습니다.";
        default:
          return `오류 (${status}): ${message}`;
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없는 경우
      return "Ollama 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.";
    } else {
      // 요청 설정 중 오류
      return `요청 오류: ${error.message}`;
    }
  },
};

export default ollamaApiService;
