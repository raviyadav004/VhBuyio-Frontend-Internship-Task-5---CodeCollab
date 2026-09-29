import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './IconButton';
import { resetAllStorage } from '@/services/storage';
import styles from './common.module.css';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  area?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[CodeCollab] ${this.props.area ?? 'App'} crashed`, error, info);
  }

  private reset = () => this.setState({ error: null });
  private resetStorage = () => {
    resetAllStorage();
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className={styles.errorScreen} role="alert">
        <AlertTriangle size={32} className={styles.errorIcon} aria-hidden="true" />

        <h2 className={styles.errorTitle}>
          {this.props.area ? `${this.props.area} stopped responding` : 'Something broke'}
        </h2>
        <p className={styles.errorMessage}> The rest of CodeCollab is still running. Try again, or reset the locally stored workspace if the problem keeps coming back. </p>
        <pre className={styles.errorDetail}>{error.message}</pre>
        <div className={styles.errorActions}>
          <Button variant="primary" onClick={this.reset}> Try again </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}> Reload page </Button>
          <Button variant="ghost" onClick={this.resetStorage}> Reset stored data </Button>
        </div>
      </div>
    );
  }
}
