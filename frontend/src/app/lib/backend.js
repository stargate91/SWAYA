const getBackendUrl = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const port = urlParams.get('backend_port');
    if (port) {
      return `http://localhost:${port}`;
    }
  } catch {
    // Ignore URL parsing issues in unexpected environments.
  }
  return 'http://localhost:8000';
};

export const API_BASE = getBackendUrl();
