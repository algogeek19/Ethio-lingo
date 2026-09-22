import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2, Trash2, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  icon: CustomIcon,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      badgeBg: 'bg-red-500/10 text-destructive-red border-red-500/30',
      icon: Trash2,
      btnBg: 'bg-destructive-red hover:bg-red-600 text-white',
    },
    warning: {
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      btnBg: 'bg-warning-amber hover:bg-amber-600 text-white',
    },
    info: {
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: Info,
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const config = typeConfig[type] || typeConfig.danger;
  const IconComponent = CustomIcon || config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Dialog Content Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-10 w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border shrink-0 ${config.badgeBg}`}>
              <IconComponent size={22} />
            </div>
            <div className="space-y-1 grow">
              <h3 className="font-serif font-bold text-lg text-on-surface">
                {title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-card transition-colors focus-ring"
            >
              <X size={18} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
            {cancelLabel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface bg-surface-card hover:bg-surface-high border border-hairline rounded-xl transition-colors focus-ring cursor-pointer"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs focus-ring btn-interactive cursor-pointer ${config.btnBg}`}
            >
              {isSubmitting ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
