// System Prompt 설정 파일
// 이 상수만 변경하면 바로 Ollama에 적용됩니다.

// 여러 System Prompt 상수들 (필요에 따라 선택해서 사용)
export const SYSTEM_PROMPTS = {
  // 기본 AI 어시스턴트
  DEFAULT:
    "당신은 도움이 되는 AI 어시스턴트입니다. 항상 정확하고 유용한 답변을 제공하세요.",

  LANGUAGE:
    "당신은 반드시 한국어로 대답합니다. 상대가 다른 언어로 요청할 경우에만 다른 언어로 대답합니다.",
};

// 현재 사용할 System Prompt (이 값만 변경하면 됩니다)
export const CURRENT_SYSTEM_PROMPT = [
  SYSTEM_PROMPTS.DEFAULT,
  SYSTEM_PROMPTS.LANGUAGE,
];
