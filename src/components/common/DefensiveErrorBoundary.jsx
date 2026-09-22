import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Defensive Error Boundary Component
 *
 * Catches runtime exceptions caused by third-party browser extensions monkey-patching
 * native DOM constructors (e.g. "Illegal constructor at contentscript.js" / MessagePort.D)
 * and prevents third-party extension crashes from unmounting the React UI tree.
 */
export class DefensiveErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasAppError: false,
      error: null,
      errorInfo: null,
    };
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  handleGlobalError = (event) => {
    const errObj = event?.error || event?.message;
    if (DefensiveErrorBoundary.isThirdPartyExtensionError(errObj)) {
      console.warn('[DefensiveErrorBoundary] Intercepted uncaught window extension error:', event?.message || errObj);
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
    }
  };

  handleUnhandledRejection = (event) => {
    if (DefensiveErrorBoundary.isThirdPartyExtensionError(event?.reason)) {
      console.warn('[DefensiveErrorBoundary] Intercepted unhandled extension rejection:', event?.reason);
      if (event.preventDefault) event.preventDefault();
    }
  };

  static getDerivedStateFromError(error) {
    const isExtensionError = DefensiveErrorBoundary.isThirdPartyExtensionError(error);
    if (isExtensionError) {
      // Third-party extension error: Do not crash the app UI tree
      return { hasAppError: false, error: null };
    }
    // Genuine application error
    return { hasAppError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const isExtensionError = DefensiveErrorBoundary.isThirdPartyExtensionError(error, errorInfo);

    if (isExtensionError) {
      console.warn(
        '[DefensiveErrorBoundary] Intercepted and neutralized third-party browser extension error:',
        error?.message || error
      );
      // Reset error state so UI continues rendering smoothly
      this.setState({ hasAppError: false, error: null, errorInfo: null });
      return;
    }

    console.error('[DefensiveErrorBoundary] Application error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  static isThirdPartyExtensionError(error, errorInfo) {
    if (!error) return false;

    const message = (error.message || String(error)).toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const componentStack = (errorInfo?.componentStack || '').toLowerCase();
    const fullTrace = `${message} ${stack} ${componentStack}`;

    // Common extension error signatures
    const extensionSignatures = [
      'illegal constructor',
      'contentscript',
      'contentscript.js',
      'chrome-extension:',
      'moz-extension:',
      'safari-extension:',
      'extension:',
      'messageport',
      'messageport.d',
      'postmessage',
      'cannot read properties of undefined (reading \'postmessage\')',
      'cannot read properties of null (reading \'postmessage\')',
    ];

    return extensionSignatures.some((sig) => fullTrace.includes(sig));
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasAppError) {
      return (
        <div className="min-h-screen bg-canvas text-on-surface flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-surface-lowest border border-hairline rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif font-bold text-xl text-on-surface">
                Application Recovered
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                An unexpected interface issue occurred. You can safely reload the page to continue learning.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-surface-soft border border-hairline rounded-xl text-[11px] font-mono text-on-surface-variant text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-primary-coral hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 focus-ring btn-interactive cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Reload Platform</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DefensiveErrorBoundary;
