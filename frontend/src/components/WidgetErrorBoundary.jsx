import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DEFAULT_ERROR_TITLE = 'Failed to load';
const DEFAULT_ERROR_DESC = 'An unknown error occurred while loading this widget.';

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
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="dashboard-widget dashboard-widget--error">
          <AlertTriangle className="dashboard-widget-error-icon" size={32} />
          <h3 className="dashboard-widget-error-title">
            {this.props.title || (t ? t('widget.failed_to_load') : DEFAULT_ERROR_TITLE)}
          </h3>
          <p className="dashboard-widget-error-desc">
            {this.state.error?.message || (t ? t('widget.unknown_error') : DEFAULT_ERROR_DESC)}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default WidgetErrorBoundary;
