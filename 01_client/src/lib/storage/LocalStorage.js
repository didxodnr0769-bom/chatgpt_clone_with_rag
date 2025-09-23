import { cryptoUtils } from "@/lib/encryption/CryptoUtils";

// Local Storage 관련 유틸리티 함수들
export const localStorageUtils = {
  // 데이터 저장 (JSON 직렬화 + Base64 인코딩)
  setItem(key, value) {
    try {
      const jsonString = JSON.stringify(value);
      const encodedData = cryptoUtils.encode(jsonString);
      localStorage.setItem(key, encodedData);
    } catch (error) {
      console.error("데이터 저장 오류:", error);
      // 인코딩에 실패하면 원래 방식으로 저장
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // 데이터 조회 (Base64 디코딩 + JSON 파싱)
  getItem(key) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      const decodedData = cryptoUtils.decode(value);
      return JSON.parse(decodedData);
    } catch (error) {
      console.error("데이터 조회 오류:", error);
      // 디코딩에 실패하면 원래 방식으로 시도
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (fallbackError) {
        console.error("데이터 조회 재시도 오류:", fallbackError);
        return null;
      }
    }
  },
  // 데이터 삭제
  removeItem(key) {
    localStorage.removeItem(key);
  },
};
