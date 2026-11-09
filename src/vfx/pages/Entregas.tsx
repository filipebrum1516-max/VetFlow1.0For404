import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, Camera, Check, Edit3, MapPin, MessageCircle, Navigation, Phone, Printer, Truck, X, UserRound } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { brl, fmtDate, normalizeText, todayISO, Page } from "../ui"
import { ENTREGADORES, lineTotal, printHtml, saleSlipHtml, saleTone, stamp, type Entrega, type Line } from "../vendasShared"
import Layer from "../OpLayer"
import { PrintBar } from "../PrintMenu"
import { Duo, Ident, ListaFicha, Status } from "../CadastroLista"
import { FichaDados, FichaLivre } from "../Ficha"

const KPIS: [string, string, string][] = [
  ["Aguardando liberação", "#9a5800", "Aguardando liberação"],
  ["A separar", "#e94f17", "A separar"],
  ["Pronta para sair", "#1d5fbf", "Prontas para sair"],
  ["Em rota", "#6b4fbb", "Em rota"],
  ["Entregue", "#137a48", "Entregues"],
  ["Não entregue", "#b42318", "Com problema"],
]
const SITUACOES = ["Aguardando liberação", "A separar", "Pronta para sair", "Em rota", "Entregue", "Concluída", "Não entregue", "Reagendada", "Cancelada"]
const tomEntrega = (s: string) => (/conclu|^entregue/i.test(s) ? "green" : /não entregue/i.test(s) ? "red" : /cancel/i.test(s) ? "gray" : /rota/i.test(s) ? "violet" : /pronta|reagend/i.test(s) ? "blue" : "orange")
const MOTIVOS = ["Cliente ausente", "Endereço não encontrado", "Cliente recusou", "Produto avariado", "Outro"]
const Tag = ({ s }: { s: string }) => <span className={`op-tag ${saleTone(s)}`}>{s}</span>
const addrLine = (e: Entrega) => `${e.rua}, ${e.numero}${e.complemento ? ` · ${e.complemento}` : ""}`
const mapsUrl = (e: Entrega) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.rua}, ${e.numero}, ${e.bairro}, ${e.cidade} - ${e.uf}`)}`
const wazeUrl = (e: Entrega) => `https://waze.com/ul?q=${encodeURIComponent(`${e.rua}, ${e.numero}, ${e.cidade}`)}`
const waUrl = (e: Entrega, msg: string) => `https://wa.me/55${e.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`

export default function Entregas() {
  const { data, activeUnit, profile, updateItem } = useVetFlow()
  const user = profile?.displayName || "Expedição"
  const deliveries = useMemo(() => (data.vendas || []).filter((s) => s.kind === "Venda" && s.extra?.entrega), [data.vendas])
  const [view, setView] = useState<"exp" | "rotas" | "app">("exp")
  const [toast, setToast] = useState("")
  const showToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(""), 3000) }

  const upd = (sale: Item, patch: Partial<Entrega>, hist: string, saleStatus?: string) => {
    const e = sale.extra.entrega as Entrega
    const entrega = { ...e, ...patch, historico: [...(e.historico || []), `${stamp()} · ${hist}`] }
    updateItem("vendas", sale.id, { ...(saleStatus ? { status: saleStatus } : {}), extra: { ...sale.extra, entrega, historico: [...(sale.extra?.historico || []), `${stamp()} · Entrega: ${hist}`] } })
  }

  /* ---------- expedição ---------- */
  const [kpi, setKpi] = useState("pendentes")
  const [q, setQ] = useState("")
  const [dia, setDia] = useState("")
  const [periodo, setPeriodo] = useState("Todos")
  const [bairro, setBairro] = useState("Todos")
  const [entregador, setEntregador] = useState("Todos")
  const [fichaId, setFichaId] = useState("")
  const [edit, setEdit] = useState<Item | null>(null)
  const [ef, setEf] = useState({ status: "", entregador: "", data: "", periodo: "Manhã", obs: "", recebidoPor: "", forma: "Dinheiro", valor: "", motivo: MOTIVOS[0] })
  const bairros = useMemo(() => ["Todos", ...new Set(deliveries.map((s) => (s.extra.entrega as Entrega).bairro))], [deliveries])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of deliveries) { const st = (s.extra.entrega as Entrega).status; m.set(st, (m.get(st) || 0) + 1) }
    return m
  }, [deliveries])
  const rows = useMemo(() => {
    const qq = normalizeText(q.trim())
    return deliveries.filter((s) => {
      const e = s.extra.entrega as Entrega
      if (kpi === "pendentes" ? /conclu|cancel|^entregue/i.test(e.status) : kpi !== "todas" && e.status !== kpi) return false
      if (dia && dia !== "Todas" && e.data !== dia) return false
      if (periodo !== "Todos" && e.periodo !== periodo) return false
      if (bairro !== "Todos" && e.bairro !== bairro) return false
      if (entregador !== "Todos" && (e.entregador || "Sem entregador") !== entregador) return false
      if (qq && !normalizeText(`${s.name} ${s.owner} ${e.rua} ${e.bairro}`).includes(qq)) return false
      return true
    }).sort((a, b) => `${(a.extra.entrega as Entrega).data}${(a.extra.entrega as Entrega).periodo}${a.time}`.localeCompare(`${(b.extra.entrega as Entrega).data}${(b.extra.entrega as Entrega).periodo}${b.time}`))
  }, [deliveries, kpi, q, dia, periodo, bairro, entregador])
  const datas = useMemo(() => [...new Set(deliveries.map((s) => (s.extra.entrega as Entrega).data))].sort(), [deliveries])
  const atribuir = (s: Item, who: string) => {
    const e = s.extra.entrega as Entrega
    const ordem = deliveries.filter((d) => (d.extra.entrega as Entrega).entregador === who && /pronta|rota/i.test((d.extra.entrega as Entrega).status)).length + 1
    upd(s, { entregador: who, ordem, status: e.status === "A separar" ? "A separar" : e.status === "Não entregue" || e.status === "Reagendada" ? "Pronta para sair" : e.status }, `Atribuída a ${who}`)
  }
  const romaneioRota = (list: Item[], who: string) => {
    const ordered = [...list].sort((a, b) => ((a.extra.entrega as Entrega).ordem || 0) - ((b.extra.entrega as Entrega).ordem || 0))
    const body = `<h1>VetFlow · ${activeUnit.name}</h1><div>ROMANEIO DA ROTA · ${who}</div><div>${fmtDate(todayISO())} · ${ordered.length} entregas · a cobrar ${brl(ordered.reduce((a, s) => a + (s.extra.entrega as Entrega).aCobrar, 0))}</div>` +
      ordered.map((s, i) => { const e = s.extra.entrega as Entrega; return `<h2>${i + 1}. ${s.name} · ${e.periodo}</h2><div><b>${s.owner}</b> · ${e.telefone}<br>${addrLine(e)} · ${e.bairro}<br>${e.referencia ? `Ref.: ${e.referencia}<br>` : ""}${((s.extra.itens || []) as Line[]).map((l) => `${l.qtd}× ${l.descricao}`).join("; ")}<br>${e.aCobrar ? `<b>COBRAR ${brl(e.aCobrar)}</b>` : "Pago"}${e.obs ? `<br>Obs.: ${e.obs}` : ""}</div><div class="sig">Recebido por</div>` }).join("")
    printHtml(`Romaneio ${who}`, body)
  }
  /* editar entrega: é aqui (e só aqui) que a situação muda */
  const abrirEdicao = (s: Item) => {
    const e = s.extra.entrega as Entrega
    setEdit(s)
    setEf({ status: e.status, entregador: e.entregador || "", data: e.data, periodo: e.periodo, obs: e.obs || "", recebidoPor: e.recebidoPor || "", forma: e.cobradoForma || "Dinheiro", valor: e.aCobrar ? String(e.cobradoValor ?? e.aCobrar).replace(".", ",") : "", motivo: e.motivo || MOTIVOS[0] })
  }
  const salvarEdicao = () => {
    if (!edit) return
    const e = edit.extra.entrega as Entrega
    const mudou: string[] = []
    if (ef.status !== e.status) mudou.push(`situação: ${e.status} → ${ef.status}`)
    if (ef.entregador !== (e.entregador || "")) mudou.push(`entregador: ${ef.entregador || "nenhum"}`)
    if (ef.data !== e.data || ef.periodo !== e.periodo) mudou.push(`quando: ${fmtDate(ef.data)} (${ef.periodo})`)
    if (ef.obs !== (e.obs || "")) mudou.push("observações")
    const entregue = /^entregue|conclu/i.test(ef.status)
    const patch: Partial<Entrega> = { status: ef.status, entregador: ef.entregador, data: ef.data, periodo: ef.periodo, obs: ef.obs, motivo: ef.status === "Não entregue" ? ef.motivo : "" }
    if (entregue) Object.assign(patch, { recebidoPor: ef.recebidoPor || "Cliente", ...(e.aCobrar ? { cobradoForma: ef.forma, cobradoValor: Number(ef.valor.replace(",", ".")) || e.aCobrar } : {}) })
    if (ef.entregador && ef.entregador !== e.entregador) patch.ordem = deliveries.filter((d) => (d.extra.entrega as Entrega).entregador === ef.entregador && /pronta|rota/i.test((d.extra.entrega as Entrega).status)).length + 1
    const saleStatus = /conclu/i.test(ef.status) ? "Concluída" : ef.status === "Em rota" && /paga/i.test(edit.status) ? "Em entrega" : undefined
    upd(edit, patch, mudou.length ? `Editada por ${user} · ${mudou.join(" · ")}` : `Editada por ${user}`, saleStatus)
    showToast(`${edit.name} atualizada.`)
    setEdit(null)
  }

  /* ---------- rotas ---------- */
  const rotas = useMemo(() => ENTREGADORES.map((who) => ({
    who,
    list: deliveries.filter((s) => { const e = s.extra.entrega as Entrega; return e.entregador === who && /pronta|rota/i.test(e.status) }).sort((a, b) => ((a.extra.entrega as Entrega).ordem || 0) - ((b.extra.entrega as Entrega).ordem || 0)),
  })), [deliveries])
  const move = (list: Item[], i: number, dir: number) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const a = list[i], b = list[j]
    upd(a, { ordem: j + 1 }, `Ordem na rota: ${j + 1}`)
    upd(b, { ordem: i + 1 }, `Ordem na rota: ${i + 1}`)
  }
  const sairRota = (list: Item[], who: string) => {
    list.filter((s) => (s.extra.entrega as Entrega).status === "Pronta para sair").forEach((s) => upd(s, { status: "Em rota" }, `Saiu para entrega com ${who}`, /paga/i.test(s.status) ? "Em entrega" : undefined))
    showToast(`Rota de ${who} iniciada.`)
  }

  /* ---------- app do entregador ---------- */
  const [me, setMe] = useState(ENTREGADORES[0])
  const mine = useMemo(() => deliveries.filter((s) => { const e = s.extra.entrega as Entrega; return e.entregador === me && /pronta|rota|entregue|não entregue/i.test(e.status) && !/conclu/i.test(e.status) }).sort((a, b) => {
    const ea = a.extra.entrega as Entrega, eb = b.extra.entrega as Entrega
    const done = (e: Entrega) => (/entregue/i.test(e.status) ? 1 : 0)
    return done(ea) - done(eb) || (ea.ordem || 0) - (eb.ordem || 0)
  }), [deliveries, me])
  const prestar = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of mine) { const e = s.extra.entrega as Entrega; if (e.status === "Entregue" && e.aCobrar) m.set(e.cobradoForma || "Dinheiro", (m.get(e.cobradoForma || "Dinheiro") || 0) + (e.cobradoValor ?? e.aCobrar)) }
    return [...m.entries()]
  }, [mine])
  const [confirm, setConfirm] = useState<Item | null>(null)
  const [cf, setCf] = useState({ nome: "", forma: "Dinheiro", valor: "", foto: false, assinou: false })
  const [fail, setFail] = useState<Item | null>(null)
  const [failMotivo, setFailMotivo] = useState(MOTIVOS[0])
  const sigRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = sigRef.current
    if (!confirm || !c) return undefined
    const ctx = c.getContext("2d")!
    c.width = c.clientWidth * 2; c.height = c.clientHeight * 2
    ctx.scale(2, 2); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#141a26"
    let drawing = false
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const down = (e: PointerEvent) => { drawing = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); c.setPointerCapture(e.pointerId) }
    const moveP = (e: PointerEvent) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setCf((f) => (f.assinou ? f : { ...f, assinou: true })) }
    const up = () => { drawing = false }
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", moveP); window.addEventListener("pointerup", up)
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", moveP); window.removeEventListener("pointerup", up) }
  }, [confirm])
  const iniciar = (s: Item) => {
    upd(s, { status: "Em rota" }, `Saiu para entrega com ${me}`, /paga/i.test(s.status) ? "Em entrega" : undefined)
    showToast(`${s.name}: cliente avisado que o pedido saiu.`)
  }
  const openConfirm = (s: Item) => {
    const e = s.extra.entrega as Entrega
    setConfirm(s)
    setCf({ nome: "", forma: "Dinheiro", valor: e.aCobrar ? String(e.aCobrar).replace(".", ",") : "", foto: false, assinou: false })
  }
  const confirmar = () => {
    if (!confirm) return
    const e = confirm.extra.entrega as Entrega
    const cobrado = e.aCobrar ? { cobradoForma: cf.forma, cobradoValor: Number(cf.valor.replace(",", ".")) || e.aCobrar } : {}
    const final = e.aCobrar ? undefined : "Concluída"
    upd(confirm, { status: e.aCobrar ? "Entregue" : "Concluída", recebidoPor: cf.nome || "Cliente", foto: cf.foto, assinatura: cf.assinou, ...cobrado }, `Entregue a ${cf.nome || "cliente"}${e.aCobrar ? ` · cobrado ${cf.forma} ${brl(Number(cf.valor.replace(",", ".")) || e.aCobrar)}` : ""}`, final)
    showToast(`${confirm.name} entregue.`)
    setConfirm(null)
  }
  const naoEntregue = () => {
    if (!fail) return
    upd(fail, { status: "Não entregue", motivo: failMotivo }, `Não entregue: ${failMotivo}`)
    showToast(`${fail.name} volta para a loja reagendar.`); setFail(null)
  }

  const kpiRow = (
    <div className="op-kpis">
      {KPIS.map(([st, color, label]) => (
        <button key={st} className={`op-kpi ${kpi === st ? "on" : ""}`} onClick={() => setKpi(kpi === st ? "pendentes" : st)}>
          <span><i style={{ background: color }} />{label}</span>
          <b>{counts.get(st) || 0}</b>
        </button>
      ))}
    </div>
  )

  return (
    <Page bg="#eef1f8" blobs={[["#b3c3ff", -80, 140, 520, 460], ["#ffc9a3", "72%", -60, 360, 340]]} crumb="Entregas" title="Entregas" sub="Separe, distribua e acompanhe cada entrega até a casa do cliente.">
      <div className="op op-vx">
      <div className="op-bar">
        <h1><Truck size={18} /> Entregas</h1>
        <span className="sep" />
        <div className="op-meta"><span><b>{deliveries.filter((s) => !/conclu|cancel|^entregue/i.test((s.extra.entrega as Entrega).status)).length}</b> pendentes</span><span>A cobrar na rua <b className="num">{brl(deliveries.filter((s) => /rota|pronta/i.test((s.extra.entrega as Entrega).status)).reduce((a, s) => a + (s.extra.entrega as Entrega).aCobrar, 0))}</b></span></div>
        <span className="grow" />
        <div className="op-tabs">
          <button className={view === "exp" ? "on" : ""} onClick={() => setView("exp")}>Expedição</button>
          <button className={view === "rotas" ? "on" : ""} onClick={() => setView("rotas")}>Rotas</button>
          <button className={view === "app" ? "on" : ""} onClick={() => setView("app")}>Minhas entregas <span className="muted" style={{ fontWeight: 500 }}>(entregador)</span></button>
        </div>
      </div>

      {view === "exp" && (
        <>
          {kpiRow}
          <ListaFicha
            className="et-lista"
            label="Entregas"
            abas={[
              { key: "pendentes", label: "Pendentes", count: deliveries.filter((s) => !/conclu|cancel|^entregue/i.test((s.extra.entrega as Entrega).status)).length },
              ...KPIS.map(([st]) => ({ key: st, label: st, count: counts.get(st) || 0, tone: st === "Não entregue" ? ("red" as const) : undefined })),
              { key: "todas", label: "Todas", count: deliveries.length },
            ]}
            aba={kpi}
            onAba={(k) => setKpi(k || "pendentes")}
            query={q}
            onQuery={setQ}
            placeholder="Nº, cliente, rua ou bairro"
            filtros={[
              { label: "Data", value: dia || "Todas", onChange: setDia, options: [["Todas", "Todas as datas"], ...datas.map((d) => [d, d === todayISO() ? `Hoje · ${fmtDate(d)}` : fmtDate(d)] as [string, string])] },
              { label: "Período", value: periodo, onChange: setPeriodo, options: [["Todos", "Todos os períodos"], "Manhã", "Tarde", "Noite"] },
              { label: "Bairro", value: bairro, onChange: setBairro, options: bairros.map((b) => (b === "Todos" ? ["Todos", "Todos os bairros"] : b) as string | [string, string]) },
              { label: "Entregador", icon: <UserRound />, value: entregador, onChange: setEntregador, options: [["Todos", "Todos os entregadores"], "Sem entregador", ...ENTREGADORES] },
            ]}
            rows={rows}
            rowKey={(s) => s.id}
            noun="entregas"
            vazio="Nenhuma entrega com esses filtros"
            perPageDefault={10}
            exportar={{ nome: "entregas", linha: (s) => { const e = s.extra.entrega as Entrega; return { Venda: s.name, Cliente: s.owner || "", Telefone: e.telefone, Endereco: addrLine(e), Bairro: e.bairro, Data: fmtDate(e.data), Periodo: e.periodo, ACobrar: e.aCobrar, Entregador: e.entregador || "", Situacao: e.status } } }}
            colunas={[
              { label: "Entrega", w: "minmax(220px,1.3fr)", cell: (s) => { const e = s.extra.entrega as Entrega; return <Ident square title={s.owner || "Cliente"} sub={`${s.name} · ${e.telefone}`} icon={<Truck />} color="#3d5fd6" /> } },
              { label: "Endereço", w: "minmax(200px,1.3fr)", cell: (s) => { const e = s.extra.entrega as Entrega; return <Duo title={addrLine(e)} sub={`${e.bairro}${e.referencia ? ` · ${e.referencia}` : ""}`} /> } },
              { label: "Quando", w: "100px", cell: (s) => { const e = s.extra.entrega as Entrega; return <Duo title={fmtDate(e.data, { day: "2-digit", month: "2-digit" })} sub={e.periodo} /> } },
              { label: "A cobrar", w: "110px", align: "right", cell: (s) => { const e = s.extra.entrega as Entrega; return e.aCobrar ? <b className="cl-money" style={{ color: "var(--lv-brand-ink)" }}>{brl(e.aCobrar)}</b> : <span className="vx-muted">pago</span> } },
              { label: "Entregador", w: "minmax(120px,.8fr)", cell: (s) => <Duo title={(s.extra.entrega as Entrega).entregador || "—"} /> },
              { label: "Situação", w: "170px", cell: (s) => { const st = (s.extra.entrega as Entrega).status; return <Status status={st} toneOverride={tomEntrega(st)} /> } },
            ]}
            atual={fichaId}
            onAtual={setFichaId}
            ficha={(s) => {
              const e = s.extra.entrega as Entrega
              return (
                <FichaLivre
                  titulo={s.owner || "Cliente"}
                  sub={`${s.name} · ${fmtDate(e.data)} · ${e.periodo}`}
                  status={e.status}
                  tom={tomEntrega(e.status) === "violet" ? "blue" : tomEntrega(e.status) === "green" ? "" : tomEntrega(e.status)}
                  avatar={<Truck size={28} />}
                  cor="#3d5fd6"
                  acoes={[
                    { label: "Editar", icon: <Edit3 />, main: true, onClick: () => abrirEdicao(s) },
                    { label: "Romaneio", icon: <Printer />, onClick: () => printHtml(s.name, saleSlipHtml(s, activeUnit.name, "romaneio")) },
                    { label: "WhatsApp", icon: <MessageCircle />, onClick: () => window.open(waUrl(e, `Olá! Aqui é da ${activeUnit.name}. Sobre seu pedido ${s.name}.`), "_blank", "noopener") },
                    { label: "Mapa", icon: <MapPin />, onClick: () => window.open(mapsUrl(e), "_blank", "noopener") },
                  ]}
                  abas={[
                    { label: "Entrega", content: (
                      <FichaDados campos={[
                        ["Endereço", `${addrLine(e)} · ${e.bairro} · ${e.cidade}/${e.uf}`, true],
                        ["Referência", e.referencia || ""],
                        ["CEP", e.cep || ""],
                        ["Telefone", e.telefone],
                        ["Quando", `${fmtDate(e.data)} · ${e.periodo}`],
                        ["Entregador", e.entregador || "Sem entregador"],
                        ["Taxa", brl(e.taxa)],
                        ["Pagamento", e.aCobrar ? `Cobrar ${brl(e.aCobrar)} na entrega` : /aguardando/i.test(e.status) ? "Aguardando o caixa" : "Pago no caixa"],
                        ["Motivo", e.motivo || ""],
                        ["Recebido por", e.recebidoPor ? `${e.recebidoPor}${e.cobradoValor ? ` · ${e.cobradoForma} ${brl(e.cobradoValor)}` : ""}${e.foto ? " · com foto" : ""}${e.assinatura ? " · assinado" : ""}` : ""],
                        ["Observações", e.obs || "", true],
                      ]} />
                    ) },
                    { label: "Itens", content: <div>{((s.extra.itens || []) as Line[]).map((l, i) => <div key={i} className="cd-li static et-item"><time>{l.qtd}×</time><span><b>{l.descricao}</b> · {brl(lineTotal(l))}</span></div>)}</div> },
                    { label: "Imprimir", content: <div className="et-print"><PrintBar sale={s} unitName={activeUnit.name} tutor={data.tutores.find((t) => t.id === s.ownerId)} only={["Romaneio", "Conferência", "Comprovante", "Recibo", "Duplicata"]} /></div> },
                    { label: "Histórico", content: <div>{[...(e.historico || [])].reverse().map((h, i) => <div key={i} className="cd-li static et-hist"><span>{h}</span></div>)}{!(e.historico || []).length && <p className="cd-empty">Sem registros ainda.</p>}</div> },
                  ]}
                />
              )
            }}
          />
        </>
      )}

      {view === "rotas" && (
        <div className="op-grid" style={{ gridTemplateColumns: `repeat(${ENTREGADORES.length}, minmax(0,1fr))` }}>
          {rotas.map(({ who, list }) => (
            <div key={who} className="op-card">
              <div className="op-ch">
                <h2 style={{ textTransform: "none", letterSpacing: 0, fontSize: 14, color: "var(--ink)" }}><span className="op-av" style={{ width: 30, height: 30, fontSize: 12 }}>{who.split(" ").map((p) => p[0]).join("")}</span>{who}</h2>
                <span className="muted" style={{ fontSize: 12 }}>{list.length} paradas · {brl(list.reduce((a, s) => a + (s.extra.entrega as Entrega).aCobrar, 0))}</span>
              </div>
              {list.map((s, i) => { const e = s.extra.entrega as Entrega; return (
                <div key={s.id} className="op-tr" style={{ gridTemplateColumns: "26px minmax(0,1fr) auto" }}>
                  <b className="num" style={{ color: "var(--or)" }}>{i + 1}</b>
                  <span><b className="mono">{s.name}</b> · {s.owner}<small>{addrLine(e)} · {e.bairro} · {e.periodo}{e.aCobrar ? ` · cobrar ${brl(e.aCobrar)}` : ""}</small><span style={{ marginTop: 3, display: "block" }}><Tag s={e.status} /></span></span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><button className="op-x" onClick={() => move(list, i, -1)} aria-label="Subir"><ArrowUp /></button><button className="op-x" onClick={() => move(list, i, 1)} aria-label="Descer"><ArrowDown /></button></span>
                </div>
              ) })}
              {!list.length && <div className="op-empty">Sem entregas atribuídas.</div>}
              <div className="op-cb" style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line2)" }}>
                <button className="op-btn sm grow" disabled={!list.length} onClick={() => romaneioRota(list, who)}><Printer /> Romaneio da rota</button>
                <button className="op-btn sm pri grow" disabled={!list.some((s) => (s.extra.entrega as Entrega).status === "Pronta para sair")} onClick={() => sairRota(list, who)}><Navigation /> Saiu para rota</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "app" && (
        <div style={{ maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="op-card op-cb op-me" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="op-av">{me.split(" ").map((p) => p[0]).join("")}</span>
            <div className="grow"><b>{me}</b><div className="muted" style={{ fontSize: 12 }}>{fmtDate(todayISO(), { weekday: "long", day: "2-digit", month: "long" })}</div></div>
            <select className="op-in" style={{ width: 150, height: 32 }} value={me} onChange={(e) => setMe(e.target.value)} aria-label="Entregador">{ENTREGADORES.map((w) => <option key={w}>{w}</option>)}</select>
          </div>
          <div className="op-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
            <div className="op-cb" style={{ borderRight: "1px solid var(--line2)" }}><span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>ENTREGUES</span><div className="op-big">{mine.filter((s) => /entregue/i.test((s.extra.entrega as Entrega).status) && !/não/i.test((s.extra.entrega as Entrega).status)).length} / {mine.length}</div></div>
            <div className="op-cb"><span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>A PRESTAR CONTAS</span><div className="op-big" style={{ color: "var(--amber)" }}>{brl(prestar.reduce((a, [, v]) => a + v, 0))}</div><div className="muted" style={{ fontSize: 11.5 }}>{prestar.map(([f, v]) => `${f} ${brl(v)}`).join(" · ") || "nada a prestar"}</div></div>
          </div>
          {mine.map((s) => {
            const e = s.extra.entrega as Entrega
            const doneE = /entregue/i.test(e.status) && !/não/i.test(e.status)
            return (
              <div key={s.id} className="op-card" style={{ opacity: doneE ? 0.6 : 1, borderColor: e.status === "Em rota" ? "var(--or)" : undefined }}>
                <div className="op-ch"><h2 style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink)", fontSize: 16 }}><span className="op-num">{e.ordem || "—"}</span>{s.owner}</h2><Tag s={e.status} /></div>
                <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}><MapPin size={16} color="var(--or)" style={{ flex: "none", marginTop: 2 }} /><div><b style={{ fontSize: 15.5 }}>{addrLine(e)}</b><div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.bairro}</div><div className="muted" style={{ fontSize: 12.5 }}>{e.cidade}{e.referencia ? ` · ${e.referencia}` : ""}</div></div></div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{s.name} · {e.periodo} · {((s.extra.itens || []) as Line[]).reduce((a, l) => a + l.qtd, 0)} itens{e.obs ? ` · ${e.obs}` : ""}</div>
                  {e.aCobrar > 0 && <div className="op-note warn"><AlertTriangle /> Cobrar na entrega: <b>{brl(e.aCobrar)}</b></div>}
                  {e.status === "Não entregue" && <div className="op-note bad"><X /> {e.motivo}</div>}
                  {!doneE && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        <a className="op-btn sm" href={mapsUrl(e)} target="_blank" rel="noreferrer"><MapPin /> Mapa</a>
                        <a className="op-btn sm" href={wazeUrl(e)} target="_blank" rel="noreferrer"><Navigation /> Waze</a>
                        <a className="op-btn sm" href={`tel:${e.telefone.replace(/\D/g, "")}`}><Phone /> Ligar</a>
                        <a className="op-btn sm" href={waUrl(e, `Olá! Aqui é da ${activeUnit.name}. Seu pedido ${s.name} está a caminho.`)} target="_blank" rel="noreferrer"><MessageCircle /> Zap</a>
                      </div>
                      {e.status === "Pronta para sair" && <button className="op-btn pri lg" onClick={() => iniciar(s)}><Navigation /> Iniciar rota</button>}
                      {e.status === "Em rota" && <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}><button className="op-btn ok lg" onClick={() => openConfirm(s)}><Check /> Confirmar entrega</button><button className="op-btn lg dan" onClick={() => setFail(s)}>Não entregue</button></div>}
                    </>
                  )}
                  {doneE && <div className="muted" style={{ fontSize: 12.5 }}>Recebido por {e.recebidoPor}{e.cobradoValor ? ` · ${e.cobradoForma} ${brl(e.cobradoValor)}` : ""}</div>}
                </div>
              </div>
            )
          })}
          {!mine.length && <div className="op-card op-empty">Nenhuma entrega atribuída a {me} hoje.</div>}
        </div>
      )}

      {edit && (() => { const e = edit.extra.entrega as Entrega; const entregue = /^entregue|conclu/i.test(ef.status); return (
        <Layer className="op-modal-layer" onMouseDown={() => setEdit(null)}>
          <div className="op-modal et-edit" role="dialog" aria-modal="true" aria-label={`Editar entrega ${edit.name}`} onMouseDown={(ev) => ev.stopPropagation()}>
            <div className="op-ch"><h2>Editar entrega · {edit.name}</h2><button className="op-x" onClick={() => setEdit(null)} aria-label="Fechar"><X /></button></div>
            <div className="op-cb">
              <label className="op-f"><span>Situação</span><select className="op-in" value={ef.status} onChange={(ev) => setEf({ ...ef, status: ev.target.value })}>{[...new Set([e.status, ...SITUACOES])].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="op-f"><span>Entregador</span><select className="op-in" value={ef.entregador} onChange={(ev) => setEf({ ...ef, entregador: ev.target.value })}><option value="">Sem entregador</option>{ENTREGADORES.map((w) => <option key={w}>{w}</option>)}</select></label>
              <div className="et-two">
                <label className="op-f"><span>Data</span><input className="op-in" type="date" value={ef.data} onChange={(ev) => setEf({ ...ef, data: ev.target.value })} /></label>
                <label className="op-f"><span>Período</span><select className="op-in" value={ef.periodo} onChange={(ev) => setEf({ ...ef, periodo: ev.target.value })}>{["Manhã", "Tarde", "Noite"].map((x) => <option key={x}>{x}</option>)}</select></label>
              </div>
              {entregue && <label className="op-f"><span>Recebido por</span><input className="op-in" value={ef.recebidoPor} onChange={(ev) => setEf({ ...ef, recebidoPor: ev.target.value })} placeholder="Nome de quem recebeu" /></label>}
              {entregue && e.aCobrar > 0 && (
                <div className="et-two">
                  <label className="op-f"><span>Forma de pagamento</span><select className="op-in" value={ef.forma} onChange={(ev) => setEf({ ...ef, forma: ev.target.value })}>{["Dinheiro", "Pix", "Cartão"].map((x) => <option key={x}>{x}</option>)}</select></label>
                  <label className="op-f"><span>Valor recebido</span><input className="op-in r" inputMode="decimal" value={ef.valor} onChange={(ev) => setEf({ ...ef, valor: ev.target.value })} /></label>
                </div>
              )}
              {ef.status === "Não entregue" && <label className="op-f"><span>Motivo</span><select className="op-in" value={ef.motivo} onChange={(ev) => setEf({ ...ef, motivo: ev.target.value })}>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}</select></label>}
              <label className="op-f"><span>Observações</span><textarea className="op-in" rows={2} value={ef.obs} onChange={(ev) => setEf({ ...ef, obs: ev.target.value })} /></label>
              {ef.status !== e.status && <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>A troca de situação fica registrada no histórico com o seu nome.</p>}
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setEdit(null)}>Cancelar</button><button className="op-btn pri" onClick={salvarEdicao}><Check /> Salvar</button></div>
          </div>
        </Layer>
      ) })()}
      {confirm && (() => { const e = confirm.extra.entrega as Entrega; return (
        <Layer className="op-modal-layer">
          <div className="op-modal">
            <div className="op-ch"><h2>Confirmar entrega {confirm.name}</h2><button className="op-x" onClick={() => setConfirm(null)} aria-label="Fechar"><X /></button></div>
            <div className="op-cb">
              <div className="op-hl"><span className="op-hl-label">Entregar para</span><strong>{confirm.owner}</strong><span className="op-hl-addr2"><MapPin size={16} /> {addrLine(e)} · {e.bairro}</span></div>
              <label className="op-f"><span>Recebido por</span><input className="op-in lg" autoFocus value={cf.nome} onChange={(ev) => setCf({ ...cf, nome: ev.target.value })} placeholder="Nome de quem recebeu" /></label>
              {e.aCobrar > 0 && (
                <>
                  <div className="op-f"><span>Cobrança de {brl(e.aCobrar)}</span><div className="op-chips">{["Dinheiro", "Pix", "Cartão"].map((f) => <button key={f} className={`op-chip ${cf.forma === f ? "on" : ""}`} onClick={() => setCf({ ...cf, forma: f })}>{f}</button>)}</div></div>
                  <label className="op-f"><span>Valor recebido</span><input className="op-in lg r" inputMode="decimal" value={cf.valor} onChange={(ev) => setCf({ ...cf, valor: ev.target.value })} /></label>
                  {cf.forma === "Dinheiro" && Number(cf.valor.replace(",", ".")) > e.aCobrar && <div className="op-note ok"><Check /> Troco: {brl(Number(cf.valor.replace(",", ".")) - e.aCobrar)}</div>}
                </>
              )}
              <label className="op-btn" style={{ cursor: "pointer" }}><Camera /> {cf.foto ? "Foto anexada ✓" : "Foto do comprovante"}<input type="file" accept="image/*" capture="environment" hidden onChange={(ev) => setCf({ ...cf, foto: !!ev.target.files?.length })} /></label>
              <div className="op-f"><span>Assinatura (opcional)</span><canvas ref={sigRef} style={{ width: "100%", height: 110, border: "1px dashed var(--line)", borderRadius: 8, background: "#fff", touchAction: "none" }} /></div>
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setConfirm(null)}>Voltar</button><button className="op-btn ok" onClick={confirmar}><Check /> Confirmar entrega</button></div>
          </div>
        </Layer>
      ) })()}
      {fail && (
        <Layer className="op-modal-layer" onMouseDown={() => setFail(null)}>
          <div className="op-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2>Não entregue · {fail.name}</h2></div>
            <div className="op-cb"><div className="op-chips" style={{ gridTemplateColumns: "1fr 1fr" }}>{MOTIVOS.map((m) => <button key={m} className={`op-chip ${failMotivo === m ? "on" : ""}`} onClick={() => setFailMotivo(m)}>{m}</button>)}</div><p className="muted" style={{ margin: 0, fontSize: 12.5 }}>A entrega volta para a expedição reagendar.</p></div>
            <div className="foot"><button className="op-btn" onClick={() => setFail(null)}>Voltar</button><button className="op-btn pri" onClick={naoEntregue}>Registrar</button></div>
          </div>
        </Layer>
      )}
      {toast && <Layer className="op-toast"><Check /> {toast}</Layer>}
      </div>
    </Page>
  )
}
