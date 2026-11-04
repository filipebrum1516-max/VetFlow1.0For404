import type { ReactNode } from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"

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
