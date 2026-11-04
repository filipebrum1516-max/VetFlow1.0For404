import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Plus, Printer, Sparkles } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { brl, Page, SearchBox, Seg, matches, parseMoney } from "../ui"

const sectionOf = (item: Item) => {
  if (item.extra?.secao) return item.extra.secao
  if (/vacin/i.test(item.name)) return "Vacinas"
  if (/ultra|exame|raio|hemo/i.test(item.name)) return "Exames"
  if (/banho|tosa|hidrat/i.test(item.name)) return "Estética"
  if (/cirurg|castra/i.test(item.name)) return "Cirurgias"
  return "Consultas"
}
const order = ["Consultas", "Vacinas", "Exames", "Estética", "Cirurgias", "Hospedagem", "Leva e traz", "Outros"]

export default function Servicos() {
  const { data, activeUnit } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("servicos")
  const [porte, setPorte] = useState("Base")
  const [query, setQuery] = useState("")
  const items = data.servicos.filter((item) => matches(item, query))
  const sections = useMemo(() => {
    const map = new Map<string, Item[]>()
    items.forEach((item) => map.set(sectionOf(item), [...(map.get(sectionOf(item)) || []), item]))
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  }, [items])
  const priceOf = (item: Item) => {
    if (porte !== "Base" && item.extra?.[`preco${porte}`]) return parseMoney(item.extra[`preco${porte}`])
    return item.amountValue || 0
  }
  const combo = data.servicos.find((item) => item.extra?.combo)
  const popular = useMemo(() => {
    const counts = new Map<string, number>()
    data.consultas.forEach((item) => counts.set(item.service || item.name, (counts.get(item.service || item.name) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [data.consultas])
  const max = popular[0]?.[1] || 1

  return (
    <Page
      bg="#f6eee2"
      blobs={[["#f4c99a", 200, 240, 600, 500], ["#a8e2b8", "85%", -60, 360, 360]]}
      crumb="Serviços"
      title="Serviços"
      sub="Serviços da clínica com preço e duração. Toque num serviço para abrir ou editar."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar serviço" />
          <Seg label="Porte" options={[["Base", "Base"], ["P", "Porte P"], ["M", "M"], ["G", "G"], ["Gato", "Gato"]]} value={porte} onChange={setPorte} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Novo serviço
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24, alignItems: "start" }} className="vx-svc-grid">
        <div className="vx-menu">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div className="vx-serif" style={{ fontStyle: "italic", fontSize: 15, color: "#b9500a" }}>{activeUnit.name}</div>
            <div className="vx-serif" style={{ fontSize: 32, fontWeight: 800 }}>Serviços da casa</div>
            <div style={{ width: 60, height: 2, background: "#b9500a", margin: "8px auto 0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", columnGap: 44, rowGap: 18 }}>
            {sections.map(([section, list]) => (
              <div key={section}>
                <div className="vx-serif" style={{ fontSize: 19, fontWeight: 800, color: "#b9500a", marginBottom: 6 }}>{section}</div>
                {list.map((item) => (
                  <button key={item.id} className="vx-menu-item" onClick={() => navigate(`/servicos/${item.id}`)}>
                    <span className="vx-row" style={{ gap: 6, alignItems: "baseline" }}>
                      <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>{item.name}</strong>
                      <span className="vx-leader" />
                      <span className="vx-serif" style={{ fontWeight: 800, fontSize: 16 }}>{brl(priceOf(item))}</span>
                    </span>
                    <span className="vx-serif" style={{ fontStyle: "italic", fontSize: 12, color: "#5b6474", display: "block" }}>
                      {item.extra?.descCurta || item.subtitle.split(" • ").slice(-1)[0]}
                      {item.status !== "Ativo" ? ` · ${item.status}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {!sections.length && <div className="vx-empty">Nenhum serviço encontrado.</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {combo ? (
            <button onClick={() => navigate(`/servicos/${combo.id}`)} style={{ borderRadius: 24, padding: 22, background: "linear-gradient(150deg, #0f766e, #0b5b53)", color: "#fff", border: 0, textAlign: "left", font: "inherit", cursor: "pointer", boxShadow: "0 30px 50px -26px rgba(11,91,83,.8)" }}>
              <div className="vx-lbl" style={{ color: "rgba(255,255,255,.8)" }}>Combo do mês</div>
              <div className="vx-serif" style={{ fontSize: 26, fontWeight: 800, marginTop: 6, lineHeight: 1.05 }}>{combo.name}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{combo.extra?.descricao || combo.extra?.descCurta}</div>
              <div className="vx-num" style={{ fontSize: 30, marginTop: 12 }}>{brl(combo.extra?.promo ? parseMoney(combo.extra.promo) : combo.amountValue || 0)}</div>
            </button>
          ) : (
            <button className="vx-glass vx-clickable" style={{ padding: 20, textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => forms.open("servicos", undefined, { combo: true, secao: "Consultas", name: "Check-up sênior" })}>
              <Sparkles size={22} />
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>Criar o combo do mês</div>
              <div className="vx-hint">Junte serviços com preço especial e destaque no cardápio.</div>
            </button>
          )}
          <div className="vx-glass" style={{ padding: 18 }}>
            <div className="vx-lbl">Mais pedidos (histórico)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {popular.map(([name, count]) => (
                <button key={name} onClick={() => navigate("/consultas")} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
                  <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}><span>{name}</span><span>{count}</span></div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--vx-soft)", marginTop: 4 }}><div style={{ width: `${(count / max) * 100}%`, height: "100%", borderRadius: 3, background: "#b9500a" }} /></div>
                </button>
              ))}
            </div>
          </div>
          <button className="vx-btn vx-btn-g" onClick={() => window.print()}>
            <Printer /> Imprimir cardápio da recepção
          </button>
        </div>
      </div>
      <style>{`@media (max-width: 1100px){ .vx-svc-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
