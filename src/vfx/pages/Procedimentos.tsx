import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Edit3, Plus, Play } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { brl, fmtDate, itemDate, Page, Pager, SearchBox, Seg, StatusPill } from "../ui"

const suits: Record<string, [string, string]> = {
  Clínico: ["◆", "#b9500a"],
  Cirúrgico: ["✚", "#6d4bc2"],
  Diagnóstico: ["●", "#2457c5"],
  Estético: ["✦", "#b4325e"],
  Terapêutico: ["▲", "#0f766e"],
}
const seedSuit: Record<string, string> = {
  "Curativo simples": "Clínico",
  "Coleta de sangue": "Diagnóstico",
  "Limpeza otológica": "Clínico",
  Fluidoterapia: "Terapêutico",
  "Limpeza dentária": "Cirúrgico",
  "Aplicação de medicamento": "Clínico",
}
type Card = { name: string; suit: string; catalog?: Item; uses: Item[]; price: number; duration: string }

export default function Procedimentos() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("procedimentos", (saved) => setSelected(saved.name))
  const [suit, setSuit] = useState("Todos")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  // D-04 / M-26: a lista é a visão padrão; as cartas viram a visão "Visual" opcional.
  const [mode, setMode] = useState<"lista" | "visual">(() => { try { return (localStorage.getItem("vetflow-proc-view") as "lista" | "visual") || "lista" } catch { return "lista" } })
  const changeMode = (value: "lista" | "visual") => { setMode(value); try { localStorage.setItem("vetflow-proc-view", value) } catch { /* ok */ } }
  const cards = useMemo(() => {
    const map = new Map<string, Card>()
    data.procedimentos.forEach((item) => {
      const card = map.get(item.name) || { name: item.name, suit: seedSuit[item.name] || "Clínico", uses: [], price: 0, duration: "30 min" }
      if (item.extra?.catalogo) {
        card.catalog = item
        card.suit = item.extra.naipe || item.category || card.suit
        card.price = item.amountValue || card.price
        card.duration = item.extra.duracao || card.duration
      } else card.uses.push(item)
      map.set(item.name, card)
    })
    map.forEach((card) => {
      if (!card.price && card.uses.length) card.price = Math.round(card.uses.reduce((sum, use) => sum + (use.amountValue || 0), 0) / card.uses.length)
    })
    return [...map.values()].sort((a, b) => b.uses.length - a.uses.length)
  }, [data.procedimentos])
  const filtered = cards.filter((card) => (suit === "Todos" || card.suit === suit) && card.name.toLowerCase().includes(query.toLowerCase()))
  const perHand = 7
  const pages = Math.max(1, Math.ceil(filtered.length / perHand))
  const hand = filtered.slice((Math.min(page, pages) - 1) * perHand, Math.min(page, pages) * perHand)
  const [selected, setSelected] = useState("")
  const current = filtered.find((card) => card.name === selected) || hand[Math.floor(hand.length / 2)]
  const [symbol, color] = suits[current?.suit || "Clínico"] || suits.Clínico
  const checklist: string[] = current?.catalog?.extra?.checklist?.map((row: { etapa: string }) => row.etapa).filter(Boolean) || ["Conferir identificação do paciente", "Registrar no prontuário", "Orientar o tutor"]

  return (
    <Page
      bg="#fbeff1"
      blobs={[["#ffb8c6", 60, 260, 640, 520], ["#ffd39a", "75%", -60, 380, 380], ["#b8d4ff", "88%", "70%", 320, 320]]}
      crumb="Procedimentos"
      title="Procedimentos"
      sub="Procedimentos oferecidos, com categoria, preço e protocolo da equipe."
      actions={
        <>
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1) }} placeholder="Buscar procedimento" />
          <Seg label="Modo de exibição" options={[["lista", "Lista"], ["visual", "Visual"]]} value={mode} onChange={(value) => changeMode(value as "lista" | "visual")} />
          <Seg options={[["Todos", `Todos ${cards.length}`], ...Object.entries(suits).map(([key, [mark]]) => [key, `${mark} ${key}`] as [string, string])]} value={suit} onChange={(value) => { setSuit(value); setPage(1) }} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("procedimentos")}>
            <Plus /> Novo procedimento
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 460px", gap: 20, alignItems: "start" }} className="vx-proc-grid">
        {mode === "lista" ? (
          <div className="vx-table">
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: "minmax(0,2fr) 120px 110px 90px 110px" }}><span>Procedimento</span><span>Categoria</span><span>Duração</span><span>Feitos</span><span className="r">Preço</span></div>
            {filtered.map((card) => (
              <button key={card.name} className={`vx-tr ${current?.name === card.name ? "on" : ""}`} style={{ gridTemplateColumns: "minmax(0,2fr) 120px 110px 90px 110px", textAlign: "left", font: "inherit", color: "inherit", background: current?.name === card.name ? "rgba(233,79,23,.08)" : undefined, border: 0, width: "100%", cursor: "pointer" }} onClick={() => setSelected(card.name)}>
                <strong>{card.name}</strong>
                <span>{(suits[card.suit] || suits.Clínico)[0]} {card.suit}</span>
                <span>{card.duration}</span>
                <span className="vx-mono">{card.uses.length}</span>
                <b className="r">{card.price ? brl(card.price) : "—"}</b>
              </button>
            ))}
            {!filtered.length && <div className="vx-empty">Nenhum procedimento encontrado. <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => forms.open("procedimentos")}><Plus /> Cadastrar procedimento</button></div>}
          </div>
        ) : (
        <div>
          <div className="vx-fan" style={{ zIndex: 1 }}>
            {hand.map((card, index) => {
              const [mark, tint] = suits[card.suit] || suits.Clínico
              const spread = hand.length - 1 || 1
              const angle = -24 + (48 * index) / spread
              const left = `calc(${(index / spread) * 76}% + 10px)`
              const lift = current?.name === card.name ? 40 : 0
              return (
                <button
                  key={card.name}
                  className={`vx-card ${current?.name === card.name ? "on" : ""}`}
                  style={{ left, bottom: 40 + Math.cos((angle * Math.PI) / 180) * 80 - 60 + lift, transform: `rotate(${angle}deg)`, zIndex: current?.name === card.name ? 999 : index }}
                  onClick={() => setSelected(card.name)}
                  aria-label={`Carta ${card.name}`}
                >
                  <span className="vx-suit" style={{ fontSize: 22, color: tint }}>{mark}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: tint, letterSpacing: ".08em", marginTop: 2 }}>{card.suit.toUpperCase()}</span>
                  <span className="vx-suit" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, color: tint, opacity: 0.18 }}>{mark}</span>
                  <strong style={{ fontSize: 15, lineHeight: 1.15 }}>{card.name}</strong>
                  <span className="vx-row" style={{ justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--vx-muted)" }}>
                    <span>{card.uses.length}×</span>
                    <b style={{ color: "var(--vx-ink)" }}>{card.price ? brl(card.price) : "—"}</b>
                  </span>
                </button>
              )
            })}
            {!hand.length && <div className="vx-glass vx-empty">Nenhuma carta neste naipe.</div>}
          </div>
          <div className="vx-row" style={{ justifyContent: "center" }}>
            <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} label={`Mão ${Math.min(page, pages)} de ${pages}`} />
          </div>
        </div>
        )}

        {current && (
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap", position: "relative", zIndex: 1000 }}>
            <div style={{ width: 210, height: 320, flex: "none", borderRadius: 24, background: `linear-gradient(160deg, ${color}, #1a2233)`, color: "#fff", padding: 18, display: "flex", flexDirection: "column", boxShadow: "0 34px 60px -26px rgba(26,34,51,.7)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.2)" }} />
              <div className="vx-suit" style={{ fontSize: 34 }}>{symbol}</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", opacity: 0.85 }}>{current.suit.toUpperCase()}</div>
              <div className="vx-serif" style={{ marginTop: "auto", fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>{current.name}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{current.catalog?.extra?.descricao || `${current.uses.length} execuções registradas`}</div>
              <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.25)" }}>
                <span style={{ fontSize: 13 }}>≈ {current.duration}</span>
                <span className="vx-num" style={{ fontSize: 22 }}>{current.price ? brl(current.price) : "—"}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="vx-glass" style={{ padding: 16 }}>
                <div className="vx-lbl">Verso da carta</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, fontSize: 13 }}>
                  {checklist.map((step) => (
                    <div key={step} className="vx-row" style={{ gap: 8 }}><span className="vx-dot" style={{ background: "var(--vx-teal)" }} />{step}</div>
                  ))}
                </div>
              </div>
              <div className="vx-glass" style={{ padding: 16 }}>
                <div className="vx-lbl">Últimas jogadas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {current.uses.slice().sort((a, b) => itemDate(b).localeCompare(itemDate(a))).slice(0, 4).map((use) => (
                    <button key={use.id} className="vx-up" onClick={() => navigate(`/procedimentos/${use.id}`)}>
                      <span style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13 }}>{use.animal}</strong>
                        <small>{fmtDate(itemDate(use))} · {use.professional}</small>
                      </span>
                      <StatusPill status={use.status} />
                    </button>
                  ))}
                  {!current.uses.length && <span className="vx-hint">Ainda não foi usada.</span>}
                </div>
              </div>
              <button className="vx-btn vx-btn-p" onClick={() => forms.open("procedimentos-exec", undefined, { name: current.name, valor: current.price ? brl(current.price) : "" })}>
                <Play /> Jogar no atendimento
              </button>
              <button className="vx-btn vx-btn-g" onClick={() => (current.catalog ? forms.open("procedimentos", current.catalog) : forms.open("procedimentos", undefined, { name: current.name, naipe: current.suit, preco: current.price ? brl(current.price) : "" }))}>
                <Edit3 /> {current.catalog ? "Editar carta" : "Completar a carta"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 1150px){ .vx-proc-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
