
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Hub is starting up...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Fatal Error: Target container #root not found in index.html.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Hub has been successfully mounted.");
  } catch (error) {
    console.error("Hub failed to initialize:", error);
    
    // Provide a visual error message instead of a white screen
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        background: #fff; 
        font-family: 'Inter', sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 2rem; border-radius: 1.5rem; max-width: 500px; width: 100%;">
          <h2 style="color: #991b1b; font-weight: 800; margin-bottom: 1rem;">Initialization Error</h2>
          <p style="color: #b91c1c; margin-bottom: 1.5rem; line-height: 1.5;">The application could not be started. This is usually due to a missing API key or a module loading failure.</p>
          <div style="background: #fff; padding: 1rem; border-radius: 0.75rem; border: 1px solid #fecaca; text-align: left; font-family: monospace; font-size: 12px; overflow-x: auto;">
            ${error instanceof Error ? error.stack || error.message : String(error)}
          </div>
          <button onclick="location.reload()" style="margin-top: 1.5rem; background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer;">
            Reload Application
          </button>
        </div>
      </div>
    `;
  }
}
