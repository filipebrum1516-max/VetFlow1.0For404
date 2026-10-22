import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronDown, ChevronUp, Edit3, FileStack, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { brl, colorFor, hash, matches, Page, SearchBox, Seg, StatusPill } from "../ui"

const gradient = (color: string) => `linear-gradient(135deg, ${color}, ${color}cc)`
type Coverage = { servico: string; cobertura: string; repasse: string; limite: string }

export default function Convenios() {
  const { data, updateItem, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("convenios", (saved) => setSelectedId(saved.id))
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos")
  const [start, setStart] = useState(0)
  const list = useMemo(() => data.convenios.filter((item) => matches(item, query) && (status === "Todos" || item.status === status)), [data.convenios, query, status])
  const [selectedId, setSelectedId] = useState("")
  const selected = list.find((item) => item.id === selectedId) || list[0]
  const window5 = list.slice(start, start + 5)
  const ordered = selected && !window5.includes(selected) ? [...window5.slice(0, 4), selected] : window5
  const stack = [...ordered.filter((item) => item !== selected), ...(selected && ordered.includes(selected) ? [selected] : [])]
  const statsOf = (item: Item) => {
    const seed = hash(item.id)
    const guias = data.consultas.filter((consulta) => consulta.extra?.convenio === item.name)
    return { vidas: 20 + (seed % 140), repasse: 900 + (seed % 9000) + guias.reduce((sum, guia) => sum + (guia.amountValue || 0), 0), prazo: item.extra?.prazo || ["D+15", "D+20", "D+30", "D+45"][seed % 4], guias: 30 + (seed % 70) + guias.length, glosas: (seed % 6) * 70 }
  }
  const coverage: Coverage[] = selected?.extra?.cobertura?.filter((row: Coverage) => row.servico) || data.servicos.slice(0, 5).map((service, index) => ({ servico: service.name, cobertura: ["Coparticipação", "Coberto", "Coberto", "Carência", "Não coberto"][index % 5], repasse: brl(Math.round((service.amountValue || 100) * 0.7)), limite: ["ilimitado", "6", "4", "2", "—"][index % 5] }))
  const stats = selected ? statsOf(selected) : undefined
  const recentGuides = data.consultas.filter((item) => item.extra?.convenio === selected?.name).slice(0, 3)
  const fallbackGuides = data.consultas.filter((_, index) => selected && (index + hash(selected.id)) % 97 === 0).slice(0, 3)
  const guides = recentGuides.length ? recentGuides : fallbackGuides

  const toggleStatus = () => {
    if (!selected) return
    const next = selected.status === "Suspenso" ? "Ativo" : "Suspenso"
    updateItem("convenios", selected.id, { status: next })
    forms.toast(`${selected.name} agora está ${next.toLowerCase()}.`)
  }
  const bill = () => {
    if (!selected || !stats) return
    addItem("financeiro", { name: `Lote ${selected.name}`, category: "Receita", kind: "Receita", status: "A receber", amountValue: stats.repasse, subtitle: `Faturamento de convênio • ${stats.prazo}` })
    forms.toast(`Lote de ${selected.name} faturado: ${brl(stats.repasse)} a receber.`)
  }

  return (
    <Page
      bg="#eef0fa"
      blobs={[["#b3c3ff", 60, 200, 560, 520], ["#ffc9a8", "45%", -80, 380, 360], ["#a8e2b8", "88%", "72%", 320, 320]]}
      crumb="Convênios"
      title="Wallet de planos"
      sub="Cada convênio é um cartão na carteira. Toque para puxar e ver coberturas, repasses e guias."
      actions={
        <>
          <SearchBox value={query} onChange={(value) => { setQuery(value); setStart(0) }} placeholder="Buscar convênio" />
          <Seg options={["Todos", "Ativo", "Em análise", "Suspenso"]} value={status} onChange={(value) => { setStatus(value); setStart(0) }} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Adicionar convênio
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "420px minmax(0,1fr)", gap: 36, alignItems: "start" }} className="vx-cv-grid">
        <div>
          <div className="vx-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="vx-lbl">{list.length} cartões</span>
            <div className="vx-row" style={{ gap: 6 }}>
              <button className="vx-icon-btn" aria-label="Cartões anteriores" disabled={start === 0} onClick={() => setStart(Math.max(0, start - 5))}><ChevronUp /></button>
              <button className="vx-icon-btn" aria-label="Mais cartões" disabled={start + 5 >= list.length} onClick={() => setStart(start + 5)}><ChevronDown /></button>
            </div>
          </div>
          <div className="vx-wallet-stack">
            {stack.map((item, index) => {
              const isSelected = item === selected
              const color = item.extra?.cor || colorFor(item.name)
              const itemStats = statsOf(item)
              return (
                <button key={item.id} className="vx-ins" style={{ top: isSelected ? (stack.length - 1) * 60 + 40 : index * 60, background: gradient(color), zIndex: isSelected ? 10 : index }} onClick={() => setSelectedId(item.id)} aria-label={`Cartão ${item.name}`}>
                  <span style={{ position: "absolute", right: -60, bottom: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
                  <span className="vx-row" style={{ justifyContent: "space-between", position: "relative" }}>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{item.status}</span>
                  </span>
                  <span style={{ display: "flex", gap: 22, marginTop: 60, position: "relative" }}>
                    <span><span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", opacity: 0.75 }}>VIDAS</span><span className="vx-num" style={{ fontSize: 26 }}>{itemStats.vidas}</span></span>
                    <span><span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", opacity: 0.75 }}>REPASSE</span><span className="vx-num" style={{ fontSize: 26 }}>{(itemStats.repasse / 1000).toFixed(1).replace(".", ",")} mil</span></span>
                    <span><span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", opacity: 0.75 }}>PRAZO</span><span className="vx-num" style={{ fontSize: 26 }}>{itemStats.prazo}</span></span>
                  </span>
                  <span style={{ position: "absolute", left: 24, right: 24, bottom: 18, fontFamily: "JetBrains Mono, monospace", fontSize: 12, opacity: 0.8, display: "flex", justifyContent: "space-between" }}>
                    <span>{item.id.split("-").slice(-1)[0].padStart(5, "0")}</span><span>{item.category || "plano pet"}</span>
                  </span>
                </button>
              )
            })}
            {!stack.length && <div className="vx-glass vx-empty">Nenhum convênio.</div>}
          </div>
        </div>

        {selected && stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="vx-glass" style={{ padding: 22 }}>
              <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <StatusPill status={selected.status} />
              </div>
              <div className="vx-rows" style={{ marginTop: 14 }}>
                <div className="r" style={{ gridTemplateColumns: "1.4fr 1fr 90px 80px" }}><span>Serviço</span><span>Cobertura</span><span>Repasse</span><span>Limite/ano</span></div>
                {coverage.map((row) => (
                  <div key={row.servico} className="r" style={{ gridTemplateColumns: "1.4fr 1fr 90px 80px" }}>
                    <b>{row.servico}</b>
                    <span style={{ color: /não/i.test(row.cobertura) ? "var(--vx-red)" : /carên/i.test(row.cobertura) ? "var(--vx-amber)" : "var(--vx-green)", fontWeight: 700 }}>{row.cobertura}</span>
                    <span>{row.repasse}</span>
                    <span>{row.limite}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
              <div className="vx-glass" style={{ padding: 18 }}><div className="vx-lbl">A receber</div><div className="vx-num" style={{ fontSize: 26, marginTop: 4 }}>{brl(stats.repasse)}</div><div className="vx-hint">pago em {stats.prazo}</div></div>
              <div className="vx-glass" style={{ padding: 18 }}><div className="vx-lbl">Glosas</div><div className="vx-num" style={{ fontSize: 26, marginTop: 4, color: "var(--vx-red)" }}>{brl(stats.glosas)}</div><div className="vx-hint">para recorrer</div></div>
              <div className="vx-glass" style={{ padding: 18 }}><div className="vx-lbl">Guias no mês</div><div className="vx-num" style={{ fontSize: 26, marginTop: 4 }}>{stats.guias}</div><div className="vx-hint">{Math.round(stats.guias / 7)} aguardando autorização</div></div>
            </div>
            <div className="vx-glass" style={{ padding: 18 }}>
              <div className="vx-lbl">Guias recentes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {guides.map((guide, index) => (
                  <button key={guide.id} className="vx-up" onClick={() => navigate(`/consultas/${guide.id}`)}>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--vx-muted)", width: 76 }}>G-{guide.id.split("-").pop()}</span>
                    <span style={{ flex: 1 }}><strong style={{ fontSize: 13 }}>{guide.animal}</strong><small>{guide.name}</small></span>
                    <StatusPill status={["Autorizada", "Em análise", "Glosada"][index % 3]} />
                  </button>
                ))}
              </div>
            </div>
            <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="vx-btn vx-btn-p" onClick={bill}><FileStack /> Faturar lote</button>
              <button className="vx-btn vx-btn-g" onClick={() => forms.open("convenios", selected)}><Edit3 /> Editar</button>
              <button className="vx-btn vx-btn-g" onClick={toggleStatus}>{selected.status === "Suspenso" ? "Reativar" : "Suspender"}</button>
              <button className="vx-btn vx-btn-g" onClick={() => navigate(`/convenios/${selected.id}`)}>Ficha</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 1100px){ .vx-cv-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
