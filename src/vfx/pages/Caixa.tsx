import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Banknote, Check, Clock, History, ListOrdered, Lock, Package, Pencil, Printer, RotateCcw, ScanBarcode, Truck, Undo2, Unlock, Wallet, X } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { brl, fmtDate, itemDate, parseMoney, todayISO, Page } from "../ui"
import { A_PRAZO, planoInfo, addMonths, FORMAS, PARCELADAS, LIMITE_FIADO, lineTotal, minutesSince, nowTime, printHtml, stamp, type Entrega, type Line, type Pay } from "../vendasShared"
import { PrintBar } from "../PrintMenu"
import "../ops.css"
import Layer from "../OpLayer"

type Mov = { tipo: string; valor: number; motivo: string; hora: string; forma?: string; venda?: string; por?: string }
const LIMITE_GAVETA = 1000
const TAXA: Record<string, number> = { Débito: 1.6, Crédito: 3.2 }

export default function Caixa() {
  const { data, activeUnit, profile, addItem, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const operador = profile?.displayName || "Recepção"
  const all = data.vendas || []
  const sales = useMemo(() => all.filter((i) => i.kind === "Venda"), [all])
  const abertos = all.filter((i) => i.kind === "Caixa" && i.status === "Aberto")
  const caixa = abertos.find((i) => i.professional === operador)
  const outros = abertos.filter((i) => i.professional !== operador)
  const [view, setView] = useState<"receber" | "extrato" | "historico">("receber")
  const [toast, setToast] = useState("")
  const showToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(""), 3200) }

  /* fila */
  const fila = useMemo(() => sales.filter((s) => s.status === "Aguardando pagamento").sort((a, b) => `${itemDate(a)}${a.extra?.enviadaAs || a.time}`.localeCompare(`${itemDate(b)}${b.extra?.enviadaAs || b.time}`)), [sales])
  const acertos = useMemo(() => sales.filter((s) => { const e = s.extra?.entrega as Entrega | undefined; return e && e.aCobrar > 0 && e.status === "Entregue" && s.status !== "Concluída" }), [sales])
  const [seen, setSeen] = useState<Set<string>>(() => new Set(fila.map((s) => s.id)))
  const fresh = fila.filter((s) => !seen.has(s.id))
  useEffect(() => { if (fresh.length) { const t = window.setTimeout(() => setSeen(new Set(fila.map((s) => s.id))), 5000); return () => window.clearTimeout(t) } return undefined }, [fresh.length, fila])
  const [, tick] = useState(0)
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 30000); return () => window.clearInterval(id) }, [])

  const [q, setQ] = useState("")
  const scanRef = useRef<HTMLInputElement>(null)
  const filaShown = q.trim() ? fila.filter((s) => `${s.name} ${s.owner} ${s.professional}`.toLowerCase().includes(q.trim().toLowerCase()) || s.name.replace(/\D/g, "").endsWith(q.replace(/\D/g, "") || "x")) : fila

  /* venda selecionada */
  const [selId, setSelId] = useState("")
  const sale = sales.find((s) => s.id === selId) || null
  const [pays, setPays] = useState<Pay[]>([])
  const [forma, setForma] = useState<string>("Dinheiro")
  const [valor, setValor] = useState("")
  const [parcelas, setParcelas] = useState(1)
  const [venc1, setVenc1] = useState(addMonths(todayISO(), 1))
  const [intervalo, setIntervalo] = useState(30)
  const [returning, setReturning] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [done, setDone] = useState<Item | null>(null)
  const valorRef = useRef<HTMLInputElement>(null)

  const select = (s: Item) => {
    if (s.extra?.emEdicao) { showToast(`${s.name} está sendo editada por ${s.extra.emEdicao}. Aguarde.`); return }
    setSelId(s.id); setPays([]); setValor(""); setParcelas(Math.max(1, planoInfo(s.extra?.plano).total))
    setForma(FORMAS.includes(s.extra?.formaSugerida) ? s.extra.formaSugerida : "Dinheiro")
    setSeen((x) => new Set([...x, s.id]))
    window.setTimeout(() => valorRef.current?.focus(), 0)
  }
  const total = sale?.amountValue || 0
  const paid = pays.reduce((a, p) => a + p.valor, 0)
  const rest = Math.max(0, Math.round((total - paid) * 100) / 100)
  const troco = pays.reduce((a, p) => a + (p.troco || 0), 0)
  const client = sale?.ownerId ? data.tutores.find((t) => t.id === sale.ownerId) : undefined
  const fiadoAberto = useMemo(() => {
    if (!client) return 0
    let v = client.amountValue || 0
    for (const s of sales) if (s.ownerId === client.id && s.status !== "Cancelada") for (const p of s.extra?.pagamentos || []) if (p.forma === "Fiado") v += p.valor
    return v
  }, [client, sales])
  const typed = parseMoney(valor) || rest
  const limiteCli = (client?.extra?.limiteCredito ?? LIMITE_FIADO) as number
  const fiadoBlock = forma === "Fiado" && (!client ? "Fiado exige cliente identificado." : client.extra?.bloqueadoFiado ? "Vendas anotadas bloqueadas no cadastro deste cliente." : fiadoAberto + typed > limiteCli ? `Limite de fiado excedido (em aberto ${brl(fiadoAberto)}, limite ${brl(limiteCli)}).` : "")
  const parcelasDup = useMemo(() => Array.from({ length: PARCELADAS.includes(forma) ? parcelas : 0 }, (_, i) => addMonths(venc1, 0, i * intervalo)), [forma, parcelas, venc1, intervalo])

  const [cheque, setCheque] = useState({ numero: "", banco: "", bomPara: todayISO() })
  const [conv, setConv] = useState({ nome: "", autorizacao: "" })
  const convenios = useMemo(() => [...new Set(data.convenios.map((c) => c.name))], [data.convenios])
  const addPay = () => {
    if (!sale || !rest) return
    if (fiadoBlock) { showToast(fiadoBlock); return }
    if (forma === "Cheque" && !cheque.numero) { showToast("Informe o número do cheque."); return }
    if (forma === "Convênio" && !conv.nome) { showToast("Escolha o convênio."); return }
    if (forma === "Vale-crédito" && !client) { showToast("Vale-crédito exige cliente identificado."); return }
    let v = typed
    let tr = 0
    if (forma === "Dinheiro" && v > rest) { tr = Math.round((v - rest) * 100) / 100; v = rest }
    v = Math.min(v, rest)
    const p: Pay = { forma, valor: v, parcelas: forma === "Crédito" || PARCELADAS.includes(forma) ? parcelas : 1, troco: tr || undefined }
    if (PARCELADAS.includes(forma)) p.vencimentos = parcelasDup
    if (forma === "Cheque") { p.detalhe = `nº ${cheque.numero}${cheque.banco ? ` · ${cheque.banco}` : ""}${cheque.bomPara > todayISO() ? ` · bom para ${fmtDate(cheque.bomPara)}` : ""}`; p.vencimentos = [cheque.bomPara]; setCheque({ numero: "", banco: "", bomPara: todayISO() }) }
    if (forma === "Convênio") { p.detalhe = `${conv.nome}${conv.autorizacao ? ` · aut. ${conv.autorizacao}` : ""}`; p.vencimentos = [addMonths(todayISO(), 1)]; setConv({ nome: "", autorizacao: "" }) }
    if (forma === "Fiado") p.vencimentos = [addMonths(todayISO(), 1)]
    setPays((c) => [...c, p]); setValor(""); setParcelas(1)
  }

  const baixaEstoque = (s: Item) => {
    for (const l of (s.extra?.itens || []) as Line[]) {
      const st = data.estoque.find((x) => x.id === l.ref)
      if (st && l.tipo === "Produto") {
        const quantity = Math.max(0, (st.quantity || 0) - l.qtd)
        updateItem("estoque", st.id, { quantity, subtitle: `${quantity} un. • mínimo ${st.minimum}`, status: quantity <= 0 ? "Esgotado" : quantity < (st.minimum || 0) ? "Abaixo do mínimo" : st.status })
      }
    }
  }
  const lancarFinanceiro = (s: Item, list: Pay[]) => {
    const base = Date.now()
    list.forEach((p, i) => {
      const n = Math.max(1, p.parcelas)
      for (let k = 0; k < n; k++) {
        const v = Math.round((p.valor / n) * 100) / 100
        const prazo = A_PRAZO.includes(p.forma) || (p.forma === "Cheque" && (p.vencimentos?.[0] || "") > todayISO())
        const due = p.vencimentos?.[k] || (p.forma === "Crédito" ? addMonths(todayISO(), k + 1) : todayISO())
        addItem("financeiro", {
          id: `${activeUnit.id}-financeiro-${base}-${i}-${k}`,
          name: `${p.forma === "Duplicata" ? "DUP " : p.forma === "Boleto" ? "BOL " : ""}${s.name} • ${p.forma}${p.detalhe ? ` (${p.detalhe})` : ""}${n > 1 ? ` ${k + 1}/${n}` : ""}`,
          subtitle: s.owner || "Consumidor final",
          category: "Receita",
          status: prazo ? "A receber" : "Recebido",
          date: prazo ? due : todayISO(),
          dueDate: due,
          amountValue: v,
          notes: TAXA[p.forma] ? `Taxa ${TAXA[p.forma]}% • líquido ${brl(v * (1 - TAXA[p.forma] / 100))}` : undefined,
        })
      }
    })
  }

  const concluir = () => {
    if (!sale) return
    if (!caixa) { showToast("Abra o caixa para receber."); return }
    if (rest > 0) { showToast(`Faltam ${brl(rest)}.`); return }
    baixaEstoque(sale)
    lancarFinanceiro(sale, pays)
    const tipo = sale.extra?.tipo || "Balcão"
    const e = sale.extra?.entrega as Entrega | undefined
    const status = tipo === "Balcão" ? "Concluída" : "Paga"
    const extra = {
      ...sale.extra, pago: total, pagamentos: pays, caixaId: caixa.id, recebidoPor: operador, recebidoAs: nowTime(),
      entrega: e ? { ...e, status: "A separar", historico: [...(e.historico || []), `${stamp()} · Liberada pelo caixa (pago)`] } : e,
      historico: [...(sale.extra?.historico || []), `${stamp()} · Recebida no caixa por ${operador}: ${pays.map((p) => `${p.forma} ${brl(p.valor)}`).join(" + ")}`],
    }
    updateItem("vendas", sale.id, { status, extra })
    setDone({ ...sale, status, extra } as Item)
    setSelId(""); setPays([])
  }
  const liberarCobrarNaEntrega = () => {
    if (!sale || !caixa) return
    const e = sale.extra?.entrega as Entrega
    baixaEstoque(sale)
    updateItem("vendas", sale.id, { status: "A cobrar na entrega", extra: { ...sale.extra, caixaId: caixa.id, entrega: { ...e, status: "A separar", aCobrar: total, historico: [...(e.historico || []), `${stamp()} · Liberada para cobrar na entrega`] }, historico: [...(sale.extra?.historico || []), `${stamp()} · Liberada pelo caixa para pagar na entrega`] } })
    showToast(`${sale.name} liberada. ${brl(total)} será cobrado na entrega.`)
    setSelId(""); setPays([])
  }
  const devolver = () => {
    if (!sale) return
    updateItem("vendas", sale.id, { status: "Devolvida ao vendedor", extra: { ...sale.extra, motivoDevolucao: motivo || "corrigir a venda", historico: [...(sale.extra?.historico || []), `${stamp()} · Devolvida ao vendedor por ${operador}: ${motivo || "sem motivo"}`] } })
    showToast(`${sale.name} devolvida ao vendedor.`)
    setReturning(false); setMotivo(""); setSelId(""); setPays([])
  }
  const acertar = (s: Item) => {
    if (!caixa) { showToast("Abra o caixa para fazer o acerto."); return }
    const e = s.extra?.entrega as Entrega
    const f = e.cobradoForma || "Dinheiro"
    const v = e.cobradoValor ?? e.aCobrar
    const p: Pay = { forma: f, valor: v, parcelas: 1 }
    lancarFinanceiro(s, [p])
    updateItem("vendas", s.id, { status: "Concluída", extra: { ...s.extra, pago: v, pagamentos: [p], caixaId: caixa.id, entrega: { ...e, status: "Concluída", historico: [...(e.historico || []), `${stamp()} · Acerto feito no caixa`] }, historico: [...(s.extra?.historico || []), `${stamp()} · Acerto do entregador ${e.entregador}: ${f} ${brl(v)}`] } })
    showToast(`Acerto de ${s.name} conferido: ${f} ${brl(v)}.`)
  }

  /* resumo do caixa */
  const movs: Mov[] = caixa?.extra?.movs || []
  const resumo = useMemo(() => {
    const map = new Map<string, number>()
    let trocos = 0
    let n = 0
    for (const s of sales) {
      if (s.extra?.caixaId !== caixa?.id || s.status === "Cancelada") continue
      if (s.extra?.pagamentos?.length) n++
      for (const p of (s.extra?.pagamentos || []) as Pay[]) { map.set(p.forma, (map.get(p.forma) || 0) + p.valor); trocos += p.troco || 0 }
    }
    return { porForma: FORMAS.map((f) => [f, map.get(f) || 0] as [string, number]), trocos, n }
  }, [sales, caixa])
  const dinheiroEsperado = (caixa?.amountValue || 0) + (resumo.porForma.find(([f]) => f === "Dinheiro")?.[1] || 0) + movs.reduce((a, m) => a + (m.tipo === "Sangria" ? -m.valor : m.tipo === "Suprimento" ? m.valor : 0), 0)
  const totalRecebido = resumo.porForma.reduce((a, [, v]) => a + v, 0)

  const [abrirValor, setAbrirValor] = useState("200,00")
  const [mov, setMov] = useState<{ tipo: string; valor: string; motivo: string; senha?: string } | null>(null)
  const [fechando, setFechando] = useState(false)
  const [contado, setContado] = useState("")
  const [conf, setConf] = useState<Record<string, string>>({ Pix: "", Débito: "", Crédito: "", Transferência: "", Cheque: "" })
  const esperadoForma: [string, number][] = [["Dinheiro (gaveta)", dinheiroEsperado], ["Pix", resumo.porForma.find(([f]) => f === "Pix")?.[1] || 0], ["Débito", resumo.porForma.find(([f]) => f === "Débito")?.[1] || 0], ["Crédito", resumo.porForma.find(([f]) => f === "Crédito")?.[1] || 0], ["Transferência", resumo.porForma.find(([f]) => f === "Transferência")?.[1] || 0], ["Cheque", resumo.porForma.find(([f]) => f === "Cheque")?.[1] || 0]]
  const contadoDe = (f: string) => (f.startsWith("Dinheiro") ? parseMoney(contado) : conf[f] === "" ? NaN : parseMoney(conf[f]))
  const abrir = () => {
    addItem("vendas", { id: `${activeUnit.id}-vendas-cx-${Date.now()}`, name: `CX-${String(all.filter((i) => i.kind === "Caixa").length + 1).padStart(4, "0")}`, subtitle: `Operador ${operador}`, kind: "Caixa", status: "Aberto", professional: operador, date: todayISO(), time: nowTime(), amountValue: parseMoney(abrirValor), extra: { movs: [] } })
    showToast("Caixa aberto.")
  }
  const salvarMov = () => {
    if (!caixa || !mov) return
    const v = parseMoney(mov.valor)
    if (!v) return
    if (mov.tipo === "Sangria" && v > dinheiroEsperado) { showToast(`A gaveta tem só ${brl(dinheiroEsperado)}.`); return }
    if (mov.tipo === "Sangria" && !mov.senha) { showToast("A sangria precisa da senha do gerente."); return }
    const m: Mov = { tipo: mov.tipo, valor: v, motivo: mov.motivo || "—", hora: nowTime(), por: operador }
    updateItem("vendas", caixa.id, { extra: { ...caixa.extra, movs: [...movs, m] } })
    printHtml(mov.tipo, `<h1>VetFlow · ${activeUnit.name}</h1><div>COMPROVANTE DE ${mov.tipo.toUpperCase()}</div><div>Caixa ${caixa.name} · ${fmtDate(todayISO())} ${m.hora}</div><div class="t">${brl(v)}</div><div>Motivo: ${m.motivo}</div><div>Operador: ${operador}</div><div class="sig">${mov.tipo === "Sangria" ? "Recebido por (gerente)" : "Entregue por"}</div>`)
    showToast(`${mov.tipo} de ${brl(v)} registrada.`); setMov(null)
  }
  const relatorioHtml = (informado: number) => `<h1>VetFlow · ${activeUnit.name}</h1><div>FECHAMENTO DE CAIXA ${caixa?.name}</div><div>Operador: ${caixa?.professional} · Aberto ${fmtDate(caixa ? itemDate(caixa) : todayISO())} ${caixa?.time}</div><div>Fechado ${fmtDate(todayISO())} ${nowTime()}</div><h2>Conferência</h2><table><tr><th>Forma</th><th>Esperado</th><th>Contado</th><th>Dif.</th></tr>${esperadoForma.map(([f, e]) => { const c = contadoDe(f); return `<tr><td>${f}</td><td>${brl(e)}</td><td>${Number.isNaN(c) ? "—" : brl(c)}</td><td>${Number.isNaN(c) ? "—" : brl(c - e)}</td></tr>` }).join("")}</table><h2>Recebido por forma</h2><table>${resumo.porForma.map(([f, v]) => `<tr><td>${f}</td><td>${brl(v)}</td></tr>`).join("")}<tr><td><b>Total</b></td><td><b>${brl(totalRecebido)}</b></td></tr></table><h2>Gaveta (dinheiro)</h2><table><tr><td>Troco inicial</td><td>${brl(caixa?.amountValue || 0)}</td></tr>${movs.map((m) => `<tr><td>${m.tipo} · ${m.motivo}</td><td>${m.tipo === "Sangria" ? "-" : "+"}${brl(m.valor)}</td></tr>`).join("")}<tr><td>Esperado</td><td>${brl(dinheiroEsperado)}</td></tr><tr><td>Contado</td><td>${brl(informado)}</td></tr><tr><td><b>Diferença</b></td><td><b>${brl(informado - dinheiroEsperado)}</b></td></tr></table><div class="sig">Conferido por (gerente)</div>`
  const fechar = () => {
    if (!caixa) return
    const informado = parseMoney(contado)
    const html = relatorioHtml(informado)
    const conferencia = Object.fromEntries(esperadoForma.map(([f, e]) => [f, { esperado: e, contado: contadoDe(f) }]))
    const difTotal = esperadoForma.reduce((a, [f, e]) => { const c = contadoDe(f); return a + (Number.isNaN(c) ? 0 : c - e) }, 0)
    updateItem("vendas", caixa.id, { status: "Fechado", extra: { ...caixa.extra, fechamento: `${todayISO()} ${nowTime()}`, esperado: dinheiroEsperado, informado, diferenca: difTotal, total: totalRecebido, vendas: resumo.n, conferencia, relatorio: html } })
    printHtml(`Fechamento ${caixa.name}`, html)
    setFechando(false); setContado(""); setConf({ Pix: "", Débito: "", Crédito: "", Transferência: "", Cheque: "" }); showToast(`Caixa ${caixa.name} fechado.`)
  }

  /* extrato do caixa */
  const extrato = useMemo(() => {
    if (!caixa) return [] as { hora: string; tipo: string; desc: string; valor: number; sale?: Item; por?: string }[]
    const rows: { hora: string; tipo: string; desc: string; valor: number; sale?: Item; por?: string }[] = [{ hora: caixa.time || "", tipo: "Abertura", desc: "Troco inicial da gaveta", valor: caixa.amountValue || 0, por: caixa.professional }]
    for (const s of sales) {
      if (s.extra?.caixaId !== caixa.id || s.status === "Cancelada") continue
      const pays = (s.extra?.pagamentos || []) as Pay[]
      if (!pays.length) { rows.push({ hora: s.extra?.recebidoAs || s.time || "", tipo: "A cobrar na entrega", desc: `${s.name} · ${s.owner}`, valor: 0, sale: s, por: s.extra?.recebidoPor }); continue }
      rows.push({ hora: s.extra?.recebidoAs || s.time || "", tipo: "Recebimento", desc: `${s.name} · ${s.owner} · ${pays.map((p) => `${p.forma}${p.parcelas > 1 ? ` ${p.parcelas}x` : ""} ${brl(p.valor)}${p.troco ? ` (troco ${brl(p.troco)})` : ""}`).join(" + ")}`, valor: pays.reduce((a, p) => a + p.valor, 0), sale: s, por: s.extra?.recebidoPor })
    }
    for (const m of movs) rows.push({ hora: m.hora, tipo: m.tipo, desc: `${m.venda ? `${m.venda} · ` : ""}${m.motivo}`, valor: m.tipo === "Sangria" ? -m.valor : m.tipo === "Estorno" ? -m.valor : m.valor, por: m.por })
    return rows.sort((a, b) => a.hora.localeCompare(b.hora))
  }, [caixa, sales, movs])
  const [estorno, setEstorno] = useState<Item | null>(null)
  const [estMotivo, setEstMotivo] = useState("")
  const [estSenha, setEstSenha] = useState("")
  const estornar = () => {
    if (!estorno || !caixa) return
    if (!estSenha) { showToast("O estorno precisa da senha do gerente."); return }
    const s = estorno
    const e = s.extra?.entrega as Entrega | undefined
    if (e && /rota|entregue|conclu/i.test(e.status)) { showToast("A entrega já saiu. Cancele pela tela de vendas."); return }
    for (const l of (s.extra?.itens || []) as Line[]) {
      const st = data.estoque.find((x) => x.id === l.ref)
      if (st && l.tipo === "Produto") updateItem("estoque", st.id, { quantity: (st.quantity || 0) + l.qtd, subtitle: `${(st.quantity || 0) + l.qtd} un. • mínimo ${st.minimum}` })
    }
    const pago = s.extra?.pago || 0
    if (pago) addItem("financeiro", { id: `${activeUnit.id}-financeiro-est-${Date.now()}`, name: `${s.name} • Estorno do recebimento`, subtitle: s.owner || "", category: "Despesa", status: "Pago", date: todayISO(), amountValue: pago })
    updateItem("vendas", s.id, { status: "Aguardando pagamento", extra: { ...s.extra, pago: 0, pagamentos: [], caixaId: undefined, recebidoPor: undefined, entrega: e ? { ...e, status: "Aguardando liberação", aCobrar: 0 } : e, historico: [...(s.extra?.historico || []), `${stamp()} · Recebimento estornado por ${operador}: ${estMotivo || "sem motivo"}`] } })
    updateItem("vendas", caixa.id, { extra: { ...caixa.extra, movs: [...movs, { tipo: "Estorno", valor: pago, motivo: estMotivo || "Estorno de recebimento", hora: nowTime(), venda: s.name, por: operador }] } })
    showToast(`Recebimento de ${s.name} estornado. A venda voltou para a fila.`)
    setEstorno(null); setEstMotivo(""); setEstSenha("")
  }
  const historico = useMemo(() => all.filter((i) => i.kind === "Caixa").sort((a, b) => `${itemDate(b)}${b.time}`.localeCompare(`${itemDate(a)}${a.time}`)), [all])
  const extratoHtml = () => `<h1>VetFlow · ${activeUnit.name}</h1><div>EXTRATO DO CAIXA ${caixa?.name}</div><div>${fmtDate(todayISO())} · Operador ${caixa?.professional}</div><table><tr><th>Hora</th><th>Movimento</th><th>Valor</th></tr>${extrato.map((r) => `<tr><td>${r.hora}</td><td>${r.tipo}<br><small>${r.desc}</small></td><td>${brl(r.valor)}</td></tr>`).join("")}</table><div class="t">Na gaveta: ${brl(dinheiroEsperado)}</div>`

  /* atalhos */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA"
      if (e.key === "F2") { e.preventDefault(); scanRef.current?.focus() }
      if (e.key === "F10") { e.preventDefault(); concluir() }
      if (e.key === "Escape" && !inField) setSelId("")
      if (!inField && sale && /^[0-9]$/.test(e.key)) { setForma(FORMAS[e.key === "0" ? 9 : Number(e.key) - 1]); window.setTimeout(() => valorRef.current?.focus(), 0) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const historicoCard = (
    <div className="op-card">
      <div className="op-ch"><h2><History /> Histórico de caixas</h2></div>
      <div className="op-table">
        <div className="op-tr op-th" style={{ gridTemplateColumns: "90px minmax(0,1fr) 120px 140px 110px 120px 110px" }}><span>Caixa</span><span>Operador</span><span>Abertura</span><span>Fechamento</span><span className="r">Recebido</span><span className="r">Diferença</span><span /></div>
        {historico.map((c) => (
          <div key={c.id} className="op-tr" style={{ gridTemplateColumns: "90px minmax(0,1fr) 120px 140px 110px 120px 110px" }}>
            <b className="mono">{c.name}</b>
            <span>{c.professional}</span>
            <span className="num">{fmtDate(itemDate(c), { day: "2-digit", month: "2-digit" })} {c.time}</span>
            <span className="num">{c.status === "Aberto" ? <span className="op-tag green">Aberto</span> : c.extra?.fechamento ? `${fmtDate(c.extra.fechamento.slice(0, 10), { day: "2-digit", month: "2-digit" })} ${c.extra.fechamento.slice(11)}` : "—"}</span>
            <b className="r num">{c.status === "Aberto" ? "—" : brl(c.extra?.total || 0)}</b>
            <span className="r">{c.status === "Aberto" ? "—" : <span className={`op-tag ${Math.abs(c.extra?.diferenca || 0) < 0.01 ? "green" : "red"} plain`}>{brl(c.extra?.diferenca || 0)}</span>}</span>
            <span className="r">{c.extra?.relatorio && <button className="op-btn sm" onClick={() => printHtml(`Fechamento ${c.name}`, c.extra.relatorio)}><Printer /> Relatório</button>}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (!caixa) {
    return (
      <Page bg="#eef6f0" blobs={[["#a8e2b8", -100, 160, 520, 460], ["#ffd39a", "70%", -40, 380, 340]]} crumb="Caixa" title="Caixa" sub="Receba as vendas da fila, controle a gaveta e feche o dia conferido.">
      <div className="op op-vx">
        <div className="op-bar"><h1><Wallet size={18} /> Caixa</h1><span className="sep" /><span className="op-tag">Fechado</span><span className="grow" /><button className="op-btn sm" onClick={() => navigate("/vendas")}>Ir para vendas</button></div>
        <div className="op-card" style={{ maxWidth: 440, margin: "40px auto 16px" }}>
          <div className="op-ch"><h2><Unlock /> Abrir caixa</h2></div>
          <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <dl className="op-dl"><dt>Operador</dt><dd>{operador}</dd><dt>Data</dt><dd>{fmtDate(todayISO())} · {nowTime()}</dd><dt>Aguardando</dt><dd>{fila.length} vendas na fila</dd></dl>
            <label className="op-f"><span>Troco inicial da gaveta (R$)</span><input className="op-in lg r" autoFocus value={abrirValor} onChange={(e) => setAbrirValor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") abrir() }} /></label>
            <button className="op-btn pri lg" onClick={abrir}><Unlock /> Abrir caixa</button>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Cada operador trabalha no próprio caixa. Tudo o que você receber fica registrado no seu nome.</p>
            {outros.length > 0 && <div className="op-note info"><Wallet /> Outros caixas abertos: {outros.map((c) => `${c.name} (${c.professional}, desde ${c.time})`).join(", ")}.</div>}
          </div>
        </div>
        {historicoCard}
        {toast && <Layer className="op-toast"><Check /> {toast}</Layer>}
      </div>
      </Page>
    )
  }

  const itens = (sale?.extra?.itens || []) as Line[]
  const ent = sale?.extra?.entrega as Entrega | undefined

  return (
    <Page bg="#eef6f0" blobs={[["#a8e2b8", -100, 160, 520, 460], ["#ffd39a", "70%", -40, 380, 340]]} crumb="Caixa" title="Caixa" sub="Receba as vendas da fila, controle a gaveta e feche o dia conferido.">
      <div className="op op-vx">
      <div className="op-bar">
        <h1><Wallet size={18} /> Caixa</h1>
        <span className="sep" />
        <div className="op-meta">
          <span><span className="op-num">{caixa.name}</span></span>
          <span className="op-tag green">Aberto às {caixa.time}</span>
          <span>Operador <b>{caixa.professional}</b></span>
          <span>Na gaveta <b className="num">{brl(dinheiroEsperado)}</b></span>
          <span className="op-hide-sm">Recebido hoje <b className="num">{brl(totalRecebido)}</b></span>
        </div>
        <span className="grow" />
        <div className="op-tabs">
          <button className={view === "receber" ? "on" : ""} onClick={() => setView("receber")}><Banknote size={14} /> Recebimento {fila.length > 0 && <span className="cnt">{fila.length}</span>}</button>
          <button className={view === "extrato" ? "on" : ""} onClick={() => setView("extrato")}><ListOrdered size={14} /> Extrato</button>
          <button className={view === "historico" ? "on" : ""} onClick={() => setView("historico")}><History size={14} /> Histórico</button>
        </div>
        <button className="op-btn sm" onClick={() => setMov({ tipo: "Sangria", valor: "", motivo: "" })}><ArrowUpFromLine /> Sangria</button>
        <button className="op-btn sm" onClick={() => setMov({ tipo: "Suprimento", valor: "", motivo: "" })}><ArrowDownToLine /> Suprimento</button>
        <button className="op-btn sm dan" onClick={() => setFechando(true)}><Lock /> Fechar caixa</button>
      </div>

      {dinheiroEsperado > LIMITE_GAVETA && <div className="op-note warn" style={{ marginBottom: 14 }}><AlertTriangle /> Há {brl(dinheiroEsperado)} em dinheiro na gaveta, acima do limite de {brl(LIMITE_GAVETA)}. Faça uma sangria.</div>}
      {view === "extrato" && (
        <div className="op-card">
          <div className="op-ch"><h2><ListOrdered /> Extrato do caixa {caixa.name}</h2><button className="op-btn sm" onClick={() => printHtml(`Extrato ${caixa.name}`, extratoHtml())}><Printer /> Imprimir extrato</button></div>
          <div className="op-table">
            <div className="op-tr op-th" style={{ gridTemplateColumns: "64px 150px minmax(0,1fr) 120px 120px 110px" }}><span>Hora</span><span>Movimento</span><span>Descrição</span><span>Operador</span><span className="r">Valor</span><span /></div>
            {extrato.map((r, i) => (
              <div key={i} className="op-tr" style={{ gridTemplateColumns: "64px 150px minmax(0,1fr) 120px 120px 110px" }}>
                <span className="num muted">{r.hora}</span>
                <span><span className={`op-tag plain ${r.tipo === "Recebimento" ? "green" : r.tipo === "Sangria" || r.tipo === "Estorno" ? "red" : r.tipo === "Suprimento" || r.tipo === "Abertura" ? "blue" : "amber"}`}>{r.tipo}</span></span>
                <span title={r.desc}>{r.desc}</span>
                <span className="muted">{r.por || "—"}</span>
                <b className="r num" style={{ color: r.valor < 0 ? "var(--red)" : undefined }}>{brl(r.valor)}</b>
                <span className="r">{r.sale && r.tipo === "Recebimento" && <button className="op-btn sm dan" onClick={() => setEstorno(r.sale!)}><RotateCcw /> Estornar</button>}</span>
              </div>
            ))}
          </div>
          <div className="op-total"><span>Esperado na gaveta</span><b style={{ fontSize: 20 }}>{brl(dinheiroEsperado)}</b></div>
        </div>
      )}
      {view === "historico" && historicoCard}
      {view === "receber" && <div className="op-grid" style={{ gridTemplateColumns: "300px minmax(0,1fr) 270px" }}>
        {/* fila */}
        <div className="op-col">
          <div className="op-card">
            <div className="op-ch"><h2><Clock /> Aguardando pagamento</h2><span className="op-tag amber plain">{fila.length}</span></div>
            <div className="op-cb" style={{ paddingBottom: 8 }}>
              <div className="op-search"><ScanBarcode /><input ref={scanRef} className="op-in" placeholder="Nº da venda, cliente ou código" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && filaShown[0]) { select(filaShown[0]); setQ("") } }} /><kbd>F2</kbd></div>
            </div>
            <div style={{ maxHeight: "calc(100vh - 330px)", overflowY: "auto" }}>
              {filaShown.map((s) => (
                <div key={s.id} className={`op-tr click ${selId === s.id ? "sel" : ""} ${!seen.has(s.id) ? "op-pulse" : ""}`} style={{ gridTemplateColumns: "minmax(0,1fr) auto", padding: "9px 14px" }} onClick={() => select(s)}>
                  <span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><b className="mono">{s.name}</b>{s.extra?.tipo === "Entrega" && <Truck size={13} color="var(--blue)" />}{!seen.has(s.id) && <span className="op-tag amber plain" style={{ height: 18 }}>nova</span>}{s.extra?.emEdicao && <span className="op-tag violet plain" style={{ height: 18 }}><Pencil size={11} /> em edição</span>}</span>
                    <small>{s.owner || "Consumidor final"} · {s.professional}</small>
                  </span>
                  <span style={{ textAlign: "right" }}><b className="num">{brl(s.amountValue || 0)}</b><small>{minutesSince(itemDate(s), s.extra?.enviadaAs || s.time)}</small></span>
                </div>
              ))}
              {!filaShown.length && <div className="op-empty">Nenhuma venda aguardando. As vendas finalizadas no balcão aparecem aqui na hora.</div>}
            </div>
          </div>
          {acertos.length > 0 && (
            <div className="op-card">
              <div className="op-ch"><h2><Truck /> Acerto de entregadores</h2><span className="op-tag blue plain">{acertos.length}</span></div>
              {acertos.map((s) => { const e = s.extra.entrega as Entrega; return (
                <div key={s.id} className="op-tr" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <span><b className="mono">{s.name}</b><small>{e.entregador} · {e.cobradoForma || "Dinheiro"} {brl(e.cobradoValor ?? e.aCobrar)}</small></span>
                  <button className="op-btn sm" onClick={() => acertar(s)}><Check /> Conferir</button>
                </div>
              ) })}
            </div>
          )}
        </div>

        {/* recebimento */}
        <div className="op-col">
          {!sale ? (
            <div className="op-card"><div className="op-empty" style={{ padding: "70px 20px" }}><ScanBarcode size={30} style={{ opacity: .5 }} /><p style={{ margin: "10px 0 4px", fontWeight: 600, color: "var(--ink)" }}>Selecione uma venda da fila</p><p style={{ margin: 0 }}>ou leia o código de barras da pré-venda com o leitor (<kbd>F2</kbd>).</p></div></div>
          ) : (
            <>
              <div className="op-card">
                <div className="op-ch">
                  <h2 style={{ textTransform: "none", letterSpacing: 0, fontSize: 14, color: "var(--ink)" }}><span className="op-num">{sale.name}</span> {sale.owner || "Consumidor final"}</h2>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{sale.extra?.tipo === "Entrega" ? <span className="op-tag blue plain"><Truck size={12} /> Entrega</span> : <span className="op-tag plain">{sale.extra?.tipo || "Balcão"}</span>}<button className="op-x" onClick={() => setSelId("")} aria-label="Fechar"><X /></button></span>
                </div>
                <div className="op-cb" style={{ paddingBottom: 0 }}><PrintBar sale={sale} unitName={activeUnit.name} tutor={client} only={["Pré-venda", "Conferência", "Duplicata", "Orçamento"]} /></div>
                <div className="op-cb" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--muted)", paddingBottom: 6 }}>
                  <span>Vendedor <b style={{ color: "var(--ink)" }}>{sale.professional}</b></span>
                  <span>Enviada {minutesSince(itemDate(sale), sale.extra?.enviadaAs || sale.time)}</span>
                  {sale.extra?.formaSugerida && <span>Documento <b style={{ color: "var(--or)" }}>{sale.extra.documento || sale.extra.formaSugerida}</b></span>}
                  {sale.extra?.plano && <span>Plano <b style={{ color: "var(--ink)" }}>{sale.extra.plano}</b></span>}
                  {sale.extra?.interno && <span>Nº interno <b className="mono" style={{ color: "var(--ink)" }}>{sale.extra.interno}</b></span>}
                  {sale.extra?.obs && <span>Obs. <b style={{ color: "var(--ink)" }}>{sale.extra.obs}</b></span>}
                </div>
                <div className="op-table">
                  <div className="op-tr op-th" style={{ gridTemplateColumns: "46px minmax(0,1fr) 90px 70px 100px 112px" }}><span>Qtd.</span><span>Produto</span><span className="r">Unitário</span><span className="r">Desc.</span><span className="r">Total</span><span className="r" title="Estoque agora → após receber">Estoque</span></div>
                  {itens.map((l, i) => {
                    const st = l.tipo === "Produto" && l.ref ? data.estoque.find((x) => x.id === l.ref) : undefined
                    const now = st?.quantity ?? 0
                    const after = now - l.qtd
                    return <div key={i} className="op-tr" style={{ gridTemplateColumns: "46px minmax(0,1fr) 90px 70px 100px 112px" }}><span className="num">{l.qtd}</span><span>{l.descricao.replace(/ • lote \d+/, "")}{l.obs ? <small>Obs.: {l.obs}</small> : null}</span><span className="r num muted">{brl(l.preco)}</span><span className="r num muted">{l.desconto ? `${l.desconto}%` : "—"}</span><b className="r num">{brl(lineTotal(l))}</b><span className="r num" style={{ fontSize: 12 }}>{st ? <>{now} → <b style={{ color: after <= 0 ? "var(--red, #b4322a)" : after < (st.minimum || 0) ? "var(--amber, #c98a1b)" : "var(--green, #2b7a4b)" }}>{Math.max(0, after)}</b></> : <span className="muted">serviço</span>}</span></div>
                  })}
                </div>
                {itens.some((l) => l.tipo === "Produto") && <div className="op-cb" style={{ paddingTop: 8, paddingBottom: 0 }}><div className="op-note info"><Package size={14} /> Ao concluir o recebimento, {itens.filter((l) => l.tipo === "Produto").reduce((a, l) => a + l.qtd, 0)} un. saem do estoque automaticamente.</div></div>}
                <div className="op-cb op-sum" style={{ borderTop: "1px solid var(--line2)" }}>
                  <div><span>Subtotal</span><b>{brl(sale.extra?.subtotal || 0)}</b></div>
                  {!!sale.extra?.desconto && <div><span>Desconto</span><b>− {brl(sale.extra.desconto)}</b></div>}
                  {sale.extra?.descontoLiberado?.por && <div><span className="muted" style={{ fontSize: 12 }}>Desconto de {Number(sale.extra.descontoLiberado.pct || sale.extra.descontoPct || 0).toFixed(1).replace(".", ",")}% liberado por</span><b style={{ fontSize: 12 }}>{sale.extra.descontoLiberado.por}</b></div>}
                  {!!sale.extra?.taxaEntrega && <div><span>Taxa de entrega</span><b>{brl(sale.extra.taxaEntrega)}</b></div>}
                </div>
                <div className="op-total"><span>Total a receber</span><b>{brl(total)}</b></div>
              </div>

              <div className="op-card">
                <div className="op-ch"><h2><Banknote /> Recebimento</h2><span className="muted" style={{ fontSize: 12 }}>teclas <kbd>1</kbd>–<kbd>0</kbd> escolhem a forma</span></div>
                <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="op-chips" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
                    {FORMAS.map((f, i) => <button key={f} className={`op-chip ${forma === f ? "on" : ""}`} onClick={() => { setForma(f); setParcelas(1); valorRef.current?.focus() }}>{i < 10 && <kbd>{i === 9 ? 0 : i + 1}</kbd>}{f}</button>)}
                  </div>
                  {forma === "Cheque" && (
                    <div className="op-fields" style={{ gridTemplateColumns: "1fr 1fr 150px" }}>
                      <label className="op-f"><span>Nº do cheque *</span><input className="op-in lg" value={cheque.numero} onChange={(e) => setCheque({ ...cheque, numero: e.target.value })} /></label>
                      <label className="op-f"><span>Banco</span><input className="op-in lg" value={cheque.banco} onChange={(e) => setCheque({ ...cheque, banco: e.target.value })} /></label>
                      <label className="op-f"><span>Bom para</span><input className="op-in lg" type="date" value={cheque.bomPara} onChange={(e) => setCheque({ ...cheque, bomPara: e.target.value })} /></label>
                    </div>
                  )}
                  {forma === "Convênio" && (
                    <div className="op-fields" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      <label className="op-f"><span>Convênio *</span><select className="op-in lg" value={conv.nome} onChange={(e) => setConv({ ...conv, nome: e.target.value })}><option value="">Escolha…</option>{convenios.map((c) => <option key={c}>{c}</option>)}</select></label>
                      <label className="op-f"><span>Nº de autorização</span><input className="op-in lg" value={conv.autorizacao} onChange={(e) => setConv({ ...conv, autorizacao: e.target.value })} /></label>
                    </div>
                  )}
                  {forma === "Transferência" && <div className="op-note info"><Check /> Confira a transferência (TED/DOC) no extrato do banco antes de adicionar.</div>}
                  {forma === "Vale-crédito" && <div className="op-note info"><Check /> Abate do crédito que o cliente tem na loja (devoluções, adiantamentos).</div>}
                  {(forma === "Crédito" || PARCELADAS.includes(forma)) && (
                    <div className="op-fields" style={{ gridTemplateColumns: PARCELADAS.includes(forma) ? "90px minmax(0,1fr) 120px" : "minmax(0,1fr)" }}>
                      {forma === "Crédito" && <label className="op-f"><span>Parcelas</span><select className="op-in lg" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}x de {brl(typed / (i + 1))}</option>)}</select></label>}
                      {PARCELADAS.includes(forma) && <>
                        <label className="op-f"><span>Parcelas</span><input className="op-in lg r" value={parcelas} onChange={(e) => setParcelas(Math.max(1, Math.min(12, Number(e.target.value.replace(/\D/g, "")) || 1)))} /></label>
                        <label className="op-f"><span>1º vencimento</span><input className="op-in lg" type="date" value={venc1} onChange={(e) => setVenc1(e.target.value)} /></label>
                        <label className="op-f"><span>Intervalo (dias)</span><input className="op-in lg r" value={intervalo} onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 30))} /></label>
                      </>}
                    </div>
                  )}
                  <div className="op-fields" style={{ gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "end" }}>
                    <label className="op-f"><span>{forma === "Dinheiro" ? "Valor recebido (troco automático)" : "Valor"}</span><input ref={valorRef} className="op-in lg r" inputMode="decimal" placeholder={brl(rest)} value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (rest) addPay(); else concluir() } }} /></label>
                    <button className="op-btn lg" onClick={addPay} disabled={!rest}>Adicionar <kbd>Enter</kbd></button>
                  </div>
                  {PARCELADAS.includes(forma) && rest > 0 && <div className="op-sum" style={{ fontSize: 12.5 }}>{parcelasDup.map((d, i) => <div key={d + i}><span className="mono">{forma === "Boleto" ? "BOL" : "DUP"} {sale.name.slice(4)}-{i + 1}/{parcelas}</span><span>venc. {fmtDate(d)}</span><b>{brl(typed / parcelas)}</b></div>)}</div>}
                  {forma === "Fiado" && client && <div className={`op-note ${fiadoBlock ? "bad" : "info"}`}>{fiadoBlock ? <AlertTriangle /> : <Check />} {fiadoBlock || `${client.name}: em aberto ${brl(fiadoAberto)} de ${brl(limiteCli)}. Vence em ${fmtDate(addMonths(todayISO(), 1))}.`}</div>}
                  {forma === "Fiado" && !client && <div className="op-note bad"><AlertTriangle /> Venda sem cliente identificado não pode ser anotada.</div>}
                  {forma === "Pix" && <div className="op-note info"><Check /> Confirme o Pix no aplicativo do banco antes de adicionar.</div>}

                  {pays.length > 0 && (
                    <div className="op-card">
                      {pays.map((p, i) => (
                        <div key={i} className="op-tr" style={{ gridTemplateColumns: "minmax(0,1fr) 120px 28px" }}>
                          <span><strong>{p.forma}</strong>{p.parcelas > 1 && <span className="muted"> · {p.parcelas}x</span>}{p.detalhe && <span className="muted"> · {p.detalhe}</span>}{p.troco ? <span className="muted"> · troco {brl(p.troco)}</span> : null}{TAXA[p.forma] ? <small>taxa da maquininha {TAXA[p.forma]}%</small> : null}</span>
                          <b className="r num">{brl(p.valor)}</b>
                          <button className="op-x" onClick={() => setPays((c) => c.filter((_, k) => k !== i))} aria-label="Remover"><X /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div className="op-card op-cb"><span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>RECEBIDO</span><div className="op-big">{brl(paid)}</div></div>
                    <div className="op-card op-cb" style={{ borderColor: rest ? "var(--amber)" : undefined }}><span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>FALTA</span><div className="op-big" style={{ color: rest ? "var(--amber)" : "var(--green)" }}>{brl(rest)}</div></div>
                    <div className="op-card op-cb"><span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>TROCO</span><div className="op-big" style={{ color: troco ? "var(--green)" : undefined }}>{brl(troco)}</div></div>
                  </div>
                  <button className="op-btn ok lg" disabled={rest > 0} onClick={concluir}><Check /> Concluir recebimento <kbd>F10</kbd></button>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ent && <button className="op-btn grow" onClick={liberarCobrarNaEntrega} title="O entregador cobra na entrega"><Truck /> Cobrar na entrega</button>}
                    <button className="op-btn grow dan" onClick={() => setReturning(true)}><Undo2 /> Devolver ao vendedor</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* resumo */}
        <div className="op-col op-sticky">
          <div className="op-card">
            <div className="op-ch"><h2>Recebido neste caixa</h2><span className="muted num" style={{ fontSize: 12 }}>{resumo.n} vendas</span></div>
            <div className="op-cb op-sum">
              {resumo.porForma.map(([f, v]) => <div key={f}><span>{f}</span><b className={v ? "" : "muted"}>{brl(v)}</b></div>)}
            </div>
            <div className="op-total"><span>Total</span><b style={{ fontSize: 20 }}>{brl(totalRecebido)}</b></div>
          </div>
          <div className="op-card">
            <div className="op-ch"><h2>Gaveta</h2></div>
            <div className="op-cb op-sum" style={{ fontSize: 12.5 }}>
              <div><span>Troco inicial ({caixa.time})</span><b>{brl(caixa.amountValue || 0)}</b></div>
              <div><span>Dinheiro recebido</span><b>{brl(resumo.porForma[0][1])}</b></div>
              {movs.map((m, i) => <div key={i}><span>{m.tipo} · <span className="muted">{m.motivo} {m.hora}</span></span><b style={{ color: m.tipo === "Sangria" ? "var(--red)" : "var(--green)" }}>{m.tipo === "Sangria" ? "−" : "+"}{brl(m.valor)}</b></div>)}
              <div style={{ borderTop: "1px solid var(--line2)", paddingTop: 7 }}><span style={{ fontWeight: 700 }}>Esperado na gaveta</span><b>{brl(dinheiroEsperado)}</b></div>
            </div>
          </div>
          <div className="op-keys"><span><kbd>F2</kbd> buscar</span><span><kbd>1</kbd>–<kbd>0</kbd> forma</span><span><kbd>Enter</kbd> adicionar</span><span><kbd>F10</kbd> concluir</span></div>
        </div>
      </div>}

      {returning && sale && (
        <Layer className="op-modal-layer" onMouseDown={() => setReturning(false)}>
          <div className="op-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2>Devolver {sale.name} ao vendedor</h2></div>
            <div className="op-cb"><p style={{ margin: 0 }}>A venda sai da fila e volta para {sale.professional} corrigir.</p><label className="op-f"><span>Motivo</span><input className="op-in" autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu de um item" /></label></div>
            <div className="foot"><button className="op-btn" onClick={() => setReturning(false)}>Voltar</button><button className="op-btn pri" onClick={devolver}>Devolver</button></div>
          </div>
        </Layer>
      )}
      {mov && (
        <Layer className="op-modal-layer" onMouseDown={() => setMov(null)}>
          <div className="op-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2>{mov.tipo}</h2></div>
            <div className="op-cb">
              <p style={{ margin: 0 }} className="muted">{mov.tipo === "Sangria" ? "Retirada de dinheiro da gaveta." : "Entrada de dinheiro para troco."}</p>
              <label className="op-f"><span>Valor (R$)</span><input className="op-in lg r" autoFocus value={mov.valor} onChange={(e) => setMov({ ...mov, valor: e.target.value })} /></label>
              <label className="op-f"><span>Motivo</span><input className="op-in" value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") salvarMov() }} /></label>
              {mov.tipo === "Sangria" && <label className="op-f"><span>Senha do gerente</span><input className="op-in" type="password" value={mov.senha || ""} onChange={(e) => setMov({ ...mov, senha: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") salvarMov() }} /></label>}
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Na gaveta agora: {brl(dinheiroEsperado)}. Um comprovante é impresso para assinatura.</p>
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setMov(null)}>Cancelar</button><button className="op-btn pri" onClick={salvarMov}>Registrar</button></div>
          </div>
        </Layer>
      )}
      {fechando && (
        <Layer className="op-modal-layer" onMouseDown={() => setFechando(false)}>
          <div className="op-modal op-fechar" style={{ width: "min(420px,100%)" }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2><Lock /> Fechamento do caixa {caixa.name}</h2></div>
            <div className="op-cb">
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Conte o dinheiro da gaveta e confira Pix e cartões no extrato do banco e na maquininha.</p>
              <div className="op-card">
                <div className="op-tr op-th" style={{ gridTemplateColumns: "minmax(0,1fr) 100px 120px 100px" }}><span>Forma</span><span className="r">Esperado</span><span className="r">Contado</span><span className="r">Diferença</span></div>
                {esperadoForma.map(([f, e]) => { const c = contadoDe(f); const d = Number.isNaN(c) ? NaN : c - e; return (
                  <div key={f} className="op-tr" style={{ gridTemplateColumns: "minmax(0,1fr) 100px 120px 100px" }}>
                    <span>{f}</span><b className="r num">{brl(e)}</b>
                    <input className="op-in r" style={{ height: 32 }} autoFocus={f.startsWith("Dinheiro")} placeholder={f.startsWith("Dinheiro") ? "obrigatório" : brl(e)} value={f.startsWith("Dinheiro") ? contado : conf[f]} onChange={(ev) => f.startsWith("Dinheiro") ? setContado(ev.target.value) : setConf({ ...conf, [f]: ev.target.value })} />
                    <b className="r num" style={{ color: Number.isNaN(d) ? "var(--muted)" : Math.abs(d) < 0.01 ? "var(--green)" : "var(--red)" }}>{Number.isNaN(d) ? "—" : brl(d)}</b>
                  </div>
                ) })}
                {["Duplicata", "Boleto", "Fiado", "Convênio", "Vale-crédito"].map((f) => <div key={f} className="op-tr" style={{ gridTemplateColumns: "minmax(0,1fr) 100px 120px 100px" }}><span className="muted">{f} (a receber)</span><b className="r num muted">{brl(resumo.porForma.find(([x]) => x === f)?.[1] || 0)}</b><span className="muted r">não conta</span><span /></div>)}
              </div>
              {contado && (() => { const d = esperadoForma.reduce((a, [f, e]) => { const c = contadoDe(f); return a + (Number.isNaN(c) ? 0 : c - e) }, 0); return <div className={`op-note ${Math.abs(d) < 0.01 ? "ok" : "bad"}`}>{Math.abs(d) < 0.01 ? <Check /> : <AlertTriangle />} {Math.abs(d) < 0.01 ? "Caixa conferido, sem diferença." : `${d > 0 ? "Sobra" : "Falta"} total de ${brl(Math.abs(d))}. Fica registrada no fechamento.`}</div> })()}
              {fila.length > 0 && <div className="op-note warn"><AlertTriangle /> {fila.length} vendas continuam aguardando pagamento e ficam para o próximo caixa.</div>}
            </div>
            <div className="foot"><button className="op-btn" onClick={() => printHtml("Prévia", relatorioHtml(parseMoney(contado)))}><Printer /> Prévia</button><button className="op-btn pri" disabled={!contado} onClick={fechar}><Lock /> Fechar e imprimir</button></div>
          </div>
        </Layer>
      )}
      {done && (
        <Layer className="op-modal-layer">
          <div className="op-modal">
            <div className="op-cb" style={{ alignItems: "center", textAlign: "center", padding: "26px 22px" }}>
              <span className="op-av" style={{ width: 52, height: 52, background: "var(--green-soft)", color: "var(--green)" }}><Check size={24} /></span>
              <span className="op-num" style={{ fontSize: 16 }}>{done.name}</span>
              <h3 style={{ margin: 0, fontSize: 18 }}>Recebimento concluído</h3>
              <p className="muted" style={{ margin: 0 }}>{brl(done.amountValue || 0)} · {(done.extra?.pagamentos || []).map((p: Pay) => p.forma).join(" + ")}.{done.extra?.tipo === "Entrega" ? " A entrega foi liberada para separação." : done.extra?.tipo === "Retirada" ? " Itens separados para retirada." : ""}</p>
              {(done.extra?.pagamentos || []).some((p: Pay) => p.troco) && <div className="op-big" style={{ color: "var(--green)" }}>Troco {brl((done.extra?.pagamentos || []).reduce((a: number, p: Pay) => a + (p.troco || 0), 0))}</div>}
              <div style={{ width: "100%", textAlign: "left", marginTop: 6 }}><div className="op-sec" style={{ marginBottom: 8 }}>Imprimir</div><PrintBar sale={done} unitName={activeUnit.name} tutor={data.tutores.find((t) => t.id === done.ownerId)} /></div>
            </div>
            <div className="foot" style={{ justifyContent: "center" }}>

              <button className="op-btn pri" autoFocus onClick={() => { setDone(null); scanRef.current?.focus() }}>Próxima <kbd>Enter</kbd></button>
            </div>
          </div>
        </Layer>
      )}
      {estorno && (
        <Layer className="op-modal-layer" onMouseDown={() => setEstorno(null)}>
          <div className="op-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2><RotateCcw /> Estornar recebimento de {estorno.name}</h2></div>
            <div className="op-cb">
              <p style={{ margin: 0 }}>{brl(estorno.extra?.pago || 0)} volta ao cliente, os produtos voltam ao estoque e a venda retorna para a fila do caixa.</p>
              <label className="op-f"><span>Motivo</span><input className="op-in" autoFocus value={estMotivo} onChange={(e) => setEstMotivo(e.target.value)} placeholder="Ex.: forma de pagamento errada" /></label>
              <label className="op-f"><span>Senha do gerente</span><input className="op-in" type="password" value={estSenha} onChange={(e) => setEstSenha(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") estornar() }} /></label>
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setEstorno(null)}>Voltar</button><button className="op-btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={estornar}>Estornar</button></div>
          </div>
        </Layer>
      )}
      {toast && <Layer className="op-toast"><Check /> {toast}</Layer>}
      </div>
    </Page>
  )
}
