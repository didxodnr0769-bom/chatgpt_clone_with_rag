import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import Header from "@/components/Header";
import { modelService } from "@/service/serviceAPI";
import { serviceStorage } from "@/service/serviceStorage";

function MainPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [conversations, setConversations] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [systemPrompts, setSystemPrompts] = useState([]);

  // 모델 목록 로드
  useEffect(() => {
    loadAvailableModels();
    loadChatHistory();
    loadSystemPrompts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const result = await modelService.getAvailableModels();
      if (result.success) {
        setAvailableModels(result.models);
        // 기본 모델이 없으면 첫 번째 모델을 선택
        if (
          result.models.length > 0 &&
          !result.models.find((m) => m.name === selectedModel)
        ) {
          setSelectedModel(result.models[0].name);
        }
      } else {
        console.error("모델 목록 로드 실패:", result.error);
      }
    } catch (error) {
      console.error("모델 목록 로드 오류:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadChatHistory = () => {
    const chatHistoryMap = serviceStorage.getChatHistoryList();
    console.log("chatHistoryMap", chatHistoryMap);

    // 대화 목록을 최신순으로 정렬 (updatedAt 기준)
    const sortedConversations = Object.values(chatHistoryMap).sort((a, b) => {
      // 객체인 경우 updatedAt 또는 createdAt 기준으로 정렬
      if (typeof a === "object" && typeof b === "object") {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA; // 최신순 (내림차순)
      }
      // 문자열인 경우는 그대로 (기존 데이터 호환성)
      return 0;
    });

    setConversations(sortedConversations);
  };

  const loadSystemPrompts = () => {
    try {
      const prompts = serviceStorage.getSystemPrompts();
      setSystemPrompts(prompts);
    } catch (error) {
      console.error("시스템 프롬프트 로드 오류:", error);
    }
  };

  // 새로운 대화가 저장되었을 때 호출되는 콜백 함수
  const handleConversationSaved = (newConversation) => {
    console.log("새로운 대화가 저장되었습니다:", newConversation);
    // 신규 대화 선택
    setSelectedConversation(newConversation);
    // 사이드바 대화 목록 새로고침
    loadChatHistory();
  };

  // 대화 선택 핸들러
  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    console.log("선택된 대화:", conversation);
  };

  // 현재 대화 해제 핸들러
  const handleClearCurrentConversation = () => {
    setSelectedConversation(null);
    console.log("현재 대화가 해제되었습니다.");
  };

  // 새 채팅 시작 핸들러
  const handleNewChat = () => {
    setSelectedConversation(null);
    console.log("새 채팅이 시작되었습니다.");
  };

  // 대화 삭제 핸들러
  const handleConversationDelete = (conversation) => {
    try {
      // 대화 ID 추출
      const conversationId =
        typeof conversation === "object" && conversation.id
          ? conversation.id
          : null;

      if (conversationId) {
        // 저장소에서 대화 삭제
        serviceStorage.deleteChatHistory(conversationId);

        // 현재 선택된 대화가 삭제된 대화와 같다면 선택 해제
        if (
          selectedConversation &&
          selectedConversation.id === conversationId
        ) {
          setSelectedConversation(null);
        }

        // 대화 목록 새로고침
        loadChatHistory();

        console.log("대화가 삭제되었습니다:", conversation);
      } else {
        console.error("대화 ID를 찾을 수 없습니다:", conversation);
      }
    } catch (error) {
      console.error("대화 삭제 중 오류 발생:", error);
    }
  };

  // 시스템 프롬프트 변경 핸들러
  const handleSystemPromptsChange = (updatedPrompts) => {
    setSystemPrompts(updatedPrompts);
    console.log("시스템 프롬프트가 업데이트되었습니다:", updatedPrompts);
  };

  return (
    <div className="App">
      {/* 헤더 */}
      <Header
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        toggleSidebar={toggleSidebar}
        isModelDropdownOpen={isModelDropdownOpen}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        availableModels={availableModels}
        setAvailableModels={setAvailableModels}
        isLoadingModels={isLoadingModels}
      />
      <div className="main-container">
        {/* 사이드바 */}
        <Sidebar
          isOpen={sidebarOpen}
          conversations={conversations}
          setConversations={setConversations}
          toggleSidebar={toggleSidebar}
          onConversationSelect={handleConversationSelect}
          selectedConversation={selectedConversation}
          onNewChat={handleNewChat}
          onConversationDelete={handleConversationDelete}
          onSystemPromptsChange={handleSystemPromptsChange}
        />
        {/* 채팅 영역 */}
        <div
          className={`chat-area-wrapper ${sidebarOpen ? "sidebar-open" : ""}`}
        >
          <ChatArea
            selectedModel={selectedModel}
            onConversationSaved={handleConversationSaved}
            selectedConversation={selectedConversation}
            onClearCurrentConversation={handleClearCurrentConversation}
            systemPrompts={systemPrompts}
          />
        </div>
      </div>
    </div>
  );
}

export default MainPage;
