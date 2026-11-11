import { Component, lazy, type ComponentType, type ErrorInfo, type ReactNode } from "react"

/*
 * Inicialização resistente para o Figma Make (e para qualquer atualização publicada).
 *
 * Quando o código muda enquanto a prévia está aberta, o navegador pode ainda ter o módulo
 * antigo em memória e falhar ao buscar uma tela carregada sob demanda ("Failed to fetch
 * dynamically imported module"). Antes isso deixava a prévia presa numa versão anterior ou
 * numa tela de erro. Agora a página recarrega uma única vez, sozinha, e abre a versão atual.
 */
const RELOAD_KEY = "vetflow-boot-reload"
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Unable to preload CSS/i

export const isChunkError = (error: unknown) => CHUNK_ERROR.test(String((error as Error)?.message || error || ""))

/** Recarrega a página no máximo uma vez a cada 20 s (evita laço infinito). */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 20_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    /* sem sessionStorage: recarrega mesmo assim */
  }
  window.location.reload()
  return true
}

export function installBootRecovery() {
  // evento do Vite quando um pré-carregamento de tela falha
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault()
    reloadOnce()
  })
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkError(event.reason)) reloadOnce()
  })
  // se a página abriu bem, libera uma nova recarga automática no futuro
  window.setTimeout(() => {
    try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* ok */ }
  }, 30_000)
}

/** `lazy` que se recupera de telas desatualizadas recarregando a página uma vez. */
export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkError(error) && reloadOnce()) return new Promise<{ default: T }>(() => {})
      throw error
    }),
  )
}

/* Se algo quebrar antes do app montar (por exemplo, dados antigos salvos no navegador),
   mostra uma saída em vez da tela branca. */
export class BootBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[VetFlow] erro ao iniciar", error, info.componentStack)
    if (isChunkError(error)) reloadOnce()
  }
  render() {
    if (!this.state.error) return this.props.children
    const reset = () => {
      try {
        Object.keys(localStorage).filter((k) => k.startsWith("vetflow-state")).forEach((k) => localStorage.removeItem(k))
      } catch { /* ok */ }
      window.location.replace("/")
    }
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif", background: "#f4f6f9", color: "#1a2233", textAlign: "center" }}>
        <div style={{ maxWidth: 440 }}>
          <strong style={{ display: "block", fontSize: 22, marginBottom: 8 }}>O VetFlow não conseguiu abrir.</strong>
          <p style={{ margin: "0 0 18px", color: "#5d6675", lineHeight: 1.5 }}>Normalmente é uma versão antiga guardada no navegador. Recarregue; se continuar, restaure os dados de exemplo.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 42, padding: "0 18px", borderRadius: 999, border: 0, background: "#e94f17", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Recarregar</button>
            <button type="button" onClick={reset} style={{ minHeight: 42, padding: "0 18px", borderRadius: 999, border: "1px solid #d5dae2", background: "#fff", color: "#1a2233", fontWeight: 700, cursor: "pointer" }}>Restaurar dados de exemplo</button>
          </div>
        </div>
      </div>
    )
  }
}
