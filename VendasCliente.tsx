import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, Check, Lock, Eye, MessageCircle, Pencil, Plus, Printer, RotateCcw, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../store"
import { addDays, brl, Confirm, fmtDate, itemDate, Modal, parseMoney, todayISO } from "./ui"
import { printDoc } from "./printDoc"
import { PrintBar } from "./PrintMenu"
import { lineTotal, nowTime, stamp, type Line, type Pay } from "./vendasShared"

/*
 * Vendas por cliente (fiado / notinha, duplicata, boleto): usado no Caixa e no Financeiro.
 * Escolhe o cliente, vê as vendas dele e faz o CRUD: ver, marcar como paga (total ou parcial),
 * editar vencimento e observação, excluir. A baixa também fecha as contas a receber no Financeiro.
 */
export const PRAZO_CLIENTE = ["Fiado", "Duplicata", "Boleto"]
type Fin = { quitados: string[]; ajustados: { id: string; de: number }[]; criados: string[] }
type Rec = { id?: string; data: string; hora: string; forma: string; valor: number; por: string; encargos?: number; statusAntes?: string; fin?: Fin }
const r2 = (v: number) => Math.round(v * 100) / 100
const recebidoConta = (s: Item) => ((s.extra?.recebimentosConta || []) as Rec[]).reduce((a, r) => a + r.valor, 0)
const pays = (s: Item) => (s.extra?.pagamentos || []) as Pay[]
const naFila = (s: Item) => /aguardando pagamento|devolvida/i.test(s.status)
const naEntrega = (s: Item) => /entrega/i.test(s.status) && !pays(s).length

/** Quanto o cliente ainda deve desta venda. */
export function saldoVenda(s: Item) {
  if (s.kind !== "Venda" || /cancel/i.test(s.status) || s.extra?.quitada || naFila(s) || naEntrega(s)) return 0
  const total = s.amountValue || 0
  const pago = Number(s.extra?.pago || 0)
  const prazo = pays(s).filter((p) => PRAZO_CLIENTE.includes(p.forma)).reduce((a, p) => a + p.valor, 0)
  return Math.max(0, r2(total - pago + prazo - recebidoConta(s)))
}
/** Fiado (notinha) ainda em aberto da venda: entra no limite de crédito do cliente. */
export function fiadoAbertoVenda(s: Item) {
  if (/cancel/i.test(s.status) || s.extra?.quitada) return 0
  const fiado = pays(s).filter((p) => p.forma === "Fiado").reduce((a, p) => a + p.valor, 0)
  return Math.max(0, r2(fiado - recebidoConta(s)))
}
const vencimento = (s: Item) => String(s.extra?.vencimentoConta || pays(s).flatMap((p) => (PRAZO_CLIENTE.includes(p.forma) ? p.vencimentos || [] : [])).sort()[0] || s.dueDate || addDays(itemDate(s), 30))
const documento = (s: Item) => {
  const f = pays(s).find((p) => PRAZO_CLIENTE.includes(p.forma))?.forma
  if (f) return f === "Fiado" ? "Fiado (notinha)" : f
  if (saldoVenda(s) > 0) return "A receber"
  return [...new Set(pays(s).map((p) => p.forma))].join(" + ") || "—"
}
function situacao(s: Item, hoje: string): [string, string] {
  if (/cancel/i.test(s.status)) return ["Cancelada", "gray"]
  if (naFila(s)) return ["Na fila do caixa", "blue"]
  if (naEntrega(s)) return ["Cobrar na entrega", "blue"]
  const saldo = saldoVenda(s)
  if (saldo <= 0) return ["Paga", "green"]
  if (vencimento(s) < hoje) return ["Vencida", "red"]
  if (recebidoConta(s) > 0 || /parcial/i.test(s.status)) return ["Parcial", "amber"]
  return ["Em aberto", "amber"]
}
/** Lançamentos do Financeiro que pertencem à venda. */
const daVenda = (f: Item, s: Item) => f.extra?.vendaId === s.id || [`${s.name} •`, `DUP ${s.name} •`, `BOL ${s.name} •`].some((p) => f.name.startsWith(p))
const pendenteFin = (f: Item) => !/receb|^pago|cancel|estorn/i.test(f.status)
const FORMAS_BAIXA = ["Dinheiro", "Pix", "Débito", "Crédito", "Transferência", "Boleto", "Cheque"]
type Filtro = "aberto" | "pagas" | "todas" | "recebimentos"
/** Multa de 2% + juros de 1% ao mês (pro rata dia) sobre o saldo vencido. */
export const encargosAtraso = (saldo: number, venc: string, hoje: string) => {
  const dias = Math.max(0, Math.round((new Date(`${hoje}T12:00:00`).getTime() - new Date(`${venc}T12:00:00`).getTime()) / 86400000))
  return dias > 0 ? r2(saldo * 0.02 + saldo * 0.01 * (dias / 30)) : 0
}
const diasAtraso = (venc: string, hoje: string) => Math.max(0, Math.round((new Date(`${hoje}T12:00:00`).getTime() - new Date(`${venc}T12:00:00`).getTime()) / 86400000))

export default function VendasCliente({ onRecebido, onEstornado, origem, modo = "completo" }: { onRecebido?: (lista: { s: Item; forma: string; valor: number }[]) => void; onEstornado?: (s: Item, forma: string, valor: number, motivo: string) => void; origem: "Caixa" | "Financeiro"; modo?: "completo" | "rapido" }) {
  const completo = modo === "completo"
  const { data, activeUnit, profile, addItem, updateItem, deleteItem } = useVetFlow()
  const navigate = useNavigate()
  const operador = profile?.displayName || "Recepção"
  const hoje = todayISO()
  const sales = useMemo(() => (data.vendas || []).filter((s) => s.kind === "Venda" && s.ownerId), [data.vendas])
  const [q, setQ] = useState("")
  const [soAberto, setSoAberto] = useState(true)
  const [cliId, setCliId] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("aberto")
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [verId, setVerId] = useState("")
  const [pagar, setPagar] = useState<{ ids: string[]; forma: string; data: string; valor: string; encargos: boolean } | null>(null)
  const [docFiltro, setDocFiltro] = useState("")
  const [recibo, setRecibo] = useState<{ sale: Item; rec: Rec }[] | null>(null)
  const [desfazer, setDesfazer] = useState<{ sale: Item; rec: Rec } | null>(null)
  const [credito, setCredito] = useState<{ limite: string; bloqueado: boolean } | null>(null)
  const [editar, setEditar] = useState<{ id: string; venc: string; obs: string } | null>(null)
  const [excluir, setExcluir] = useState<Item | null>(null)
  const [toast, setToast] = useState("")
  const avisar = (t: string) => { setToast(t); window.setTimeout(() => setToast(""), 3400) }

  /* clientes com vendas */
  const clientes = useMemo(() => {
    const map = new Map<string, { t: Item; aberto: number; vencido: number; n: number; abertas: number; ultima: string }>()
    for (const s of sales) {
      const t = data.tutores.find((x) => x.id === s.ownerId)
      if (!t) continue
      const c = map.get(t.id) || { t, aberto: 0, vencido: 0, n: 0, abertas: 0, ultima: "" }
      const saldo = saldoVenda(s)
      c.n++
      c.aberto = r2(c.aberto + saldo)
      if (saldo > 0) { c.abertas++; if (vencimento(s) < hoje) c.vencido = r2(c.vencido + saldo) }
      if (itemDate(s) > c.ultima) c.ultima = itemDate(s)
      map.set(t.id, c)
    }
    return [...map.values()]
  }, [sales, data.tutores, hoje])
  const termo = normalize(q.trim())
  const porNumero = termo ? sales.find((s) => normalize(s.name) === termo || s.name.replace(/\D/g, "").replace(/^0+/, "") === q.replace(/\D/g, "").replace(/^0+/, "") && /\d{2,}/.test(q)) : undefined
  const lista = clientes
    .filter((c) => (termo ? normalize(`${c.t.name} ${c.t.cpf || ""} ${c.t.phone || ""}`).includes(termo) || (porNumero && porNumero.ownerId === c.t.id) : !soAberto || c.aberto > 0))
    .sort((a, b) => b.aberto - a.aberto || a.t.name.localeCompare(b.t.name))
  const cli = clientes.find((c) => c.t.id === cliId)
  const escolher = (id: string, vendaId = "") => { setCliId(id); setMarcadas(new Set()); setVerId(vendaId); if (vendaId) setFiltro("todas") }

  const vendasCli = useMemo(() => {
    if (!cli) return []
    return sales
      .filter((s) => s.ownerId === cli.t.id)
      .filter((s) => (filtro === "aberto" ? saldoVenda(s) > 0 : filtro === "pagas" ? saldoVenda(s) <= 0 && !/cancel/i.test(s.status) && !naFila(s) && !naEntrega(s) : true))
      .filter((s) => !docFiltro || documento(s).startsWith(docFiltro))
      .sort((a, b) => (filtro === "aberto" ? vencimento(a).localeCompare(vencimento(b)) : `${itemDate(b)}${b.time}`.localeCompare(`${itemDate(a)}${a.time}`)))
  }, [sales, cli, filtro, docFiltro])
  const recebimentos = useMemo(() => {
    if (!cli) return [] as { sale: Item; rec: Rec; i: number; ultimo: boolean }[]
    return sales.filter((s) => s.ownerId === cli.t.id).flatMap((s) => { const rs = (s.extra?.recebimentosConta || []) as Rec[]; return rs.map((rec, i) => ({ sale: s, rec, i, ultimo: i === rs.length - 1 })) })
      .sort((a, b) => `${b.rec.data}${b.rec.hora}`.localeCompare(`${a.rec.data}${a.rec.hora}`))
  }, [sales, cli])
  const abertasCli = vendasCli.filter((s) => saldoVenda(s) > 0)
  const marcadasLista = vendasCli.filter((s) => marcadas.has(s.id) && saldoVenda(s) > 0)
  const totalMarcadas = r2(marcadasLista.reduce((a, s) => a + saldoVenda(s), 0))
  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ver = sales.find((s) => s.id === verId && s.ownerId === cliId)

  /* marcar como paga: total ou parcial; fecha as contas a receber da venda no Financeiro */
  const abrirPagar = (ids: string[]) => {
    const alvo = sales.filter((s) => ids.includes(s.id) && saldoVenda(s) > 0)
    if (!alvo.length) { avisar("Não há saldo em aberto nas vendas escolhidas."); return }
    setPagar({ ids: alvo.map((s) => s.id), forma: "Dinheiro", data: hoje, valor: "", encargos: false })
  }
  const confirmarPagar = () => {
    if (!pagar) return
    const alvo = sales.filter((s) => pagar.ids.includes(s.id))
    const unica = alvo.length === 1
    const digitado = parseMoney(pagar.valor)
    if (unica && pagar.valor.trim() && (!digitado || digitado <= 0)) { avisar("Informe um valor válido."); return }
    const stampId = Date.now()
    let total = 0
    const feitos: { sale: Item; rec: Rec }[] = []
    const entradas: { s: Item; forma: string; valor: number }[] = []
    alvo.forEach((s, i) => {
      const saldo = saldoVenda(s)
      const v = r2(unica && digitado ? Math.min(digitado, saldo) : saldo)
      if (v <= 0) return
      const enc = unica && pagar.encargos ? encargosAtraso(saldo, vencimento(s), pagar.data) : 0
      total = r2(total + v + enc)
      const fin: Fin = { quitados: [], ajustados: [], criados: [] }
      const novoFin = (sufixo: string, nome: string, valor: number) => {
        const id = `${activeUnit.id}-financeiro-rc-${stampId}-${i}-${sufixo}`
        addItem("financeiro", { id, name: `${s.name} • ${nome}`, subtitle: s.owner || "", owner: s.owner, category: "Receita", status: "Recebido", date: pagar.data, dueDate: pagar.data, amountValue: valor, extra: { vendaId: s.id, forma: pagar.forma, dataPagamento: pagar.data } })
        fin.criados.push(id)
      }
      let resto = v
      const abertos = data.financeiro.filter((f) => f.category === "Receita" && pendenteFin(f) && daVenda(f, s) && (f.extra?.vendaId === s.id || /fiado|duplicata|boleto|^dup |^bol /i.test(f.name))).sort((a, b) => itemDate(a).localeCompare(itemDate(b)))
      for (const f of abertos) {
        if (resto <= 0.005) break
        const amt = f.amountValue || 0
        if (amt <= resto + 0.005) {
          updateItem("financeiro", f.id, { status: "Recebido", extra: { ...(f.extra || {}), dataPagamento: pagar.data, forma: pagar.forma, situacao: "Pago / recebido", vendaId: s.id } })
          fin.quitados.push(f.id)
          resto = r2(resto - amt)
        } else {
          updateItem("financeiro", f.id, { amountValue: r2(amt - resto), notes: `Saldo após recebimento parcial de ${brl(resto)} em ${fmtDate(pagar.data)}`, extra: { ...(f.extra || {}), vendaId: s.id } })
          fin.ajustados.push({ id: f.id, de: amt })
          novoFin("p", `Recebimento de conta (${pagar.forma})`, resto)
          resto = 0
        }
      }
      if (resto > 0.005) novoFin("r", `Recebimento de conta (${pagar.forma})`, resto)
      if (enc > 0) novoFin("j", `Multa e juros por atraso (${pagar.forma})`, enc)
      const rec: Rec = { id: `rc-${stampId}-${i}`, data: pagar.data, hora: nowTime(), forma: pagar.forma, valor: v, por: operador, encargos: enc || undefined, statusAntes: s.status, fin }
      const quit = saldo - v <= 0.005
      updateItem("vendas", s.id, {
        status: quit ? (/conclu/i.test(s.status) ? s.status : "Paga") : "Parcialmente paga",
        extra: { ...s.extra, recebimentosConta: [...((s.extra?.recebimentosConta || []) as Rec[]), rec], quitada: quit || undefined, quitadaEm: quit ? pagar.data : undefined, historico: [...(s.extra?.historico || []), `${stamp()} · ${quit ? "Marcada como paga" : "Recebimento parcial"} no ${origem} por ${operador}: ${pagar.forma} ${brl(v)}${enc ? ` + encargos ${brl(enc)}` : ""}${quit ? "" : ` (resta ${brl(saldo - v)})`}`] },
      })
      feitos.push({ sale: s, rec })
      entradas.push({ s, forma: pagar.forma, valor: r2(v + enc) })
    })
    avisar(unica ? `${alvo[0].name}: recebido ${brl(total)} em ${pagar.forma}.` : `${alvo.length} vendas marcadas como pagas: ${brl(total)} em ${pagar.forma}.`)
    if (entradas.length) onRecebido?.(entradas)
    setPagar(null); setMarcadas(new Set())
    if (completo && feitos.length) setRecibo(feitos)
  }

  /* desfazer um recebimento lançado por engano (só o último de cada venda) */
  const confirmarDesfazer = (motivo: string) => {
    if (!desfazer) return
    const { sale: s, rec } = desfazer
    const atual = sales.find((x) => x.id === s.id)
    if (!atual) { setDesfazer(null); return }
    const recs = ((atual.extra?.recebimentosConta || []) as Rec[]).filter((r) => (rec.id ? r.id !== rec.id : !(r.data === rec.data && r.hora === rec.hora && r.valor === rec.valor)))
    const fin = rec.fin
    if (fin) {
      fin.quitados.forEach((id) => { const f = data.financeiro.find((x) => x.id === id); if (f) updateItem("financeiro", id, { status: "A receber", extra: { ...(f.extra || {}), dataPagamento: undefined, situacao: undefined } }) })
      fin.ajustados.forEach(({ id, de }) => updateItem("financeiro", id, { amountValue: de, notes: undefined }))
      fin.criados.forEach((id) => deleteItem("financeiro", id))
    } else {
      data.financeiro.filter((f) => daVenda(f, s) && /recebimento de conta/i.test(f.name) && f.date === rec.data && Math.abs((f.amountValue || 0) - rec.valor) < 0.01).slice(0, 1).forEach((f) => deleteItem("financeiro", f.id))
    }
    updateItem("vendas", s.id, { status: recs.length ? "Parcialmente paga" : rec.statusAntes && !/^paga$/i.test(rec.statusAntes) ? rec.statusAntes : "A receber", extra: { ...atual.extra, recebimentosConta: recs, quitada: undefined, quitadaEm: undefined, historico: [...(atual.extra?.historico || []), `${stamp()} · Recebimento de ${brl(rec.valor)} (${rec.forma}, ${fmtDate(rec.data)}) desfeito no ${origem} por ${operador}: ${motivo}`] } })
    onEstornado?.(s, rec.forma, r2(rec.valor + (rec.encargos || 0)), motivo)
    avisar(`Recebimento de ${s.name} desfeito. A venda voltou a ficar em aberto.`)
    setDesfazer(null)
  }

  const imprimirRecibo = (lista: { sale: Item; rec: Rec }[]) => {
    if (!lista.length) return
    const tot = lista.reduce((a, x) => a + x.rec.valor + (x.rec.encargos || 0), 0)
    printDoc({
      title: "Recibo de pagamento",
      subtitle: `${fmtDate(lista[0].rec.data)} às ${lista[0].rec.hora}`,
      unit: activeUnit,
      issuedBy: operador,
      meta: [["Cliente", lista[0].sale.owner || "—"], ["Forma", lista[0].rec.forma], ["Recebido por", lista[0].rec.por]],
      kpis: [["Valor recebido", brl(tot)]],
      sections: [{ title: "Vendas pagas", head: ["Venda", "Data da venda", "Valor pago", "Encargos", "Ainda em aberto"], align: ["l", "l", "r", "r", "r"], rows: lista.map(({ sale, rec }) => { const atual = sales.find((x) => x.id === sale.id) || sale; return [sale.name, fmtDate(itemDate(sale)), brl(rec.valor), brl(rec.encargos || 0), brl(saldoVenda(atual))] }), total: ["Total", "", brl(lista.reduce((a, x) => a + x.rec.valor, 0)), brl(lista.reduce((a, x) => a + (x.rec.encargos || 0), 0)), ""] },
        { note: `Recebemos de ${lista[0].sale.owner || "cliente"} a importância de ${brl(tot)} referente às vendas acima.` }],
      signatures: ["Recebido por"],
    })
  }

  const cobrarWhats = () => {
    if (!cli) return
    const fone = String(cli.t.phone || "").replace(/\D/g, "")
    if (fone.length < 10) { avisar("Cliente sem telefone válido no cadastro."); return }
    const abertas = sales.filter((s) => s.ownerId === cli.t.id && saldoVenda(s) > 0)
    const msg = `Olá, ${cli.t.name.split(" ")[0]}! Aqui é da ${activeUnit.name}. Consta em aberto ${brl(cli.aberto)} (${abertas.map((s) => `${s.name} venc. ${fmtDate(vencimento(s))}`).join("; ")}). Qualquer dúvida, estamos à disposição.`
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener")
    addItem("comunicacao", { name: "Cobrança de vendas em aberto", owner: cli.t.name, ownerId: cli.t.id, phone: cli.t.phone, subtitle: `Cobrança • ${cli.t.name}`, status: "Enviada", date: hoje, time: nowTime(), extra: { mensagem: msg, canal: "WhatsApp" } })
    avisar("Mensagem de cobrança aberta no WhatsApp.")
  }
  const salvarCredito = () => {
    if (!cli || !credito) return
    const lim = parseMoney(credito.limite)
    updateItem("tutores", cli.t.id, { extra: { ...(cli.t.extra || {}), limiteCredito: lim >= 0 ? lim : 0, bloqueadoFiado: credito.bloqueado || undefined } })
    avisar(`Crédito de ${cli.t.name}: limite ${brl(lim)}${credito.bloqueado ? ", fiado bloqueado" : ""}.`)
    setCredito(null)
  }

  const salvarEdicao = () => {
    if (!editar) return
    const s = sales.find((x) => x.id === editar.id)
    if (!s) return
    const mudou = [editar.venc !== vencimento(s) ? `vencimento ${fmtDate(editar.venc)}` : "", editar.obs !== String(s.extra?.obs || "") ? "observação" : ""].filter(Boolean)
    updateItem("vendas", s.id, { extra: { ...s.extra, vencimentoConta: editar.venc, obs: editar.obs, historico: [...(s.extra?.historico || []), `${stamp()} · Editada no ${origem} por ${operador}${mudou.length ? `: ${mudou.join(", ")}` : ""}`] } })
    data.financeiro.filter((f) => daVenda(f, s) && pendenteFin(f) && f.category === "Receita" && /fiado|duplicata|boleto|^dup |^bol /i.test(f.name)).slice(0, 1).forEach((f) => updateItem("financeiro", f.id, { date: editar.venc, dueDate: editar.venc }))
    avisar(`${s.name} atualizada.`); setEditar(null)
  }

  const confirmarExcluir = (motivo: string) => {
    const s = excluir
    if (!s) return
    const e = s.extra?.entrega
    if (e && /rota/i.test(e.status || "")) { avisar("A entrega está em rota. Aguarde o retorno do entregador."); setExcluir(null); return }
    if (s.extra?.estoqueBaixado) for (const l of (s.extra?.itens || []) as Line[]) {
      const st = l.tipo === "Produto" && l.ref ? data.estoque.find((x) => x.id === l.ref) : undefined
      if (st) { const quantity = (st.quantity || 0) + l.qtd; updateItem("estoque", st.id, { quantity, subtitle: `${quantity} un. • mínimo ${st.minimum}`, status: quantity <= 0 ? "Esgotado" : quantity < (st.minimum || 0) ? "Abaixo do mínimo" : "Disponível", extra: { ...(st.extra || {}), movimentos: [...(st.extra?.movimentos || []), { em: new Date().toISOString(), tipo: "Entrada", qtd: l.qtd, motivo: `Exclusão da venda ${s.name}: ${motivo}` }] } }) }
    }
    const lanc = data.financeiro.filter((f) => daVenda(f, s))
    lanc.forEach((f) => deleteItem("financeiro", f.id))
    deleteItem("vendas", s.id)
    avisar(`${s.name} excluída${lanc.length ? ` com ${lanc.length} ${lanc.length === 1 ? "lançamento" : "lançamentos"} do Financeiro` : ""}.`)
    setExcluir(null); if (verId === s.id) setVerId("")
    setMarcadas((m) => { const n = new Set(m); n.delete(s.id); return n })
  }

  const imprimirExtrato = () => {
    if (!cli) return
    const abertas = sales.filter((s) => s.ownerId === cli.t.id && saldoVenda(s) > 0).sort((a, b) => vencimento(a).localeCompare(vencimento(b)))
    printDoc({
      title: `Extrato de contas · ${cli.t.name}`,
      subtitle: `Vendas em aberto em ${fmtDate(hoje)}`,
      unit: activeUnit,
      issuedBy: operador,
      meta: [["Cliente", cli.t.name], ["CPF", cli.t.cpf || "—"], ["Telefone", cli.t.phone || "—"]],
      kpis: [["Em aberto", brl(cli.aberto), `${cli.abertas} vendas`], ["Vencido", brl(cli.vencido)]],
      sections: [{ title: "Vendas em aberto", head: ["Venda", "Data", "Documento", "Vencimento", "Total", "Em aberto"], align: ["l", "l", "l", "l", "r", "r"], rows: abertas.map((s) => [s.name, fmtDate(itemDate(s)), documento(s), fmtDate(vencimento(s)), brl(s.amountValue || 0), brl(saldoVenda(s))]), total: ["Total", "", "", "", "", brl(cli.aberto)] }],
      signatures: ["Cliente"],
    })
  }

  const pagarAlvo = pagar ? sales.filter((s) => pagar.ids.includes(s.id)) : []
  const pagarTotal = r2(pagarAlvo.reduce((a, s) => a + saldoVenda(s), 0))
  const limite = Number(cli?.t.extra?.limiteCredito ?? 1500)
  const fiadoCli = cli ? r2(sales.filter((s) => s.ownerId === cli.t.id).reduce((a, s) => a + fiadoAbertoVenda(s), 0)) : 0

  return (
    <div className="vc">
      <aside className="vc-side">
        <div className="vc-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, CPF, telefone ou nº da venda" aria-label="Buscar cliente"
          onKeyDown={(e) => { if (e.key === "Enter") { if (porNumero?.ownerId) escolher(porNumero.ownerId, porNumero.id); else if (lista[0]) escolher(lista[0].t.id) } }} />{q && <button className="vc-x" onClick={() => setQ("")} aria-label="Limpar"><X /></button>}</div>
        {!termo && <label className="vc-check"><input type="checkbox" checked={soAberto} onChange={(e) => setSoAberto(e.target.checked)} /> Só clientes com saldo em aberto</label>}
        {porNumero && <button className="vc-hit" onClick={() => porNumero.ownerId && escolher(porNumero.ownerId, porNumero.id)}>Abrir venda <b>{porNumero.name}</b> · {porNumero.owner}</button>}
        <div className="vc-clis">
          {lista.slice(0, 80).map((c) => (
            <button key={c.t.id} className={`vc-cli ${cliId === c.t.id ? "on" : ""}`} onClick={() => escolher(c.t.id)}>
              <span className="vc-av">{c.t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
              <span className="vc-cli-main"><b>{c.t.name}</b><small>{c.abertas ? `${c.abertas} ${c.abertas === 1 ? "venda em aberto" : "vendas em aberto"}` : `${c.n} ${c.n === 1 ? "venda" : "vendas"} · tudo pago`}</small></span>
              <span className="vc-cli-val"><b className={c.aberto ? (c.vencido ? "red" : "") : "muted"}>{brl(c.aberto)}</b>{c.vencido > 0 && <small className="red">vencido {brl(c.vencido)}</small>}</span>
            </button>
          ))}
          {!lista.length && <p className="vc-empty">{termo ? "Nenhum cliente encontrado." : "Nenhum cliente com saldo em aberto."}</p>}
        </div>
      </aside>

      <section className="vc-main">
        {!cli ? (
          <div className="vc-placeholder"><UserRound /><b>Selecione um cliente</b><span>Veja as vendas no fiado (notinha), duplicata e boleto, marque como paga, edite ou exclua.</span></div>
        ) : (
          <>
            <header className="vc-head">
              <div className="vc-head-id">
                <span className="vc-av lg">{cli.t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                <div><h3>{cli.t.name}</h3><small>{[cli.t.cpf && `CPF ${cli.t.cpf}`, cli.t.phone].filter(Boolean).join(" · ") || "sem documento"}</small></div>
              </div>
              <div className="vc-head-acts">
                {completo && <button className="vx-btn vx-btn-g" onClick={cobrarWhats} disabled={!cli.aberto} title="Abre o WhatsApp com a mensagem de cobrança"><MessageCircle /> Cobrar</button>}
                {completo && <button className="vx-btn vx-btn-g" onClick={() => setCredito({ limite: String(limite).replace(".", ","), bloqueado: !!cli.t.extra?.bloqueadoFiado })}><ShieldCheck /> Crédito</button>}
                <button className="vx-btn vx-btn-g" onClick={imprimirExtrato} disabled={!cli.aberto}><Printer /> Extrato</button>
                {completo && <button className="vx-btn vx-btn-g" onClick={() => navigate("/vendas")}><Plus /> Nova venda</button>}
              </div>
            </header>
            <div className="vc-kpis">
              <div><small>Em aberto</small><b>{brl(cli.aberto)}</b><span>{cli.abertas} {cli.abertas === 1 ? "venda" : "vendas"}</span></div>
              <div className={cli.vencido ? "bad" : ""}><small>Vencido</small><b>{brl(cli.vencido)}</b><span>{cli.vencido ? "cobrar o cliente" : "nada vencido"}</span></div>
              <div className={cli.t.extra?.bloqueadoFiado ? "bad" : ""}><small>Fiado (notinha){cli.t.extra?.bloqueadoFiado ? " · bloqueado" : ""}</small><b>{brl(fiadoCli)}</b><span>limite {brl(limite)} · disponível {brl(Math.max(0, limite - fiadoCli))}</span></div>
            </div>
            <div className="vc-bar">
              <div className="vc-tabs" role="tablist">
                {([["aberto", "Em aberto"], ["pagas", "Pagas"], ["todas", "Todas"], ...(completo ? [["recebimentos", "Recebimentos"]] : [])] as [Filtro, string][]).map(([k, l]) => <button key={k} role="tab" aria-selected={filtro === k} className={filtro === k ? "on" : ""} onClick={() => { setFiltro(k); setMarcadas(new Set()) }}>{l}{k === "aberto" && cli.abertas > 0 && <em>{cli.abertas}</em>}</button>)}
              </div>
              {completo && filtro !== "recebimentos" && <select className="vc-sel" value={docFiltro} onChange={(e) => setDocFiltro(e.target.value)} aria-label="Filtrar por documento"><option value="">Todos os documentos</option><option value="Fiado">Fiado (notinha)</option><option value="Duplicata">Duplicata</option><option value="Boleto">Boleto</option><option value="A receber">A receber</option></select>}
              <span className="grow" />
              {filtro !== "recebimentos" && (marcadasLista.length > 0
                ? <button className="vx-btn vx-btn-p" onClick={() => abrirPagar(marcadasLista.map((s) => s.id))}><Check /> Marcar {marcadasLista.length} como {marcadasLista.length === 1 ? "paga" : "pagas"} · {brl(totalMarcadas)}</button>
                : abertasCli.length > 1 && <button className="vx-btn vx-btn-g" onClick={() => setMarcadas(new Set(abertasCli.map((s) => s.id)))}>Selecionar todas em aberto</button>)}
            </div>
            {filtro === "recebimentos" ? (
              <div className="vc-table vc-rec" role="table">
                <div className="vc-tr vc-th" role="row"><span>Data</span><span>Venda</span><span>Forma</span><span>Recebido por</span><span className="r">Valor</span><span className="r">Ações</span></div>
                {recebimentos.map(({ sale, rec, ultimo }, k) => (
                  <div key={`${sale.id}-${k}`} role="row" className="vc-tr">
                    <span className="vc-sale"><b>{fmtDate(rec.data)}</b><small>{rec.hora}</small></span>
                    <span className="vc-sale"><b className="mono">{sale.name}</b><small>{documento(sale)}</small></span>
                    <span data-l="Forma">{rec.forma}</span>
                    <span data-l="Por" className="muted">{rec.por}</span>
                    <b data-l="Valor" className="r num">{brl(rec.valor)}{rec.encargos ? <small className="muted"> + {brl(rec.encargos)} encargos</small> : null}</b>
                    <span className="vc-acts">
                      <button title="Imprimir recibo" aria-label={`Recibo de ${sale.name}`} onClick={() => imprimirRecibo([{ sale, rec }])}><Printer /></button>
                      {ultimo && <button className="dan" title="Desfazer recebimento" aria-label={`Desfazer recebimento de ${sale.name}`} onClick={() => setDesfazer({ sale, rec })}><RotateCcw /></button>}
                    </span>
                  </div>
                ))}
                {!recebimentos.length && <p className="vc-empty">Nenhum recebimento de conta registrado para este cliente.</p>}
              </div>
            ) : (
            <div className="vc-table" role="table">
              <div className="vc-tr vc-th" role="row"><span /><span>Venda</span><span>Documento</span><span>Vencimento</span><span className="r">Em aberto</span><span>Situação</span><span className="r">Ações</span></div>
              {vendasCli.map((s) => {
                const saldo = saldoVenda(s)
                const [sit, tom] = situacao(s, hoje)
                return (
                  <div key={s.id} role="row" className={`vc-tr ${verId === s.id ? "sel" : ""} ${marcadas.has(s.id) ? "mk" : ""}`} onClick={() => completo && setVerId(verId === s.id ? "" : s.id)}>
                    <span onClick={(e) => e.stopPropagation()}>{saldo > 0 && <input type="checkbox" aria-label={`Selecionar ${s.name}`} checked={marcadas.has(s.id)} onChange={() => alternar(s.id)} />}</span>
                    <span className="vc-sale"><b className="mono">{s.name}</b><small title={s.animal ? `Paciente ${s.animal}` : undefined}>{fmtDate(itemDate(s))} · total {brl(s.amountValue || 0)}</small></span>
                    <span data-l="Documento">{documento(s)}</span>
                    <span data-l="Vencimento" className={saldo > 0 && vencimento(s) < hoje ? "red" : ""}>{saldo > 0 ? fmtDate(vencimento(s)) : "—"}</span>
                    <b data-l="Em aberto" className={`r num ${saldo ? "" : "muted"}`}>{brl(saldo)}</b>
                    <span data-l="Situação"><i className={`vc-pill ${tom}`}>{sit}</i></span>
                    <span className="vc-acts" onClick={(e) => e.stopPropagation()}>
                      {completo && <button title="Ver venda" aria-label={`Ver ${s.name}`} onClick={() => setVerId(verId === s.id ? "" : s.id)}><Eye /></button>}
                      {saldo > 0 && <button className="ok" title="Marcar como paga" aria-label={`Marcar ${s.name} como paga`} onClick={() => abrirPagar([s.id])}><Check /></button>}
                      <button title="Editar" aria-label={`Editar ${s.name}`} onClick={() => setEditar({ id: s.id, venc: vencimento(s), obs: String(s.extra?.obs || "") })}><Pencil /></button>
                      <button className="dan" title="Excluir" aria-label={`Excluir ${s.name}`} onClick={() => setExcluir(s)}><Trash2 /></button>
                    </span>
                  </div>
                )
              })}
              {!vendasCli.length && <p className="vc-empty">{filtro === "aberto" ? "Este cliente não tem vendas em aberto." : "Nenhuma venda neste filtro."}</p>}
            </div>
            )}

            {completo && filtro !== "recebimentos" && ver && (
              <div className="vc-detail">
                <div className="vc-detail-h"><b>{ver.name}</b><span>{fmtDate(itemDate(ver))} · vendedor {ver.professional || "—"}</span><button className="vc-x" onClick={() => setVerId("")} aria-label="Fechar"><X /></button></div>
                <PrintBar sale={ver} unitName={activeUnit.name} tutor={cli.t} only={["Duplicata", "Conferência", "Pré-venda"]} />
                <div className="vc-itens">
                  {((ver.extra?.itens || []) as Line[]).map((l, i) => <div key={i}><span>{l.qtd}× {l.descricao.replace(/ • lote \d+/, "")}</span><b className="num">{brl(lineTotal(l))}</b></div>)}
                  {!!ver.extra?.desconto && <div className="muted"><span>Desconto</span><b className="num">− {brl(ver.extra.desconto)}</b></div>}
                  <div className="tot"><span>Total</span><b className="num">{brl(ver.amountValue || 0)}</b></div>
                </div>
                <div className="vc-cols">
                  <div><h4>Pagamentos</h4>{pays(ver).length ? pays(ver).map((p, i) => <p key={i}>{p.forma === "Fiado" ? "Fiado (notinha)" : p.forma}{p.parcelas > 1 ? ` ${p.parcelas}x` : ""} · <b>{brl(p.valor)}</b>{p.vencimentos?.length ? ` · vence ${p.vencimentos.map((d) => fmtDate(d, { day: "2-digit", month: "2-digit" })).join(", ")}` : ""}</p>) : <p className="muted">Nenhum pagamento no caixa.</p>}
                    {((ver.extra?.recebimentosConta || []) as Rec[]).map((r, i, arr) => <p key={`r${i}`} className="green vc-recline"><span>Recebido {fmtDate(r.data)} {r.hora} · {r.forma} <b>{brl(r.valor)}</b>{r.encargos ? ` + ${brl(r.encargos)} encargos` : ""} · {r.por}</span><button onClick={() => imprimirRecibo([{ sale: ver, rec: r }])}>Recibo</button>{i === arr.length - 1 && <button className="dan" onClick={() => setDesfazer({ sale: ver, rec: r })}>Desfazer</button>}</p>)}
                    {ver.extra?.obs && <p><span className="muted">Obs.:</span> {ver.extra.obs}</p>}</div>
                  <div><h4>Histórico</h4>{((ver.extra?.historico || []) as string[]).slice(-6).reverse().map((h, i) => <p key={i} className="muted">{h}</p>)}{!(ver.extra?.historico || []).length && <p className="muted">Sem registros.</p>}</div>
                </div>
                {naFila(ver) && <p className="vc-note"><AlertTriangle /> Esta venda está na fila do caixa: receba pela aba Recebimento.</p>}
                <div className="vc-detail-acts">
                  {saldoVenda(ver) > 0 && <button className="vx-btn vx-btn-p" onClick={() => abrirPagar([ver.id])}><Check /> Marcar como paga</button>}
                  <button className="vx-btn vx-btn-g" onClick={() => setEditar({ id: ver.id, venc: vencimento(ver), obs: String(ver.extra?.obs || "") })}><Pencil /> Editar</button>
                  <button className="vx-btn vx-btn-g vc-dan" onClick={() => setExcluir(ver)}><Trash2 /> Excluir</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {pagar && (
        <Modal title={pagarAlvo.length === 1 ? `Marcar ${pagarAlvo[0]?.name} como paga` : `Marcar ${pagarAlvo.length} vendas como pagas`} text={`${cli?.t.name || ""} · em aberto ${brl(pagarTotal)}. A conta a receber no Financeiro é baixada junto.`} onClose={() => setPagar(null)}
          actions={<><button type="button" className="vx-btn vx-btn-g" onClick={() => setPagar(null)}>Cancelar</button><button type="button" className="vx-btn vx-btn-p" onClick={confirmarPagar}><Check /> Confirmar pagamento</button></>}>
          <div className="vc-form">
            <label><span>Forma de pagamento</span><select value={pagar.forma} onChange={(e) => setPagar({ ...pagar, forma: e.target.value })}>{FORMAS_BAIXA.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label><span>Data do pagamento</span><input type="date" value={pagar.data} max={hoje} onChange={(e) => setPagar({ ...pagar, data: e.target.value || hoje })} /></label>
            {pagarAlvo.length === 1 && <label className="full"><span>Valor recebido (deixe vazio para o total)</span><input inputMode="decimal" placeholder={brl(pagarTotal)} value={pagar.valor} autoFocus onChange={(e) => setPagar({ ...pagar, valor: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") confirmarPagar() }} /></label>}
            {completo && pagarAlvo.length === 1 && vencimento(pagarAlvo[0]) < pagar.data && (() => { const enc = encargosAtraso(pagarTotal, vencimento(pagarAlvo[0]), pagar.data); return (
              <label className="full vc-enc"><input type="checkbox" checked={pagar.encargos} onChange={(e) => setPagar({ ...pagar, encargos: e.target.checked })} /><span>Cobrar multa (2%) e juros (1% ao mês) · {diasAtraso(vencimento(pagarAlvo[0]), pagar.data)} dias de atraso · <b>+ {brl(enc)}</b></span></label>
            ) })()}
            {pagar.encargos && pagarAlvo.length === 1 && <p className="full vc-note ok"><Check /> Total a receber agora: {brl((parseMoney(pagar.valor) > 0 ? Math.min(parseMoney(pagar.valor), pagarTotal) : pagarTotal) + encargosAtraso(pagarTotal, vencimento(pagarAlvo[0]), pagar.data))}</p>}
            {pagarAlvo.length === 1 && parseMoney(pagar.valor) > 0 && parseMoney(pagar.valor) < pagarTotal && <p className="full vc-note"><AlertTriangle /> Recebimento parcial: fica {brl(pagarTotal - parseMoney(pagar.valor))} em aberto.</p>}
            {pagarAlvo.length > 1 && <ul className="full vc-ul">{pagarAlvo.map((s) => <li key={s.id}><span>{s.name}</span><b>{brl(saldoVenda(s))}</b></li>)}</ul>}
            {origem === "Caixa" && pagar.forma === "Dinheiro" && <p className="full vc-note ok"><Check /> O dinheiro entra na gaveta deste caixa.</p>}
          </div>
        </Modal>
      )}
      {editar && (
        <Modal title={`Editar ${sales.find((s) => s.id === editar.id)?.name || "venda"}`} text="Altere o vencimento da conta e a observação. Para trocar itens, exclua e lance a venda de novo." onClose={() => setEditar(null)}
          actions={<><button type="button" className="vx-btn vx-btn-g" onClick={() => setEditar(null)}>Cancelar</button><button type="button" className="vx-btn vx-btn-p" onClick={salvarEdicao}><Check /> Salvar</button></>}>
          <div className="vc-form">
            <label><span>Vencimento</span><input type="date" value={editar.venc} onChange={(e) => setEditar({ ...editar, venc: e.target.value || editar.venc })} /></label>
            {completo && <div className="vc-presets"><span>Prorrogar</span>{[7, 15, 30].map((d) => <button type="button" key={d} onClick={() => setEditar({ ...editar, venc: addDays(editar.venc < hoje ? hoje : editar.venc, d) })}>+{d} dias</button>)}</div>}
            <label className="full"><span>Observação</span><textarea rows={3} value={editar.obs} onChange={(e) => setEditar({ ...editar, obs: e.target.value })} placeholder="Ex.: cliente paga todo dia 10" /></label>
          </div>
        </Modal>
      )}
      {excluir && (
        <Confirm danger title={`Excluir ${excluir.name}?`} confirm="Excluir venda" reason="Motivo da exclusão"
          text={`${excluir.owner || ""} · ${brl(excluir.amountValue || 0)}. A venda e os lançamentos dela no Financeiro serão apagados${excluir.extra?.estoqueBaixado ? " e os produtos voltam ao estoque" : ""}. Não dá para desfazer.`}
          onCancel={() => setExcluir(null)} onConfirm={confirmarExcluir} />
      )}
      {desfazer && (
        <Confirm danger title={`Desfazer recebimento de ${desfazer.sale.name}?`} confirm="Desfazer recebimento" reason="Motivo"
          text={`${desfazer.rec.forma} ${brl(desfazer.rec.valor + (desfazer.rec.encargos || 0))} em ${fmtDate(desfazer.rec.data)}. A venda volta a ficar em aberto e a baixa no Financeiro é desfeita.${origem === "Caixa" && desfazer.rec.forma === "Dinheiro" ? " O valor sai da gaveta como estorno." : ""}`}
          onCancel={() => setDesfazer(null)} onConfirm={confirmarDesfazer} />
      )}
      {credito && cli && (
        <Modal title={`Crédito de ${cli.t.name}`} text="Limite para vendas no fiado (notinha). O vendedor e o caixa são avisados quando passar do limite." onClose={() => setCredito(null)}
          actions={<><button type="button" className="vx-btn vx-btn-g" onClick={() => setCredito(null)}>Cancelar</button><button type="button" className="vx-btn vx-btn-p" onClick={salvarCredito}><Check /> Salvar</button></>}>
          <div className="vc-form">
            <label><span>Limite de crédito (R$)</span><input inputMode="decimal" value={credito.limite} autoFocus onChange={(e) => setCredito({ ...credito, limite: e.target.value })} /></label>
            <label><span>Em aberto no fiado</span><input value={brl(fiadoCli)} readOnly /></label>
            <label className="full vc-enc"><input type="checkbox" checked={credito.bloqueado} onChange={(e) => setCredito({ ...credito, bloqueado: e.target.checked })} /><span><Lock size={14} /> Bloquear novas vendas no fiado para este cliente</span></label>
          </div>
        </Modal>
      )}
      {recibo && (
        <Modal title="Pagamento registrado" text={`${recibo.length === 1 ? recibo[0].sale.name : `${recibo.length} vendas`} · ${recibo[0].rec.forma} ${brl(recibo.reduce((a, x) => a + x.rec.valor + (x.rec.encargos || 0), 0))}. A baixa já aparece no Financeiro.`} onClose={() => setRecibo(null)}
          actions={<><button type="button" className="vx-btn vx-btn-g" onClick={() => setRecibo(null)}>Fechar</button><button type="button" className="vx-btn vx-btn-p" onClick={() => { imprimirRecibo(recibo); setRecibo(null) }}><Printer /> Imprimir recibo</button></>} />
      )}
      {toast && <div className="vc-toast" role="status"><Check /> {toast}</div>}
    </div>
  )
}
