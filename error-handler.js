/**
 * Tella Extension Error Handler
 * Centralized error handling and graceful degradation
 */

class TellaErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.setupGlobalErrorHandling();

    console.log('🛡️ TellaErrorHandler initialized');
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      this.handleError('unhandled_promise', event.reason, {
        type: 'unhandled_promise_rejection',
        timestamp: new Date().toISOString()
      });

      // Prevent default browser handling
      event.preventDefault();
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('🚨 Global error:', event.error);
      this.handleError('global_error', event.error, {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Central error handling method
   */
  handleError(category, error, context = {}) {
    const errorEntry = {
      id: Date.now() + Math.random(),
      category,
      message: error?.message || error || 'Unknown error',
      stack: error?.stack || null,
      context,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.errors.push(errorEntry);

    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log for debugging
    console.error(`❌ [${category}] ${errorEntry.message}`, context);

    // Attempt recovery based on error category
    this.attemptRecovery(category, error, context);

    return errorEntry.id;
  }

  /**
   * Attempt error recovery based on category
   */
  attemptRecovery(category, error, context) {
    try {
      switch (category) {
        case 'extension_context':
          this.handleExtensionContextError(error, context);
          break;

        case 'sidebar_injection':
          this.handleSidebarInjectionError(error, context);
          break;

        case 'webhook_request':
          this.handleWebhookRequestError(error, context);
          break;

        case 'storage_access':
          this.handleStorageAccessError(error, context);
          break;

        case 'content_script':
          this.handleContentScriptError(error, context);
          break;

        case 'network_error':
          this.handleNetworkError(error, context);
          break;

        default:
          console.log('ℹ️ No specific recovery for category:', category);
      }
    } catch (recoveryError) {
      console.error('🚨 Recovery attempt failed:', recoveryError);
    }
  }

  /**
   * Handle extension context invalidation
   */
  handleExtensionContextError(error, context) {
    console.log('🔄 Handling extension context error...');

    // Check if chrome.runtime is still available
    if (!chrome?.runtime?.id) {
      console.warn('⚠️ Extension context invalidated - showing user notification');

      // Show user notification to reload
      this.showContextInvalidatedMessage();
      return;
    }

    console.log('✅ Extension context appears valid');
  }

  /**
   * Handle sidebar injection failures
   */
  handleSidebarInjectionError(error, context) {
    console.log('🔄 Handling sidebar injection error...');

    const retryCount = context.retryCount || 0;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      console.log(`🔄 Attempting sidebar injection retry ${retryCount + 1}/${maxRetries}`);

      setTimeout(() => {
        if (window.sidebarInjector) {
          window.sidebarInjector.injectionAttempts = 0; // Reset attempts
          window.sidebarInjector.findAndInjectSidebar();
        }
      }, (retryCount + 1) * 2000); // Progressive delay
    } else {
      console.warn('❌ Sidebar injection failed after all retries');
      this.showSidebarInjectionFailureMessage();
    }
  }

  /**
   * Handle webhook request errors
   */
  handleWebhookRequestError(error, context) {
    console.log('🔄 Handling webhook request error...');

    const errorMessage = error?.message || error || 'Unknown error';

    // Categorize webhook errors
    if (errorMessage.includes('Failed to fetch')) {
      return this.handleNetworkError(error, { ...context, type: 'webhook_network' });
    }

    if (errorMessage.includes('CORS')) {
      this.showWebhookCorsError();
      return;
    }

    if (errorMessage.includes('404')) {
      this.showWebhookNotFoundError();
      return;
    }

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      this.showWebhookAuthError();
      return;
    }

    // Generic webhook error
    console.warn('⚠️ Generic webhook error:', errorMessage);
  }

  /**
   * Handle storage access errors
   */
  handleStorageAccessError(error, context) {
    console.log('🔄 Handling storage access error...');

    const operation = context.operation || 'unknown';

    // Try alternative storage methods
    if (operation === 'read') {
      console.log('🔄 Attempting localStorage fallback for read operation');
      return this.tryLocalStorageFallback('read', context.key);
    }

    if (operation === 'write') {
      console.log('🔄 Attempting localStorage fallback for write operation');
      return this.tryLocalStorageFallback('write', context.key, context.value);
    }

    console.warn('❌ Storage access failed with no recovery options');
  }

  /**
   * Handle content script communication errors
   */
  handleContentScriptError(error, context) {
    console.log('🔄 Handling content script error...');

    const action = context.action || 'unknown';

    // Check if tab is still valid
    if (context.tabId) {
      chrome.tabs.get(context.tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Tab no longer exists:', context.tabId);
          return;
        }

        if (tab.url !== context.expectedUrl) {
          console.warn('⚠️ Tab URL changed, retry may not work');
          return;
        }

        // Retry with delay
        setTimeout(() => {
          console.log('🔄 Retrying content script communication...');
          // The calling code should implement retry logic
        }, 1000);
      });
    }
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error, context) {
    console.log('🔄 Handling network error...');

    const retryCount = context.retryCount || 0;
    const maxRetries = 2;

    if (retryCount < maxRetries) {
      console.log(`🔄 Scheduling network retry ${retryCount + 1}/${maxRetries}`);

      // Return a promise that resolves when retry should happen
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ shouldRetry: true, retryCount: retryCount + 1 });
        }, (retryCount + 1) * 1000);
      });
    } else {
      console.warn('❌ Network operation failed after all retries');
      this.showNetworkErrorMessage();
    }
  }

  /**
   * Try localStorage as fallback for chrome.storage
   */
  tryLocalStorageFallback(operation, key, value) {
    try {
      const storageKey = `tella_webhook_${key}`;

      if (operation === 'read') {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : null;
      }

      if (operation === 'write') {
        localStorage.setItem(storageKey, JSON.stringify(value));
        return true;
      }

    } catch (localStorageError) {
      console.error('❌ localStorage fallback failed:', localStorageError);
      return null;
    }
  }

  /**
   * Show context invalidated message
   */
  showContextInvalidatedMessage() {
    this.showErrorMessage(
      'Extension Context Lost',
      'The extension needs to be refreshed. Please reload the page to continue.',
      'warning'
    );
  }

  /**
   * Show sidebar injection failure message
   */
  showSidebarInjectionFailureMessage() {
    this.showErrorMessage(
      'Sidebar Integration Failed',
      'Could not add webhook tab to sidebar. The extension may still work with the popup interface.',
      'warning'
    );
  }

  /**
   * Show webhook CORS error
   */
  showWebhookCorsError() {
    this.showErrorMessage(
      'Webhook CORS Error',
      'The webhook service needs to allow browser requests. Contact your webhook provider.',
      'error'
    );
  }

  /**
   * Show webhook not found error
   */
  showWebhookNotFoundError() {
    this.showErrorMessage(
      'Webhook URL Not Found',
      'The webhook URL appears to be incorrect. Please check the URL and try again.',
      'error'
    );
  }

  /**
   * Show webhook authentication error
   */
  showWebhookAuthError() {
    this.showErrorMessage(
      'Webhook Authentication Failed',
      'The webhook service rejected the request. Check your authentication settings.',
      'error'
    );
  }

  /**
   * Show network error message
   */
  showNetworkErrorMessage() {
    this.showErrorMessage(
      'Network Error',
      'Unable to connect to the webhook service. Check your internet connection.',
      'error'
    );
  }

  /**
   * Generic error message display
   */
  showErrorMessage(title, message, type = 'error') {
    // Try to show in sidebar interface first
    if (window.webhookInterface?.showError) {
      window.webhookInterface.showError(`${title}: ${message}`);
      return;
    }

    // Fallback to console notification
    const emoji = type === 'warning' ? '⚠️' : '❌';
    console.error(`${emoji} ${title}: ${message}`);

    // Try to create a simple notification element
    this.createNotificationElement(title, message, type);
  }

  /**
   * Create simple notification element
   */
  createNotificationElement(title, message, type) {
    try {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        padding: 12px 16px;
        background: ${type === 'warning' ? '#fef3cd' : '#f8d7da'};
        color: ${type === 'warning' ? '#856404' : '#721c24'};
        border: 1px solid ${type === 'warning' ? '#faeaa3' : '#f5c6cb'};
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
      `;

      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div>${message}</div>
      `;

      document.body.appendChild(notification);

      // Fade in
      requestAnimationFrame(() => {
        notification.style.opacity = '1';
      });

      // Auto remove after 8 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 8000);

    } catch (notificationError) {
      console.error('❌ Could not create notification element:', notificationError);
    }
  }

  /**
   * Check system health
   */
  checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      chromeExtensionContext: !!chrome?.runtime?.id,
      storageAccess: false,
      sidebarInjected: !!window.sidebarInjector?.webhookTab?.isConnected,
      recentErrors: this.errors.filter(e =>
        Date.now() - new Date(e.timestamp).getTime() < 300000 // Last 5 minutes
      ).length
    };

    // Test storage access
    try {
      chrome.storage.local.get(['test'], () => {
        health.storageAccess = !chrome.runtime.lastError;
      });
    } catch (e) {
      health.storageAccess = false;
    }

    return health;
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    const categories = {};
    this.errors.forEach(error => {
      categories[error.category] = (categories[error.category] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      categories,
      recentErrors: this.errors.filter(e =>
        Date.now() - new Date(e.timestamp).getTime() < 3600000 // Last hour
      ),
      systemHealth: this.checkSystemHealth()
    };
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
    console.log('🧹 Error history cleared');
  }
}

// Create global instance
window.TellaErrorHandler = TellaErrorHandler;

// Initialize error handler
if (!window.tellaErrorHandler) {
  window.tellaErrorHandler = new TellaErrorHandler();
}