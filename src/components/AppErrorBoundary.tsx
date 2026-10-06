import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

function getSafeErrorMessage(error: Error | null) {
  if (!error) return 'Erro inesperado ao carregar a página.';
  const message = error.message?.replace(/[\r\n]+/g, ' ').trim();
  return message ? message.slice(0, 180) : error.name || 'Erro inesperado ao carregar a página.';
}

function resetAccessAndReload() {
  try {
    const storage = window.localStorage;
    const authKeys = Object.keys(storage).filter((key) => /(^sb-.+-auth-token$|supabase\.auth\.token)/i.test(key));
    authKeys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn('Não foi possível limpar a sessão local.', error);
  }

  window.location.assign(`/auth?recuperar=${Date.now()}`);
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao iniciar o sistema GM.', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            GM
          </div>
          <h1 className="text-xl font-semibold text-foreground">Não foi possível abrir o sistema</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A sessão pode ter falhado. Reinicie o acesso; seus cadastros e atendimentos não serão apagados.
          </p>
          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground"
            onClick={resetAccessAndReload}
          >
            Reiniciar acesso
          </button>
          <details className="mt-4 rounded-lg bg-muted p-3 text-left">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Detalhe da falha</summary>
            <p className="mt-2 break-words text-xs text-muted-foreground" role="status">
              {getSafeErrorMessage(this.state.error)}
            </p>
          </details>
          <a
            className="mt-4 block text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="https://landing-page-gm-two.vercel.app/"
          >
            Ir para a página da clínica
          </a>
        </section>
      </main>
    );
  }
}
