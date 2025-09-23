import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX, FiSave, FiEdit3, FiPlus, FiTrash2, FiEdit } from "react-icons/fi";
import { serviceStorage } from "../service/serviceStorage";
import "./SystemPromptModal.css";

const SystemPromptModal = ({ isOpen, onClose, onSave }) => {
  const [prompts, setPrompts] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // 모달이 열릴 때 저장된 데이터 로드
  useEffect(() => {
    if (isOpen) {
      const savedPrompts = serviceStorage.getSystemPrompts();
      setPrompts(savedPrompts);
      setEditingPrompt(null);
      setTitle("");
      setContent("");
      setIsEditing(false);
    }
  }, [isOpen]);

  // 저장 버튼 클릭
  const handleSave = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const promptData = {
      title: title.trim(),
      content: content.trim(),
    };

    try {
      let savedPrompt;
      if (editingPrompt) {
        // 수정 모드
        savedPrompt = serviceStorage.updateSystemPrompt(
          editingPrompt.id,
          promptData
        );
      } else {
        // 새로 추가 모드
        savedPrompt = serviceStorage.addSystemPrompt(promptData);
      }

      if (savedPrompt) {
        const updatedPrompts = serviceStorage.getSystemPrompts();
        setPrompts(updatedPrompts);
        onSave(updatedPrompts);
        handleCancel();
      }
    } catch (error) {
      console.error("시스템 프롬프트 저장 실패:", error);
      alert("시스템 프롬프트 저장에 실패했습니다.");
    }
  };

  // 취소 버튼 클릭
  const handleCancel = () => {
    setEditingPrompt(null);
    setTitle("");
    setContent("");
    setIsEditing(false);
  };

  // 새 프롬프트 추가 시작
  const handleAddNew = () => {
    setEditingPrompt(null);
    setTitle("");
    setContent("");
    setIsEditing(true);
  };

  // 기존 프롬프트 편집 시작
  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt);
    setTitle(prompt.title);
    setContent(prompt.content);
    setIsEditing(true);
  };

  // 프롬프트 삭제
  const handleDeletePrompt = (id) => {
    if (window.confirm("정말로 이 프롬프트를 삭제하시겠습니까?")) {
      try {
        serviceStorage.deleteSystemPrompt(id);
        const updatedPrompts = serviceStorage.getSystemPrompts();
        setPrompts(updatedPrompts);
        onSave(updatedPrompts);
      } catch (error) {
        console.error("프롬프트 삭제 실패:", error);
        alert("프롬프트 삭제에 실패했습니다.");
      }
    }
  };

  // 모달 배경 클릭으로 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="system-prompt-modal">
        <div className="modal-header">
          <h2>시스템 프롬프트 관리</h2>
          <button className="close-button" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-content">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-header">
                <h3>{editingPrompt ? "프롬프트 수정" : "새 프롬프트 추가"}</h3>
              </div>

              <div className="form-group">
                <label htmlFor="prompt-title">제목</label>
                <input
                  id="prompt-title"
                  type="text"
                  className="title-input"
                  placeholder="프롬프트 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                />
                <span className="char-count">{title.length}/50</span>
              </div>

              <div className="form-group">
                <label htmlFor="prompt-content">내용</label>
                <textarea
                  id="prompt-content"
                  className="content-textarea"
                  placeholder="시스템 프롬프트 내용을 입력하세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                />
                <span className="char-count">{content.length}자</span>
              </div>

              <div className="form-buttons">
                <button className="cancel-button" onClick={handleCancel}>
                  취소
                </button>
                <button className="save-button" onClick={handleSave}>
                  <FiSave size={16} />
                  {editingPrompt ? "수정" : "추가"}
                </button>
              </div>
            </div>
          ) : (
            <div className="view-mode">
              <div className="prompts-header">
                <h3>프롬프트 목록 ({prompts.length}개)</h3>
                <button className="add-button" onClick={handleAddNew}>
                  <FiPlus size={16} />새 프롬프트 추가
                </button>
              </div>

              {prompts.length === 0 ? (
                <div className="no-prompts">
                  <p>등록된 프롬프트가 없습니다.</p>
                  <p>새 프롬프트를 추가해보세요.</p>
                </div>
              ) : (
                <div className="prompts-list">
                  {prompts.map((prompt) => (
                    <div key={prompt.id} className="prompt-item">
                      <div className="prompt-info">
                        <div className="prompt-title">{prompt.title}</div>
                        <div className="prompt-content-preview">
                          {prompt.content.length > 100
                            ? `${prompt.content.substring(0, 100)}...`
                            : prompt.content}
                        </div>
                        <div className="prompt-meta">
                          <span>
                            생성:{" "}
                            {new Date(prompt.createdAt).toLocaleDateString(
                              "ko-KR"
                            )}
                          </span>
                          {prompt.updatedAt !== prompt.createdAt && (
                            <span>
                              수정:{" "}
                              {new Date(prompt.updatedAt).toLocaleDateString(
                                "ko-KR"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="prompt-actions">
                        <button
                          className="edit-action-button"
                          onClick={() => handleEditPrompt(prompt)}
                          title="편집"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          className="delete-action-button"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          title="삭제"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="view-buttons">
                <button className="close-view-button" onClick={onClose}>
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SystemPromptModal;
