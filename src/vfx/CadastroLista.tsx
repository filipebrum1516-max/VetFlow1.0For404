import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, ChevronLeft, ChevronRight, Download, Plus, Search, X } from "lucide-react"
import { accessLevel, normalize, useVetFlow } from "../store"
import { tone } from "./ui"

/*
 * Lista VetFlow — o padrão único de todas as listas do sistema.
 * Sempre na mesma ordem: cabeçalho (um único botão laranja) · 4 indicadores de vidro que também filtram ·
 * painel branco com abas de situação (com contador), busca e filtros, etiquetas dos filtros ativos ·
 * linhas com seleção, identidade, colunas em duas linhas, situação e ações redondas · barra de ações em massa ·
 * rodapé com paginação. <ListaCard> é o painel; <CadastroLista> é a página inteira.
 */

export type Kpi = {
  label: string
  value: ReactNode
  detail?: string
  icon: ReactNode
  tone?: "orange" | "aqua" | "green" | "red" | "gray" | "violet" | "blue"
  /** Ao tocar no card, liga esta aba (e desliga ao tocar de novo). */
  aba?: string
  onClick?: () => void
  active?: boolean
}
export type Filtro = { label: string; icon?: ReactNode; value: string; options: (string | [string, string])[]; onChange: (value: string) => void }
export type Coluna<T> = { label: string; w: string; cell: (row: T) => ReactNode; align?: "right"; /** false = some quando a ficha lateral está aberta (sobra espaço para ela). */ ficha?: false }
export type Aba = { key: string; label: string; count?: number; tone?: "red" }
export type Chip = { label: string; onClear: () => void }

export function GlassKpis({ items, aba, onAba }: { items: Kpi[]; aba?: string; onAba?: (key: string) => void }) {
  return (
    <div className="animals-glass-metrics cl-metrics" style={{ "--cl-n": Math.min(4, items.length) } as CSSProperties}>
      {items.map((item) => {
        const clicavel = !!item.onClick || (!!item.aba && !!onAba)
        const ativo = item.active ?? (!!item.aba && aba === item.aba)
        const corpo = (
          <>
            <i className={item.tone || "orange"}>{item.icon}</i>
            <span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              {item.detail && <em>{item.detail}</em>}
            </span>
          </>
        )
        if (!clicavel) return <article key={item.label}>{corpo}</article>
        return (
          <article key={item.label} className={`lv-kpi-btn ${ativo ? "on" : ""}`}>
            <button
              type="button"
              aria-pressed={ativo}
              title={ativo ? "Mostrar tudo" : `Filtrar: ${item.label}`}
              onClick={() => (item.onClick ? item.onClick() : onAba?.(ativo ? "" : item.aba!))}
            >
              {corpo}
            </button>
          </article>
        )
      })}
    </div>
  )
}

/* ---------- células ---------- */
export function Ident({ title, sub, tag, icon, initials, color, onClick, square }: { title: ReactNode; sub?: ReactNode; tag?: ReactNode; icon?: ReactNode; initials?: string; color?: string; onClick?: () => void; square?: boolean }) {
  const style = color ? { color, background: `${color}1a`, borderColor: `${color}33` } : undefined
  return (
    <div className={`animal-identity lv-id ${onClick ? "cl-click" : ""}`} onClick={onClick}>
      <i className={`animal-placeholder cl-avatar ${square ? "sq" : ""}`} style={style}>{icon || <b>{initials}</b>}</i>
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

/* ---------- exportar (CSV que abre no Excel) ---------- */
export function baixarCsv(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return
  const cols = Object.keys(linhas[0])
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const csv = "﻿" + [cols.map(esc).join(";"), ...linhas.map((l) => cols.map((c) => esc(l[c])).join(";"))].join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `${normalize(nome).replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/* ---------- o painel da lista ---------- */
export function ListaCard<T>({
  abas,
  aba,
  onAba,
  query,
  onQuery,
  placeholder,
  filtros = [],
  chips = [],
  toolbarExtra,
  colunas,
  rows,
  rowKey,
  onRow,
  acoes,
  acoesW = "170px",
  emMassa,
  exportar,
  noun = "registros",
  vazio = "Nenhum registro encontrado",
  perPageDefault = 8,
  resumo,
  className = "",
  label,
  ativo,
}: {
  abas?: Aba[]
  aba?: string
  onAba?: (key: string) => void
  query: string
  onQuery: (value: string) => void
  placeholder: string
  filtros?: Filtro[]
  /** Etiquetas extras de filtros que não estão na barra (ex.: período escolhido no gráfico). */
  chips?: Chip[]
  toolbarExtra?: ReactNode
  colunas: Coluna<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRow?: (row: T) => void
  acoes?: (row: T) => ReactNode
  acoesW?: string
  /** Botões da barra que aparece ao marcar linhas. */
  emMassa?: (selecionados: T[], limpar: () => void) => ReactNode
  /** Liga o botão Exportar (planilha) para as linhas marcadas. */
  exportar?: { nome: string; linha: (row: T) => Record<string, unknown> }
  noun?: string
  vazio?: string
  perPageDefault?: number
  /** Texto extra no rodapé (ex.: totais). */
  resumo?: ReactNode
  className?: string
  label?: string
  /** Linha aberta na ficha lateral. */
  ativo?: string
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(perPageDefault)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const filtroKey = filtros.map((f) => f.value).join("|")
  useEffect(() => setPage(1), [query, filtroKey, perPage, rows.length, aba])
  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const atual = Math.min(page, pages)
  const visiveis = rows.slice((atual - 1) * perPage, atual * perPage)
  const selecionavel = !!emMassa || !!exportar
  // colunas encolhem até 75% antes de a linha virar cartão (nada de rolagem para o lado)
  const flex = (w: string) => /^\d+px$/.test(w) ? `minmax(${Math.round(parseInt(w) * 0.75)}px, ${w})` : w.replace(/minmax\((\d+)px/, (_, n) => `minmax(${Math.round(Number(n) * 0.75)}px`)
  const cols = `${selecionavel ? "24px " : ""}${colunas.map((c) => flex(c.w)).join(" ")}${acoes ? ` ${acoesW}` : ""}`
  const minTotal = [selecionavel ? 24 : 0, ...colunas.map((c) => Number(flex(c.w).match(/(\d+)px/)?.[1] || 80)), acoes ? parseInt(acoesW) : 0].reduce((a, b) => a + b, 0) + (colunas.length + (acoes ? 1 : 0)) * 14 + 40
  const cardRef = useRef<HTMLElement>(null)
  const [estreito, setEstreito] = useState(false)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([entry]) => setEstreito(entry.contentRect.width < minTotal))
    ro.observe(el)
    return () => ro.disconnect()
  }, [minTotal])
  const colStyle = { gridTemplateColumns: cols, "--lv-cols": cols } as CSSProperties
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

  const ids = new Set(rows.map(rowKey))
  const marcados = rows.filter((r) => sel[rowKey(r)])
  const todosVisiveis = visiveis.length > 0 && visiveis.every((r) => sel[rowKey(r)])
  const limpar = () => setSel({})
  useEffect(() => {
    // tira da seleção o que sumiu da lista (filtro, exclusão)
    if (Object.keys(sel).some((k) => sel[k] && !ids.has(k))) setSel((s) => Object.fromEntries(Object.entries(s).filter(([k]) => ids.has(k))))
  })

  const ativos: Chip[] = [
    ...filtros
      .filter((f) => f.options.length && f.value !== (Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]))
      .map((f) => {
        const opt = f.options.find((o) => (Array.isArray(o) ? o[0] : o) === f.value)
        const first = f.options[0]
        return { label: `${f.label}: ${Array.isArray(opt) ? opt[1] : opt ?? f.value}`, onClear: () => f.onChange(Array.isArray(first) ? first[0] : first) }
      }),
    ...(query.trim() ? [{ label: `Busca: “${query.trim()}”`, onClear: () => onQuery("") }] : []),
    ...chips,
  ]

  return (
    <section ref={cardRef} className={`animals-table-card cl-card lv-card ${estreito ? "lv-narrow" : ""} ${className}`} aria-label={label || noun}>
      {abas && abas.length > 0 && (
        <nav className="lv-tabs" role="tablist" aria-label="Situação">
          {abas.map((a) => (
            <button key={a.key} type="button" role="tab" aria-selected={aba === a.key} className={`lv-tab ${aba === a.key ? "on" : ""} ${a.tone || ""}`} onClick={() => onAba?.(a.key)}>
              {a.label}
              {a.count !== undefined && <b>{a.count.toLocaleString("pt-BR")}</b>}
            </button>
          ))}
        </nav>
      )}
      <div className="animals-toolbar lv-tools">
        <label className="animals-search lv-search">
          <Search />
          <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
          {query && <button type="button" className="lv-search-x" aria-label="Limpar busca" onClick={() => onQuery("")}><X /></button>}
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
        {toolbarExtra && <span className="lv-spacer" />}
        {toolbarExtra}
      </div>
      {ativos.length > 0 && (
        <div className="lv-chips">
          <span>Filtros ativos:</span>
          {ativos.map((c) => (
            <button key={c.label} type="button" className="lv-chip" onClick={c.onClear} aria-label={`Remover filtro ${c.label}`}>
              {c.label} <X />
            </button>
          ))}
          {ativos.length > 1 && <button type="button" className="lv-link" onClick={() => ativos.forEach((c) => c.onClear())}>Limpar tudo</button>}
        </div>
      )}
      <div className="animals-table-scroll">
        <div className="animals-table">
          <div className="animals-table-head cl-row" style={colStyle}>
            {selecionavel && (
              <input
                type="checkbox"
                className="lv-check"
                aria-label="Marcar todos desta página"
                checked={todosVisiveis}
                onChange={() => setSel((s) => ({ ...s, ...Object.fromEntries(visiveis.map((r) => [rowKey(r), !todosVisiveis])) }))}
              />
            )}
            {colunas.map((c) => <strong key={c.label} className={c.align === "right" ? "r" : ""}>{c.label}</strong>)}
            {acoes && <strong className="r">Ações</strong>}
          </div>
          {visiveis.length ? (
            visiveis.map((row) => {
              const key = rowKey(row)
              const on = !!sel[key]
              return (
                <div
                  key={key}
                  className={`animals-table-row cl-row ${onRow ? "cl-click" : ""} ${on ? "sel" : ""} ${ativo === key ? "lv-cur" : ""}`}
                  aria-current={ativo === key ? "true" : undefined}
                  style={colStyle}
                  onClick={onRow ? () => onRow(row) : undefined}
                >
                  {selecionavel && (
                    <input
                      type="checkbox"
                      className="lv-check"
                      aria-label="Marcar linha"
                      checked={on}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => setSel((s) => ({ ...s, [key]: !on }))}
                    />
                  )}
                  {colunas.map((c) => <div key={c.label} className={`cl-cell ${c.align === "right" ? "r" : ""}`} data-label={c.label}>{c.cell(row)}</div>)}
                  {acoes && <div className="animal-actions" data-label="Ações" onClick={(event) => event.stopPropagation()}>{acoes(row)}</div>}
                </div>
              )
            })
          ) : (
            <div className="animals-empty">
              <Search />
              <strong>{vazio}</strong>
              <span>Ajuste a busca ou os filtros para ver outros resultados.</span>
              {ativos.length > 0 && <button type="button" className="lv-link" onClick={() => ativos.forEach((c) => c.onClear())}>Limpar filtros</button>}
            </div>
          )}
        </div>
      </div>
      {marcados.length > 0 && (
        <div className="lv-bulk" role="region" aria-label="Ações para os marcados">
          <strong>{marcados.length} {marcados.length === 1 ? "marcado" : "marcados"}</strong>
          <span className="lv-spacer" />
          {emMassa?.(marcados, limpar)}
          {exportar && (
            <button type="button" onClick={() => baixarCsv(exportar.nome, marcados.map(exportar.linha))}>
              <Download /> Exportar planilha
            </button>
          )}
          <button type="button" onClick={limpar}><X /> Desmarcar</button>
        </div>
      )}
      <footer className="animals-table-footer">
        <span>
          Mostrando {visiveis.length ? (atual - 1) * perPage + 1 : 0}–{Math.min(atual * perPage, rows.length)} de {rows.length.toLocaleString("pt-BR")} {noun}
          {resumo && <> · {resumo}</>}
        </span>
        <div className="animals-pagination">
          <button type="button" aria-label="Página anterior" disabled={atual === 1} onClick={() => setPage(Math.max(1, atual - 1))}><ChevronLeft /></button>
          {pageItems.map((value, index) =>
            value === "…" ? <span key={`e${index}`}>…</span> : <button type="button" key={value} aria-current={atual === value ? "page" : undefined} className={atual === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>,
          )}
          <button type="button" aria-label="Próxima página" disabled={atual === pages} onClick={() => setPage(Math.min(pages, atual + 1))}><ChevronRight /></button>
        </div>
        <label>
          <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} aria-label="Itens por página">
            {[...new Set([perPageDefault, 8, 16, 32])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} por página</option>)}
          </select>
          <ChevronDown />
        </label>
      </footer>
    </section>
  )
}

/* ---------- a página inteira ---------- */
type ListaProps<T> = Parameters<typeof ListaCard<T>>[0]
export function CadastroLista<T>({
  crumb,
  title,
  sub,
  headerActions,
  kpis,
  above,
  novo,
  children,
  ficha,
  atual: atualControlado,
  onAtual,
  ...lista
}: ListaProps<T> & {
  crumb: string
  title: string
  sub?: ReactNode
  headerActions?: ReactNode
  kpis?: Kpi[]
  above?: ReactNode
  novo?: { label: string; onClick: () => void }
  children?: ReactNode
  /** Ficha lateral do registro escolhido (lista à esquerda, ficha à direita). */
  ficha?: (row: T) => ReactNode
  /** Registro aberto na ficha (quando a página controla a escolha). */
  atual?: string
  onAtual?: (key: string) => void
}) {
  const { user } = useVetFlow()
  // perfil com "Ver" nesta área: consulta, mas não cadastra, edita nem exclui
  const area = typeof window !== "undefined" ? window.location.pathname.split("/")[1] || "dashboard" : ""
  const soVer = !!user && accessLevel(user.role, area, user.perms) === "Ver"
  if (soVer) {
    novo = undefined
    lista = { ...lista, acoes: undefined, emMassa: undefined }
  }
  const [atualInterno, setAtualInterno] = useState("")
  const atualKey = atualControlado ?? atualInterno
  const setAtualKey = (k: string) => { setAtualInterno(k); onAtual?.(k) }
  const asideRef = useRef<HTMLDivElement>(null)
  const atual = ficha ? lista.rows.find((r) => lista.rowKey(r) === atualKey) || lista.rows[0] : undefined
  const escolher = (row: T) => {
    setAtualKey(lista.rowKey(row))
    if (typeof window !== "undefined" && window.innerWidth < 1100) window.setTimeout(() => asideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40)
  }
  // com a ficha aberta a lista fica com 3 colunas: quem é, o dado principal e a situação
  const visiveisF = lista.colunas.filter((c) => c.ficha !== false)
  const colsFicha = (visiveisF.length > 3 ? [visiveisF[0], visiveisF[1], visiveisF[visiveisF.length - 1]] : visiveisF).map((c, i) => (i === 0 ? { ...c, w: "minmax(200px,1.6fr)" } : { ...c, w: "minmax(96px,.8fr)" }))
  const corpo = ficha ? (
    <div className="cd-grid">
      <ListaCard {...lista} acoes={undefined} colunas={colsFicha} onRow={escolher} ativo={atual ? lista.rowKey(atual) : undefined} className={`cd-list ${lista.className || ""}`} />
      <div ref={asideRef} className="cd-side-wrap">
        {atual ? ficha(atual) : <aside className="cd-side"><section className="cd-pane"><p className="cd-empty">Nada para mostrar com estes filtros.</p></section></aside>}
      </div>
    </div>
  ) : (
    <ListaCard {...lista} />
  )
  return (
    <div className="animals-page cl-page">
      <header className="cl-head">
        <div>
          <div className="cl-crumb"><b>VetFlow</b> / {crumb}</div>
          <h1>{title}</h1>
          {sub && <p className="cl-sub">{sub}</p>}
        </div>
        {(headerActions || novo) && (
          <div className="cl-head-actions">
            {headerActions}
            {novo && (
              <button type="button" className="new-animal-button lv-cta" onClick={novo.onClick}>
                <Plus /> {novo.label}
              </button>
            )}
          </div>
        )}
      </header>

      {kpis && kpis.length > 0 && <GlassKpis items={kpis} aba={lista.aba} onAba={lista.onAba && ((k) => lista.onAba!(k || lista.abas?.[0]?.key || ""))} />}
      {above}
      {corpo}
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

/** Painel lateral de vidro (detalhes de um cadastro sem sair da lista). */
export function Painel({ title, sub, onClose, children, foot }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div className="vx-drawer-layer cl-layer" onMouseDown={onClose}>
      <aside className="cl-sheet" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cl-sheet-head">
          <div>{title}{sub && <p>{sub}</p>}</div>
          <button type="button" className="cl-x" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <div className="cl-sheet-body">{children}</div>
        {foot && <footer className="cl-sheet-foot">{foot}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
