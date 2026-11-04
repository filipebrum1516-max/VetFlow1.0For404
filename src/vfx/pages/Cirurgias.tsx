import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { CheckCircle2, ChevronLeft, ChevronRight, Play, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, fmtDate, fmtLong, hash, itemDate, matches, Page, Pager, SearchBox, Seg, StatusPill, todayISO, usePaged } from "../ui"

const phases = ["Pré-op", "Indução", "Cirurgia", "Recuperação"]
const checks = [["signin", "Sign in"], ["timeout", "Time out"], ["signout", "Sign out"]] as const
const roomColor = ["#5ee0b0", "#b8a5ff"]
const minutes = (time?: string) => {
  const [h, m] = (time || "08:00").split(":").map(Number)
  return h * 60 + (m || 0)
}
const durationMin = (item: Item) => {
  const text = String(item.extra?.duracao || "1 h 30")
  const h = Number((text.match(/(\d+)\s*h/) || [])[1] || 1)
  const m = Number((text.match(/h\s*(\d+)/) || [])[1] || 0)
  return h * 60 + m
}
const timeOf = (item: Item) => item.time || `${String(8 + (hash(item.id) % 9)).padStart(2, "0")}:00`
const roomOf = (item: Item) => item.extra?.sala || (hash(item.id) % 2 ? "Sala 2" : "Sala 1")

export default function Cirurgias() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("cirurgias")
  const [view, setView] = useState<"salas" | "lista">("salas")
  const [query, setQuery] = useState("")
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2000)
    return () => window.clearInterval(timer)
  }, [])
  const [day, setDay] = useState(() => todayISO())
  const dayItems = data.cirurgias.filter((item) => itemDate(item) === day && !/cancel/i.test(item.status)).sort((a, b) => minutes(timeOf(a)) - minutes(timeOf(b)))
  const roomItem = (room: string) => {
    const inRoom = dayItems.filter((item) => roomOf(item) === room)
    return inRoom.find((item) => /andamento|pré/i.test(item.status)) || inRoom.find((item) => /agendad/i.test(item.status)) || inRoom[inRoom.length - 1]
  }
  const patch = (item: Item, extra: Record<string, unknown>, status?: string) => updateItem("cirurgias", item.id, { ...(status ? { status } : {}), extra: { ...(item.extra || {}), ...extra } })
  const start = (item: Item) => {
    patch(item, { inicio: new Date().toISOString(), fase: 1 }, "Em andamento")
    forms.toast(`${item.name} de ${item.animal} iniciada.`)
  }
  const setPhase = (item: Item, phase: number) => patch(item, { fase: phase, ...(phase > 0 && !item.extra?.inicio ? { inicio: new Date().toISOString() } : {}) }, phase === 0 ? "Pré-operatório" : "Em andamento")
  const finish = (item: Item) => {
    patch(item, { fase: 3, fim: new Date().toISOString() }, "Concluída")
    forms.toast(`${item.name} concluída. Paciente em recuperação.`)
  }
  const elapsed = (item: Item) => {
    if (!item.extra?.inicio) return "00:00:00"
    const end = item.extra.fim ? new Date(item.extra.fim).getTime() : Date.now()
    const seconds = Math.max(0, Math.floor((end - new Date(item.extra.inicio).getTime()) / 1000))
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((value) => String(value).padStart(2, "0")).join(":")
  }
  const vitals = (item: Item) => {
    const seed = hash(item.id) + tick * (/andamento/i.test(item.status) ? 1 : 0)
    return { fc: 88 + (seed % 30), sp: 96 + (seed % 4), tp: (36.6 + (seed % 12) / 10).toFixed(1).replace(".", ",") }
  }
  const all = useMemo(() => data.cirurgias.filter((item) => matches(item, query)).sort((a, b) => itemDate(b).localeCompare(itemDate(a))), [data.cirurgias, query])
  const paged = usePaged(all, 10, [query])

  return (
    <Page
      bg="#0c1420"
      bgDark="#0c1420"
      className="vx-or"
      blobs={[["#0f766e", -120, 200, 560, 460], ["#3e2a80", "80%", 80, 460, 420]]}
      crumb="Cirurgias"
      title="Cirurgias"
      sub={<span style={{ color: "rgba(255,255,255,.75)" }}>Salas do dia, cirurgias agendadas e checklist de cirurgia segura.</span>}
      actions={
        <>
          <Seg options={[["salas", "Salas"], ["lista", "Todas as cirurgias"]]} value={view} onChange={setView} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("cirurgias", undefined, { date: day })}>
            <Plus /> Agendar cirurgia
          </button>
        </>
      }
    >
      {view === "salas" ? (
        <>
          <div className="vx-row" style={{ gap: 8, marginBottom: 14 }}>
            <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><ChevronLeft /></button>
            <strong style={{ minWidth: 150, textAlign: "center" }}>{fmtLong(day)}</strong>
            <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><ChevronRight /></button>
            <button className="vx-chip" style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.15)" }} onClick={() => setDay(todayISO())}>Hoje</button>
            <span className="vx-chip" style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.15)" }}>
              <span className="vx-dot" style={{ background: "#5ee0b0" }} /> {dayItems.length} no mapa do dia
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
            {["Sala 1", "Sala 2"].map((room, roomIndex) => {
              const item = roomItem(room)
              const color = roomColor[roomIndex]
              if (!item)
                return (
                  <div key={room} className="vx-room" style={{ alignItems: "center", justifyContent: "center", minHeight: 320 }}>
                    <span className="vx-mono" style={{ fontSize: 13, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: color, color: "#0c1420" }}>{room.toUpperCase()}</span>
                    <div style={{ color: "rgba(255,255,255,.7)" }}>Sala livre neste dia</div>
                    <button className="vx-btn vx-btn-g" onClick={() => forms.open("cirurgias", undefined, { date: day, sala: room })}>Reservar {room}</button>
                  </div>
                )
              const phase = Number(item.extra?.fase ?? (/conclu/i.test(item.status) ? 3 : /andamento/i.test(item.status) ? 2 : /pré/i.test(item.status) ? 0 : -1))
              const vital = vitals(item)
              const checklist = item.extra?.checklist || {}
              return (
                <div key={room} className="vx-room">
                  <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div className="vx-row" style={{ gap: 10 }}>
                      <span className="vx-mono" style={{ fontSize: 13, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: color, color: "#0c1420" }}>{room.toUpperCase()}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{item.professional} {item.extra?.anestesista ? `· anest. ${item.extra.anestesista}` : ""}</span>
                    </div>
                    <div className="vx-mono" style={{ fontSize: 32, fontWeight: 800, color }}>{elapsed(item)}</div>
                  </div>
                  <button onClick={() => navigate(`/cirurgias/${item.id}`)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", color: "#fff", cursor: "pointer", font: "inherit" }}>
                    <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.02em" }}>{item.animal}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>{item.name} · {timeOf(item)} · <StatusPill status={item.status} /></div>
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
                    {phases.map((label, index) => (
                      <button key={label} className="vx-phase" onClick={() => setPhase(item, index)} aria-label={`Fase ${label}`}>
                        <div style={{ height: 6, borderRadius: 3, background: index <= phase ? color : "rgba(255,255,255,.12)" }} />
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, color: index <= phase ? "#fff" : "rgba(255,255,255,.5)" }}>{label}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
                    <div className="vx-vital"><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: "#5ee0b0" }}>FC bpm</div><div className="vx-mono" style={{ fontSize: 28, fontWeight: 800, color: "#5ee0b0" }}>{phase > 0 ? vital.fc : "—"}</div>
                      <svg width="100%" height="24" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,16 18,16 24,16 28,4 32,24 36,16 58,16 64,16 68,4 72,24 76,16 98,16 104,16 108,4 112,24 116,16 120,16" fill="none" stroke="#5ee0b0" strokeWidth="1.6" /></svg></div>
                    <div className="vx-vital"><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: "#7fc4ff" }}>SpO₂ %</div><div className="vx-mono" style={{ fontSize: 28, fontWeight: 800, color: "#7fc4ff" }}>{phase > 0 ? vital.sp : "—"}</div>
                      <svg width="100%" height="24" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18 Q10 4 20 18 T40 18 T60 18 T80 18 T100 18 T120 18" fill="none" stroke="#7fc4ff" strokeWidth="1.6" /></svg></div>
                    <div className="vx-vital"><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: "#ffd27a" }}>Temp °C</div><div className="vx-mono" style={{ fontSize: 28, fontWeight: 800, color: "#ffd27a" }}>{phase > 0 ? vital.tp : "—"}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 6 }}>{item.extra?.manutencao || "Iso 2,0%"}</div></div>
                  </div>
                  <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="vx-lbl" style={{ color: "rgba(255,255,255,.6)" }}>Checklist</span>
                    {checks.map(([key, label]) => (
                      <button key={key} className="vx-chip" aria-pressed={!!checklist[key]} onClick={() => patch(item, { checklist: { ...checklist, [key]: !checklist[key] } })} style={{ background: checklist[key] ? "rgba(94,224,176,.18)" : "rgba(255,255,255,.06)", color: checklist[key] ? "#5ee0b0" : "rgba(255,255,255,.7)", borderColor: "rgba(255,255,255,.12)" }}>
                        {checklist[key] ? "✓ " : ""}{label}
                      </button>
                    ))}
                  </div>
                  <div className="vx-row" style={{ gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                    {!/andamento|conclu/i.test(item.status) && (
                      <button className="vx-btn vx-btn-p vx-btn-sm" onClick={() => start(item)}><Play /> Iniciar cirurgia</button>
                    )}
                    {/andamento/i.test(item.status) && (
                      <button className="vx-btn vx-btn-p vx-btn-sm" onClick={() => finish(item)}><CheckCircle2 /> Finalizar</button>
                    )}
                    <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => forms.open("cirurgias", item)}>Editar</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="vx-room" style={{ marginTop: 18, padding: "16px 20px" }}>
            <div className="vx-row" style={{ justifyContent: "space-between" }}>
              <span className="vx-lbl" style={{ color: "rgba(255,255,255,.65)" }}>Mapa cirúrgico do dia · 7h às 19h</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>toque num bloco para abrir</span>
            </div>
            {["Sala 1", "Sala 2"].map((room, roomIndex) => (
              <div key={room} className="vx-row" style={{ gap: 10, marginTop: 10 }}>
                <span className="vx-mono" style={{ width: 56, fontSize: 11, color: "rgba(255,255,255,.7)" }}>{room}</span>
                <div style={{ position: "relative", flex: 1, height: 30, borderRadius: 8, background: "rgba(255,255,255,.05)" }}>
                  {dayItems.filter((item) => roomOf(item) === room).map((item) => {
                    const left = ((minutes(timeOf(item)) - 7 * 60) / (12 * 60)) * 100
                    const width = (durationMin(item) / (12 * 60)) * 100
                    const done = /conclu/i.test(item.status)
                    return (
                      <button key={item.id} onClick={() => navigate(`/cirurgias/${item.id}`)} title={`${timeOf(item)} · ${item.animal} · ${item.name}`}
                        style={{ position: "absolute", left: `${Math.max(0, left)}%`, width: `${Math.max(6, width)}%`, top: 0, height: 30, borderRadius: 8, border: done ? 0 : `1.5px ${/agend/i.test(item.status) ? "dashed" : "solid"} ${roomColor[roomIndex]}`, background: /andamento/i.test(item.status) ? roomColor[roomIndex] : done ? "rgba(94,224,176,.3)" : "transparent", color: /andamento/i.test(item.status) ? "#0c1420" : "#fff", fontSize: 11, fontWeight: 800, padding: "0 8px", textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer", font: "inherit" }}>
                        {item.animal} · {item.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="vx-room">
          <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <SearchBox value={query} onChange={setQuery} placeholder="Buscar cirurgia ou paciente" />
            <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
          </div>
          <div className="vx-list">
            {paged.visible.map((item) => (
              <button key={item.id} className="vx-list-item" onClick={() => navigate(`/cirurgias/${item.id}`)}>
                <span className="vx-mono" style={{ fontSize: 12, width: 86 }}>{fmtDate(itemDate(item))}</span>
                <span className="t"><strong>{item.name} · {item.animal}</strong><small style={{ color: "rgba(255,255,255,.6)" }}>{roomOf(item)} · {timeOf(item)} · {item.professional}</small></span>
                <StatusPill status={item.status} />
              </button>
            ))}
          </div>
        </div>
      )}
      {forms.node}
    </Page>
  )
}
