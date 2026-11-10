import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useDescartar } from "./ui"
import { createPortal } from "react-dom"
import { AlertTriangle, X } from "lucide-react"

/*
 * Padrão único de cadastro (gaveta lateral). Todo cadastro do sistema usa esta casca:
 * cabeçalho com título e o que é o cadastro, seções numeradas com título curto,
 * rótulos acima dos campos, * para obrigatório, mensagem de erro logo abaixo do campo
 * e rodapé fixo com Cancelar e o botão principal.
 */
export function CadastroDrawer({
  title,
  sub,
  onClose,
  onSubmit,
  submitLabel,
  error,
  note,
  children,
}: {
  title: string
  sub?: string
  onClose: () => void
  /** Recebe o próprio formulário (para ler os campos com FormData, se preciso). */
  onSubmit: (form: HTMLFormElement) => void
  submitLabel: string
  error?: string
  note?: string
  children: ReactNode
}) {
  const [sujo, setSujo] = useState(false)
  const descartar = useDescartar(onClose, sujo)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") descartar.tentar()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(event.currentTarget)
  }

  return createPortal(
    <div className="vx-drawer-layer" onMouseDown={descartar.tentar}>
      <form
        className="vx-drawer cad-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        onInput={() => setSujo(true)}
        onChange={() => setSujo(true)}
        onClick={(event) => { if ((event.target as HTMLElement).closest?.(".vx-pick-list button, .vx-db .vx-chip, .vx-db [aria-pressed]")) setSujo(true) }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="vx-dh">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="vx-dt">{title}</h2>
          </div>
          <button className="vx-xb" aria-label="Fechar" onClick={descartar.tentar} type="button">
            <X />
          </button>
        </div>
        <div className="vx-db">{children}</div>
        {error && (
          <div className="vx-note" role="alert" style={{ margin: "0 26px 10px", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertTriangle size={16} color="#b4322a" />
            <span>{error}</span>
          </div>
        )}
        <div className="vx-df">
          <span className="sp">{note || "Campos com * são obrigatórios"}</span>
          <button className="vx-btn vx-btn-g" type="button" onClick={descartar.tentar}>
            Cancelar
          </button>
          <button className="vx-btn vx-btn-p" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
      {descartar.node}
    </div>,
    document.body,
  )
}

/** Seção numerada dentro do cadastro, com título curto e, se precisar, uma explicação. */
export function CadSec({ n, title, desc, children }: { n: number; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="vx-sec">
      <div className="vx-sh">
        <span className="n">{n}</span>
        <b>{title}</b>
        {desc && <span className="d">{desc}</span>}
      </div>
      <div className="vx-g">{children}</div>
    </section>
  )
}

/** Campo com rótulo sempre visível acima; erro ou dica embaixo. Use com input/select/textarea de classe vx-in. */
export function Campo({
  label,
  req,
  span = 3,
  error,
  hint,
  children,
}: {
  label: string
  req?: boolean
  span?: 1 | 2 | 3 | 4 | 5 | 6
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className={`vx-f vx-c${span}`}>
      <span className="vx-fl">
        {label} {req && <i>*</i>}
      </span>
      {children}
      {error ? <span className="vx-err" role="alert">{error}</span> : hint ? <span className="vx-hint">{hint}</span> : null}
    </label>
  )
}

export const cadInput = (error?: string) => `vx-in${error ? " bad" : ""}`
