import React, { useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";

const CodeBlock = ({ children, className, ...props }) => {
  const [copied, setCopied] = useState(false);

  // 언어 추출
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  // 코드 내용 추출
  const code = React.Children.toArray(children).join("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      // 2초 후 복사 상태 리셋
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("복사 실패:", err);
      // fallback: 텍스트 선택
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error("Fallback 복사도 실패:", fallbackErr);
      }
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        {language && <span className="code-language">{language}</span>}
        <button
          onClick={handleCopy}
          className={`copy-button ${copied ? "copied" : ""}`}
          title={copied ? "복사됨!" : "코드 복사"}
        >
          {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
          <span className="copy-text">{copied ? "복사됨" : "복사"}</span>
        </button>
      </div>
      <pre className="code-block">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
