// 암호화/복호화 관련 유틸리티 함수들
export const cryptoUtils = {
  // Base64 인코딩
  encode(data) {
    try {
      return btoa(
        encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
        })
      );
    } catch (error) {
      console.error("인코딩 오류:", error);
      return data;
    }
  },

  // Base64 디코딩
  decode(data) {
    try {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(data), (c) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    } catch (error) {
      console.error("디코딩 오류:", error);
      return data;
    }
  },
};
