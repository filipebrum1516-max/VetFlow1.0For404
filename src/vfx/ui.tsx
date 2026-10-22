import { createPortal } from "react-dom"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useLocation, useNavigate } from "react-router"
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { normalize, type Item, type ModuleSlug } from "../store"
export const normalizeText = normalize

/* ---------------- utilidades ---------------- */
export const palette = [
  "#e94f17",
  "#2457c5",
  "#0f766e",
  "#6d4bc2",
  "#b4325e",
  "#9a6212",
  "#2b7a4b",
  "#2f78bf",
]

export function hash(text: string) {
  let value = 0
  for (let index = 0; index < text.length; index++)
    value = (value * 31 + text.charCodeAt(index)) >>> 0
  return value
}

export function colorFor(text: string) {
  return palette[hash(text || "vetflow") % palette.length]
}

export function initials(name = "") {
  const clean = name.replace(/^(Dr|Dra)\.?\s+/i, "")
  return (
    clean
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VF"
  )
}

export function brl(value: number) {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number") return value
  const text = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .trim()
  if (!text) return 0
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function todayISO() {
  return isoDate(new Date())
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export function fmtDate(iso?: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—"
  const date = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("pt-BR", opts)
}

export function fmtLong(iso: string) {
  return fmtDate(iso, { weekday: "short", day: "2-digit", month: "short" })
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) /
      86_400_000,
  )
}

export function itemDate(item: Item) {
  return item.date || item.createdAt.slice(0, 10)
}

export function matches(item: Item, query: string) {
  if (!query.trim()) return true
  return normalize(
    `${item.name} ${item.subtitle} ${item.status} ${item.animal || ""} ${item.owner || ""} ${item.professional || ""} ${item.category || ""}`,
  ).includes(normalize(query))
}

export function tone(status = "") {
  const value = normalize(status)
  if (
    /(atras|vencid|urgent|critic|cancel|bloque|falt|suspens|glos|abaixo|faleci|inadimpl)/.test(
      value,
    )
  )
    return "red"
  if (
    /(pend|aguard|a vencer|vencendo|analise|rascunho|aberta|pre-op|triagem|observ|renova|convite|agendad|solicitad|a receber|chegou)/.test(
      value,
    )
  )
    return "orange"
  if (/(andamento|atendimento|em uso|ativa$|plantao|internado|em tratamento)/.test(value))
    return "blue"
  if (/(conclu|aplicad|assinad|resolvid|recebid|pago|publicad|alta|aprovad|ativo|ativa|confirmad|disponivel|enviad|lida|respondid|atualizado|gerado)/.test(value))
    return "green"
  return "gray"
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`vx-status vx-s-${tone(status)}`}>
      <i
        className="vx-dot"
        style={{ background: "currentColor", width: 6, height: 6 }}
      />
      {status}
    </span>
  )
}

/* ---------------- toast ---------------- */
export function useToast() {
  const [message, setMessage] = useState("")
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((text: string) => {
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(""), 3600)
  }, [])
  const node = message
    ? createPortal(
        <div className="vx-toast" role="status">
          <Check />
          {message}
        </div>,
        document.body,
      )
    : null
  return [node, show] as const
}

/* ---------------- página ---------------- */
export type Blob = [string, number | string, number | string, number, number]

export function Page({
  bg,
  bgDark,
  blobs = [],
  crumb,
  title,
  sub,
  actions,
  className = "",
  children,
  style,
}: {
  bg: string
  bgDark?: string
  blobs?: Blob[]
  crumb: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      className={`vx vx-page ${className}`}
      style={
        {
          "--vx-bg": bg,
          "--vx-bg-dark": bgDark || "#0e131b",
          ...style,
        } as CSSProperties
      }
    >
      {blobs.map(([color, left, top, width, height], index) => (
        <div
          key={index}
          className="vx-blob"
          aria-hidden="true"
          style={{ background: color, left, top, width, height }}
        />
      ))}
      <div className="vx-top">
        <div>
          <div className="vx-crumb">
            <b>Vetflow</b> / {crumb}
          </div>
          <h1 className="vx-h1">{title}</h1>
          {sub && <p className="vx-sub">{sub}</p>}
        </div>
        {actions && <div className="vx-actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: (T | [T, string])[]
  value: T
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className="vx-seg" role="tablist" aria-label={label}>
      {options.map((option) => {
        const [key, text] = Array.isArray(option) ? option : [option, option]
        return (
          <button
            key={key}
            role="tab"
            aria-selected={value === key}
            className={value === key ? "on" : ""}
            onClick={() => onChange(key)}
            type="button"
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  style?: CSSProperties
}) {
  return (
    <label className="vx-search" style={style}>
      <Search />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          style={{
            border: 0,
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            display: "grid",
            padding: 0,
          }}
        >
          <X size={15} />
        </button>
      )}
    </label>
  )
}

export function Pager({
  page,
  pages,
  onPage,
  label,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
  label?: string
}) {
  return (
    <div className="vx-pager">
      <button
        className="vx-icon-btn"
        aria-label="Anterior"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <ChevronLeft />
      </button>
      <span>{label || `${page} de ${Math.max(1, pages)}`}</span>
      <button
        className="vx-icon-btn"
        aria-label="Próximo"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        <ChevronRight />
      </button>
    </div>
  )
}

export function Modal({
  title,
  text,
  children,
  onClose,
  actions,
}: {
  title: string
  text?: string
  children?: ReactNode
  onClose: () => void
  actions?: ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div className="vx-modal-layer" onMouseDown={onClose}>
      <div
        className="vx-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        {children}
        {actions && <div className="vx-modal-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({
  title,
  text,
  confirm = "Confirmar",
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  text: string
  confirm?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      title={title}
      text={text}
      onClose={onCancel}
      actions={
        <>
          <button className="vx-btn vx-btn-g" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={`vx-btn ${danger ? "vx-btn-d" : "vx-btn-p"}`}
            onClick={onConfirm}
            type="button"
          >
            {confirm}
          </button>
        </>
      }
    />
  )
}

/** Abre a gaveta quando a URL vem com ?novo=1 e devolve os parâmetros. */
export function useQueryFlag(onNovo: (params: URLSearchParams) => void) {
  const location = useLocation()
  const navigate = useNavigate()
  const handled = useRef("")
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("novo") === "1" && handled.current !== location.key) {
      handled.current = location.key
      onNovo(params)
      params.delete("novo")
      const rest = params.toString()
      navigate(`${location.pathname}${rest ? `?${rest}` : ""}`, {
        replace: true,
      })
    }
  }, [location, navigate, onNovo])
}

export function useQueryParam(name: string) {
  const location = useLocation()
  return new URLSearchParams(location.search).get(name) || ""
}

export function usePaged<T>(items: T[], perPage: number, reset: unknown[] = []) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1)
  }, reset)
  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])
  return {
    page,
    pages,
    setPage,
    visible: items.slice((page - 1) * perPage, page * perPage),
  }
}

export function moduleLabel(slug: ModuleSlug) {
  const labels: Partial<Record<ModuleSlug, string>> = {
    consultas: "Consultas",
    profissionais: "Profissionais",
    vacinas: "Vacinas",
    prescricoes: "Prescrições",
    medicamentos: "Medicamentos",
    exames: "Exames",
    procedimentos: "Procedimentos",
    cirurgias: "Cirurgias",
    internacoes: "Internações",
    protocolos: "Protocolos",
    servicos: "Serviços",
    estoque: "Estoque",
    financeiro: "Financeiro",
    convenios: "Convênios",
    unidades: "Unidades",
    teleatendimentos: "Teleatendimentos",
    comunicacao: "Comunicação",
    publicacoes: "Publicações",
    documentos: "Documentos",
    ocorrencias: "Ocorrências",
    usuarios: "Usuários e Acessos",
  }
  return labels[slug] || slug
}

/* ---------------- assinatura digital no padrão gov.br ---------------- */
export function GovSign({ name, when, compact }: { name: string; when?: string; compact?: boolean }) {
  const date = when ? new Date(when.length <= 10 ? `${when}T10:24:31` : when) : new Date()
  const stamp = `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}-0300`
  const line: CSSProperties = { display: "block", fontSize: compact ? 9 : 10, color: "#333", lineHeight: 1.3 }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: compact ? "6px 10px" : "8px 14px", border: "1px solid #cfd4dc", borderRadius: 2, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.06)", color: "#1a2233", fontFamily: "Arial, Helvetica, sans-serif", textAlign: "left", maxWidth: "100%" }}>
      <svg aria-label="gov.br" role="img" viewBox="0 0 96 40" width={compact ? 64 : 82} height={compact ? 27 : 34} style={{ flex: "none" }}>
        <text x="0" y="29" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontWeight="900" fontSize="30" letterSpacing="-1.5">
          <tspan fill="#2670E8">g</tspan>
          <tspan fill="#FFCD07">o</tspan>
          <tspan fill="#168821">v</tspan>
          <tspan fill="#2670E8">.br</tspan>
        </text>
      </svg>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={line}>Documento assinado digitalmente</span>
        <strong style={{ display: "block", fontSize: compact ? 10 : 11, fontWeight: 700, color: "#000", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name.toUpperCase()}</strong>
        <span style={line}>Data: {stamp}</span>
        <span style={line}>Verifique em https://validar.iti.gov.br</span>
      </span>
    </div>
  )
}
