import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

/*
 * Botões padrão de cada linha de lista: Ver, Editar, Excluir (sempre nesta ordem, mesmo
 * tamanho e mesmo ícone em todas as telas). Ações extras entram antes do Excluir.
 */
export default function RowActions({
  name,
  onView,
  onEdit,
  onDelete,
  deleteLabel = "Excluir",
  deleteDisabled,
  children,
}: {
  name: string
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  deleteLabel?: string
  /** Motivo para não poder excluir (o botão fica desativado com esta explicação). */
  deleteDisabled?: string
  children?: ReactNode
}) {
  return (
    <span className="vx-ra" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {onView && (
        <button type="button" title="Ver" aria-label={`Ver ${name}`} onClick={onView}>
          <Eye />
        </button>
      )}
      {onEdit && (
        <button type="button" title="Editar" aria-label={`Editar ${name}`} onClick={onEdit}>
          <Pencil />
        </button>
      )}
      {children}
      {onDelete && (
        <button
          type="button"
          className="danger"
          title={deleteDisabled || deleteLabel}
          aria-label={`${deleteLabel} ${name}`}
          disabled={!!deleteDisabled}
          onClick={onDelete}
        >
          <Trash2 />
        </button>
      )}
    </span>
  )
}

/** Botão extra no mesmo formato (ex.: imprimir, agendar, mais opções). */
export function RowButton({ title, onClick, children, expanded }: { title: string; onClick: () => void; children: ReactNode; expanded?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} aria-expanded={expanded} onClick={onClick}>
      {children}
    </button>
  )
}

/**
 * Botão "Mais opções" com menu que abre por cima de tudo (portal no body, posição fixa),
 * sem ser cortado pela tabela nem ficar atrás das outras linhas.
 */
export function RowMenu({ items }: { items: [string, () => void, boolean?][] }) {
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener("click", close)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      window.removeEventListener("keydown", onKey)
    }
  }, [pos])
  const toggle = (event: MouseEvent) => {
    event.stopPropagation()
    if (pos) return setPos(null)
    const r = ref.current!.getBoundingClientRect()
    const height = items.length * 42 + 12
    const up = r.bottom + height > window.innerHeight - 8 && r.top > height
    setPos({ top: up ? r.top - height - 6 : r.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - 228, r.right - 220)), up })
  }
  return (
    <>
      <button ref={ref} type="button" title="Mais opções" aria-label="Mais opções" aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle}>
        <MoreHorizontal />
      </button>
      {pos &&
        createPortal(
          <div className="vx-rowmenu-fixed" role="menu" style={{ top: pos.top, left: pos.left }} onClick={(event) => event.stopPropagation()}>
            {items.map(([label, run, danger]) => (
              <button key={label} type="button" role="menuitem" className={danger ? "danger" : ""} onClick={() => { setPos(null); run() }}>
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
