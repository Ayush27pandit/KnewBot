import { useState } from 'react';

interface Memory {
  id: string;
  type: string;
  summary: string;
  content: string | null;
  source_type: string;
  source_id: string;
  source_url: string | null;
  timestamp: string;
  confidence: number;
}

interface SearchResult {
  memory: Memory;
  score: number;
  sources: { type: string; url: string }[];
}

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'decisions' | 'incidents'>('search');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };

  const loadMemories = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memories?type=${type}&limit=50`);
      const data = await res.json();
      setResults(data.map((m: Memory) => ({ memory: m, score: m.confidence, sources: [] })));
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  };

  const handleTabChange = (tab: 'search' | 'decisions' | 'incidents') => {
    setActiveTab(tab);
    if (tab === 'decisions') loadMemories('decision');
    else if (tab === 'incidents') loadMemories('incident');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'decision': return 'bg-green-100 text-green-800';
      case 'incident': return 'bg-red-100 text-red-800';
      case 'pr': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-800">KnewBot</h1>
          <p className="text-slate-500 text-sm">AI Teammate Memory Layer</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => handleTabChange('search')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'search' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => handleTabChange('decisions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'decisions' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Decisions
          </button>
          <button
            onClick={() => handleTabChange('incidents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'incidents' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Incidents
          </button>
        </div>

        {activeTab === 'search' && (
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Ask a question about your team's knowledge..."
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button
                onClick={search}
                disabled={loading}
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              {activeTab === 'search' ? 'Search for knowledge...' : 'No memories found'}
            </div>
          )}

          {results.map((result, idx) => (
            <div
              key={result.memory.id || idx}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(result.memory.type)}`}>
                  {result.memory.type}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.round(result.memory.confidence * 100)}% confidence
                </span>
              </div>
              
              <p className="text-slate-800 mb-2">{result.memory.summary}</p>
              
              {result.memory.content && (
                <p className="text-sm text-slate-500 mb-2 line-clamp-2">{result.memory.content}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(result.memory.timestamp).toLocaleDateString()}</span>
                {result.sources[0]?.url && (
                  <a
                    href={result.sources[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Source
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
