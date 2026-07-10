import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RootApp from './app/RootApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const installSafePerformanceMeasure = () => {
  const perf = window.performance;
  if (!perf || typeof perf.measure !== 'function' || perf.__swayaSafeMeasureInstalled) {
    return;
  }

  const originalMeasure = perf.measure.bind(perf);

  perf.measure = (...args) => {
    try {
      return originalMeasure(...args);
    } catch (error) {
      const isCloneFailure = error?.name === 'DataCloneError'
        || error?.message?.includes('Data cannot be cloned');

      if (!isCloneFailure) {
        throw error;
      }

      try {
        const [name] = args;
        if (typeof name === 'string') {
          return originalMeasure(name);
        }
      } catch (err) {
        console.error(err);
      }

      return undefined;
    }
  };

  perf.__swayaSafeMeasureInstalled = true;
};

const sendRendererLog = (level, message, details = null) => {
  try {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send('renderer-log', { level, message, details });
  } catch (err) {
    console.error(err);
  }
};

const getRendererRuntimeSnapshot = () => {
  const memory = performance?.memory
    ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
      }
    : null;

  return {
    href: window.location.href,
    visibilityState: document.visibilityState,
    readyState: document.readyState,
    hasFocus: typeof document.hasFocus === 'function' ? document.hasFocus() : null,
    memory,
  };
};

const installConsoleLogging = () => {
  const originalConsoleError = console.error.bind(console);

  console.error = (...args) => {
    try {
      const [firstArg, ...restArgs] = args;
      let normalizedMessage = '';
      try {
        normalizedMessage = typeof firstArg === 'string' ? firstArg : String(firstArg);
      } catch (e) {
        normalizedMessage = '';
      }

      if (
        normalizedMessage.includes('Maximum update depth exceeded')
        || normalizedMessage.includes('Too many re-renders')
      ) {
        sendRendererLog('ERROR', 'Renderer React console error', {
          message: normalizedMessage,
          args: restArgs.map((arg) => {
            if (arg instanceof Error) {
              return {
                name: arg.name,
                message: arg.message,
                stack: arg.stack,
              };
            }
            if (typeof arg === 'string') {
              return arg;
            }
            try {
              return JSON.parse(JSON.stringify(arg));
            } catch (err) {
              originalConsoleError(err);
              try {
                return String(arg);
              } catch (e) {
                return '[Unformattable Object]';
              }
            }
          }),
          stack: new Error('Console error stack').stack,
          runtime: getRendererRuntimeSnapshot(),
        });
      }
    } catch (err) {
      originalConsoleError(err);
    }

    originalConsoleError(...args);
  };
};

window.addEventListener('error', (event) => {
  sendRendererLog('ERROR', 'Renderer window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? {
      name: event.error.name,
      message: event.error.message,
      stack: event.error.stack,
    } : null,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? {
        name: event.reason.name,
        message: event.reason.message,
        stack: event.reason.stack,
      }
    : event.reason;

  sendRendererLog('ERROR', 'Renderer unhandled promise rejection', reason);
});

installSafePerformanceMeasure();
installConsoleLogging();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RootApp />
    </ErrorBoundary>
  </StrictMode>,
)
