import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

export default function ChatWidget() {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: lang === 'hi' 
        ? 'नमस्ते! मैं GRAM AI हूँ। मैं खेती, मंडी के भाव या ट्रांसपोर्ट से जुड़ी आपकी कैसे मदद कर सकता हूँ?'
        : 'Hello! I am GRAM AI. How can I help you with farming, mandi prices, or transport today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const payloadHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch('http://localhost:8080/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage, lang, history: payloadHistory }),
      });

      const data = await response.json();
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        throw new Error('No answer received');
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: lang === 'hi' ? 'क्षमा करें, मुझे सर्वर से जुड़ने में समस्या आ रही है।' : 'Sorry, I am having trouble connecting to the server.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        className="chat-fab" 
        onClick={toggleChat}
        aria-label="Open AI Assistant"
      >
        <Bot size={28} color="white" />
      </button>

      {/* Chat Window */}
      <div className={`chat-window ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="chat-avatar-bg">
              <Bot size={20} color="var(--green)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>GRAM AI</h3>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                {lang === 'hi' ? 'कृषि विशेषज्ञ' : 'Agriculture Expert'}
              </span>
            </div>
          </div>
          <button onClick={toggleChat} className="chat-close">
            <X size={20} color="white" />
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-msg-avatar">
                  <Bot size={14} color="white" />
                </div>
              )}
              <div className={`chat-msg-bubble ${msg.role}`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-msg-row assistant">
              <div className="chat-msg-avatar">
                <Bot size={14} color="white" />
              </div>
              <div className="chat-msg-bubble assistant typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-area">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === 'hi' ? 'अपना प्रश्न पूछें...' : 'Ask your question...'}
            disabled={isLoading}
          />
          <button type="submit" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
