import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useVetFlow, type Item, type ModuleSlug } from "../../store"
import { clinicMetrics } from "../../metrics"
import { addDays, brl, fmtLong, itemDate, Page, Seg, todayISO } from "../ui"


type Kind = "Consulta" | "Cirurgia" | "Vacina" | "Exame" | "Tele"
const kindColor: Record<Kind, string> = { Consulta: "#e94f17", Cirurgia: "#6d4bc2", Vacina: "#0f9c8c", Exame: "#2457c5", Tele: "#5aa9f0" }

type Event = { item: Item; slug: ModuleSlug; kind: Kind; start: number; minutes: number }

function minutesOf(time?: string) {
  const [h, m] = (time || "09:00").split(":").map(Number)
  return h * 60 + (m || 0)
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100)
      setShown(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{brl(shown)}</>
}

export default function Dashboard() {
  const { data, profile, activeUnit, clinic } = useVetFlow()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<"1" | "7" | "30">("30")
  const [hidden, setHidden] = useState<Kind[]>([])
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const allEvents = useMemo(() => {
    const kindFor = (slug: ModuleSlug, item: Item): Kind =>
      slug === "cirurgias" ? "Cirurgia" : slug === "teleatendimentos" ? "Tele" : /vacin/i.test(item.name) ? "Vacina" : /ultra|exame|raio/i.test(item.name) ? "Exame" : "Consulta"
    const sources: ModuleSlug[] = ["agendas", "cirurgias", "teleatendimentos"]
    return sources.flatMap((slug) =>
      data[slug]
        .filter((item) => item.time && !/cancel/i.test(item.status))
        .map((item) => ({ item, slug, kind: kindFor(slug, item), start: minutesOf(item.time), minutes: item.duration || (slug === "cirurgias" ? 90 : 30) })),
    )
  }, [data])

  const [day, setDay] = useState(() => todayISO())
  const events = allEvents.filter((event) => itemDate(event.item) === day && !hidden.includes(event.kind)).sort((a, b) => a.start - b.start)
  const isToday = day === todayISO()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const current = isToday ? events.find((event) => event.start <= nowMin && nowMin < event.start + event.minutes) : undefined
  const upcoming = events.filter((event) => !isToday || event.start >= nowMin)
  const focus = current || upcoming[0]
  const done = isToday ? events.filter((event) => event.start + event.minutes <= nowMin).length : 0

  const ref = todayISO()
  const metrics = clinicMetrics(data, ref)
  const days = Number(period)
  const revenueItems = metrics.receipts(days)
  const revenue = metrics.revenue(days)
  const spark = Array.from({ length: 10 }, (_, index) => {
    const date = addDays(ref, index - 9)
    return data.financeiro.filter((item) => item.category === "Receita" && /receb/i.test(item.status) && itemDate(item) === date).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  })
  const sparkMax = Math.max(...spark, 1)
  const sparkPath = spark.map((value, index) => `${index === 0 ? "M" : "L"}${index * 28.8} ${50 - (value / sparkMax) * 42}`).join(" ")
  const beds = metrics.beds
  const occupied = metrics.hospitalized
  const patients = metrics.patients
  const needs = [
    ["Vacinas em atraso", data.vacinas.filter((item) => item.status === "Atrasada").length, "/vacinas?filtro=Atrasada"],
    ["Itens abaixo do mínimo", data.estoque.filter((item) => (item.quantity || 0) < (item.minimum || 0)).length, "/estoque?filtro=Acabando"],
    ["Laudos aguardando", data.exames.filter((item) => /aguard/i.test(item.status)).length, "/exames?filtro=Aguardando"],
    ["Ocorrências abertas", data.ocorrencias.filter((item) => item.status === "Aberta").length, "/ocorrencias"],
  ] as const
  const hour = now.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <Page
      bg="#f6efe7"
      blobs={[["#ffb27a", "30%", 160, 640, 640], ["#8fe0d2", -80, 520, 360, 360], ["#ffd39a", "82%", 40, 340, 340]]}
      crumb={`Dashboard · ${fmtLong(day)}`}
      title={`${greeting}, ${profile.displayName}.`}
      sub={`${activeUnit.name} · Compromissos de ${isToday ? "hoje" : fmtLong(day)}, em ordem de horário.`}
      actions={
        <>
          <Seg label="Período dos indicadores" options={[["1", "Hoje"], ["7", "Semana"], ["30", "Mês"]]} value={period} onChange={setPeriod} />
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/agendas")}>
            <CalendarDays /> Agenda
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => navigate("/consultas?novo=1")}>
            <Plus /> Nova consulta
          </button>
        </>
      }
    >
      {clinic === "minha" && (() => {
        // N-11: roteiro de primeiros passos da clínica real.
        const steps: [string, boolean, string][] = [
          ["Cadastrar a equipe", data.profissionais.length > 0, "/profissionais?novo=1"],
          ["Cadastrar os serviços e preços", data.servicos.length > 0, "/servicos?novo=1"],
          ["Cadastrar um tutor", data.tutores.length > 0, "/tutores?novo=1"],
          ["Cadastrar o primeiro animal", data.animais.length > 0, "/animais?novo=1"],
          ["Fazer o primeiro agendamento", data.agendas.length > 0, "/agendas"],
        ]
        const doneCount = steps.filter(([, ok]) => ok).length
        if (doneCount === steps.length) return null
        return (
          <section className="vx-glass" style={{ padding: 18, marginBottom: 18 }} aria-label="Primeiros passos">
            <div className="vx-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontSize: 16 }}>Primeiros passos · {doneCount} de {steps.length}</strong>
              <span className="vx-hint">Siga a ordem para deixar a clínica pronta para atender.</span>
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
              {steps.map(([label, ok, path], index) => (
                <li key={label}>
                  <button className="vx-btn vx-btn-g" style={{ width: "100%", justifyContent: "flex-start", opacity: ok ? 0.6 : 1 }} onClick={() => navigate(path)}>
                    <b style={{ color: ok ? "var(--vx-green)" : "var(--vx-accent)" }}>{ok ? "✓" : index + 1}</b> {label}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )
      })()}
      <div className="vx-dash">
        <div className="vx-side">
          <button className="vx-glass vx-clickable" style={{ textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("/financeiro")}>
            <div className="vx-lbl">Receita recebida · {period === "1" ? "hoje" : `últimos ${period} dias`}</div>
            <div className="vx-num" style={{ fontSize: 32, marginTop: 6 }}><CountUp value={revenue} /></div>
            <svg key={`${period}-${revenue}`} className="vx-spark" width="100%" height="64" viewBox="0 0 260 58" preserveAspectRatio="none" aria-hidden="true" style={{ marginTop: 8 }}>
              <defs>
                <linearGradient id="vxSparkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2b7a4b" stopOpacity=".28" /><stop offset="1" stopColor="#2b7a4b" stopOpacity="0" /></linearGradient>
              </defs>
              {[14, 28, 42].map((y) => <line key={y} x1="0" x2="260" y1={y} y2={y} stroke="currentColor" opacity=".07" />)}
              {spark.map((value, index) => (
                <rect key={index} className="vx-spark-bar" x={index * 28.8 - 6} width="12" y={54 - (value / sparkMax) * 42} height={(value / sparkMax) * 42} rx="3" fill="#2b7a4b" opacity=".12" style={{ animationDelay: `${index * 60}ms` }} />
              ))}
              <path className="vx-spark-area" d={`${sparkPath} L259 54 L0 54Z`} fill="url(#vxSparkFill)" />
              <path className="vx-spark-line" d={sparkPath} pathLength={1} fill="none" stroke="#2b7a4b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle className="vx-spark-dot" cx={259} cy={50 - (spark[spark.length - 1] / sparkMax) * 42} r="4" fill="#2b7a4b" />
              <circle className="vx-spark-pulse" cx={259} cy={50 - (spark[spark.length - 1] / sparkMax) * 42} r="4" fill="none" stroke="#2b7a4b" strokeWidth="2" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--vx-green)" }}>{revenueItems.length} lançamentos recebidos</div>
          </button>
          <button className="vx-glass vx-clickable" style={{ textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("/internacoes")}>
            <div className="vx-lbl">Leitos ocupados</div>
            <div className="vx-row" style={{ gap: 5, marginTop: 12, flexWrap: "wrap" }}>
              {Array.from({ length: beds }, (_, index) => (
                <span key={index} style={{ width: 14, height: 34, borderRadius: 6, background: index < occupied ? "#e94f17" : "rgba(26,34,51,.12)" }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: "var(--vx-muted)", marginTop: 10 }}>
              <b style={{ color: "var(--vx-ink)" }}>{occupied} de {beds}</b> · abra o mapa de leitos
            </div>
          </button>
          <button className="vx-glass vx-clickable" style={{ display: "flex", gap: 14, alignItems: "center", font: "inherit", color: "inherit", textAlign: "left" }} onClick={() => navigate("/animais")}>
            <div className="vx-num" style={{ fontSize: 40, color: "var(--vx-teal)" }}>{patients}</div>
            <div style={{ fontSize: 13, color: "var(--vx-muted)", lineHeight: 1.4 }}>
              pacientes ativos<br />
              <b style={{ color: "var(--vx-ink)" }}>{metrics.tutors} tutores</b>
            </div>
          </button>
        </div>

        <section className="vx-glass vx-timeline" aria-label={`Compromissos de ${fmtLong(day)}`}>
          <div className="vx-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div className="vx-lbl">{isToday ? `Hoje · agora ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : fmtLong(day)}</div>
              <div style={{ fontSize: 15, marginTop: 4 }}><b className="vx-num" style={{ fontSize: 22 }}>{events.length}</b> compromissos{isToday ? ` · ${done} concluídos` : ""}</div>
            </div>
            <div className="vx-row" style={{ gap: 6 }}>
              <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><ChevronLeft /></button>
              <button className="vx-chip" onClick={() => setDay(todayISO())} aria-pressed={isToday}>Hoje</button>
              <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><ChevronRight /></button>
            </div>
          </div>
          {focus && (
            <button className="vx-tl-focus" onClick={() => navigate(`/${focus.slug}/${focus.item.id}`)} style={{ borderColor: kindColor[focus.kind] }}>
              <small style={{ color: kindColor[focus.kind] }}>{current ? "Acontecendo agora" : "Próximo"} · {focus.item.time}</small>
              <strong>{focus.item.animal || focus.item.name} · {focus.item.name}</strong>
              <span>{focus.item.professional}</span>
            </button>
          )}
          <ol className="vx-tl">
            {events.map((event) => {
              const past = isToday && event.start + event.minutes <= nowMin
              const live = current === event
              return (
                <li key={`${event.slug}-${event.item.id}`} className={`${past ? "past" : ""} ${live ? "live" : ""}`}>
                  <time>{event.item.time}</time>
                  <button onClick={() => navigate(`/${event.slug}/${event.item.id}`)} style={{ borderLeftColor: kindColor[event.kind], minHeight: Math.max(52, Math.min(140, event.minutes * 1.1)) }}>
                    <strong>{event.item.animal || "—"} · {event.item.name}</strong>
                    <small>{event.kind} · {event.minutes} min · {event.item.professional || "sem profissional"}{past ? " · concluído" : live ? " · agora" : ""}</small>
                  </button>
                </li>
              )
            })}
          </ol>
          {!events.length && <div className="vx-empty" style={{ padding: 24 }}>Nenhum compromisso neste dia. <button className="vx-btn vx-btn-g" style={{ marginTop: 10 }} onClick={() => navigate("/agendas")}><CalendarDays /> Abrir agenda</button></div>}
        </section>

        <div className="vx-side">
          <div className="vx-glass">
            <div className="vx-lbl">Próximos</div>
            <div style={{ marginTop: 8 }}>
              {upcoming.slice(0, 4).map((event) => (
                <button key={`${event.slug}-${event.item.id}`} className="vx-up" onClick={() => navigate(`/${event.slug}/${event.item.id}`)}>
                  <span className="vx-dot" style={{ background: kindColor[event.kind], width: 10, height: 10 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>
                      {event.item.name} · {event.item.animal || "—"}
                    </strong>
                    <small>{event.item.professional}</small>
                  </span>
                  <b className="vx-num" style={{ fontSize: 14 }}>{event.item.time}</b>
                </button>
              ))}
              {!upcoming.length && <div className="vx-hint" style={{ padding: "8px 0" }}>Nada mais para este dia.</div>}
            </div>
          </div>
          <div className="vx-dark" style={{ padding: 18 }}>
            <div className="vx-lbl" style={{ color: "rgba(255,255,255,.7)" }}>Precisa de você</div>
            <div style={{ marginTop: 8 }}>
              {needs.map(([label, count, path]) => (
                <button key={label} className="vx-needrow" onClick={() => navigate(path)}>
                  <span>{label}</span>
                  <b>{count}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {(Object.keys(kindColor) as Kind[]).map((kind) => (
              <button
                key={kind}
                className="vx-chip"
                aria-pressed={!hidden.includes(kind)}
                style={{ opacity: hidden.includes(kind) ? 0.45 : 1 }}
                onClick={() => setHidden((current) => (current.includes(kind) ? current.filter((entry) => entry !== kind) : [...current, kind]))}
              >
                <span className="vx-dot" style={{ background: kindColor[kind] }} />
                {kind}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
