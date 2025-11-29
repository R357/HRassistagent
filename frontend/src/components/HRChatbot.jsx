import { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import axios from 'axios';
import { MessageCircle } from "lucide-react";
import { Bot } from "lucide-react";
import { RefreshCcw } from "lucide-react";
import { Loader2, Play } from "lucide-react";
import { User } from "lucide-react";

const API_URL = 'http://localhost:5000/api';

export default function HRChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello!  I\'m your AI HR Assistant. I can help you with:\n\n• Leave policies\n• Salary details\n• Benefits information\n• Work from home policies\n• And much more!\n\nHow can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await axios.post(`${API_URL}/chat`, {
        message: userInput,
        conversationHistory
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response?.status === 429) {
        errorMessage = ' Too many requests. Please wait 10 seconds and try again.';
      } else if (error.response?.status === 503) {
        errorMessage = 'AI model is loading. Please wait 20 seconds and try again.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Make sure backend is running.';
      }
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello!  I\'m your AI HR Assistant. I can help you with:\n\n• Leave policies\n• Salary details\n• Benefits information\n• Work from home policies\n• And much more!\n\nHow can I assist you today?'
      }
    ]);
  };

  const suggestions = [
    "How many casual leaves?",
    "Salary structure?",
    "Work from home policy?",
    "Holiday list?"
  ];

  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-500 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center text-3xl animate-pulse hover:animate-none"
        aria-label="Toggle HR Chat"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="relative">
  <MessageCircle className="w-6 h-6 text-white" />

  <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>
</span>

        )}
      </button>

      {/* Draggable chat window */}
      {isOpen && (
        <Draggable handle=".drag-handle" bounds="body">
          <div className="fixed bottom-24 right-6 w-[450px] h-[500px] bg-white rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="drag-handle bg-gradient-to-r from-blue-600 via-blue-800 to-blue-500 text-white p-5 rounded-t-3xl cursor-move ">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-8 h-8 text-black" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-400 rounded-full border-2 border-white"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">HR Assistant</h3>
                    <p className="text-xs text-blue-100 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Online • Always here to help
                    </p>
                  </div>
                </div>
                <button
  onClick={clearChat}
  className="text-white hover:bg-white/20 rounded-full p-2.5 transition-all duration-200 hover:rotate-180"
  title="Clear chat"
>
  <RefreshCcw className="w-8 h-8 text-current" />

</button>

              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50 to-white custom-scrollbar ">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm mr-2 flex-shrink-0 shadow-md">
                      <Bot className="w-5 h-5 text-white" />
                    </div>

                  )}
                  <div
                    className={`max-w-[75%] p-2 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-xs mt-2 block ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm ml-2 flex-shrink-0 shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>

                  )}
                </div>
              ))}
              
              {/* Loading animation */}
              {loading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm mr-2">
                   <Bot className="w-5 h-5 text-white" />
                  </div>

                  <div className="bg-white text-gray-800 shadow-md p-4 rounded-2xl rounded-bl-sm border border-gray-200">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick suggestions */}
              {showSuggestions && messages.length === 1 && !loading && (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-xs text-gray-500 text-center font-medium">Quick questions:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 px-3 py-2 rounded-xl border border-blue-200 transition-all duration-200 hover:shadow-md hover:scale-105"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 bg-white border-t border-gray-200 rounded-b-3xl ">
              <div className="flex gap-2 items-center bg-gray-100 rounded-2xl p-1 border border-gray-300 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setShowSuggestions(false)}
                  placeholder="Type your question..."
                  disabled={loading}
                  className="flex-1 bg-transparent px-3 py-3 focus:outline-none disabled:bg-gray-100 text-gray-800 placeholder-gray-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex-shrink-0 hover:scale-105 active:scale-95 font-bold text-lg"
                >
                  {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                 <Play className="w-5 h-5" />
            )}

                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Powered by HR assist • Press Enter to send
              </p>
            </div>
          </div>
        </Draggable>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #9333ea);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7e22ce);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
