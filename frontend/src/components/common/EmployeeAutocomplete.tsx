import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../../types';
import { Search, X, Check, User as UserIcon } from 'lucide-react';

export interface EmployeeAutocompleteProps {
  employees: User[];
  selectedEmployeeId: string;
  onSelect: (employee: User) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export const EmployeeAutocomplete: React.FC<EmployeeAutocompleteProps> = ({
  employees,
  selectedEmployeeId,
  onSelect,
  label = 'Select Employee',
  placeholder = 'Search employee by name, email, or department...',
  required = false,
  disabled = false,
  helperText,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find currently selected employee
  const selectedEmployee = useMemo(() => {
    return employees.find(
      e => e.id === selectedEmployeeId || e.employee_id === selectedEmployeeId
    ) || null;
  }, [employees, selectedEmployeeId]);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) {
      return employees;
    }
    const query = searchTerm.toLowerCase().trim();
    return employees.filter(emp => {
      const matchName = emp.name.toLowerCase().includes(query);
      const matchEmail = emp.email.toLowerCase().includes(query);
      const matchEmpId = (emp.employee_id || '').toLowerCase().includes(query);
      const matchDept = (emp.department?.name || '').toLowerCase().includes(query);
      return matchName || matchEmail || matchEmpId || matchDept;
    });
  }, [employees, searchTerm]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredEmployees.length, searchTerm]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (emp: User) => {
    onSelect(emp);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredEmployees.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev <= 0 ? Math.max(0, filteredEmployees.length - 1) : prev - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredEmployees.length > 0 && filteredEmployees[highlightedIndex]) {
          handleSelect(filteredEmployees[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Helper to highlight matching text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;

    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + q.length);
    const after = text.substring(idx + q.length);

    return (
      <>
        {before}
        <mark
          style={{
            backgroundColor: '#fef08a',
            color: '#854d0e',
            padding: '0 1px',
            borderRadius: 2,
            fontWeight: 700,
          }}
        >
          {match}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Selected Employee Pill (if already selected and dropdown is closed) */}
      {selectedEmployee && !isOpen && (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--color-slate-300)',
            backgroundColor: '#f8fafc',
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              {selectedEmployee.name[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                {selectedEmployee.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedEmployee.email} • {selectedEmployee.department?.name || 'No department'}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-600)', fontWeight: 600, flexShrink: 0 }}>
            Change
          </span>
        </div>
      )}

      {/* Search Input */}
      {(!selectedEmployee || isOpen) && (
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-slate-400)',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            placeholder={placeholder}
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              borderRadius: 6,
              border: '1px solid var(--color-primary-500)',
              fontSize: '0.875rem',
              outline: 'none',
              boxShadow: '0 0 0 2px var(--color-primary-100)',
            }}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            role="combobox"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-slate-400)',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 260,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--color-slate-200)',
            zIndex: 100,
            overflowY: 'auto',
          }}
        >
          {filteredEmployees.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
              No employees match &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}
            >
              {filteredEmployees.map((emp, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = emp.id === selectedEmployeeId || emp.employee_id === selectedEmployeeId;

                return (
                  <li
                    key={emp.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(emp)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      backgroundColor: isHighlighted ? '#f1f5f9' : isSelected ? '#eef2ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? 'var(--color-primary-600)' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : 'var(--color-slate-700)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        {emp.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                          {renderHighlightedText(emp.name, searchTerm)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                          {renderHighlightedText(emp.email, searchTerm)} • Dept:{' '}
                          <span style={{ fontWeight: 500, color: 'var(--color-slate-700)' }}>
                            {renderHighlightedText(emp.department?.name || 'Not assigned', searchTerm)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {helperText && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
