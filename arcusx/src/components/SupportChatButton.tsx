import React, { useState } from 'react';
import { FaRobot, FaTimes } from 'react-icons/fa';
import SupportBot from './SupportBot';
import '../css/SupportChatButton.css';

const SupportChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <button 
        className={`support-chat-button ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label="Abrir chat de soporte"
        type="button"
      >
        <div className="support-chat-button-icon-wrapper">
          {isOpen ? (
            <FaTimes className="support-chat-button-icon close-icon" />
          ) : (
            <FaRobot className="support-chat-button-icon robot-icon" />
          )}
        </div>
      </button>

      {/* Modal/Overlay del chat */}
      {isOpen && (
        <div className="support-chat-overlay" onClick={closeChat}>
          <div className="support-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="support-chat-modal-header">
              <button 
                className="support-chat-close-button"
                onClick={closeChat}
                aria-label="Cerrar chat"
                type="button"
              >
                <span className="support-chat-close-icon">
                  <FaTimes />
                </span>
              </button>
            </div>
            <div className="support-chat-modal-content">
              <SupportBot />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatButton;
