import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  requiresTyping?: boolean;
  typingConfirmText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  requiresTyping = false,
  typingConfirmText = 'DELETE',
}) => {
  const [typedText, setTypedText] = React.useState('');
  const [isConfirming, setIsConfirming] = React.useState(false);

  const handleConfirm = () => {
    if (requiresTyping && typedText !== typingConfirmText) {
      return;
    }
    setIsConfirming(true);
    onConfirm();
    setTypedText('');
    setIsConfirming(false);
  };

  const handleClose = () => {
    setTypedText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`p-6 ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {danger && (
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              )}
              <h3 className={`text-lg font-bold ${danger ? 'text-red-900 dark:text-red-100' : 'text-slate-900 dark:text-slate-100'}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {message}
          </p>

          {requiresTyping && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Type <span className={`font-mono ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{typingConfirmText}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:border-red-500 dark:focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-400/20 font-mono"
                placeholder={typingConfirmText}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-500 transition-all font-medium shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requiresTyping && typedText !== typingConfirmText}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
                : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white'
            }`}
          >
            {isConfirming ? 'Confirming...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
