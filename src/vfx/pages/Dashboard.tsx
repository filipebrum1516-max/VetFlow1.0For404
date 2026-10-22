import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useVetFlow, type Item, type ModuleSlug } from "../../store"
import { bedAssignments } from "../forms"
import { addDays, brl, fmtLong, itemDate, Page, Seg, todayISO } from "../ui"

const START_H = 7
const HOURS = 12
const R = 240
const CIRC = 2 * Math.PI * R
const PER_MIN = CIRC / (HOURS * 60)

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
  const { data, profile, activeUnit } = useVetFlow()
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

  const daysWithEvents = useMemo(() => [...new Set(allEvents.map((event) => itemDate(event.item)))].sort(), [allEvents])
  const [day, setDay] = useState(() => {
    const today = todayISO()
    if (daysWithEvents.includes(today)) return today
    return daysWithEvents.find((value) => value >= today) || daysWithEvents[daysWithEvents.length - 1] || today
  })
  const events = allEvents.filter((event) => itemDate(event.item) === day && !hidden.includes(event.kind)).sort((a, b) => a.start - b.start)
  const isToday = day === todayISO()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const current = isToday ? events.find((event) => event.start <= nowMin && nowMin < event.start + event.minutes) : undefined
  const upcoming = events.filter((event) => !isToday || event.start >= nowMin)
  const focus = current || upcoming[0]
  const done = isToday ? events.filter((event) => event.start + event.minutes <= nowMin).length : 0
  const needle = ((Math.min(Math.max(nowMin, START_H * 60), (START_H + HOURS) * 60) - START_H * 60) / (HOURS * 60)) * 360

  const ref = useMemo(() => {
    const today = todayISO()
    const dates = data.financeiro.map(itemDate).filter((value) => value <= today).sort()
    return dates[dates.length - 1] || today
  }, [data.financeiro])
  const days = Number(period)
  const revenueItems = data.financeiro.filter((item) => item.category === "Receita" && itemDate(item) > addDays(ref, -days) && itemDate(item) <= ref)
  const revenue = revenueItems.reduce((sum, item) => sum + (item.amountValue || 0), 0)
  const spark = Array.from({ length: 10 }, (_, index) => {
    const date = addDays(ref, index - 9)
    return data.financeiro.filter((item) => item.category === "Receita" && itemDate(item) === date).reduce((sum, item) => sum + (item.amountValue || 0), 0)
  })
  const sparkMax = Math.max(...spark, 1)
  const sparkPath = spark.map((value, index) => `${index === 0 ? "M" : "L"}${index * 28.8} ${50 - (value / sparkMax) * 42}`).join(" ")
  const beds = 14
  const occupied = Math.min(beds, bedAssignments(data.internacoes, data.animais).map.size)
  const patients = data.animais.filter((item) => !/falec|inativ/i.test(item.status)).length
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
      sub={`${activeUnit.name} — seu dia em órbita: cada arco é um compromisso, o ponteiro é agora.`}
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
      <div className="vx-dash">
        <div className="vx-side">
          <button className="vx-glass vx-clickable" style={{ textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("/financeiro")}>
            <div className="vx-lbl">Receita · {period === "1" ? "último dia" : `${period} dias`}</div>
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
              <b style={{ color: "var(--vx-ink)" }}>{data.tutores.length} tutores</b>
            </div>
          </button>
        </div>

        <div className="vx-orbit">
          <svg viewBox="0 0 600 600" role="img" aria-label={`Agenda de ${fmtLong(day)} em formato de relógio, das 7h às 19h`}>
            <circle cx="300" cy="300" r={R} fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="44" />
            <g transform="rotate(-90 300 300)" fill="none" strokeWidth="34" strokeLinecap="round">
              {events.map((event) => {
                const offset = Math.max(0, event.start - START_H * 60) * PER_MIN
                const length = Math.max(10, Math.min(event.minutes, (START_H + HOURS) * 60 - event.start) * PER_MIN - 6)
                if (event.start >= (START_H + HOURS) * 60) return null
                return (
                  <circle
                    key={`${event.slug}-${event.item.id}`}
                    className="vx-arc"
                    cx="300"
                    cy="300"
                    r={R}
                    stroke={kindColor[event.kind]}
                    strokeDasharray={`${length} ${CIRC}`}
                    strokeDashoffset={-offset - 3}
                    opacity={isToday && event.start + event.minutes <= nowMin ? 0.45 : 1}
                    onClick={() => navigate(`/${event.slug}/${event.item.id}`)}
                  >
                    <title>{`${event.item.time} · ${event.item.name} · ${event.item.animal || ""}`}</title>
                  </circle>
                )
              })}
            </g>
            <g fontSize="13" fontWeight="700" fill="currentColor" textAnchor="middle" style={{ color: "var(--vx-muted)" }}>
              <text x="300" y="34">7h</text>
              <text x="572" y="305">10h</text>
              <text x="300" y="584">13h</text>
              <text x="28" y="305">16h</text>
            </g>
            {isToday && (
              <g transform={`rotate(${needle} 300 300)`}>
                <line x1="300" y1="300" x2="300" y2="38" stroke="currentColor" style={{ color: "var(--vx-ink)" }} strokeWidth="3" strokeLinecap="round" />
                <circle cx="300" cy="44" r="9" fill="var(--vx-ink)" stroke="#fff" strokeWidth="3" />
              </g>
            )}
            <circle cx="300" cy="300" r="8" fill="var(--vx-ink)" />
          </svg>
          <div className="vx-glass vx-orbit-core">
            <div className="vx-lbl">{isToday ? `Agora · ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : fmtLong(day)}</div>
            {focus ? (
              <button onClick={() => navigate(`/${focus.slug}/${focus.item.id}`)} style={{ border: 0, background: "transparent", font: "inherit", color: "inherit", cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: kindColor[focus.kind], marginTop: 6 }}>
                  {current ? "Acontecendo" : "Próximo"} · {focus.item.time}
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>
                  {focus.item.animal || focus.item.name} · {focus.item.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>{focus.item.professional}</div>
              </button>
            ) : (
              <div style={{ fontSize: 14, color: "var(--vx-muted)", marginTop: 6 }}>Sem compromissos restantes</div>
            )}
            <div style={{ width: 140, height: 1, background: "var(--vx-line)", margin: "10px 0" }} />
            <div className="vx-num">{events.length}</div>
            <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>
              compromissos {isToday ? `· ${done} feitos` : ""}
            </div>
          </div>
          <div className="vx-orbit-nav">
            <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}>
              <ChevronLeft />
            </button>
            <button className="vx-chip" onClick={() => setDay(todayISO())}>
              Hoje
            </button>
            <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}>
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="vx-side">
          <div className="vx-glass">
            <div className="vx-lbl">Próximos na órbita</div>
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
