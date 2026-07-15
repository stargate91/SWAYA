import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-crash">
          {/* eslint-disable-next-line react/jsx-no-literals, i18next/no-literal-string */}
          <h1 className="error-boundary-crash__title">Frontend Crash</h1>
          <pre className="error-boundary-crash__stack">
            {this.state.error && this.state.error.toString()}
          </pre>
          {/* eslint-disable-next-line react/jsx-no-literals, i18next/no-literal-string */}
          <h2 className="error-boundary-crash__subtitle">Component Stack:</h2>
          <pre className="error-boundary-crash__stack">
            {this.state.info && this.state.info.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
