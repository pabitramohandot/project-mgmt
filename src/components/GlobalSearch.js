'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronRight, FileText, CheckCircle2, User, FileOutput, LayoutDashboard, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Typewriter effect state
  const placeholders = ['Client...', 'Project...', 'Invoice...', 'Account...'];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    const currentWord = placeholders[placeholderIndex];
    let timeoutId;

    if (isDeleting) {
      if (typedText === '') {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        timeoutId = setTimeout(() => {}, 500);
      } else {
        timeoutId = setTimeout(() => {
          setTypedText(currentWord.substring(0, typedText.length - 1));
        }, 50);
      }
    } else {
      if (typedText === currentWord) {
        timeoutId = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else {
        timeoutId = setTimeout(() => {
          setTypedText(currentWord.substring(0, typedText.length + 1));
        }, 100);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [typedText, isDeleting, placeholderIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleResultClick = (link) => {
    setIsOpen(false);
    setQuery('');
    router.push(link);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'menu': return <LayoutDashboard size={16} color="#6366f1" />;
      case 'project': return <FileText size={16} color="#3b82f6" />;
      case 'task': return <CheckCircle2 size={16} color="#10b981" />;
      case 'client': return <User size={16} color="#a855f7" />;
      case 'invoice': return <FileOutput size={16} color="#f97316" />;
      case 'note': return <StickyNote size={16} color="#eab308" />;
      default: return <FileText size={16} color="#94a3b8" />;
    }
  };

  return (
    <div className="global-search-container" ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 1) setIsOpen(true);
          }}
          placeholder={`Search for ${typedText}`}
          style={{
            width: '100%',
            height: '42px',
            paddingLeft: '44px',
            paddingRight: '16px',
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={() => {
            if (query.length > 1 && results.length > 0) setIsOpen(true);
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = 'var(--border-color-hover)'; }}
          onMouseLeave={(e) => { 
            if (document.activeElement !== e.target) {
              e.target.style.borderColor = 'var(--border-color)'; 
            }
          }}
        />
        {isSearching && (
          <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        )}
      </div>

      {isOpen && query.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {results.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: '8px' }}>
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleResultClick(result.link)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ marginTop: '2px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '8px' }}>
                      {getIconForType(result.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '2px' }}>{result.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{result.subtitle}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                        {result.breadcrumbs.map((crumb, i) => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {crumb}
                            {i < result.breadcrumbs.length - 1 && <ChevronRight size={10} />}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !isSearching && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No results found for "{query}"
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
