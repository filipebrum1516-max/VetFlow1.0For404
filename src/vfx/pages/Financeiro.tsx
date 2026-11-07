import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Check, CircleAlert, Plus, Receipt, Search, Wallet, X } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions, { RowButton } from "../RowActions"
import { addDays, brl, fmtDate, itemDate, Page, Pager, Seg, todayISO, usePaged } from "../ui"

/*
 * Financeiro: saldo e resultado no topo, gráfico de entradas x saídas, contas que vencem
 * nos próximos dias e a lista de lançamentos com filtro, busca e baixa (marcar como pago/recebido).
 */
const isIn = (item: Item) => item.category === "Receita"
const sum = (items: Item[]) => items.reduce((total, item) => total + (item.amountValue || 0), 0)
const quitado = (item: Item) => /receb|^pago/i.test(item.status)
const pendente = (item: Item) => !quitado(item) && !/cancel|estorn/i.test(item.status)
type Aba = "todos" | "entradas" | "saidas" | "receber" | "pagar" | "vencidos"

export default function Financeiro() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("financeiro")
  const hoje = todayISO()
  const [period, setPeriod] = useState<"7" | "30" | "90">("30")
  const [aba, setAba] = useState<Aba>("todos")
  const [query, setQuery] = useState("")
  const [faixa, setFaixa] = useState<{ de: string; ate: string } | null>(null)
  const days = Number(period)
  const inicio = addDays(hoje, -days + 1)
  const vencido = (item: Item) => /vencid/i.test(item.status) || (pendente(item) && itemDate(item) < hoje)

  const doPeriodo = data.financeiro.filter((item) => itemDate(item) >= inicio && itemDate(item) <= hoje)
  const entradas = sum(doPeriodo.filter((i) => isIn(i) && quitado(i)))
  const saidas = sum(doPeriodo.filter((i) => !isIn(i) && quitado(i)))
  const resultado = entradas - saidas
  const saldo = sum(data.financeiro.filter((i) => isIn(i) && quitado(i))) - sum(data.financeiro.filter((i) => !isIn(i) && quitado(i)))
  const aReceber = data.financeiro.filter((i) => isIn(i) && pendente(i))
  const aPagar = data.financeiro.filter((i) => !isIn(i) && pendente(i))
  const vencidos = data.financeiro.filter(vencido)
  const receitas = data.financeiro.filter(isIn)
  const inadimplencia = receitas.length ? (receitas.filter(vencido).length / receitas.length) * 100 : 0
  const margem = entradas ? (resultado / entradas) * 100 : 0

  /* gráfico: até 15 barras no período */
  const n = days <= 7 ? 7 : 15
  const passo = Math.max(1, Math.ceil(days / n))
  const barras = Array.from({ length: n }, (_, i) => {
    const ate = addDays(hoje, -(n - 1 - i) * passo)
    const de = addDays(ate, -passo + 1)
    const fatia = data.financeiro.filter((item) => itemDate(item) >= de && itemDate(item) <= ate)
    return { de, ate, in: sum(fatia.filter(isIn)), out: sum(fatia.filter((x) => !isIn(x))) }
  })
  const pico = Math.max(1, ...barras.map((b) => Math.max(b.in, b.out)))

  /* contas em aberto: vencidas primeiro, depois as que vencem logo */
  const proximas = data.financeiro
    .filter(pendente)
    .sort((a, b) => Number(vencido(b)) - Number(vencido(a)) || itemDate(a).localeCompare(itemDate(b)))
    .slice(0, 7)

  const lista = useMemo(() => {
    const base = data.financeiro.filter((item) => {
      if (aba === "entradas" && !isIn(item)) return false
      if (aba === "saidas" && isIn(item)) return false
      if (aba === "receber" && !(isIn(item) && pendente(item))) return false
      if (aba === "pagar" && !(!isIn(item) && pendente(item))) return false
      if (aba === "vencidos" && !vencido(item)) return false
      if (faixa && (itemDate(item) < faixa.de || itemDate(item) > faixa.ate)) return false
      if (query.trim() && !normalize(`${item.name} ${item.subtitle} ${item.animal || ""} ${item.owner || ""} ${item.status}`).includes(normalize(query))) return false
      return true
    })
    return base.sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.financeiro, aba, faixa, query, hoje])
  const paged = usePaged(lista, 12, [aba, faixa, query])

  const quitar = (item: Item) => {
    updateItem("financeiro", item.id, { status: isIn(item) ? "Recebido" : "Pago", extra: { ...(item.extra || {}), dataPagamento: hoje, situacao: "Pago / recebido" } })
    forms.toast(`${item.name.replace(" • Receita", "")}: ${isIn(item) ? "recebido" : "pago"} hoje (${brl(item.amountValue || 0)}).`)
  }
  const situacao = (item: Item) =>
    quitado(item) ? ["ok", isIn(item) ? "Recebido" : "Pago"] : vencido(item) ? ["late", "Vencido"] : ["pend", isIn(item) ? "A receber" : "A pagar"]

  const ABAS: [Aba, string, number][] = [
    ["todos", "Todos", data.financeiro.length],
    ["entradas", "Entradas", receitas.length],
    ["saidas", "Saídas", data.financeiro.length - receitas.length],
    ["receber", "A receber", aReceber.length],
    ["pagar", "A pagar", aPagar.length],
    ["vencidos", "Vencidos", vencidos.length],
  ]

  return (
    <Page
      className="fn-page"
      bg="#eef3f1"
      blobs={[["#a8e2c8", -100, 160, 560, 480], ["#c9d6ff", "80%", -80, 420, 380]]}
      crumb="Financeiro"
      title="Financeiro"
      actions={
        <>
          <Seg options={[["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"]]} value={period} onChange={(v) => { setPeriod(v); setFaixa(null) }} />
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/relatorios/financeiro")}><Receipt /> Relatório</button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("financeiro", undefined, { date: hoje })}><Plus /> Novo lançamento</button>
        </>
      }
    >
      <section className="fn-top">
        <div className="fn-hero">
          <span className="fn-hero-lbl"><Wallet /> Saldo em conta</span>
          <strong className="fn-hero-val">{brl(saldo)}</strong>
          <span className="fn-hero-sub">recebido menos pago, todas as contas</span>
          <div className="fn-hero-grid">
            <div><small><ArrowDownLeft /> Entradas</small><b>{brl(entradas)}</b></div>
            <div><small><ArrowUpRight /> Saídas</small><b>{brl(saidas)}</b></div>
            <div><small>Resultado {days} dias</small><b className={resultado >= 0 ? "pos" : "neg"}>{resultado >= 0 ? "+" : ""}{brl(resultado)}</b></div>
          </div>
        </div>
        <button className="fn-kpi in" onClick={() => setAba("receber")}>
          <small>A receber</small><strong>{brl(sum(aReceber))}</strong><span>{aReceber.length} lançamentos em aberto</span>
        </button>
        <button className="fn-kpi out" onClick={() => setAba("pagar")}>
          <small>A pagar</small><strong>{brl(sum(aPagar))}</strong><span>{aPagar.length} contas em aberto</span>
        </button>
        <button className="fn-kpi late" onClick={() => setAba("vencidos")}>
          <small>Vencidos</small><strong>{brl(sum(vencidos))}</strong><span>inadimplência {inadimplencia.toFixed(1).replace(".", ",")}% · margem {margem.toFixed(0)}%</span>
        </button>
      </section>

      <section className="fn-mid">
        <div className="fn-card fn-chart">
          <header>
            <div><strong>Entradas e saídas</strong><small>toque numa barra para ver os lançamentos daquele período</small></div>
            <span className="fn-legend"><i className="in" /> Entradas <i className="out" /> Saídas</span>
          </header>
          <div className="fn-bars" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
            {barras.map((b) => {
              const on = faixa?.de === b.de && faixa?.ate === b.ate
              return (
                <button key={b.ate} className={`fn-bar ${on ? "on" : ""}`} title={`${fmtDate(b.de)} a ${fmtDate(b.ate)}\nEntradas ${brl(b.in)}\nSaídas ${brl(b.out)}`} onClick={() => setFaixa(on ? null : { de: b.de, ate: b.ate })}>
                  <span className="up"><i style={{ height: `${(b.in / pico) * 100}%` }} /></span>
                  <span className="down"><i style={{ height: `${(b.out / pico) * 100}%` }} /></span>
                  <em>{fmtDate(b.ate, { day: "2-digit", month: "2-digit" })}</em>
                </button>
              )
            })}
          </div>
        </div>
        <div className="fn-card fn-due">
          <header><div><strong><CalendarClock /> Contas em aberto</strong><small>vencidas primeiro · dê baixa quando pagar ou receber</small></div></header>
          {proximas.map((item) => (
            <div key={item.id} className="fn-due-row">
              <span className={`fn-dot ${isIn(item) ? "in" : "out"}`} />
              <button className="fn-due-main" onClick={() => navigate(`/financeiro/${item.id}`)}>
                <strong>{item.name.replace(" • Receita", "")}</strong>
                <small className={vencido(item) ? "late" : ""}>{vencido(item) ? "venceu" : "vence"} {fmtDate(itemDate(item))} · {isIn(item) ? "a receber" : "a pagar"}</small>
              </button>
              <b className={isIn(item) ? "pos" : "neg"}>{brl(item.amountValue || 0)}</b>
              <button className="fn-quitar" title={isIn(item) ? "Marcar como recebido" : "Marcar como pago"} onClick={() => quitar(item)}><Check /></button>
            </div>
          ))}
          {!proximas.length && <p className="fn-empty">Nenhuma conta em aberto.</p>}
        </div>
      </section>

      <section className="fn-card fn-list">
        <div className="fn-toolbar">
          <div className="fn-tabs" role="tablist">
            {ABAS.map(([k, label, count]) => (
              <button key={k} role="tab" aria-selected={aba === k} className={`${aba === k ? "on" : ""} ${k === "vencidos" ? "late" : ""}`} onClick={() => setAba(k)}>
                {label} <b>{count}</b>
              </button>
            ))}
          </div>
          <label className="vx-search fn-search">
            <Search />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar lançamento, paciente ou tutor" aria-label="Buscar lançamento" />
          </label>
        </div>
        {faixa && (
          <div className="fn-filter-chip">
            Período do gráfico: {fmtDate(faixa.de)} a {fmtDate(faixa.ate)}
            <button aria-label="Limpar período" onClick={() => setFaixa(null)}><X /></button>
          </div>
        )}
        <div className="fn-table">
          <div className="fn-tr fn-th"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Situação</span><span className="r">Valor</span><span className="r">Ações</span></div>
          {paged.visible.map((item) => {
            const [cls, label] = situacao(item)
            return (
              <div key={item.id} className="fn-tr" onClick={() => navigate(`/financeiro/${item.id}`)}>
                <span className="fn-date" data-label="Data">{fmtDate(itemDate(item))}</span>
                <span className="fn-desc">
                  <i className={isIn(item) ? "in" : "out"}>{isIn(item) ? <ArrowDownLeft /> : <ArrowUpRight />}</i>
                  <span><strong>{item.name.replace(" • Receita", "")}</strong><small>{item.animal ? `${item.animal} · ${item.owner || ""}` : item.subtitle?.split(" • ")[0]}</small></span>
                </span>
                <span data-label="Categoria"><small className="fn-cat">{item.extra?.categoriaConta || (isIn(item) ? (item.service || item.animalId ? "Atendimentos" : "Outras receitas") : /fornecedor|materiais|laborat/i.test(item.name) ? "Compras / insumos" : /folha/i.test(item.name) ? "Pessoal" : "Despesas fixas")}</small></span>
                <span data-label="Situação"><span className={`fn-pill ${cls}`}>{cls === "late" && <CircleAlert />}{label}</span></span>
                <b className={`r fn-val ${isIn(item) ? "pos" : "neg"}`} data-label="Valor">{isIn(item) ? "+ " : "− "}{brl(item.amountValue || 0)}</b>
                <span className="r" data-label="Ações" onClick={(e) => e.stopPropagation()}>
                  <RowActions name={item.name} onView={() => navigate(`/financeiro/${item.id}`)} onEdit={() => forms.open("financeiro", item)} onDelete={() => navigate(`/financeiro/${item.id}?excluir=1`)}>
                    {!quitado(item) && <RowButton title={isIn(item) ? "Marcar como recebido" : "Marcar como pago"} onClick={() => quitar(item)}><Check /></RowButton>}
                  </RowActions>
                </span>
              </div>
            )
          })}
          {!lista.length && <div className="vx-empty">Nenhum lançamento com esses filtros.</div>}
        </div>
        <footer className="fn-foot">
          <span>{lista.length} lançamentos · entradas {brl(sum(lista.filter(isIn)))} · saídas {brl(sum(lista.filter((i) => !isIn(i))))}</span>
          {paged.pages > 1 && <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />}
        </footer>
      </section>
      {forms.node}
    </Page>
  )
}
