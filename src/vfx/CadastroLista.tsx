import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { normalize } from "../store"
import { tone } from "./ui"

/*
 * Padrão de telas de cadastro, igual a Animais e Tutores:
 * cards de vidro no topo · painel branco com busca, filtros e botão laranja ·
 * lista com avatar, textos em duas linhas, status e ações · rodapé com paginação.
 * Usa as mesmas classes de Animais (index.css), então o visual fica idêntico, inclusive no escuro e no celular.
 */

export type Kpi = { label: string; value: ReactNode; detail?: string; icon: ReactNode; tone?: "orange" | "aqua" | "green" | "red" | "gray" | "violet" | "blue" }
export type Filtro = { label: string; icon?: ReactNode; value: string; options: (string | [string, string])[]; onChange: (value: string) => void }
export type Coluna<T> = { label: string; w: string; cell: (row: T) => ReactNode }

export function GlassKpis({ items }: { items: Kpi[] }) {
  return (
    <div className="animals-glass-metrics cl-metrics" style={{ "--cl-n": Math.min(4, items.length) } as CSSProperties}>
      {items.map((item) => (
        <article key={item.label}>
          <i className={item.tone || "orange"}>{item.icon}</i>
          <span>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            {item.detail && <em>{item.detail}</em>}
          </span>
        </article>
      ))}
    </div>
  )
}

/* ---------- células ---------- */
export function Ident({ title, sub, tag, icon, initials, color, onClick }: { title: ReactNode; sub?: ReactNode; tag?: ReactNode; icon?: ReactNode; initials?: string; color?: string; onClick?: () => void }) {
  const style = color ? { color, background: `${color}1a`, borderColor: `${color}33` } : undefined
  return (
    <div className={`animal-identity ${onClick ? "cl-click" : ""}`} onClick={onClick}>
      <i className="animal-placeholder cl-avatar" style={style}>{icon || <b>{initials}</b>}</i>
      <span>
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
        {tag && <em>{tag}</em>}
      </span>
    </div>
  )
}
export function Duo({ title, sub, label }: { title: ReactNode; sub?: ReactNode; label?: string }) {
  return (
    <div className="animal-owner cl-duo" data-label={label}>
      <strong>{title}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}
export function Status({ status, label, toneOverride }: { status: string; label?: string; toneOverride?: string }) {
  const t = toneOverride || tone(status)
  const cls = t === "green" ? "" : t === "orange" ? "status-em-tratamento" : t === "red" ? "cl-red" : t === "blue" ? "cl-blue" : t === "violet" ? "cl-violet" : "status-inativo"
  return (
    <span className={`animal-status ${cls}`} data-label={label || "Status"}>
      <i />
      {status}
    </span>
  )
}

/* ---------- página ---------- */
export function CadastroLista<T>({
  crumb,
  title,
  headerActions,
  kpis,
  above,
  query,
  onQuery,
  placeholder,
  filtros = [],
  toolbarExtra,
  novo,
  colunas,
  rows,
  rowKey,
  onRow,
  acoes,
  vazio = "Nenhum registro encontrado",
  noun = "registros",
  children,
  perPageDefault = 8,
  acoesW = "170px",
}: {
  crumb: string
  title: string
  headerActions?: ReactNode
  kpis?: Kpi[]
  above?: ReactNode
  query: string
  onQuery: (value: string) => void
  placeholder: string
  filtros?: Filtro[]
  toolbarExtra?: ReactNode
  novo?: { label: string; onClick: () => void }
  colunas: Coluna<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRow?: (row: T) => void
  acoes?: (row: T) => ReactNode
  vazio?: string
  noun?: string
  children?: ReactNode
  perPageDefault?: number
  acoesW?: string
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(perPageDefault)
  const filtroKey = filtros.map((f) => f.value).join("|")
  useEffect(() => setPage(1), [query, filtroKey, perPage, rows.length])
  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const atual = Math.min(page, pages)
  const visiveis = rows.slice((atual - 1) * perPage, atual * perPage)
  const cols = `${colunas.map((c) => c.w).join(" ")}${acoes ? ` ${acoesW}` : ""}`
  const pageItems = useMemo(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1) as (number | "…")[]
    const set = [1, atual - 1, atual, atual + 1, pages].filter((n) => n >= 1 && n <= pages)
    const out: (number | "…")[] = []
    ;[...new Set(set)].sort((a, b) => a - b).forEach((n, i, arr) => {
      if (i && n - arr[i - 1] > 1) out.push("…")
      out.push(n)
    })
    return out
  }, [pages, atual])

  return (
    <div className="animals-page cl-page">
      <header className="cl-head">
        <div>
          <div className="cl-crumb"><b>Vetflow</b> / {crumb}</div>
          <h1>{title}</h1>
        </div>
        {headerActions && <div className="cl-head-actions">{headerActions}</div>}
      </header>

      {kpis && kpis.length > 0 && <GlassKpis items={kpis} />}
      {above}

      <section className="animals-table-card cl-card">
        <div className="animals-toolbar">
          <label className="animals-search">
            <Search />
            <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
          </label>
          {filtros.map((filtro) => (
            <label key={filtro.label} className="animals-select">
              {filtro.icon}
              <select value={filtro.value} onChange={(event) => filtro.onChange(event.target.value)} aria-label={filtro.label}>
                {filtro.options.map((option) => {
                  const [value, text] = Array.isArray(option) ? option : [option, option]
                  return <option key={value} value={value}>{text}</option>
                })}
              </select>
              <ChevronDown />
            </label>
          ))}
          {toolbarExtra}
          {novo && (
            <button type="button" className="new-animal-button" onClick={novo.onClick}>
              <Plus /> {novo.label}
            </button>
          )}
        </div>
        <div className="animals-table-scroll">
          <div className="animals-table">
            <div className="animals-table-head cl-row" style={{ gridTemplateColumns: cols }}>
              {colunas.map((c) => <strong key={c.label}>{c.label}</strong>)}
              {acoes && <strong>Ações</strong>}
            </div>
            {visiveis.length ? (
              visiveis.map((row) => (
                <div
                  key={rowKey(row)}
                  className={`animals-table-row cl-row ${onRow ? "cl-click" : ""}`}
                  style={{ gridTemplateColumns: cols }}
                  onClick={onRow ? () => onRow(row) : undefined}
                >
                  {colunas.map((c) => <div key={c.label} className="cl-cell" data-label={c.label}>{c.cell(row)}</div>)}
                  {acoes && <div className="animal-actions" data-label="Ações" onClick={(event) => event.stopPropagation()}>{acoes(row)}</div>}
                </div>
              ))
            ) : (
              <div className="animals-empty">
                <Search />
                <strong>{vazio}</strong>
                <span>Ajuste a busca ou os filtros para ver outros resultados.</span>
              </div>
            )}
          </div>
        </div>
        <footer className="animals-table-footer">
          <span>
            Mostrando {visiveis.length ? (atual - 1) * perPage + 1 : 0} a {Math.min(atual * perPage, rows.length)} de {rows.length} {noun}
          </span>
          <div className="animals-pagination">
            <button type="button" aria-label="Página anterior" disabled={atual === 1} onClick={() => setPage(Math.max(1, atual - 1))}><ChevronLeft /></button>
            {pageItems.map((value, index) =>
              value === "…" ? <span key={`e${index}`}>…</span> : <button type="button" key={value} className={atual === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>,
            )}
            <button type="button" aria-label="Próxima página" disabled={atual === pages} onClick={() => setPage(Math.min(pages, atual + 1))}><ChevronRight /></button>
          </div>
          <label>
            <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} aria-label="Itens por página">
              {[8, 16, 32].map((n) => <option key={n} value={n}>{n} por página</option>)}
            </select>
            <ChevronDown />
          </label>
        </footer>
      </section>
      {children}
    </div>
  )
}

/* ---------- alternância lista / visão antiga ---------- */
export function useModo(chave: string, padrao = "lista") {
  const key = `vetflow-modo-${chave}`
  const [modo, setModoRaw] = useState(() => {
    try { return localStorage.getItem(key) || padrao } catch { return padrao }
  })
  const setModo = (value: string) => {
    setModoRaw(value)
    try { localStorage.setItem(key, value) } catch { /* ok */ }
  }
  return [modo, setModo] as const
}
export function ModoSwitch({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="cl-modo" role="tablist" aria-label="Forma de exibir">
      {options.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  )
}
/** Barra que fica acima da visão antiga para voltar à lista. */
export function ModoBar(props: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="cl-modobar">
      <ModoSwitch {...props} />
    </div>
  )
}

/** Subtítulo útil (ignora o texto genérico dos dados de exemplo: unidade, "atualizado em", quantidade). */
export const subUtil = (text?: string) => {
  const parts = String(text || "").split(" • ").map((p) => p.trim()).filter((p) => p && !/atualizado|^\d+([.,]\d+)? ?un\.?$|^m[ií]nimo|mirante|nova uni|urup|unidade/i.test(p))
  return parts[0] || undefined
}
const GENERIC = /^(rotina|prioridade)$/i
export const categoriaUtil = (value?: string) => (value && !GENERIC.test(value) ? value : undefined)

export const initialsOf = (name = "") => normalize(name).replace(/^(dra?\.)\s*/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "VF"
