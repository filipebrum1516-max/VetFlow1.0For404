import { useState } from "react"
import { useNavigate } from "react-router"
import { ChevronLeft, ChevronRight, Plus, Receipt } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, brl, fmtDate, fmtLong, itemDate, Page, Seg, todayISO } from "../ui"

const isIn = (item: Item) => item.category === "Receita"
const sum = (items: Item[]) => items.reduce((total, item) => total + (item.amountValue || 0), 0)
type Lens = "dia" | "receber" | "pagar" | "vencidos"

export default function Financeiro() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("financeiro", (saved) => { setDay(itemDate(saved)); setLens("dia") })
  const ref = todayISO()
  const [period, setPeriod] = useState<"7" | "30" | "90">("30")
  const [day, setDay] = useState(ref)
  const [lens, setLens] = useState<Lens>("dia")
  const days = Number(period)
  const inPeriod = data.financeiro.filter((item) => itemDate(item) > addDays(ref, -days) && itemDate(item) <= ref)
  const entrou = sum(inPeriod.filter((item) => isIn(item) && /receb/i.test(item.status)))
  const saiu = sum(inPeriod.filter((item) => !isIn(item) && /pago/i.test(item.status)))
  const bank = sum(data.financeiro.filter((item) => isIn(item) && /receb/i.test(item.status))) - sum(data.financeiro.filter((item) => !isIn(item) && /pago/i.test(item.status)))
  const receivable = data.financeiro.filter((item) => isIn(item) && /a receber/i.test(item.status))
  const payable = data.financeiro.filter((item) => !isIn(item) && /a pagar|pendente|vencid/i.test(item.status))
  const overdue = data.financeiro.filter((item) => /vencid/i.test(item.status))
  // Mesmo número da tela Caixa: o que foi recebido hoje nos caixas da recepção (B-11).
  const caixasHoje = new Set(data.caixa.filter((item) => itemDate(item) === ref).map((item) => item.id))
  const cash = data.vendas
    .filter((sale) => caixasHoje.has(sale.extra?.caixaId) && !/cancel|estorn/i.test(sale.status))
    .reduce((total, sale) => total + ((sale.extra?.pagamentos || []) as { valor: number }[]).reduce((a, p) => a + (p.valor || 0), 0), 0)
  const revenueItems = data.financeiro.filter(isIn)
  const ticket = revenueItems.length ? sum(revenueItems) / revenueItems.length : 0
  const delinquency = revenueItems.length ? (overdue.filter(isIn).length / revenueItems.length) * 100 : 0

  const buckets = 20
  const bucketSize = Math.max(1, Math.ceil(days / buckets))
  const river = Array.from({ length: buckets }, (_, index) => {
    const end = addDays(ref, -(buckets - 1 - index) * bucketSize)
    const start = addDays(end, -bucketSize + 1)
    const slice = data.financeiro.filter((item) => itemDate(item) >= start && itemDate(item) <= end)
    return { end, in: sum(slice.filter(isIn)), out: sum(slice.filter((item) => !isIn(item))) }
  })
  const peak = Math.max(1, ...river.map((bucket) => Math.max(bucket.in, bucket.out)))

  const tx = lens === "dia" ? data.financeiro.filter((item) => itemDate(item) === day) : lens === "receber" ? receivable : lens === "pagar" ? payable : overdue
  const txSorted = [...tx].sort((a, b) => itemDate(b).localeCompare(itemDate(a))).slice(0, 40)
  const dayBalance = sum(tx.filter(isIn)) - sum(tx.filter((item) => !isIn(item)))
  const cards: [string, string, number, string, Lens][] = [
    ["Banco · conta PJ", "saldo acumulado", bank, "linear-gradient(135deg,#2457c5,#18418f)", "dia"],
    ["Cartões / a receber", `${receivable.length} lançamentos`, sum(receivable), "linear-gradient(135deg,#e94f17,#b9500a)", "receber"],
    ["Caixa da recepção", "recebido hoje", cash, "linear-gradient(135deg,#2b7a4b,#1e5a37)", "dia"],
  ]

  return (
    <Page
      bg="#eef6f0"
      blobs={[["#a8e2b8", -100, 180, 560, 480], ["#ffd39a", "45%", 380, 420, 380], ["#b3c3ff", "85%", -60, 320, 320]]}
      crumb="Financeiro"
      title="Financeiro"
      sub="Saldo, contas a receber e a pagar, entradas e saídas e os lançamentos do período."
      actions={
        <>
          <Seg options={[["7", "Semana"], ["30", "Mês"], ["90", "Trimestre"]]} value={period} onChange={setPeriod} />
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/relatorios/financeiro")}>
            <Receipt /> Relatório
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("financeiro", undefined, { date: todayISO() })}>
            <Plus /> Novo lançamento
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr) 300px", gap: 22, alignItems: "start" }} className="vx-fin-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="vx-wallet">
            {cards.map(([label, detail, value, bg, target], index) => (
              <button key={label} className="vx-wcard" style={{ top: index * 46, background: bg, transform: `rotate(${[-4, 3, -1][index]}deg)`, zIndex: index }} onClick={() => { setLens(target); if (target === "dia") setDay(ref) }}>
                <span className="vx-row" style={{ justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}><span>{label}</span><span>{detail}</span></span>
                <span className="vx-num" style={{ display: "block", fontSize: 22, marginTop: 8 }}>{brl(value)}</span>
              </button>
            ))}
            <div className="vx-glass" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, borderRadius: "30px 30px 26px 26px", padding: 22, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 5, background: "var(--vx-glass-strong)" }}>
              <div style={{ position: "absolute", left: "50%", top: 14, width: 50, height: 6, borderRadius: 3, marginLeft: -25, background: "var(--vx-soft)" }} />
              <div className="vx-lbl">Saldo consolidado</div>
              <div className="vx-num" style={{ fontSize: 36 }}>{brl(bank + sum(receivable) + cash)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: entrou - saiu >= 0 ? "var(--vx-green)" : "var(--vx-red)" }}>{entrou - saiu >= 0 ? "+" : ""}{brl(entrou - saiu)} no período</div>
            </div>
          </div>
          <div className="vx-glass" style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <button onClick={() => setLens("receber")} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", font: "inherit", color: "inherit" }}><div className="vx-lbl" style={{ fontSize: 10 }}>A receber</div><div className="vx-num" style={{ fontSize: 19, color: "var(--vx-green)" }}>{brl(sum(receivable))}</div></button>
            <button onClick={() => setLens("pagar")} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", font: "inherit", color: "inherit" }}><div className="vx-lbl" style={{ fontSize: 10 }}>A pagar</div><div className="vx-num" style={{ fontSize: 19, color: "var(--vx-red)" }}>{brl(sum(payable))}</div></button>
            <button onClick={() => setLens("vencidos")} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", font: "inherit", color: "inherit" }}><div className="vx-lbl" style={{ fontSize: 10 }}>Inadimplência</div><div className="vx-num" style={{ fontSize: 19 }}>{delinquency.toFixed(1).replace(".", ",")}%</div></button>
            <div><div className="vx-lbl" style={{ fontSize: 10 }}>Ticket médio</div><div className="vx-num" style={{ fontSize: 19 }}>{brl(ticket)}</div></div>
          </div>
        </div>

        <div className="vx-glass" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, minHeight: 520 }}>
          <div className="vx-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontSize: 17 }}>Entradas e saídas</strong>
            <div className="vx-row" style={{ gap: 12, fontSize: 12, color: "var(--vx-muted)" }}>
              <span className="vx-row" style={{ gap: 6 }}><span className="vx-dot" style={{ background: "#2b7a4b" }} />Entradas</span>
              <span className="vx-row" style={{ gap: 6 }}><span className="vx-dot" style={{ background: "#b4322a" }} />Saídas</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${buckets}, minmax(0,1fr))`, gap: 5, position: "relative", minHeight: 260 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: "58%", height: 1.5, background: "var(--vx-line)" }} />
            {river.map((bucket) => (
              <button key={bucket.end} title={`${fmtDate(bucket.end)} · entradas ${brl(bucket.in)} · saídas ${brl(bucket.out)}`} onClick={() => { setDay(bucket.end); setLens("dia") }} style={{ display: "flex", flexDirection: "column", height: "100%", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}>
                <span style={{ height: "58%", display: "flex", alignItems: "flex-end", width: "100%" }}><span style={{ width: "100%", height: `${(bucket.in / peak) * 100}%`, borderRadius: "6px 6px 2px 2px", background: bucket.end === day ? "#e94f17" : "#2b7a4b" }} /></span>
                <span style={{ height: "42%", display: "flex", alignItems: "flex-start", width: "100%", paddingTop: 2 }}><span style={{ width: "100%", height: `${(bucket.out / peak) * 100}%`, borderRadius: "2px 2px 6px 6px", background: "rgba(180,50,42,.75)" }} /></span>
              </button>
            ))}
          </div>
          <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--vx-muted)" }}>
            <span>{fmtDate(river[0].end, { day: "2-digit", month: "short" })}</span>
            <span style={{ color: "var(--vx-accent)" }}>{fmtDate(ref, { day: "2-digit", month: "short" })}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, paddingTop: 12, borderTop: "1px solid var(--vx-line)" }}>
            <div><div className="vx-lbl" style={{ fontSize: 10 }}>Entradas</div><div className="vx-num" style={{ fontSize: 22, color: "var(--vx-green)" }}>{brl(entrou)}</div></div>
            <div><div className="vx-lbl" style={{ fontSize: 10 }}>Saídas</div><div className="vx-num" style={{ fontSize: 22, color: "var(--vx-red)" }}>{brl(saiu)}</div></div>
            <div><div className="vx-lbl" style={{ fontSize: 10 }}>Saldo do período</div><div className="vx-num" style={{ fontSize: 22 }}>{brl(entrou - saiu)}</div></div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", filter: "drop-shadow(0 26px 30px rgba(30,60,40,.25))" }}>
          <div className="vx-receipt">
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: ".14em" }}>
              {lens === "dia" ? "EXTRATO DO DIA" : lens === "receber" ? "A RECEBER" : lens === "pagar" ? "A PAGAR" : "VENCIDOS"}
            </div>
            {lens === "dia" ? (
              <div className="vx-row" style={{ justifyContent: "center", gap: 8, fontSize: 11, color: "#5b6474" }}>
                <button aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))} style={{ display: "grid" }}><ChevronLeft size={14} /></button>
                {fmtLong(day)}
                <button aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))} style={{ display: "grid" }}><ChevronRight size={14} /></button>
              </div>
            ) : (
              <button style={{ textAlign: "center", fontSize: 11, color: "#c2410c", fontWeight: 700 }} onClick={() => setLens("dia")}>voltar ao extrato do dia</button>
            )}
            <div style={{ borderTop: "1.5px dashed rgba(26,34,51,.3)", margin: "4px 0" }} />
            {txSorted.map((item) => (
              <button key={item.id} onClick={() => navigate(`/financeiro/${item.id}`)}>
                <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 12, fontWeight: 700, gap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name.replace(" • Receita", "")}</span>
                  <span style={{ color: isIn(item) ? "#2b7a4b" : "#b4322a", whiteSpace: "nowrap" }}>{isIn(item) ? "+" : "-"}{(item.amountValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ fontSize: 10, color: "#5b6474" }}>{fmtDate(itemDate(item), { day: "2-digit", month: "2-digit" })} · {item.status} {item.animal ? `· ${item.animal}` : ""}</div>
              </button>
            ))}
            {!txSorted.length && <div style={{ fontSize: 12, color: "#5b6474", textAlign: "center", padding: 12 }}>Sem movimentos.</div>}
            <div className="vx-row" style={{ borderTop: "1.5px dashed rgba(26,34,51,.3)", marginTop: 8, paddingTop: 8 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 800 }}>{lens === "dia" ? "SALDO DO DIA" : "TOTAL"}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: dayBalance >= 0 ? "#2b7a4b" : "#b4322a" }}>{lens === "dia" ? (dayBalance >= 0 ? "+" : "") + dayBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : sum(tx).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="vx-zig" />
        </div>
      </div>
      <style>{`@media (max-width: 1200px){ .vx-fin-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
