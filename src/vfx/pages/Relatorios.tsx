import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { ArrowLeft, ChevronRight, Download, FileText, Printer, Search } from "lucide-react"
import { useVetFlow, type Item, type ModuleSlug, type UnitData } from "../../store"
import { brl, fmtDate, itemDate, matches, StatusPill } from "../ui"

type ReportDef = {
  slug: string
  title: string
  group: "Clínico" | "Financeiro" | "Operacional" | "Cadastros"
  description: string
  modules: ModuleSlug[]
  filter?: (item: Item) => boolean
  money?: boolean
}

export const REPORTS: ReportDef[] = [
  { slug: "atendimentos", title: "Atendimentos", group: "Clínico", description: "Consultas realizadas, faltas e cancelamentos por período e profissional.", modules: ["consultas"], money: true },
  { slug: "prontuarios", title: "Prontuários", group: "Clínico", description: "Evoluções clínicas registradas por paciente e veterinário.", modules: ["prontuarios"] },
  { slug: "vacinas", title: "Vacinas aplicadas e atrasadas", group: "Clínico", description: "Doses aplicadas, a vencer e em atraso com contato do tutor.", modules: ["vacinas"] },
  { slug: "exames", title: "Exames", group: "Clínico", description: "Solicitações, resultados pendentes e laudos concluídos.", modules: ["exames"] },
  { slug: "prescricoes", title: "Prescrições", group: "Clínico", description: "Receitas emitidas por tipo e prescritor.", modules: ["prescricoes"] },
  { slug: "cirurgias", title: "Cirurgias", group: "Clínico", description: "Procedimentos cirúrgicos agendados e concluídos.", modules: ["cirurgias"], money: true },
  { slug: "internacoes", title: "Internações", group: "Clínico", description: "Pacientes internados, altas e tempo de permanência.", modules: ["internacoes"], money: true },
  { slug: "teleatendimentos", title: "Teleatendimentos", group: "Clínico", description: "Atendimentos por vídeo realizados e faltas.", modules: ["teleatendimentos"] },
  { slug: "financeiro", title: "Financeiro (receitas e despesas)", group: "Financeiro", description: "Todos os lançamentos com situação de pagamento.", modules: ["financeiro"], money: true },
  { slug: "receitas", title: "Receitas", group: "Financeiro", description: "Entradas recebidas e a receber.", modules: ["financeiro"], filter: (item) => item.category !== "Despesa", money: true },
  { slug: "despesas", title: "Despesas", group: "Financeiro", description: "Saídas pagas, a pagar e vencidas.", modules: ["financeiro"], filter: (item) => item.category === "Despesa", money: true },
  { slug: "faturamento-servico", title: "Faturamento por serviço", group: "Financeiro", description: "Receita agrupada pelo serviço prestado.", modules: ["financeiro"], filter: (item) => item.category !== "Despesa", money: true },
  { slug: "faturamento-profissional", title: "Faturamento por profissional", group: "Financeiro", description: "Receita dos atendimentos por profissional.", modules: ["consultas"], money: true },
  { slug: "convenios", title: "Convênios", group: "Financeiro", description: "Convênios cadastrados e situação.", modules: ["convenios"] },
  { slug: "agendamentos-faltas", title: "Agendamentos e faltas", group: "Operacional", description: "Agenda da equipe com confirmações, faltas e cancelamentos.", modules: ["agendas"] },
  { slug: "produtividade", title: "Produtividade da equipe", group: "Operacional", description: "Volume de atendimentos e agendamentos por profissional.", modules: ["consultas", "agendas"] },
  { slug: "estoque-validade", title: "Estoque e validade", group: "Operacional", description: "Itens, quantidade, estoque mínimo e vencimento.", modules: ["estoque"] },
  { slug: "estoque-minimo", title: "Itens abaixo do mínimo", group: "Operacional", description: "Produtos que precisam de reposição.", modules: ["estoque"], filter: (item) => (item.quantity || 0) <= (item.minimum || 0) },
  { slug: "ocorrencias", title: "Ocorrências", group: "Operacional", description: "Problemas registrados, situação e responsáveis.", modules: ["ocorrencias"] },
  { slug: "comunicacao", title: "Comunicação com tutores", group: "Operacional", description: "Mensagens e lembretes enviados, lidos e respondidos.", modules: ["comunicacao"] },
  { slug: "documentos", title: "Documentos e termos", group: "Operacional", description: "Termos e documentos pendentes de assinatura.", modules: ["documentos"] },
  { slug: "novos-clientes", title: "Novos clientes e animais", group: "Cadastros", description: "Tutores e pacientes cadastrados no período.", modules: ["tutores", "animais"] },
  { slug: "tutores", title: "Tutores", group: "Cadastros", description: "Base de tutores com contato e situação.", modules: ["tutores"] },
  { slug: "animais", title: "Animais", group: "Cadastros", description: "Pacientes por espécie, raça e situação.", modules: ["animais"] },
  { slug: "profissionais", title: "Equipe", group: "Cadastros", description: "Profissionais, especialidades e registros.", modules: ["profissionais"] },
]

const periods: [string, string][] = [["30", "30 dias"], ["90", "90 dias"], ["365", "12 meses"], ["all", "Tudo"]]
const rowsOf = (report: ReportDef, data: UnitData) =>
  report.modules.flatMap((slug) => (data[slug] || []).map((item) => ({ item, slug }))).filter(({ item }) => !report.filter || report.filter(item))
const latestDate = (data: UnitData) => {
  let max = ""
  for (const slug of ["consultas", "financeiro", "agendas"] as ModuleSlug[]) for (const item of data[slug]) if ((item.date || "") > max) max = item.date || ""
  return max || new Date().toISOString().slice(0, 10)
}
const since = (end: string, days: string) => {
  if (days === "all") return ""
  const date = new Date(`${end}T12:00:00`)
  date.setDate(date.getDate() - Number(days))
  return date.toISOString().slice(0, 10)
}
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`

/* ---------------- central de relatórios ---------------- */
export default function Relatorios() {
  const { data, activeUnit } = useVetFlow()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("Todos")
  const end = latestDate(data)
  const start30 = since(end, "30")
  const list = REPORTS.filter((report) => (group === "Todos" || report.group === group) && `${report.title} ${report.description}`.toLowerCase().includes(query.toLowerCase()))
  const receita = data.financeiro.filter((item) => item.category !== "Despesa" && itemDate(item) >= start30).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  const despesa = data.financeiro.filter((item) => item.category === "Despesa" && itemDate(item) >= start30).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  const consultas = data.consultas.filter((item) => itemDate(item) >= start30)
  const faltas = consultas.filter((item) => /falt|cancel/i.test(item.status)).length
  const finEnd = data.financeiro.map((item) => itemDate(item)).filter((date) => date && date <= new Date().toISOString().slice(0, 10)).sort().pop() || end
  const finStart = (() => { const d = new Date(`${finEnd}T12:00:00`); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })()
  const inFin30 = (item: { date?: string; createdAt: string }) => { const d = itemDate(item as never); return d > finStart && d <= finEnd }
  const receita30 = data.financeiro.filter((item) => item.category !== "Despesa" && inFin30(item)).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  const despesa30 = data.financeiro.filter((item) => item.category === "Despesa" && inFin30(item)).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  const kpis: [string, string, string][] = [
    ["Receita · 30 dias", brl(receita30), `${brl(despesa30)} em despesas`],
    ["Resultado · 30 dias", brl(receita30 - despesa30), receita30 ? `${Math.round(((receita30 - despesa30) / receita30) * 100)}% de margem` : "—"],
    ["Atendimentos · 30 dias", String(consultas.length), `${faltas} faltas ou cancelamentos`],
    ["Vacinas em atraso", String(data.vacinas.filter((item) => /atras/i.test(item.status)).length), "tutores a contatar"],
    ["Estoque abaixo do mínimo", String(data.estoque.filter((item) => (item.quantity || 0) <= (item.minimum || 0)).length), "itens para repor"],
  ]

  return (
    <div className="vx vx-page vx-rep">
      <div className="vx-top">
        <div>
          <div className="vx-crumb"><b>VetFlow</b> / Relatórios</div>
          <h1 className="vx-h1">Relatórios</h1>
          <p className="vx-sub">{activeUnit.name} · dados até {fmtDate(end)}</p>
        </div>
        <div className="vx-actions">
          <label className="vx-search"><Search /><input aria-label="Buscar relatório" placeholder="Buscar relatório" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button className="vx-btn vx-btn-g" onClick={() => window.print()}><Printer /> Imprimir índice</button>
        </div>
      </div>

      <div className="vx-rep-kpis">
        {kpis.map(([label, value, hint]) => (
          <div key={label}><small>{label}</small><strong>{value}</strong><span>{hint}</span></div>
        ))}
      </div>

      <div className="vx-rep-tabs" role="tablist">
        {["Todos", "Clínico", "Financeiro", "Operacional", "Cadastros"].map((name) => (
          <button key={name} role="tab" aria-selected={group === name} className={group === name ? "on" : ""} onClick={() => setGroup(name)}>{name}</button>
        ))}
      </div>

      <div className="vx-table">
        <div className="vx-tr vx-th" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,2fr) 120px 110px 150px" }}>
          <span>Relatório</span><span>Conteúdo</span><span>Área</span><span>Registros</span><span />
        </div>
        {list.map((report) => (
          <div key={report.slug} className="vx-tr" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,2fr) 120px 110px 150px" }} role="button" tabIndex={0} onClick={() => navigate(`/relatorios/${report.slug}`)} onKeyDown={(event) => event.key === "Enter" && navigate(`/relatorios/${report.slug}`)}>
            <strong className="vx-rep-name"><FileText size={16} /> {report.title}</strong>
            <span className="vx-muted">{report.description}</span>
            <span><span className="vx-tag">{report.group}</span></span>
            <span className="vx-mono">{rowsOf(report, data).length.toLocaleString("pt-BR")}</span>
            <span className="vx-rep-act" onClick={(event) => event.stopPropagation()}>
              <button onClick={() => navigate(`/relatorios/${report.slug}`)}>Abrir <ChevronRight size={14} /></button>
              <button aria-label={`Imprimir ${report.title}`} title="Imprimir" onClick={() => navigate(`/relatorios/${report.slug}?imprimir=1`)}><Printer size={15} /></button>
            </span>
          </div>
        ))}
        {!list.length && <div className="vx-empty">Nenhum relatório encontrado.</div>}
      </div>
    </div>
  )
}

/* ---------------- relatório ---------------- */
export function Relatorio() {
  const { reportSlug = "" } = useParams()
  const { data, activeUnit, profile } = useVetFlow()
  const navigate = useNavigate()
  const report = REPORTS.find((candidate) => candidate.slug === reportSlug)
  const end = latestDate(data)
  const [period, setPeriod] = useState("90")
  const [status, setStatus] = useState("Todos")
  const [pro, setPro] = useState("Todos")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [printAll, setPrintAll] = useState(false)
  const all = useMemo(() => (report ? rowsOf(report, data) : []), [report, data])
  const start = since(end, period)
  const filtered = useMemo(
    () =>
      all
        .filter(({ item }) => (!start || itemDate(item) >= start) && (status === "Todos" || item.status === status) && (pro === "Todos" || item.professional === pro) && matches(item, query))
        .sort((a, b) => itemDate(b.item).localeCompare(itemDate(a.item))),
    [all, start, status, pro, query],
  )
  const statuses = [...new Set(all.map(({ item }) => item.status).filter(Boolean))]
  const pros = [...new Set(all.map(({ item }) => item.professional).filter(Boolean))] as string[]
  const total = filtered.reduce((sum, { item }) => sum + (item.amountValue || 0), 0)
  const byStatus = statuses.map((name) => [name, filtered.filter(({ item }) => item.status === name).length] as const).filter(([, n]) => n).sort((a, b) => b[1] - a[1])
  const groupKey = reportSlug === "faturamento-servico" ? "name" : "professional"
  const byGroup = Object.entries(
    filtered.reduce<Record<string, { n: number; v: number }>>((acc, { item }) => {
      const key = String((item as Record<string, unknown>)[groupKey] || "Não informado")
      acc[key] = acc[key] || { n: 0, v: 0 }
      acc[key].n++
      acc[key].v += item.amountValue || 0
      return acc
    }, {}),
  ).sort((a, b) => b[1].v - a[1].v || b[1].n - a[1].n).slice(0, 8)
  const perPage = 25
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visible = printAll ? filtered : filtered.slice((page - 1) * perPage, page * perPage)
  const doPrint = () => {
    setPrintAll(true)
    window.setTimeout(() => {
      window.print()
      setPrintAll(false)
    }, 150)
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("imprimir") !== "1") return
    const timer = window.setTimeout(doPrint, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSlug])
  const exportCsv = () => {
    const header = ["Registro", "Detalhes", "Paciente", "Tutor", "Profissional", "Data", "Situação", "Valor"]
    const lines = filtered.map(({ item }) => [item.name, item.subtitle, item.animal, item.owner, item.professional, itemDate(item), item.status, item.amountValue ?? ""].map(csvCell).join(";"))
    const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `vetflow-${reportSlug}-${end}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (!report)
    return (
      <div className="vx vx-page">
        <div className="vx-empty">Relatório não encontrado. <button className="vx-btn vx-btn-p" onClick={() => navigate("/relatorios")}>Ver relatórios</button></div>
      </div>
    )

  return (
    <div className="vx vx-page vx-rep">
      <button className="vx-back" onClick={() => navigate("/relatorios")}><ArrowLeft size={16} /> Relatórios</button>
      <div className="vx-top">
        <div>
          <div className="vx-crumb"><b>Relatórios</b> / {report.group}</div>
          <h1 className="vx-h1">{report.title}</h1>
          <p className="vx-sub">{report.description}</p>
        </div>
        <div className="vx-actions">
          <button className="vx-btn vx-btn-g" onClick={exportCsv}><Download /> Exportar CSV</button>
          <button className="vx-btn vx-btn-p" onClick={doPrint}><Printer /> Imprimir relatório</button>
        </div>
      </div>

      <div className="vx-rep-print-meta">
        <span><b>Unidade:</b> {activeUnit.name}</span>
        <span><b>Período:</b> {start ? `${fmtDate(start)} a ${fmtDate(end)}` : "todo o histórico"}</span>
        {status !== "Todos" && <span><b>Situação:</b> {status}</span>}
        {pro !== "Todos" && <span><b>Profissional:</b> {pro}</span>}
        <span><b>Emitido por:</b> {profile.displayName}</span>
      </div>

      <div className="vx-rep-filters rel-filters">
        <div className="vx-rep-tabs" role="tablist">
          {periods.map(([key, label]) => (
            <button key={key} className={period === key ? "on" : ""} onClick={() => { setPeriod(key); setPage(1) }}>{label}</button>
          ))}
        </div>
        <select className="vx-select" aria-label="Situação" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option>Todos</option>
          {statuses.map((name) => <option key={name}>{name}</option>)}
        </select>
        {pros.length > 0 && (
          <select className="vx-select" aria-label="Profissional" value={pro} onChange={(event) => { setPro(event.target.value); setPage(1) }}>
            <option>Todos</option>
            {pros.map((name) => <option key={name}>{name}</option>)}
          </select>
        )}
        <label className="vx-search"><Search /><input aria-label="Buscar no relatório" placeholder="Buscar paciente, tutor, item" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label>
      </div>

      <div className="vx-rep-kpis">
        <div><small>Registros</small><strong>{filtered.length.toLocaleString("pt-BR")}</strong><span>de {all.length.toLocaleString("pt-BR")} no total</span></div>
        {report.money && <div><small>Valor total</small><strong>{brl(total)}</strong><span>média {brl(filtered.length ? total / filtered.length : 0)}</span></div>}
        {byStatus.slice(0, report.money ? 3 : 4).map(([name, n]) => (
          <div key={name}><small>{name}</small><strong>{n.toLocaleString("pt-BR")}</strong><span>{filtered.length ? Math.round((n / filtered.length) * 100) : 0}% do período</span></div>
        ))}
      </div>

      {byGroup.length > 1 && (
        <div className="vx-table vx-rep-summary">
          <div className="vx-tr vx-th" style={{ gridTemplateColumns: "minmax(0,1.6fr) 100px minmax(0,2fr) 130px" }}>
            <span>{groupKey === "name" ? "Serviço" : "Profissional"}</span><span>Registros</span><span>Participação</span><span>{report.money ? "Valor" : ""}</span>
          </div>
          {byGroup.map(([name, value]) => {
            const max = Math.max(...byGroup.map(([, entry]) => (report.money ? entry.v : entry.n)), 1)
            const share = ((report.money ? value.v : value.n) / max) * 100
            return (
              <div key={name} className="vx-tr" style={{ gridTemplateColumns: "minmax(0,1.6fr) 100px minmax(0,2fr) 130px" }}>
                <strong>{name}</strong>
                <span className="vx-mono">{value.n}</span>
                <span className="vx-bar"><i style={{ width: `${share}%` }} /></span>
                <span className="vx-mono">{report.money ? brl(value.v) : ""}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="vx-table">
        <div className="vx-tr vx-th" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.4fr) minmax(0,1.1fr) 100px 140px 110px" }}>
          <span>Registro</span><span>Paciente / tutor</span><span>Profissional</span><span>Data</span><span>Situação</span><span>{report.money ? "Valor" : ""}</span>
        </div>
        {visible.map(({ item, slug }) => (
          <div key={`${slug}-${item.id}`} className="vx-tr" role="button" tabIndex={0} style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.4fr) minmax(0,1.1fr) 100px 140px 110px" }} onClick={() => navigate(`/${slug}/${item.id}`)} onKeyDown={(event) => event.key === "Enter" && navigate(`/${slug}/${item.id}`)}>
            <strong>{item.name}</strong>
            <span className="vx-muted">{item.animal ? `${item.animal} · ${item.owner || ""}` : item.subtitle || item.phone || "—"}</span>
            <span className="vx-muted">{item.professional || "—"}</span>
            <span className="vx-mono">{fmtDate(itemDate(item), { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
            <span><StatusPill status={item.status || "—"} /></span>
            <span className="vx-mono">{report.money && item.amountValue ? brl(item.amountValue) : ""}</span>
          </div>
        ))}
        {!visible.length && <div className="vx-empty">Nenhum registro no período e filtros escolhidos.</div>}
      </div>
      {!printAll && pages > 1 && (
        <div className="vx-rep-pager rel-filters">
          <span>Página {page} de {pages} · {filtered.length} registros</span>
          <button className="vx-btn vx-btn-g vx-btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <button className="vx-btn vx-btn-g vx-btn-sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Próxima</button>
        </div>
      )}
      {report.money && <div className="vx-rep-total">Total do relatório: <b>{brl(total)}</b></div>}
    </div>
  )
}
