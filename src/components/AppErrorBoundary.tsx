import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao iniciar o sistema GM.', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            GM
          </div>
          <h1 className="text-xl font-semibold text-foreground">Não foi possível abrir o sistema</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A página encontrou uma falha durante o carregamento. Tente abrir novamente.
          </p>
          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground"
            onClick={() => window.location.assign(`/auth?recuperar=${Date.now()}`)}
          >
            Abrir novamente
          </button>
          <a
            className="mt-3 block text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="https://landing-page-gm-two.vercel.app/"
          >
            Ir para a página da clínica
          </a>
        </section>
      </main>
    );
  }
}
