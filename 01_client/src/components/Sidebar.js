import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiTrash2,
  FiCpu,
  FiEdit3,
} from "react-icons/fi";
import { serviceStorage } from "../service/serviceStorage";
import SystemPromptModal from "./SystemPromptModal";
import "./Sidebar.css";

const Sidebar = ({
  isOpen,
  conversations,
  setConversations,
  toggleSidebar,
  onConversationSelect,
  selectedConversation,
  onNewChat,
  onConversationDelete,
  onSystemPromptsChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [systemPrompts, setSystemPrompts] = useState([]);
  const [showPromptModal, setShowPromptModal] = useState(false);

  // 컴포넌트 마운트 시 저장된 시스템 프롬프트 목록 로드
  useEffect(() => {
    const savedPrompts = serviceStorage.getSystemPrompts();
    setSystemPrompts(savedPrompts);
  }, []);

  // 대화 내용에서 키워드 검색 함수
  const searchInMessages = (messages, keyword) => {
    if (!messages || !Array.isArray(messages)) return false;

    return messages.some((message) => {
      if (message.text && typeof message.text === "string") {
        return message.text.toLowerCase().includes(keyword.toLowerCase());
      }
      return false;
    });
  };

  // 대화 내용 검색
  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm.trim()) return true;

    const keyword = searchTerm.toLowerCase();

    // conv가 객체인 경우
    if (typeof conv === "object" && conv.title) {
      // 제목에서 검색
      const titleMatch = conv.title.toLowerCase().includes(keyword);

      // 대화 내용에서 검색
      const contentMatch = searchInMessages(conv.messages, keyword);

      return titleMatch || contentMatch;
    }

    // 문자열인 경우 (기존 데이터 호환성)
    return conv.toLowerCase().includes(keyword);
  });

  const handleNewChat = () => {
    // 새 채팅 시작 시 선택된 대화를 해제하고 새로운 채팅 상태로 초기화
    if (onConversationSelect) {
      onConversationSelect(null);
    }

    // 새 채팅 시작을 위한 콜백 호출 (MainPage에서 처리)
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleConversationClick = (conversation) => {
    if (onConversationSelect) {
      onConversationSelect(conversation);
    }
  };

  // 검색 토글 함수
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm(""); // 검색창을 닫을 때 검색어 초기화
    }
  };

  // 검색 결과 하이라이트 함수
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // 대화 삭제 확인 다이얼로그 표시
  const handleDeleteClick = (e, conversation) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    setDeleteConfirm(conversation);
  };

  // 대화 삭제 확인
  const confirmDelete = () => {
    if (deleteConfirm && onConversationDelete) {
      onConversationDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // 대화 삭제 취소
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // 시스템 프롬프트 모달 열기
  const handleOpenPromptModal = () => {
    setShowPromptModal(true);
  };

  // 시스템 프롬프트 모달 닫기
  const handleClosePromptModal = () => {
    setShowPromptModal(false);
  };

  // 시스템 프롬프트 저장 후 콜백
  const handlePromptSave = (updatedPrompts) => {
    setSystemPrompts(updatedPrompts);
    if (onSystemPromptsChange) {
      onSystemPromptsChange(updatedPrompts);
    }
    console.log("시스템 프롬프트 저장 완료:", updatedPrompts);
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          {/* 닫기 버튼 */}
          <div className="sidebar-header">
            <button className="close-button" onClick={toggleSidebar}>
              <FiX size={20} />
            </button>
          </div>

          {/* 상단 버튼들 */}
          <div className="sidebar-top">
            <button className="sidebar-button new-chat" onClick={handleNewChat}>
              <FiPlus size={16} />
              <span>새 채팅</span>
            </button>

            <button className="sidebar-button" onClick={toggleSearch}>
              <FiSearch size={16} />
              <span>채팅 검색</span>
            </button>
          </div>

          {/* 메모리 영역 */}
          <div className="memory-section">
            <div className="memory-header">
              <div className="memory-title">
                <FiCpu size={16} />
                <span>메모리</span>
              </div>
              <button
                className="edit-prompt-button"
                onClick={handleOpenPromptModal}
                title="시스템 프롬프트 설정"
              >
                <FiEdit3 size={14} />
              </button>
            </div>

            <div className="prompt-display">
              {systemPrompts.length > 0 ? (
                <div className="prompts-list">
                  {systemPrompts.map((prompt) => (
                    <div key={prompt.id} className="prompt-item">
                      <div className="prompt-title-text">{prompt.title}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="prompt-placeholder">
                  설정된 프롬프트가 없습니다.
                  <br />
                  <span>편집 버튼을 눌러 설정해보세요.</span>
                </p>
              )}
            </div>
          </div>

          {/* 대화 목록 */}
          <div className="conversations-list">
            {/* 대화 검색 영역 */}
            {showSearch && (
              <div className="search-container">
                <input
                  type="text"
                  placeholder="제목 또는 내용으로 대화 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="conversation-search"
                />
                {searchTerm && (
                  <div className="search-info">
                    {filteredConversations.length}개의 대화에서 "{searchTerm}"
                    검색됨
                  </div>
                )}
              </div>
            )}

            <div className="conversations">
              {filteredConversations.length === 0 && searchTerm ? (
                <div className="no-results">
                  <p>검색 결과가 없습니다.</p>
                  <p>다른 키워드로 검색해보세요.</p>
                </div>
              ) : (
                filteredConversations.map((conversation, index) => {
                  // conversation이 객체인 경우 title 속성을 사용, 문자열인 경우 그대로 사용
                  const displayTitle =
                    typeof conversation === "object" && conversation.title
                      ? conversation.title
                      : conversation;
                  const conversationId =
                    typeof conversation === "object" && conversation.id
                      ? conversation.id
                      : index;

                  const isSelected =
                    selectedConversation &&
                    (selectedConversation.id === conversationId ||
                      (typeof selectedConversation === "object" &&
                        selectedConversation.id === conversation.id));

                  return (
                    <div
                      key={conversationId}
                      className={`conversation-item ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <span className="conversation-title">
                        {highlightSearchTerm(displayTitle, searchTerm)}
                      </span>
                      <button
                        className="delete-button"
                        onClick={(e) => handleDeleteClick(e, conversation)}
                        title="대화 삭제"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 - Portal을 사용하여 body에 직접 렌더링 */}
      {deleteConfirm &&
        createPortal(
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <h3>대화 삭제</h3>
              <p>
                정말로 이 대화를 삭제하시겠습니까?
                <br />
                <strong>
                  {typeof deleteConfirm === "object" && deleteConfirm.title
                    ? deleteConfirm.title
                    : deleteConfirm}
                </strong>
              </p>
              <div className="delete-modal-buttons">
                <button className="cancel-button" onClick={cancelDelete}>
                  취소
                </button>
                <button className="confirm-button" onClick={confirmDelete}>
                  삭제
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 시스템 프롬프트 모달 */}
      <SystemPromptModal
        isOpen={showPromptModal}
        onClose={handleClosePromptModal}
        onSave={handlePromptSave}
      />
    </>
  );
};

export default Sidebar;
