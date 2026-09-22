/**
 * Pristine Browser API Protection Utility
 *
 * Protects application code against browser extension monkey-patching
 * and "Illegal constructor at contentscript.js" / MessagePort errors.
 *
 * Obtains pristine unpolluted references to core Web APIs using an isolated
 * blank <iframe> context if global window properties have been tampered with.
 */

// Isolated frame to harvest clean, unpatched browser APIs
let pristineWindow = typeof window !== 'undefined' ? window : {};

try {
  if (typeof document !== 'undefined' && document.documentElement) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = 'about:blank';
    document.documentElement.appendChild(iframe);

    if (iframe.contentWindow) {
      pristineWindow = iframe.contentWindow;
    }

    // Clean up DOM node while preserving contentWindow references
    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {}
    }, 0);
  }
} catch (e) {
  console.warn('[PristineAPIs] Unable to spawn isolated iframe context, using window fallback:', e);
}

// Safely obtain native constructors / methods
const getNative = (name, fallback) => {
  try {
    const fn = pristineWindow[name] || (typeof window !== 'undefined' ? window[name] : null);
    if (fn) return fn;
  } catch {}
  return fallback;
};

// Actively test and restore window.MessageChannel and window.MessagePort if corrupted by extensions
if (typeof window !== 'undefined') {
  try {
    const pristineMC = pristineWindow.MessageChannel;
    if (pristineMC) {
      try {
        const testMC = new window.MessageChannel();
        if (!testMC || !testMC.port1) throw new Error('Illegal constructor');
      } catch (err) {
        if (err && (String(err).includes('Illegal constructor') || err.name === 'TypeError')) {
          console.warn('[PristineAPIs] Restoring monkey-patched window.MessageChannel from pristine iframe context.');
          window.MessageChannel = pristineMC;
          if (pristineWindow.MessagePort) {
            window.MessagePort = pristineWindow.MessagePort;
          }
        }
      }
    }
  } catch (e) {}
}

export const PristineEvent = getNative('Event', typeof window !== 'undefined' ? window.Event : null);
export const PristineCustomEvent = getNative('CustomEvent', typeof window !== 'undefined' ? window.CustomEvent : null);
export const PristineMessageChannel = getNative('MessageChannel', typeof window !== 'undefined' ? window.MessageChannel : null);
export const PristineMessagePort = getNative('MessagePort', typeof window !== 'undefined' ? window.MessagePort : null);
export const PristineNotification = getNative('Notification', typeof window !== 'undefined' ? window.Notification : null);
export const PristineImage = getNative('Image', typeof window !== 'undefined' ? window.Image : null);
export const PristineSelection = getNative('Selection', typeof window !== 'undefined' ? window.Selection : null);
export const PristineNode = getNative('Node', typeof window !== 'undefined' ? window.Node : null);
export const PristineRange = getNative('Range', typeof window !== 'undefined' ? window.Range : null);
export const PristineTouch = getNative('Touch', typeof window !== 'undefined' ? window.Touch : null);
export const PristineFetch = getNative('fetch', typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : null);
export const PristinePostMessage = getNative('postMessage', typeof window !== 'undefined' && window.postMessage ? window.postMessage.bind(window) : null);

// Safe constructor factory to prevent "Illegal constructor" crashes
export function createSafeInstance(ConstructorRef, ...args) {
  try {
    return new ConstructorRef(...args);
  } catch (err) {
    if (err && String(err).includes('Illegal constructor')) {
      console.warn('[PristineAPIs] Intercepted Illegal constructor error from monkey-patched API. Using fallback.');
      const pristineCtor = getNative(ConstructorRef ? ConstructorRef.name : '', null);
      if (pristineCtor && pristineCtor !== ConstructorRef) {
        return new pristineCtor(...args);
      }
    }
    throw err;
  }
}

// Defensive Aliases to prevent collisions with native Web API names
export const AppEvent = PristineEvent;
export const CustomSelection = PristineSelection;
export const AppNotification = PristineNotification;
export const AppImage = PristineImage;

export default {
  PristineEvent,
  PristineCustomEvent,
  PristineMessageChannel,
  PristineMessagePort,
  PristineNotification,
  PristineImage,
  PristineSelection,
  PristineNode,
  PristineRange,
  PristineTouch,
  PristineFetch,
  PristinePostMessage,
  createSafeInstance,
  AppEvent,
  CustomSelection,
  AppNotification,
  AppImage,
};
