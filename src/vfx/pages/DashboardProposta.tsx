import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, BedDouble, CalendarDays, ChevronRight, CircleDollarSign, Plus, Stethoscope, Syringe, TestTube2, Users } from "lucide-react"
import { useVetFlow } from "../../store"
import { bedAssignments } from "../forms"
import { addDays, brl, itemDate, todayISO } from "../ui"
import "./dashboard-proposta.css"

const short = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".", ",")} mil` : String(Math.round(value)))

export default function DashboardProposta() {
  const { data, profile, activeUnit } = useVetFlow()
  const navigate = useNavigate()
  const [period, setPeriod] = useState(30)

  const ref = useMemo(() => {
    const dates = data.financeiro.map(itemDate).filter((value) => value <= todayISO()).sort()
    return dates[dates.length - 1] || todayISO()
  }, [data.financeiro])
  const inRange = (date: string, days: number, offset = 0) => date > addDays(ref, -(days + offset)) && date <= addDays(ref, -offset)
  const sum = (filter: (date: string) => boolean, kind: "Receita" | "Despesa") =>
    data.financeiro.filter((item) => (kind === "Despesa" ? item.category === "Despesa" : item.category !== "Despesa") && filter(itemDate(item))).reduce((total, item) => total + (item.amountValue || 0), 0)

  const revenue = sum((date) => inRange(date, period), "Receita")
  const revenuePrev = sum((date) => inRange(date, period, period), "Receita")
  const consults = data.consultas.filter((item) => inRange(itemDate(item), period))
  const consultsPrev = data.consultas.filter((item) => inRange(itemDate(item), period, period)).length
  const delta = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : 0)
  const beds = bedAssignments(data.internacoes, data.animais).map.size

  const weeks = Array.from({ length: 8 }, (_, index) => {
    const end = addDays(ref, -(7 * (7 - index)))
    const start = addDays(end, -7)
    const within = (date: string) => date > start && date <= end
    return { label: end.slice(8, 10) + "/" + end.slice(5, 7), receita: sum(within, "Receita"), despesa: sum(within, "Despesa") }
  })
  const maxWeek = Math.max(...weeks.map((week) => Math.max(week.receita, week.despesa)), 1)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => Math.round(maxWeek * step))

  const agendaDay = useMemo(() => {
    const days = [...new Set(data.agendas.map(itemDate))].sort()
    return days.includes(todayISO()) ? todayISO() : days.filter((value) => value <= todayISO()).pop() || days[0]
  }, [data.agendas])
  const agenda = data.agendas.filter((item) => itemDate(item) === agendaDay).sort((a, b) => (a.time || "").localeCompare(b.time || "")).slice(0, 7)

  const types = Object.entries(
    consults.reduce<Record<string, number>>((acc, item) => {
      const key = item.name.split("•")[0].trim()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxType = Math.max(...types.map(([, value]) => value), 1)

  const pend: [string, number, string, string][] = [
    ["Vacinas em atraso", data.vacinas.filter((item) => /atras/i.test(item.status)).length, "/vacinas", "#D9480F"],
    ["Exames aguardando resultado", data.exames.filter((item) => /aguard/i.test(item.status)).length, "/exames", "#3B6FD8"],
    ["Itens abaixo do estoque mínimo", data.estoque.filter((item) => (item.quantity || 0) <= (item.minimum || 0)).length, "/estoque", "#B7791F"],
    ["Documentos sem assinatura", data.documentos.filter((item) => item.status === "Pendente").length, "/documentos", "#6B5BB5"],
    ["Ocorrências abertas", data.ocorrencias.filter((item) => item.status === "Aberta").length, "/ocorrencias", "#0F8A7E"],
  ]

  const statusTone = (status: string) => (/conclu|confirm/i.test(status) ? "ok" : /cancel|falt/i.test(status) ? "bad" : /atend|andamento/i.test(status) ? "now" : "wait")
  const greeting = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"
  const kpis = [
    { icon: CircleDollarSign, tone: "orange", label: "Faturamento", value: brl(revenue), diff: delta(revenue, revenuePrev), to: "/financeiro" },
    { icon: Stethoscope, tone: "teal", label: "Atendimentos", value: consults.length.toLocaleString("pt-BR"), diff: delta(consults.length, consultsPrev), to: "/consultas" },
    { icon: Users, tone: "blue", label: "Pacientes ativos", value: data.animais.filter((item) => item.status !== "Falecido" && item.status !== "Inativo").length.toLocaleString("pt-BR"), note: `${data.tutores.length} tutores`, to: "/animais" },
    { icon: BedDouble, tone: "violet", label: "Leitos ocupados", value: `${beds} de 14`, bar: beds / 14, to: "/internacoes" },
  ]

  return (
    <div className="dp">
      <header className="dp-head">
        <div>
          <p className="dp-over">{activeUnit.name}</p>
          <h1>{greeting}, {profile.displayName}</h1>
          <p className="dp-sub">Resumo da clínica até {new Date(`${ref}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}.</p>
        </div>
        <div className="dp-actions">
          <div className="dp-seg" role="tablist" aria-label="Período">
            {[7, 30, 90].map((value) => (
              <button key={value} className={period === value ? "on" : ""} onClick={() => setPeriod(value)}>{value} dias</button>
            ))}
          </div>
          <button className="dp-btn" onClick={() => navigate("/consultas?novo=1")}><Plus size={16} /> Nova consulta</button>
        </div>
      </header>

      <section className="dp-kpis">
        {kpis.map((kpi) => (
          <button key={kpi.label} className="dp-kpi" onClick={() => navigate(kpi.to)}>
            <span className={`dp-ico ${kpi.tone}`}><kpi.icon size={18} /></span>
            <span className="dp-kpi-body">
              <small>{kpi.label}</small>
              <strong>{kpi.value}</strong>
              {"diff" in kpi && kpi.diff !== undefined && (
                <em className={kpi.diff >= 0 ? "up" : "down"}>{kpi.diff >= 0 ? "▲" : "▼"} {Math.abs(kpi.diff)}% <span>vs. {period} dias anteriores</span></em>
              )}
              {"note" in kpi && kpi.note && <em className="muted">{kpi.note}</em>}
              {"bar" in kpi && kpi.bar !== undefined && <span className="dp-meter"><i style={{ width: `${Math.min(100, kpi.bar * 100)}%` }} /></span>}
            </span>
          </button>
        ))}
      </section>

      <section className="dp-row dp-row-a">
        <article className="dp-card">
          <div className="dp-card-h">
            <h2>Receitas e despesas por semana</h2>
            <span className="dp-legend"><i className="r" /> Receitas <i className="d" /> Despesas</span>
          </div>
          <div className="dp-chart">
            <div className="dp-axis">{[...ticks].reverse().map((tick) => <span key={tick}>{short(tick)}</span>)}</div>
            <div className="dp-plot">
              {ticks.map((tick) => <i key={tick} className="dp-grid" style={{ bottom: `${(tick / maxWeek) * 100}%` }} />)}
              {weeks.map((week) => (
                <div key={week.label} className="dp-col" title={`${week.label}: receitas ${brl(week.receita)} · despesas ${brl(week.despesa)}`}>
                  <span className="dp-bars">
                    <b className="r" style={{ height: `${(week.receita / maxWeek) * 100}%` }} />
                    <b className="d" style={{ height: `${(week.despesa / maxWeek) * 100}%` }} />
                  </span>
                  <small>{week.label}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="dp-card">
          <div className="dp-card-h">
            <h2>Agenda · {new Date(`${agendaDay}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</h2>
            <button className="dp-link" onClick={() => navigate("/agendas")}>Ver agenda <ChevronRight size={14} /></button>
          </div>
          <ul className="dp-agenda">
            {agenda.map((item) => (
              <li key={item.id} onClick={() => navigate(`/agendas/${item.id}`)}>
                <time>{item.time || "--:--"}</time>
                <span><b>{item.animal}</b><small>{item.service || item.name} · {item.professional}</small></span>
                <em className={statusTone(item.status)}>{item.status}</em>
              </li>
            ))}
            {!agenda.length && <li className="dp-empty"><CalendarDays size={16} /> Sem horários marcados.</li>}
          </ul>
        </article>
      </section>

      <section className="dp-row dp-row-b">
        <article className="dp-card">
          <div className="dp-card-h"><h2>Atendimentos por tipo</h2><span className="dp-muted">{period} dias</span></div>
          <ul className="dp-hbars">
            {types.map(([name, value]) => (
              <li key={name}>
                <span>{name}</span>
                <span className="dp-track"><i style={{ width: `${(value / maxType) * 100}%` }} /></span>
                <b>{value}</b>
              </li>
            ))}
          </ul>
        </article>

        <article className="dp-card">
          <div className="dp-card-h"><h2>Pendências</h2><AlertTriangle size={16} className="dp-muted" /></div>
          <ul className="dp-pend">
            {pend.map(([label, count, to, color]) => (
              <li key={label} onClick={() => navigate(to)}>
                <i style={{ background: color }} />
                <span>{label}</span>
                <b>{count}</b>
                <ChevronRight size={14} />
              </li>
            ))}
          </ul>
        </article>

        <article className="dp-card">
          <div className="dp-card-h"><h2>Hoje na clínica</h2></div>
          <ul className="dp-today">
            <li><Syringe size={16} /><span>Vacinas aplicadas</span><b>{data.vacinas.filter((item) => itemDate(item) === agendaDay).length}</b></li>
            <li><TestTube2 size={16} /><span>Exames solicitados</span><b>{data.exames.filter((item) => itemDate(item) === agendaDay).length}</b></li>
            <li><Stethoscope size={16} /><span>Cirurgias</span><b>{data.cirurgias.filter((item) => itemDate(item) === agendaDay).length}</b></li>
            <li><CalendarDays size={16} /><span>Agendamentos</span><b>{data.agendas.filter((item) => itemDate(item) === agendaDay).length}</b></li>
          </ul>
        </article>
      </section>
    </div>
  )
}
