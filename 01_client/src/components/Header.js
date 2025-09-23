import React from "react";
import { FiMenu, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import "./Header.css";

const Header = ({
  selectedModel,
  setSelectedModel,
  toggleSidebar,
  isModelDropdownOpen,
  setIsModelDropdownOpen,
  availableModels,
}) => {
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={toggleSidebar}>
          <FiMenu size={20} />
        </button>
      </div>

      <div className="header-center">
        <div className="model-selector">
          <button
            className="model-button"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          >
            <span>{selectedModel}</span>
            <FiChevronDown size={16} />
          </button>

          {isModelDropdownOpen && (
            <div className="model-dropdown">
              {availableModels.map((model) => (
                <button
                  key={model.name}
                  className={`model-option ${
                    selectedModel === model.name ? "selected" : ""
                  }`}
                  onClick={() => handleModelSelect(model.name)}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
