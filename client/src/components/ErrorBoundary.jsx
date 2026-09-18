import { Component } from 'react';
import { I18nContext } from '../i18n/context.js';

export default class ErrorBoundary extends Component {
  static contextType = I18nContext;

  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('The React application failed to render.', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { t } = this.context;
    return (
      <main className="fatal-screen">
        <section className="fatal-card" role="alert">
          <h1>{t('MedGuide AI could not open')}</h1>
          <p>
            {t('The interface encountered an unexpected error. Reload the page to start a clean session.')}
          </p>
          <button className="btn-p" type="button" onClick={() => window.location.reload()}>
            {t('Reload application')}
          </button>
        </section>
      </main>
    );
  }
}
