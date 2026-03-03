import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  sources?: { url: string }[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: 'Hi! I\'m KnewBot. Ask me anything about your team\'s decisions, incidents, or project history.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(input)}&limit=5`);
      const data = await res.json();
      
      const validResults = data.filter((r: { score: number | null }) => r.score && r.score > 0.3);
      
      if (validResults.length === 0) {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: "I don't have any relevant memories about that. I can only answer questions about your team's decisions, incidents, and project history. Try asking about things like 'why did we switch to postgres' or 'what incidents have we had'.",
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        const context = validResults
          .map((r: { memory: { summary: string }; sources: { url: string }[] }) => 
            `${r.memory.summary}\nSource: ${r.sources[0]?.url || 'N/A'}`
          )
          .join('\n\n');
        
        const llmRes = await fetch('/api/llm/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: input, context }),
        });
        
        const llmData = await llmRes.json();
        
        const sources = validResults.map((r: { sources: { url: string }[] }) => r.sources[0]?.url).filter(Boolean);
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: llmData.answer || "Here's what I found: " + validResults[0]?.memory?.summary,
          sources: sources.map((url: string) => ({ url })),
        };
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">KB</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">KnewBot</h1>
            <p className="text-xs text-slate-500">AI Teammate Memory</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                        >
                          Source {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about decisions, incidents, or project history..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Example: "Why did we switch to Postgres?" or "What incidents have we had?"
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
