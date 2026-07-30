import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: '', errorMessage: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorId: crypto.randomUUID(), errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 16,
            color: 'var(--text-1, #111)',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Une erreur est survenue</h2>
          <p
            style={{
              margin: 0,
              color: 'var(--text-2, #666)',
              fontSize: 14,
              textAlign: 'center',
              maxWidth: 400,
            }}
          >
            Un problème inattendu s'est produit. Vos données sont en sécurité.
          </p>
          {import.meta.env.DEV && this.state.errorMessage && (
            <pre
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: '#b91c1c',
                maxWidth: 500,
                overflow: 'auto',
                textAlign: 'left',
              }}
            >
              {this.state.errorMessage}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                background: 'var(--primary, #7c3aed)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Réessayer
            </button>
            <button
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: 'var(--text-2, #666)',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
