import crypto from "crypto";

export const hashChatId = (chatId) => {
  return crypto.createHash("sha256").update(chatId).digest("hex");
};
