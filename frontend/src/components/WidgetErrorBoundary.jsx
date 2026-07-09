import React from 'react';

class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[WidgetErrorBoundary] Error caught in widget "${this.props.name || 'Unknown'}":`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-widget dashboard-widget--error" style={{
          padding: 'var(--space-6xl, 40px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 'var(--space-md, 12px)',
          minHeight: '200px'
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {this.props.title || 'Sikertelen betöltés'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '450px' }}>
            {this.state.error?.message || 'Ismeretlen hiba történt a modul betöltése közben.'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default WidgetErrorBoundary;
