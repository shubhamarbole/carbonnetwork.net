import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, Sparkles, HelpCircle, ShieldAlert } from 'lucide-react';

export default function AIAssistant() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your Environmental ESG Assistant. I can query our actual database to analyze carbon scopes, energy inputs, waste treatments, water withdrawal risks, and permit compliance. Ask me anything about our environmental performance.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const templateQuestions = [
    "Why did our environmental score decrease?",
    "Why did emissions increase?",
    "Which facility has the highest environmental impact?",
    "Are we on track for our 2030 emissions target?",
    "How can we reduce energy consumption?",
    "Which environmental KPI needs immediate attention?",
    "Summarize this month's environmental performance."
  ];

  const handleSend = async (textToSend) => {
    if (!textToSend.trim()) return;

    // Append user message
    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: textToSend })
      });
      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          sender: 'ai',
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error('AI query fail');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        sender: 'ai',
        text: "I encountered an error while accessing the database. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 flex flex-col">
      <Navbar title="ESG AI Virtual Assistant" />

      {/* Main chat layout */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-8 py-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Left Side: Template Prompts */}
        <div className="lg:w-80 flex flex-col space-y-4 shrink-0 overflow-y-auto pr-1">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-forest-600">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Suggested Queries</h3>
            </div>
            <p className="text-[11px] text-slate-400">Click any query below to audit actual database metrics:</p>
            
            <div className="space-y-2 pt-2">
              {templateQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="w-full text-left text-xs p-2.5 rounded-xl border border-slate-150 hover:bg-forest-50 hover:text-forest-700 hover:border-forest-200 transition duration-150 bg-slate-50/50 font-medium leading-normal disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl text-white space-y-3">
            <div className="flex items-center space-x-2 text-amber-400">
              <ShieldAlert className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Auditor Guidelines</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This engine pulls directly from the ledger. In responses, items are classified as **[Actual Data]**, **[Calculated Metrics]**, or **[Predictions/Forecasting]** to ensure 100% trace accountability.
            </p>
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center space-x-3 shrink-0">
            <div className="p-2 bg-forest-50 rounded-xl">
              <Bot className="h-5 w-5 text-forest-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">ESG Environmental AI Agent</h3>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                <span>Active Ledger Connected</span>
              </span>
            </div>
          </div>

          {/* Bubbles List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm border ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 border-slate-900 text-white rounded-tr-none'
                      : 'bg-white border-slate-150 text-slate-700 rounded-tl-none'
                  }`}
                >
                  {/* Markdown rendering fallback */}
                  <div className="whitespace-pre-line prose prose-xs">
                    {msg.text}
                  </div>
                  <span className={`block text-[9px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-150 rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Panel */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="p-4 border-t border-slate-100 flex items-center space-x-3 shrink-0 bg-white"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me a question (e.g. why did emissions increase?)..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-forest-500 text-xs transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="p-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
