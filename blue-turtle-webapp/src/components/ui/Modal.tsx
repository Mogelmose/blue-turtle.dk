// src/components/ui/Modal.tsx
'use client';
import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, children, title }: { isOpen: boolean, onClose: () => void, children: React.ReactNode, title?: string }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (typeof window === 'undefined' || !isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-light-surface dark:bg-dark-surface rounded-xl shadow-xl p-6 w-full max-w-md m-4 relative border border-light-border dark:border-dark-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center mb-4">
          {title && <h2 id="modal-title" className="text-xl font-bold text-light-text dark:text-dark-text">{title}</h2>}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-light-text-muted dark:text-dark-text-muted hover:bg-light-surface-elevated dark:hover:bg-dark-surface-elevated transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
