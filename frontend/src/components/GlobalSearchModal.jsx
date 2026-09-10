import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Building, FolderKanban, Zap, Paperclip, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data) {
          setResults(json.data.results || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  if (!isOpen) return null;

  const handleSelectResult = (link) => {
    onClose();
    navigate(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
          <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizations, meter readings, projects, evidence..."
            className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-forest-500 animate-spin flex-shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Type keywords to search across all authorized records, evidence files, and decarbonization projects.
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching records found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectResult(item.link)}
                  className="w-full p-3 rounded-2xl flex items-center justify-between text-left hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-forest-100 group-hover:text-forest-700 transition">
                      {item.badge === 'Org' && <Building className="h-4 w-4" />}
                      {item.badge === 'Project' && <FolderKanban className="h-4 w-4" />}
                      {item.badge === 'Energy' && <Zap className="h-4 w-4" />}
                      {item.badge === 'Doc' && <Paperclip className="h-4 w-4" />}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-forest-600 transition truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-forest-600 group-hover:translate-x-1 transition flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Global ESG Database Search</span>
          <span>Tenant Scoped</span>
        </div>
      </div>
    </div>
  );
}
