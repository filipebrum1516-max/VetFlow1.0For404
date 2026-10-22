import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, ArrowRight, Edit3, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { daysBetween, fmtDate, hash, itemDate, matches, Page, SearchBox, Seg, todayISO } from "../ui"

const columns = ["Aberta", "Em análise", "Resolvida"] as const
const colors = ["#ffe58a", "#ffc4d6", "#bfe8c4", "#c7dcff", "#ffd2a6"]
const pins = ["#e5483d", "#2457c5", "#0f766e", "#6d4bc2"]
const gravityOf = (item: Item) => item.extra?.gravidade || (item.urgency ? "Alta" : item.category === "Urgente" ? "Alta" : "Média")

export default function Ocorrencias() {
  const { data, updateItem, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("ocorrencias")
  const [query, setQuery] = useState("")
  const [gravity, setGravity] = useState("Todas")
  const [limit, setLimit] = useState<Record<string, number>>({})
  const [dragId, setDragId] = useState("")
  const [over, setOver] = useState("")
  const [quick, setQuick] = useState("")
  const filtered = useMemo(
    () => data.ocorrencias.filter((item) => matches(item, query) && (gravity === "Todas" || gravityOf(item) === gravity)).sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [data.ocorrencias, query, gravity],
  )
  const resolved = data.ocorrencias.filter((item) => item.status === "Resolvida")
  const avg = resolved.length
    ? Math.round(resolved.reduce((sum, item) => sum + Math.max(0, item.extra?.resolvidoEm ? daysBetween(itemDate(item), item.extra.resolvidoEm) : 1 + (hash(item.id) % 6)), 0) / resolved.length)
    : 0
  const critical = data.ocorrencias.filter((item) => item.status !== "Resolvida" && ["Alta", "Crítica"].includes(gravityOf(item))).length

  const move = (item: Item, status: string) => {
    if (item.status === status) return
    updateItem("ocorrencias", item.id, { status, extra: { ...(item.extra || {}), status, ...(status === "Resolvida" ? { resolvidoEm: todayISO() } : {}) } })
    forms.toast(`"${item.name}" movida para ${status}.`)
  }
  const addQuick = () => {
    if (!quick.trim()) return
    addItem("ocorrencias", { name: quick.trim(), status: "Aberta", category: "Média", date: todayISO(), subtitle: "Registro rápido no mural", extra: { gravidade: "Média", status: "Aberta" } })
    setQuick("")
  }

  return (
    <Page
      bg="#f7f1df"
      blobs={[["#ffe58a", -80, -40, 440, 380], ["#ffc4d6", "78%", 140, 380, 340], ["#bfe8c4", "40%", "80%", 360, 320]]}
      crumb="Ocorrências"
      title="Mural da equipe"
      sub="Cada problema é um post-it. Arraste entre as colunas (ou use as setas) até resolver."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar ocorrência" />
          <Seg options={["Todas", "Baixa", "Média", "Alta", "Crítica"]} value={gravity} onChange={setGravity} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Nova ocorrência
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
        <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Abertas</div><div className="vx-num" style={{ fontSize: 26 }}>{data.ocorrencias.filter((item) => item.status === "Aberta").length}</div></div>
        <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Graves em aberto</div><div className="vx-num" style={{ fontSize: 26, color: "var(--vx-red)" }}>{critical}</div></div>
        <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Tempo médio p/ resolver</div><div className="vx-num" style={{ fontSize: 26 }}>{avg} dias</div></div>
        <form className="vx-glass" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }} onSubmit={(event) => { event.preventDefault(); addQuick() }}>
          <input className="vx-in" aria-label="Post-it rápido" value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="Post-it rápido…" style={{ flex: 1, minWidth: 0 }} />
          <button className="vx-icon-btn" aria-label="Pregar post-it" type="submit"><Plus /></button>
        </form>
      </div>

      <div className="vx-glass vx-board">
        {columns.map((column, columnIndex) => {
          const items = filtered.filter((item) => item.status === column)
          const max = limit[column] || 9
          return (
            <section
              key={column}
              onDragOver={(event) => { event.preventDefault(); setOver(column) }}
              onDragLeave={() => setOver("")}
              onDrop={(event) => {
                event.preventDefault()
                const item = data.ocorrencias.find((candidate) => candidate.id === (event.dataTransfer.getData("text/plain") || dragId))
                if (item) move(item, column)
                setOver("")
                setDragId("")
              }}
              style={{ minHeight: 200, borderRadius: 20, padding: 6, background: over === column ? "rgba(233,79,23,.08)" : "transparent", transition: "background .2s" }}
            >
              <div className="vx-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontFamily: "Caveat, cursive", fontSize: 30, fontWeight: 700 }}>{column}</span>
                <span className="vx-chip" style={{ minHeight: 26 }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {items.slice(0, max).map((item) => {
                  const seed = hash(item.id)
                  const g = gravityOf(item)
                  return (
                    <div
                      key={item.id}
                      className="vx-postit"
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => { event.dataTransfer.setData("text/plain", item.id); setDragId(item.id) }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") navigate(`/ocorrencias/${item.id}`)
                        if (event.key === "ArrowRight" && columnIndex < 2) move(item, columns[columnIndex + 1])
                        if (event.key === "ArrowLeft" && columnIndex > 0) move(item, columns[columnIndex - 1])
                      }}
                      style={{ background: colors[seed % colors.length], transform: `rotate(${((seed % 7) - 3) * 0.8}deg)`, opacity: dragId === item.id ? 0.5 : 1 }}
                    >
                      <span className="pin" style={{ background: pins[seed % pins.length] }} />
                      <h4>{item.name}</h4>
                      <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.35 }}>{item.extra?.descricao || item.notes || item.subtitle}</div>
                      <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 10, gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ["Alta", "Crítica"].includes(g) ? "#b42318" : "#6b5a1a" }}>{g.toUpperCase()} · {fmtDate(itemDate(item), { day: "2-digit", month: "2-digit" })}</span>
                        <span className="vx-row" style={{ gap: 4 }}>
                          <button className="vx-mini-x" aria-label="Voltar coluna" disabled={columnIndex === 0} onClick={() => move(item, columns[columnIndex - 1])} style={{ position: "static" }}><ArrowLeft size={14} /></button>
                          <button className="vx-mini-x" aria-label="Editar" onClick={() => forms.open("ocorrencias", item)} style={{ position: "static" }}><Edit3 size={14} /></button>
                          <button className="vx-mini-x" aria-label="Avançar coluna" disabled={columnIndex === 2} onClick={() => move(item, columns[columnIndex + 1])} style={{ position: "static" }}><ArrowRight size={14} /></button>
                        </span>
                      </div>
                      <button onClick={() => navigate(`/ocorrencias/${item.id}`)} style={{ marginTop: 8, border: 0, background: "rgba(255,255,255,.45)", borderRadius: 8, padding: "4px 8px", font: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#2a2410" }}>
                        {item.professional ? `Resp.: ${item.professional.split(" ").slice(0, 2).join(" ")}` : "Abrir ficha"}
                      </button>
                    </div>
                  )
                })}
                {items.length > max && (
                  <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setLimit({ ...limit, [column]: max + 12 })}>Mostrar mais {Math.min(12, items.length - max)}</button>
                )}
                {!items.length && <div className="vx-empty" style={{ border: "2px dashed rgba(120,90,30,.25)", borderRadius: 16 }}>Solte um post-it aqui</div>}
              </div>
            </section>
          )
        })}
      </div>
      {forms.node}
    </Page>
  )
}
