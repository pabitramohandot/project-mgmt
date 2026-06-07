'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * Reusable SearchableSelect dropdown
 * 
 * @param {Array} options - Array of { value, label, sublabel, searchText }
 * @param {string} value - Current selected value
 * @param {function} onChange - Callback (value, option) => {}
 * @param {string} placeholder - Input placeholder
 * @param {string} disabledPlaceholder - Placeholder when disabled/empty options
 * @param {boolean} required - HTML input required
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange = () => {},
  placeholder = 'Select option...',
  disabledPlaceholder = 'No options available',
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Sync search input with selected label when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [isOpen, selectedOption]);

  const handleSelect = (option) => {
    onChange(option.value, option);
    setSearch(option.label);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  };

  // Filter options based on query
  const filteredOptions = options.filter((opt) => {
    const term = search.toLowerCase();
    const labelMatch = opt.label?.toLowerCase().includes(term);
    const sublabelMatch = opt.sublabel?.toLowerCase().includes(term);
    const customMatch = opt.searchText?.toLowerCase().includes(term);
    return labelMatch || sublabelMatch || customMatch;
  });

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 50 : 1 }}>
      <div
        className="searchable-select-trigger"
        onClick={() => {
          if (options.length > 0) {
            setIsOpen(true);
            setSearch(''); // Clear search on open to show all options
          }
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          cursor: options.length > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder={options.length > 0 ? placeholder : disabledPlaceholder}
          value={isOpen ? search : (selectedOption ? selectedOption.label : '')}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          disabled={options.length === 0}
          required={required && !value}
          style={{
            width: '100%',
            paddingRight: '2.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
            boxShadow: isOpen ? '0 0 10px rgba(139, 92, 246, 0.15)' : 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--text-secondary)',
          }}
        >
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.15rem',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%',
              }}
              className="clear-btn"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              opacity: options.length > 0 ? 0.7 : 0.3,
            }}
          />
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <div
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            marginTop: '0.5rem',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color-hover)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            maxHeight: '250px',
            overflowY: 'auto',
            padding: '0.5rem',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              No matches found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`searchable-select-option ${value === option.value ? 'selected' : ''}`}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease',
                  backgroundColor: value === option.value ? 'var(--accent-primary-glow)' : 'transparent',
                  borderLeft: value === option.value ? '3px solid var(--accent-primary)' : 'none',
                  paddingLeft: value === option.value ? 'calc(0.85rem - 3px)' : '0.85rem',
                  marginBottom: '2px',
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{option.label}</div>
                {option.sublabel && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {option.sublabel}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style jsx global>{`
        .searchable-select-option:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
        }
        .searchable-select-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .searchable-select-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .searchable-select-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
        }
        .searchable-select-dropdown::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .clear-btn:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
