import type { MouseEventHandler, ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * Renderiza janelas, gavetas e avisos direto no <body>, acima de tudo
 * (cabeçalho do sistema, título da página, cartões de vidro).
 */
export default function Layer({ className, onMouseDown, children }: { className: string; onMouseDown?: MouseEventHandler<HTMLDivElement>; children?: ReactNode }) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div className="vx op op-vx op-portal">
      <div className={className} onMouseDown={onMouseDown} {...(/toast/.test(className) ? { role: "status", "aria-live": "polite" as const } : {})}>{children}</div>
    </div>,
    document.body,
  )
}
