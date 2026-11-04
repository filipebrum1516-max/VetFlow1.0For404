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
    /(atras|vencid|urgent|critic|cancel|bloque|falt|suspens|glos|abaixo|faleci|inadimpl|recusad)/.test(
      value,
    )
  )
    return "red"
  if (
    /(pend|aguard|a vencer|vencendo|analise|rascunho|aberta|pre-op|triagem|observ|renova|convite|agendad|solicitad|a receber|chegou|parcial|aberto)/.test(
      value,
    )
  )
    return "orange"
  if (/(andamento|atendimento|em uso|ativa$|plantao|internado|em tratamento)/.test(value))
    return "blue"
  if (/(conclu|^paga$|convertid|aplicad|assinad|resolvid|recebid|pago|publicad|alta|aprovad|ativo|ativa|confirmad|disponivel|enviad|lida|respondid|atualizado|gerado)/.test(value))
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

/** N-12: ajuda curta de cada tela (botão "?" ao lado do título). */
const HELP: Record<string, string> = {
  Dashboard: "Resumo do dia: compromissos em ordem de horário, receita recebida, leitos ocupados e pendências. Clique em qualquer número para abrir a tela correspondente.",
  Consultas: "Fila do dia: arraste o cartão entre as colunas ou use a seta. “Chamar próxima” leva direto ao consultório quem tem prioridade. Em Histórico ficam todas as consultas.",
  Vacinas: "Abra a carteirinha de um paciente pela busca. Registre a aplicação escolhendo o lote do estoque; a próxima dose entra no radar de atrasadas e a vencer.",
  Exames: "Cada tubo é um pedido. Avance: amostra colhida → lançar resultado (formulário do tipo de exame) → assinar laudo. Sem resultado o exame não é concluído.",
  Prescrições: "Escolha um canhoto para ver a receita. Controle especial exige CPF e endereço do tutor e duas vias. A assinatura é um registro interno.",
  Procedimentos: "Catálogo de procedimentos com categoria, duração e preço. Use “Visual” para ver em cartas.",
  Protocolos: "Protocolos são roteiros clínicos da equipe. Para aplicar a um paciente, escolha o protocolo e clique em “Aplicar a um paciente”: ele entra em uso para aquele animal e gera a prescrição.",
  Internações: "Mapa dos leitos e fila de espera. Registre sinais vitais, medicações e dê alta pela janela de alta (motivo e orientações obrigatórios).",
  Cirurgias: "Salas do dia com o checklist de cirurgia segura. Inicie, acompanhe as fases e encaminhe para a internação pós-cirúrgica.",
  Financeiro: "Entradas e saídas, contas a receber e a pagar. Lançamentos não são apagados: use Estornar com o motivo.",
  Caixa: "Abra o caixa com o troco, receba as vendas da fila e feche conferindo cada forma de pagamento.",
  Entregas: "Pedidos para entregar: atribua o entregador, monte a rota e confirme a entrega. “Pendentes” não inclui as já entregues.",
  Estoque: "Itens, lotes e validades. A venda paga e a vacina aplicada dão baixa automática; a entrada de nota soma ao estoque.",
  Ocorrências: "Mural de problemas. Para mover para Resolvida, informe a causa e a solução.",
  Relatórios: "Escolha um relatório, ajuste o período e os filtros e exporte em CSV (padrão brasileiro) ou imprima com o período no cabeçalho.",
  Comunicação: "Conversas e lembretes com os tutores. O envio por WhatsApp, e-mail e SMS é simulado nesta versão.",
  Publicações: "Posts da clínica. Alterne entre o varal, a lista e o calendário.",
  Documentos: "Termos e contratos gerados a partir de modelos. “Marcar assinado” é um registro interno, sem certificado digital.",
  Medicamentos: "Medicamentos do estoque. A quantidade é a mesma da tela Estoque (soma dos lotes); para dar entrada use “Entrada de nota”.",
  Serviços: "Tabela de serviços com preço e duração, usada na agenda e no balcão. Emissão de NFS-e ainda não está disponível.",
  Convênios: "Planos aceitos pela clínica, com cobertura e situação. Cada convênio aparece uma vez.",
  Profissionais: "Equipe clínica com registro no CRMV e especialidade. A especialidade é a mesma mostrada na agenda.",
  Teleatendimentos: "Consultas por vídeo. “Ao vivo” só aparece quando a chamada foi iniciada ou está no horário. A videochamada é simulada nesta versão.",
  "Usuários e acessos": "Contas de quem usa o sistema. Ao criar ou redefinir, o sistema gera uma senha provisória mostrada uma única vez; no primeiro acesso a pessoa cria a própria senha.",
  Configurações: "Tema, fuso, unidade padrão, cópia de segurança dos dados e, para administradores, o registro de auditoria.",
}

function PageHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="vx-help">
      <button type="button" className="vx-help-btn" aria-label="Ajuda desta tela" aria-expanded={open} onClick={() => setOpen(!open)}>?</button>
      {open && <span className="vx-help-pop" role="note">{text}<button type="button" aria-label="Fechar ajuda" onClick={() => setOpen(false)}>×</button></span>}
    </span>
  )
}

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
          <h1 className="vx-h1">{title}{typeof crumb === "string" && HELP[crumb.split(" · ")[0]] && <PageHelp text={HELP[crumb.split(" · ")[0]]} />}</h1>
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
  const boxRef = useRef<HTMLDivElement>(null)
  // A-06: o foco entra na janela, fica preso nela com Tab e volta ao botão de origem ao fechar.
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const focusables = () => Array.from(box?.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])
    if (box && !box.contains(document.activeElement)) (focusables()[0] || box).focus()
    return () => { origin?.focus?.() }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "Tab" && boxRef.current) {
        const list = Array.from(boxRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])"))
        if (!list.length) return
        const first = list[0], last = list[list.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div className="vx-modal-layer" onMouseDown={onClose}>
      <div
        ref={boxRef}
        tabIndex={-1}
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
  reason,
}: {
  title: string
  text: string
  confirm?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  /** Quando informado, exige uma justificativa antes de confirmar. */
  reason?: string
}) {
  const [why, setWhy] = useState("")
  const blocked = !!reason && why.trim().length < 5
  return (
    <Modal
      title={title}
      text={text}
      onClose={onCancel}
      children={reason ? (
        <label className="vx-field" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          <span className="vx-lbl">{reason}</span>
          <textarea autoFocus rows={3} value={why} onChange={(event) => setWhy(event.target.value)} placeholder="Escreva o motivo (mínimo de 5 letras)" style={{ font: "inherit", padding: 10, borderRadius: 10, border: "1px solid var(--vx-line, #d5d9df)" }} />
        </label>
      ) : undefined}
      actions={
        <>
          <button className="vx-btn vx-btn-g" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={`vx-btn ${danger ? "vx-btn-d" : "vx-btn-p"}`}
            onClick={() => !blocked && onConfirm(why.trim())}
            disabled={blocked}
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
  // N-09: ao voltar de uma ficha, a lista reabre na mesma página.
  const key = typeof window !== "undefined" ? `vetflow-page:${window.location.pathname}` : ""
  const [page, setPageRaw] = useState(() => { try { return Number(sessionStorage.getItem(key)) || 1 } catch { return 1 } })
  const setPage = (value: number) => { setPageRaw(value); try { sessionStorage.setItem(key, String(value)) } catch { /* ok */ } }
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const first = useRef(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (first.current) { first.current = false; return }
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

/* ---------------- assinatura ----------------
   Sem integração com certificado ICP-Brasil, o sistema NÃO mostra selo de assinatura digital.
   Mostra "Assinatura pendente" ou o registro interno de quem marcou como assinado e quando. */
export function GovSign({ name, when, compact, signed = true, by }: { name: string; when?: string; compact?: boolean; signed?: boolean; by?: string }) {
  const box: CSSProperties = { display: "inline-flex", flexDirection: "column", gap: 2, padding: compact ? "6px 10px" : "8px 14px", border: `1px dashed ${signed ? "#2b7a4b" : "#c27b0e"}`, borderRadius: 8, background: signed ? "#f0faf4" : "#fff8eb", color: "#1a2233", fontFamily: "Arial, Helvetica, sans-serif", textAlign: "left", maxWidth: "100%", fontSize: compact ? 10 : 11, lineHeight: 1.35 }
  if (!signed) return <div style={box}><strong style={{ color: "#8a5300" }}>Assinatura pendente</strong><span>{name}</span></div>
  const date = when ? new Date(when.length <= 10 ? `${when}T12:00:00` : when) : null
  return (
    <div style={box}>
      <strong style={{ color: "#1f6b3f" }}>Marcado como assinado</strong>
      <span style={{ fontWeight: 700 }}>{name}</span>
      {date && <span>{date.toLocaleDateString("pt-BR")}{when && when.length > 10 ? ` ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}{by ? ` · registrado por ${by}` : ""}</span>}
      <span style={{ color: "#5b6474" }}>Registro interno, sem certificado digital ICP-Brasil</span>
    </div>
  )
}
