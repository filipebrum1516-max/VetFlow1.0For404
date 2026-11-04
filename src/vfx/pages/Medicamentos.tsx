import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Edit3, FileText, PackagePlus, Plus } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { brl, fmtDate, matches, Page, SearchBox, StatusPill } from "../ui"

const shelfColor: Record<string, [string, string]> = {
  Antibióticos: ["#e94f17", "#b9500a"],
  "Anti-inflamatórios": ["#2457c5", "#18418f"],
  Analgésicos: ["#6d4bc2", "#4e3392"],
  Cardiológicos: ["#0f766e", "#0b5b53"],
  Dermatológicos: ["#9a6212", "#6e450b"],
  Suplementos: ["#5aa9f0", "#2f78bf"],
  Outros: ["#5b6474", "#3a4356"],
}
function groupOf(item: Item) {
  if (item.extra?.grupo) return item.extra.grupo
  const name = normalize(item.name)
  if (/amoxi|cefalex|enroflox|doxici|metronid|azitro/.test(name)) return "Antibióticos"
  if (/predni|melox|carprof|cortic/.test(name)) return "Anti-inflamatórios"
  if (/dipiron|tramad|gabapent|metadon/.test(name)) return "Analgésicos"
  if (/pimoben|enalapr|furosem/.test(name)) return "Cardiológicos"
  if (/omega|vitamin|suplem/.test(name)) return "Suplementos"
  return "Outros"
}
const baseName = (name: string) => name.replace(/\s*#\d+$/, "")

export default function Medicamentos() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("medicamentos", (saved) => setSelectedId(saved.id))
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [weight, setWeight] = useState("10")
  const [dose, setDose] = useState("")
  const items = data.medicamentos.filter((item) => matches(item, query))
  const shelves = useMemo(() => {
    const groups = new Map<string, Item[]>()
    items.forEach((item) => {
      const group = groupOf(item)
      groups.set(group, [...(groups.get(group) || []), item])
    })
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [items])
  const stockOf = (item: Item) => {
    const term = normalize(baseName(item.name)).split(" ")[0]
    const lots = data.estoque.filter((stock) => normalize(stock.name).startsWith(term))
    if (!lots.length) return item.quantity !== undefined ? { quantity: item.quantity, minimum: item.minimum || 0, due: item.extra?.validade } : undefined
    // M-23: a quantidade é a do Estoque (soma dos lotes do mesmo item), nunca uma segunda contagem.
    const exact = lots.filter((lot) => normalize(lot.name) === normalize(item.name))
    const same = exact.length ? exact : [lots[0]]
    const due = same.map((lot) => lot.dueDate).filter(Boolean).sort()[0]
    return { quantity: same.reduce((n, lot) => n + (lot.quantity || 0), 0), minimum: Math.max(...same.map((lot) => lot.minimum || 0)), due }
  }
  const level = (item: Item) => {
    const stock = stockOf(item)
    if (!stock) return 0.55
    return Math.max(0.06, Math.min(1, stock.quantity / Math.max(1, stock.minimum * 3)))
  }
  const stateOf = (item: Item) => {
    const stock = stockOf(item)
    if (!stock) return { label: "Sem controle", color: "#8a92a0", bg: "#f1f2f4", qty: "—" }
    if (stock.quantity <= 0) return { label: "Esgotado", color: "#c62f22", bg: "#fdecea", qty: "0" }
    if (stock.quantity < stock.minimum) return { label: "Acabando", color: "#d9480f", bg: "#fff0e6", qty: String(stock.quantity) }
    if (stock.quantity < stock.minimum * 1.5) return { label: "Atenção", color: "#b7791f", bg: "#fff7e0", qty: String(stock.quantity) }
    return { label: "Estoque bom", color: "#1f8a4c", bg: "#e7f6ec", qty: String(stock.quantity) }
  }
  const selected = items.find((item) => item.id === selectedId) || shelves[0]?.[1][0]
  const stock = selected ? stockOf(selected) : undefined
  const mg = Number((selected?.name.match(/(\d+[.,]?\d*)\s*mg/i) || [])[1]?.replace(",", ".")) || 0
  const refDose = Number(selected?.extra?.doses?.[0]?.min) || (/predni/i.test(selected?.name || "") ? 1 : /melox/i.test(selected?.name || "") ? 0.1 : /dipiron/i.test(selected?.name || "") ? 25 : 22)
  const dosePerKg = Number(dose || refDose)
  const total = Number(weight.replace(",", ".")) * dosePerKg
  const tablets = mg ? total / mg : 0

  return (
    <Page
      bg="#eaf4f7"
      blobs={[["#b9e6f2", 100, 220, 600, 500], ["#ffd1b0", "70%", -100, 360, 360], ["#c9b8ff", "85%", "75%", 340, 340]]}
      crumb="Medicamentos"
      title="Medicamentos"
      sub="Medicamentos do estoque com quantidade e situação. É a mesma quantidade da tela Estoque."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Princípio ativo ou nome" />
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/estoque?novo=1&form=estoque-nota")}>
            <PackagePlus /> Repor estoque
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Novo medicamento
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 24, alignItems: "start" }} className="vx-med-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {shelves.map(([group, list]) => {
            const [liquid, cap] = shelfColor[group] || shelfColor.Outros
            return (
              <div key={group}>
                <div className="vx-shelf-row">
                  {list.map((item, index) => {
                    const fill = level(item)
                    const state = stateOf(item)
                    const width = 62 + ((index * 7) % 26)
                    const height = 92 + ((index * 13) % 38)
                    return (
                      <button key={item.id} className={`vx-bottle ${selected?.id === item.id ? "on" : ""}`} style={{ width }} onClick={() => setSelectedId(item.id)} aria-label={`${item.name}, estoque ${Math.round(fill * 100)}%`}>
                        <span className="cap" style={{ background: state.label === "Estoque bom" ? cap : state.color }} />
                        <span className="body" style={{ height }}>
                          <span className="liq" style={{ height: `${fill * 100}%`, background: state.label === "Estoque bom" ? item.extra?.cor || liquid : state.color }} />
                          <span className="shine" />
                          <span className="lab">{baseName(item.name)}</span>
                        </span>
                        <span className="vx-stock-tag" style={{ color: state.color, background: state.bg }}><b>{state.qty} un</b><br />{state.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="vx-plank" />
                <div className="vx-row" style={{ justifyContent: "space-between", padding: "6px 8px 0", fontSize: 12, fontWeight: 700, color: "var(--vx-ink2)" }}>
                  <span>{group}</span>
                  <span style={{ color: "var(--vx-muted)" }}>{list.length} itens · {list.filter((item) => ["Acabando", "Esgotado"].includes(stateOf(item).label)).length} acabando ou esgotados</span>
                </div>
              </div>
            )
          })}
          {!shelves.length && <div className="vx-glass vx-empty">Nenhum medicamento encontrado.</div>}
        </div>

        {selected && (
          <div className="vx-glass" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="vx-row" style={{ gap: 14 }}>
              <div style={{ width: 54, height: 70, borderRadius: 12, background: `linear-gradient(180deg, rgba(255,255,255,.6) ${100 - level(selected) * 100}%, ${(shelfColor[groupOf(selected)] || shelfColor.Outros)[0]} ${100 - level(selected) * 100}%)`, border: "1px solid #fff", flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em" }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>{groupOf(selected)}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}><StatusPill status={selected.status} /><span className="vx-stock-tag" style={{ marginTop: 0, fontSize: 12, padding: "4px 10px", color: stateOf(selected).color, background: stateOf(selected).bg }}>{stateOf(selected).label}</span></div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              <div className="vx-info" style={{ display: "contents" }}>
                <div><small>Em estoque</small><strong>{stock ? stock.quantity : "—"}</strong></div>
                <div><small>Mínimo</small><strong>{stock ? stock.minimum : "—"}</strong></div>
                <div><small>Validade</small><strong>{fmtDate(stock?.due)}</strong></div>
                <div><small>Preço</small><strong>{selected.amountValue ? brl(selected.amountValue) : "—"}</strong></div>
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "#1a2233", color: "#fff" }}>
              <div className="vx-lbl" style={{ color: "rgba(255,255,255,.7)" }}>Calculadora de dose</div>
              <div className="vx-row" style={{ gap: 8, marginTop: 8, fontSize: 13, flexWrap: "wrap" }}>
                <label>Peso <input aria-label="Peso em kg" value={weight} onChange={(event) => setWeight(event.target.value)} style={{ width: 58, padding: "4px 8px", borderRadius: 8, border: 0, background: "rgba(255,255,255,.14)", color: "#fff", font: "inherit", fontWeight: 800 }} /> kg</label>
                <label>× <input aria-label="Dose em mg por kg" value={dose} placeholder={String(refDose)} onChange={(event) => setDose(event.target.value)} style={{ width: 58, padding: "4px 8px", borderRadius: 8, border: 0, background: "rgba(255,255,255,.14)", color: "#fff", font: "inherit", fontWeight: 800 }} /> mg/kg</label>
              </div>
              <div className="vx-num" style={{ fontSize: 28, marginTop: 8, color: "#ffb27a" }}>
                {Number.isFinite(total) ? total.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} mg
                {tablets > 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)", fontWeight: 600 }}> ≈ {tablets.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} un. de {mg} mg</span>}
              </div>
            </div>
            <button className="vx-btn vx-btn-p" onClick={() => forms.open("prescricoes", undefined, { itens: [{ med: selected.name, dose: `${dosePerKg} mg/kg`, via: "Oral", freq: "12/12 h", dur: "7 dias", qtd: "" }] })}>
              <FileText /> Prescrever
            </button>
            <div className="vx-row" style={{ gap: 8 }}>
              <button className="vx-btn vx-btn-g" style={{ flex: 1 }} onClick={() => forms.open("medicamentos", selected)}>
                <Edit3 /> Editar
              </button>
              <button className="vx-btn vx-btn-g" style={{ flex: 1 }} onClick={() => navigate(`/medicamentos/${selected.id}`)}>
                Ficha
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 1100px){ .vx-med-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
