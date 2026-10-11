import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Sparkles, X, Send, RefreshCw, ChevronDown, 
  ArrowRight, ShieldCheck, HelpCircle, Minimize2, Maximize2, Trash2
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AICopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Namaste! I am your StockSense AI Inventory Copilot. I have real-time access to your 4 Indian regional hubs (Mumbai, Delhi-NCR, Bengaluru, Chennai), FIFO valuation, and pending transfer proposals. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const quickPrompts = [
    "Which products could run out within the next 7 days?",
    "Check transferable surplus for EV Battery Packs in Delhi",
    "What is our total inventory valuation in INR (₹)?",
    "Show aging stock older than 90 days across hubs",
    "Compare transfer freight cost vs purchasing new from vendor",
    "What operations should the manager approve today?"
  ];

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/intelligence/copilot/chat', { message: textToSend });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.data.reply,
          provider: res.data.provider,
          tools: res.data.toolsUsed
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: "I encountered an error querying the logistics engine. Please verify the backend connection or try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: "Conversation cleared. Ask me anything about stockouts, reorders, transfer proposals, or FIFO batch layers."
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none print:hidden">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
        >
          <div className="relative">
            <Bot size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-extrabold text-sm tracking-wide hidden sm:inline">
            AI Copilot
          </span>
          <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Ask AI
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 overflow-hidden ${
          isMinimized 
            ? 'w-80 h-14' 
            : 'w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-indigo-200">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-none">StockSense AI Copilot</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-indigo-200 mt-0.5">Multi-Hub Inventory Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-indigo-200">
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Prompt Chips */}
              <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0 text-xs">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="shrink-0 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Bot size={15} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {msg.provider && (
                        <div className="mt-2 pt-1.5 border-t border-gray-100 text-[10px] text-gray-400 flex flex-wrap justify-between gap-1 font-mono">
                          <span>Engine: {msg.provider}</span>
                          {msg.tools && <span>Tools: {msg.tools.join(', ')}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5 items-center text-xs text-gray-500 bg-white border border-gray-100 p-2.5 rounded-xl shadow-xs w-fit">
                    <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <RefreshCw size={13} className="animate-spin" />
                    </div>
                    <span>Analyzing warehouse positions & evaluating tools...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Ask about inventory, shortages, transfers..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors shadow-sm shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AICopilotWidget;
