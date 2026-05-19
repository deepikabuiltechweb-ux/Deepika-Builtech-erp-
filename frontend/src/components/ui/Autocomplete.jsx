import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Autocomplete({ 
  options, 
  onSelect, 
  placeholder = "Search...", 
  label,
  className,
  onAddNew
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredOptions(options.slice(0, 5)); // Show recent/frequent items
    } else {
      const filtered = options.filter(opt => 
        opt.name.toLowerCase().includes(query.toLowerCase()) ||
        (opt.id && opt.id.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredOptions(filtered);
    }
  }, [query, options]);

  return (
    <div className={cn("relative w-full", className)} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-text-gray mb-1">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className="w-full text-left px-4 py-3 hover:bg-primary-bg transition-colors flex flex-col border-b border-border last:border-0"
                onClick={() => {
                  onSelect(opt);
                  setQuery(opt.name);
                  setIsOpen(false);
                }}
              >
                <span className="font-semibold text-text-dark">{opt.name}</span>
                <span className="text-xs text-text-gray">
                  {opt.id}
                  {opt.category && ` | ${opt.category}`}
                  {opt.currentStock !== undefined ? ` | Stock: ${opt.currentStock} ${opt.unit || ''}` : ''}
                  {opt.location && ` | ${opt.location}`}
                  {opt.status && ` | ${opt.status}`}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-text-gray mb-3">No matching item found</p>
              {onAddNew && (
                <button 
                  type="button"
                  onClick={() => {
                    onAddNew(query);
                    setIsOpen(false);
                  }}
                  className="btn-primary w-full text-sm"
                >
                  <Plus className="w-4 h-4" /> Add New Item?
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
