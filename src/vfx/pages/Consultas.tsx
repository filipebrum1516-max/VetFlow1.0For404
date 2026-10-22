import { useMemo, useState, type DragEvent } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, ChevronLeft, ChevronRight, History, Megaphone, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, fmtLong, initials, itemDate, matches, Page, Pager, SearchBox, Seg, StatusPill, todayISO, usePaged } from "../ui"

const lanes = [
  { key: "Chegou", label: "Chegou", statuses: ["Chegou", "Agendado", "Confirmado"], color: "#c2410c", bg: "#ffe7d2" },
  { key: "Triagem", label: "Triagem", statuses: ["Triagem"], color: "#9a6212", bg: "#fff1c9" },
  { key: "Em atendimento", label: "No consultório", statuses: ["Em atendimento", "Em andamento"], color: "#0f766e", bg: "#d5f3ec" },
  { key: "Concluído", label: "Finalizado", statuses: ["Concluído"], color: "#2457c5", bg: "#dce7ff" },
]
const flow = ["Chegou", "Triagem", "Em atendimento", "Concluído"]

function laneOf(item: Item) {
  return lanes.find((lane) => lane.statuses.includes(item.status))
}

export default function Consultas() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("consultas")
  const [view, setView] = useState<"fila" | "historico">("fila")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [calledId, setCalledId] = useState("")
  const [dragOver, setDragOver] = useState("")
  const dates = useMemo(() => [...new Set(data.consultas.map(itemDate))].sort(), [data.consultas])
  const [day, setDay] = useState(() => {
    const today = todayISO()
    if (dates.includes(today)) return today
    return [...dates].reverse().find((value) => value <= today) || today
  })

  const dayItems = useMemo(
    () => data.consultas.filter((item) => itemDate(item) === day && matches(item, query)).sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [data.consultas, day, query],
  )
  const senha = (item: Item) => {
    const index = dayItems.findIndex((candidate) => candidate.id === item.id)
    const prefix = item.urgency || item.extra?.prioridade === "Urgente" ? "U" : item.extra?.prioridade === "Preferencial" ? "P" : "A"
    return `${prefix}·${String(index + 1).padStart(3, "0")}`
  }
  const waiting = dayItems.filter((item) => ["Chegou", "Agendado", "Confirmado", "Triagem"].includes(item.status))
  const absent = dayItems.filter((item) => ["Faltou", "Cancelado"].includes(item.status))
  const called = dayItems.find((item) => item.id === calledId) || dayItems.find((item) => laneOf(item)?.key === "Em atendimento")

  const move = (item: Item, status: string) => {
    updateItem("consultas", item.id, { status })
    forms.toast(`${item.animal || item.name} → ${lanes.find((lane) => lane.key === status)?.label || status}`)
  }
  const advance = (item: Item) => {
    const current = laneOf(item)?.key || "Chegou"
    const next = flow[Math.min(flow.length - 1, flow.indexOf(current) + 1)]
    if (next === "Em atendimento") setCalledId(item.id)
    move(item, next)
  }
  const callNext = () => {
    const next =
      waiting.find((item) => item.urgency || item.extra?.prioridade === "Urgente") ||
      waiting.find((item) => item.extra?.prioridade === "Preferencial") ||
      waiting[0]
    if (!next) return forms.toast("Ninguém aguardando na fila deste dia.")
    setCalledId(next.id)
    move(next, "Em atendimento")
  }
  const onDrop = (event: DragEvent, status: string) => {
    event.preventDefault()
    setDragOver("")
    const id = event.dataTransfer.getData("text/plain")
    const item = data.consultas.find((candidate) => candidate.id === id)
    if (item && laneOf(item)?.key !== status) {
      if (status === "Em atendimento") setCalledId(item.id)
      move(item, status)
    }
  }

  const history = useMemo(
    () => data.consultas.filter((item) => matches(item, query) && (statusFilter === "Todos" || item.status === statusFilter)),
    [data.consultas, query, statusFilter],
  )
  const paged = usePaged(history, 12, [query, statusFilter, view])

  const Ticket = ({ item, lane }: { item: Item; lane?: (typeof lanes)[number] }) => (
    <div style={{ position: "relative" }}>
      <button
        className="vx-ticket"
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
        onClick={() => navigate(`/consultas/${item.id}`)}
        aria-label={`Senha ${senha(item)}, ${item.animal}, ${item.name}`}
      >
        <span className="stub" style={{ background: lane?.bg || "#eef0f4" }}>
          <small>SENHA</small>
          <b>{senha(item)}</b>
        </span>
        <span className="body">
          <span className="vx-row" style={{ justifyContent: "space-between", gap: 6 }}>
            <strong>{item.animal || item.name}</strong>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--vx-muted)" }}>{item.time}</span>
          </span>
          <small>
            {item.name} · {item.owner}
          </small>
          <span className="vx-row" style={{ gap: 6, marginTop: 8 }}>
            <span className="vx-av" style={{ width: 22, height: 22, fontSize: 9, background: colorFor(item.professional || "") }}>
              {initials(item.professional)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--vx-ink2)" }}>{item.professional}</span>
          </span>
        </span>
      </button>
      {lane && lane.key !== "Concluído" && (
        <button className="adv vx-ticket-adv" aria-label={`Avançar ${item.animal} para a próxima etapa`} onClick={() => advance(item)} style={{ position: "absolute", right: 8, bottom: 8, width: 30, height: 30, borderRadius: "50%", border: 0, background: "var(--vx-soft)", color: "var(--vx-ink)", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  )

  return (
    <Page
      bg="#fbf3e6"
      blobs={[["#ffd39a", -120, 260, 520, 420], ["#ffb27a", "78%", 360, 480, 420], ["#9fe3c6", "45%", -120, 300, 300]]}
      crumb="Consultas"
      title="Fila viva"
      sub="Cada paciente é uma senha que anda da recepção até a alta. Arraste entre as colunas ou toque na seta para avançar."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar pet, tutor ou serviço" />
          <Seg options={[["fila", "Fila do dia"], ["historico", "Histórico"]]} value={view} onChange={setView} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("consultas", undefined, { date: day })}>
            <Plus /> Emitir senha
          </button>
        </>
      }
    >
      {view === "fila" ? (
        <>
          <div className="vx-dark vx-call">
            <div className="vx-row" style={{ gap: 10 }}>
              <span className="vx-dot" style={{ width: 10, height: 10, background: "#5ee0b0", boxShadow: "0 0 0 6px rgba(94,224,176,.2)" }} />
              <span className="vx-lbl" style={{ color: "rgba(255,255,255,.75)" }}>Chamando agora</span>
            </div>
            <div className="senha">{called ? senha(called) : "—"}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 19, fontWeight: 750 }}>{called ? `${called.animal} → ${called.extra?.sala || "Consultório"}` : "Ninguém chamado"}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{called ? `${called.professional} · ${called.name} · tutor ${called.owner}` : "Use “Chamar próxima” para puxar a fila"}</div>
            </div>
            <div className="vx-row" style={{ gap: 22, fontSize: 13, color: "rgba(255,255,255,.75)" }}>
              <div>
                <div className="vx-num" style={{ fontSize: 24, color: "#fff" }}>{waiting.length}</div>na fila
              </div>
              <div>
                <div className="vx-num" style={{ fontSize: 24, color: "#fff" }}>{dayItems.length}</div>no dia
              </div>
            </div>
            <div className="vx-row" style={{ gap: 6 }}>
              <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))} style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>
                <ChevronLeft />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: "center" }}>{fmtLong(day)}</span>
              <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))} style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>
                <ChevronRight />
              </button>
            </div>
            <button className="vx-btn" onClick={callNext} style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.25)" }}>
              <Megaphone /> Chamar próxima
            </button>
          </div>
          <div className="vx-lanes">
            {lanes.map((lane) => {
              const items = dayItems.filter((item) => laneOf(item)?.key === lane.key)
              return (
                <section
                  key={lane.key}
                  className={`vx-glass vx-lane ${dragOver === lane.key ? "drop" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(lane.key)
                  }}
                  onDragLeave={() => setDragOver("")}
                  onDrop={(event) => onDrop(event, lane.key)}
                  aria-label={lane.label}
                >
                  <div className="vx-row" style={{ justifyContent: "space-between", padding: "2px 4px" }}>
                    <div className="vx-row" style={{ gap: 8 }}>
                      <span className="vx-dot" style={{ background: lane.color, width: 10, height: 10 }} />
                      <strong style={{ fontSize: 15 }}>{lane.label}</strong>
                    </div>
                    <span className="vx-chip" style={{ minHeight: 24 }}>{items.length}</span>
                  </div>
                  {items.map((item) => (
                    <Ticket key={item.id} item={item} lane={lane} />
                  ))}
                  {!items.length && <div className="vx-hint" style={{ textAlign: "center", padding: 18 }}>Solte uma senha aqui</div>}
                </section>
              )
            })}
          </div>
          {absent.length > 0 && (
            <section className="vx-glass" style={{ padding: 16, marginTop: 16 }}>
              <div className="vx-lbl" style={{ marginBottom: 10 }}>Ausências e cancelamentos do dia · {absent.length}</div>
              <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
                {absent.map((item) => (
                  <button key={item.id} className="vx-chip" onClick={() => navigate(`/consultas/${item.id}`)}>
                    {senha(item)} · {item.animal} · {item.status}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="vx-glass" style={{ padding: 18 }}>
          <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div className="vx-row" style={{ gap: 8 }}>
              <History size={18} />
              <strong>{history.length} consultas</strong>
            </div>
            <Seg options={["Todos", "Concluído", "Em atendimento", "Chegou", "Faltou", "Cancelado"]} value={statusFilter} onChange={setStatusFilter} />
          </div>
          <div className="vx-ticket-grid">
            {paged.visible.map((item) => (
              <button key={item.id} className="vx-ticket" onClick={() => navigate(`/consultas/${item.id}`)}>
                <span className="stub" style={{ background: laneOf(item)?.bg || "#eef0f4" }}>
                  <small>{itemDate(item).slice(8, 10)}/{itemDate(item).slice(5, 7)}</small>
                  <b style={{ fontSize: 14 }}>{item.time}</b>
                </span>
                <span className="body">
                  <strong>{item.animal}</strong>
                  <small>{item.name} · {item.professional}</small>
                  <span style={{ display: "block", marginTop: 6 }}>
                    <StatusPill status={item.status} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="vx-row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} label={`Página ${paged.page} de ${paged.pages}`} />
          </div>
        </section>
      )}
      {forms.node}
    </Page>
  )
}
