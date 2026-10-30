import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronLeft, ChevronRight, PackagePlus, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, brl, fmtDate, matches, Page, SearchBox, Seg, todayISO, useQueryParam } from "../ui"

const CORREDORES: [string, string][] = [["A", "Vacinas"], ["B", "Medicamentos"], ["C", "Materiais"], ["D", "Rações"], ["E", "Petiscos"], ["F", "Coleiras e guias"], ["G", "Higiene"], ["H", "Brinquedos"], ["I", "Camas"], ["J", "Acessórios"]]
const aisleName: Record<string, string> = Object.fromEntries([...CORREDORES, ["Z", "Outros"]])
const aisleByCat: Record<string, string> = Object.fromEntries(CORREDORES.map(([k, v]) => [v, k]))
const aisleOf = (item: Item) => String(item.extra?.corredor || aisleByCat[item.category || ""] || "Z")
const out = (item: Item) => (item.quantity || 0) <= 0
const low = (item: Item) => !out(item) && (item.quantity || 0) < (item.minimum || 0)
const expiring = (item: Item) => !!item.dueDate && item.dueDate <= addDays(todayISO(), 60)
const unitCost = (item: Item) => (item.quantity ? (item.amountValue || 0) / item.quantity : 12)

export default function Estoque() {
  const { data, addItem, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("estoque")
  const param = useQueryParam("filtro")
  const [filter, setFilter] = useState(param === "Acabando" ? "Acabando" : param === "Vencendo" ? "Vencendo" : param === "Esgotado" ? "Esgotado" : "Todos")
  const [aisleFilter, setAisleFilter] = useState("")
  const [query, setQuery] = useState("")
  const [pages, setPages] = useState<Record<string, number>>({})
  const [unchecked, setUnchecked] = useState<string[]>([])
  const items = data.estoque.filter((item) => matches(item, query) && (!aisleFilter || aisleOf(item) === aisleFilter) && (filter === "Todos" || (filter === "Acabando" ? low(item) : filter === "Esgotado" ? out(item) : expiring(item))))
  const aisleCounts = useMemo(() => {
    const m: Record<string, number> = {}
    data.estoque.forEach((item) => { m[aisleOf(item)] = (m[aisleOf(item)] || 0) + 1 })
    return m
  }, [data.estoque])
  const aisles = useMemo(() => {
    const map = new Map<string, Item[]>()
    items.forEach((item) => map.set(aisleOf(item), [...(map.get(aisleOf(item)) || []), item]))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])
  const reorder = data.estoque.filter((item) => low(item) || out(item)).filter((item) => !item.extra?.pedidoEm).slice(0, 10)
  const chosen = reorder.filter((item) => !unchecked.includes(item.id))
  const suggested = (item: Item) => Math.max(1, (item.minimum || 0) * 3 - (item.quantity || 0))
  const estimate = chosen.reduce((sum, item) => sum + suggested(item) * unitCost(item), 0)
  const perAisle = 5

  const sendOrder = () => {
    if (!chosen.length) return forms.toast("Selecione ao menos um item para pedir.")
    addItem("financeiro", { name: `Pedido de compra · ${chosen.length} itens`, category: "Despesa", kind: "Despesa", status: "A pagar", amountValue: estimate, subtitle: "Reposição de estoque", extra: { pedido: chosen.map((item) => ({ produto: item.name, qtd: suggested(item) })) } })
    chosen.forEach((item) => updateItem("estoque", item.id, { extra: { ...(item.extra || {}), pedidoEm: todayISO() } }))
    forms.toast(`Pedido de ${chosen.length} itens enviado · ${brl(estimate)} em contas a pagar.`)
  }

  return (
    <Page
      bg="#f4eee4"
      blobs={[["#e6cfa3", 120, 260, 600, 480], ["#ffd39a", "70%", -100, 360, 360], ["#b8dceb", "88%", "75%", 320, 320]]}
      crumb="Estoque"
      title="Almoxarifado"
      sub="Corredores e caixas como no depósito: farmácia veterinária e pet shop. A régua lateral mostra quanto resta; a fita amarela, o que está acabando; a vermelha, o que esgotou."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar item ou lote" />
          <Seg options={[["Todos", "Todos"], ["Acabando", `Acabando ${data.estoque.filter(low).length}`], ["Esgotado", `Esgotado ${data.estoque.filter(out).length}`], ["Vencendo", `Vencendo ${data.estoque.filter(expiring).length}`]]} value={filter} onChange={setFilter} />
          <button className="vx-btn vx-btn-g" onClick={() => forms.open("estoque")}>
            <Plus /> Nova caixa
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("estoque-nota")}>
            <PackagePlus /> Entrada de nota
          </button>
        </>
      }
    >
      <div className="vx-aisle-chips">
        <button className={!aisleFilter ? "on" : ""} onClick={() => setAisleFilter("")}>Todos os corredores <b>{data.estoque.length}</b></button>
        {[...CORREDORES, ["Z", "Outros"] as [string, string]].filter(([k]) => aisleCounts[k]).map(([k, v]) => (
          <button key={k} className={aisleFilter === k ? "on" : ""} onClick={() => setAisleFilter(aisleFilter === k ? "" : k)}><i>{k}</i>{v} <b>{aisleCounts[k]}</b></button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 290px", gap: 22, alignItems: "start" }} className="vx-stk-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {aisles.map(([aisle, list]) => {
            const page = Math.min(pages[aisle] || 1, Math.max(1, Math.ceil(list.length / perAisle)))
            const total = Math.max(1, Math.ceil(list.length / perAisle))
            const visible = list.slice((page - 1) * perAisle, page * perAisle)
            return (
              <div key={aisle}>
                <div className="vx-row" style={{ justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>Corredor {aisle} · {aisleName[aisle] || "Outros"} <span style={{ color: "var(--vx-muted)", fontWeight: 600 }}>· {list.length} caixas</span></strong>
                  <div className="vx-row" style={{ gap: 6 }}>
                    <button className="vx-icon-btn" aria-label={`Corredor ${aisle}: anteriores`} disabled={page <= 1} onClick={() => setPages({ ...pages, [aisle]: page - 1 })}><ChevronLeft /></button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--vx-muted)" }}>{page}/{total}</span>
                    <button className="vx-icon-btn" aria-label={`Corredor ${aisle}: próximas`} disabled={page >= total} onClick={() => setPages({ ...pages, [aisle]: page + 1 })}><ChevronRight /></button>
                  </div>
                </div>
                <div className="vx-row" style={{ gap: 14, alignItems: "stretch" }}>
                  <div className="vx-aisle"><span style={{ fontSize: 10, opacity: 0.7 }}>CORR.</span><span style={{ fontSize: 22 }}>{aisle}</span></div>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                    {visible.map((item) => {
                      const fill = Math.max(0.04, Math.min(1, (item.quantity || 0) / Math.max(1, (item.minimum || 1) * 3)))
                      return (
                        <button key={item.id} className={`vx-box${out(item) ? " is-out" : ""}`} onClick={() => navigate(`/estoque/${item.id}`)} aria-label={`${item.name}: ${item.quantity} unidades`}>
                          <span className="lid" />
                          <span style={{ flex: 1, padding: "30px 10px 10px 12px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                            <span className="label">
                              <span style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 800, color: "#5b6474" }}>{aisle}-{item.id.split("-").pop()?.padStart(3, "0")}</span>
                              <span style={{ display: "block", fontSize: 12, fontWeight: 800, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>{item.name}</span>
                              {item.extra?.preco ? <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#2b7a4b" }}>{brl(Number(item.extra.preco))}</span> : null}
                            </span>
                            <span style={{ marginTop: "auto", fontSize: 12, fontWeight: 700 }}><span className="vx-num" style={{ fontSize: 22 }}>{item.quantity ?? 0}</span> un.</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: expiring(item) ? "#b4322a" : "inherit" }}>{item.dueDate ? `val. ${fmtDate(item.dueDate, { month: "2-digit", year: "numeric" })}` : "sem validade"}</span>
                          </span>
                          <span style={{ width: 12, margin: "30px 8px 10px 0", borderRadius: 6, background: "rgba(255,255,255,.55)", position: "relative", overflow: "hidden" }}>
                            <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: out(item) || low(item) ? "#b4322a" : fill < 0.45 ? "#c98a1b" : "#2b7a4b", borderRadius: 6 }} />
                          </span>
                          {low(item) && <span className="vx-tape"><span>ACABANDO</span></span>}
                          {out(item) && <span className="vx-tape vx-tape-out"><span>ESGOTADO</span></span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
          {!aisles.length && <div className="vx-glass vx-empty">Nenhum item neste filtro.</div>}
        </div>

        <div style={{ position: "relative", paddingTop: 18 }}>
          <div style={{ position: "absolute", left: "50%", top: 0, width: 110, height: 36, marginLeft: -55, borderRadius: 10, background: "linear-gradient(180deg,#b8c2d0,#8e9aad)", zIndex: 2 }} />
          <div className="vx-clip">
            <div className="paper">
              <div style={{ fontSize: 18, fontWeight: 800 }}>Pedido de reposição</div>
              <div style={{ fontSize: 12, color: "#5b6474" }}>Sugerido automaticamente · {reorder.length} itens</div>
              {reorder.map((item) => (
                <label key={item.id} className="vx-row" style={{ gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(26,34,51,.08)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!unchecked.includes(item.id)} onChange={() => setUnchecked((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))} style={{ width: 18, height: 18, accentColor: "#b9500a" }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
                  <b>{suggested(item)}</b>
                </label>
              ))}
              {!reorder.length && <div style={{ fontSize: 13, color: "#5b6474" }}>Nada abaixo do mínimo sem pedido.</div>}
              <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 13, marginTop: 6 }}><span style={{ color: "#5b6474" }}>Estimado</span><b className="vx-num" style={{ fontSize: 18 }}>{brl(estimate)}</b></div>
              <button className="vx-btn vx-btn-p" onClick={sendOrder} disabled={!chosen.length}>Enviar pedido</button>
              <button className="vx-btn vx-btn-g" style={{ color: "#1a2233", background: "#fff" }} onClick={() => forms.open("estoque-nota", undefined, { itens: chosen.map((item) => ({ produto: item.name, qtd: String(suggested(item)), lote: "", validade: "", custo: brl(unitCost(item)) })) })}>
                Receber como nota
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 1100px){ .vx-stk-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
