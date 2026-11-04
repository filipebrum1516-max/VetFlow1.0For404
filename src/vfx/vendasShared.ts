import { localDateTime, localISO } from "../date"
import type { Item, Unit } from "../store"
import { brl, fmtDate } from "./ui"

export type Line = { tipo: string; ref?: string; codigo?: string; descricao: string; qtd: number; preco: number; desconto: number; lote?: string; validade?: string; obs?: string; vendedor?: string }
export type Pay = { forma: string; valor: number; parcelas: number; vencimentos?: string[]; troco?: number; detalhe?: string }
export type Entrega = {
  status: string
  entregador: string
  ordem?: number
  cep: string
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  referencia?: string
  telefone: string
  data: string
  periodo: string
  taxa: number
  aCobrar: number
  cobradoForma?: string
  cobradoValor?: number
  obs?: string
  recebidoPor?: string
  motivo?: string
  foto?: boolean
  assinatura?: boolean
  historico?: string[]
}

export const FORMAS = ["Dinheiro", "Pix", "Débito", "Crédito", "Duplicata", "Fiado", "Boleto", "Transferência", "Cheque", "Convênio", "Vale-crédito", "Retirada"] as const
/** formas que viram "a receber" no financeiro */
export const A_PRAZO = ["Crédito", "Duplicata", "Fiado", "Boleto", "Convênio"]
/** formas com parcelas e vencimentos definidos no caixa */
export const PARCELADAS = ["Duplicata", "Boleto"]
export const ENTREGADORES = ["Marcos Lima", "Diego Souza", "Paulo Henrique"]
export const LIMITE_FIADO = 1500
/** desconto máximo sem liberação (vendedor e demais perfis). Acima disso, só com a senha de um administrador. */
export const LIMITE_DESCONTO = 7

export const lineTotal = (line: Line) => Math.max(0, line.qtd * line.preco * (1 - (line.desconto || 0) / 100))
export const nowTime = () => new Date().toTimeString().slice(0, 5)
export const stamp = () => `${fmtDate(localISO(), { day: "2-digit", month: "2-digit" })} ${nowTime()}`
export const two = (n: number) => String(n).padStart(2, "0")

export const codeOf = (item: Item) => {
  const n = Number(item.id.replace(/\D+/g, "").slice(-4)) || 0
  return `7891${String(1000 + n).padStart(6, "0")}`.slice(0, 13)
}
export const shortCode = (item: Item) => String(Number(item.id.replace(/\D+/g, "").slice(-4)) || 0).padStart(5, "0")
export const priceOf = (item: Item) => Number(item.extra?.preco) || Math.round(((item.amountValue || 0) / Math.max(1, item.quantity || 1)) * 1.8 * 100) / 100 || 25

export function nextNumber(items: Item[], prefix: string) {
  let max = 0
  for (const item of items) if (item.name.startsWith(prefix)) max = Math.max(max, Number(item.name.slice(prefix.length + 1)) || 0)
  return `${prefix}-${String(max + 1).padStart(6, "0")}`
}

export function minutesSince(date?: string, time?: string) {
  if (!time) return ""
  const today = localISO()
  if (date && date !== today) return fmtDate(date, { day: "2-digit", month: "2-digit" })
  const [h, m] = time.split(":").map(Number)
  const now = new Date()
  const diff = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  if (diff < 1) return "agora"
  if (diff < 60) return `há ${diff} min`
  return `há ${Math.floor(diff / 60)} h ${diff % 60} min`
}

export const saleTone = (status: string) => {
  if (/aguardando pag/i.test(status)) return "amber"
  if (/devolvida/i.test(status)) return "violet"
  if (/cancel|não entregue/i.test(status)) return "red"
  if (/em entrega|em rota|a cobrar/i.test(status)) return "blue"
  if (/aguardando lib|a separar|pronta/i.test(status)) return "amber"
  if (/paga|conclu|entregue|recebid/i.test(status)) return "green"
  if (/a receber|parcial|reagend/i.test(status)) return "amber"
  return "gray"
}

export function addMonths(iso: string, months: number, days = 0) {
  const d = new Date(`${iso}T12:00:00`)
  if (months) d.setMonth(d.getMonth() + months)
  if (days) d.setDate(d.getDate() + days)
  return localISO(d)
}

export function printHtml(title: string, body: string, a4 = false) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
  body{font:12px/1.45 "Courier New",monospace;margin:18px;color:#111;max-width:${a4 ? "none" : "340px"}}
  ${a4 ? A4_CSS : ""}
  h1{font-size:15px;margin:0 0 2px}h2{font-size:12px;margin:12px 0 4px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin:8px 0}td,th{padding:3px 0;border-bottom:1px dashed #999;text-align:left;vertical-align:top}
  td:last-child,th:last-child{text-align:right}.t{font-weight:700;font-size:14px}.c{text-align:center}
  .bar{font:34px/1 "Libre Barcode 39",monospace;letter-spacing:2px;text-align:center;margin:10px 0 0}
  .code{letter-spacing:6px;text-align:center;font-weight:700}
  .sig{margin-top:28px;border-top:1px solid #111;padding-top:4px;text-align:center}
  @page{margin:${a4 ? "12mm" : "4mm"}}
  </style></head><body>${body}</body></html>`
  /* imprime por um iframe invisível na própria página: funciona mesmo quando o navegador
     ou o preview bloqueiam janelas pop-up. Se não der, cai para uma nova janela. */
  try {
    document.getElementById("vf-print-frame")?.remove()
    const frame = document.createElement("iframe")
    frame.id = "vf-print-frame"
    frame.setAttribute("aria-hidden", "true")
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
    document.body.appendChild(frame)
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (!doc || !frame.contentWindow) throw new Error("sem iframe")
    doc.open(); doc.write(html); doc.close()
    const go = () => {
      try { frame.contentWindow!.focus(); frame.contentWindow!.print() } catch { openWindow() }
    }
    window.setTimeout(go, 250)
    window.setTimeout(() => frame.remove(), 60_000)
  } catch {
    openWindow()
  }
  function openWindow() {
    const win = window.open("", "_blank", a4 ? "width=900,height=1000" : "width=480,height=720")
    if (!win) { window.alert("Não foi possível abrir a impressão. Libere pop-ups para este site e tente de novo."); return }
    win.document.write(html.replace("</body>", "<script>window.onload=()=>window.print()</script></body>"))
    win.document.close()
  }
}

/* Dados da unidade (CNPJ, endereço, telefone) para cabeçalho de recibos e cupons (M-04). */
let knownUnits: Unit[] = []
export function registerUnits(units: Unit[]) { knownUnits = units }
function unitLine(unitName: string) {
  const u = knownUnits.find((unit) => unit.name === unitName || unit.shortName === unitName)
  if (!u) return ""
  return [u.cnpj && `CNPJ ${u.cnpj}`, [u.street, u.number].filter(Boolean).join(", ") + (u.city ? ` · ${u.city}/${u.state}` : ""), u.phone].filter(Boolean).join(" · ")
}

export function saleSlipHtml(sale: Item, unitName: string, kind: "pre" | "comprovante" | "romaneio") {
  const itens: Line[] = sale.extra?.itens || []
  const pays: Pay[] = sale.extra?.pagamentos || []
  const e: Entrega | undefined = sale.extra?.entrega
  const head = kind === "pre" ? "PRÉ-VENDA · leve ao caixa" : kind === "romaneio" ? "ROMANEIO DE ENTREGA" : "COMPROVANTE NÃO FISCAL"
  return `<h1>VetFlow · ${unitName}</h1><div style="font-size:10px">${unitLine(unitName)}</div><div>${head}</div><div class="code">${sale.name}</div>
  <div>${fmtDate(sale.date)} ${sale.time || ""} · Vendedor: ${sale.professional || "—"}</div>
  <div>Cliente: ${sale.owner || "Consumidor final"}</div>
  <table><tr><th>Item</th><th>Qtd</th><th>Total</th></tr>${itens.map((l) => `<tr><td>${l.descricao}</td><td>${l.qtd}</td><td>${brl(lineTotal(l))}</td></tr>`).join("")}</table>
  <div>Subtotal ${brl(sale.extra?.subtotal || 0)} · Desconto ${brl(sale.extra?.desconto || 0)}${sale.extra?.taxaEntrega ? ` · Entrega ${brl(sale.extra.taxaEntrega)}` : ""}</div>
  <div class="t">TOTAL ${brl(sale.amountValue || 0)}</div>
  ${kind === "comprovante" ? pays.map((p) => `<div>${p.forma}${p.parcelas > 1 ? ` ${p.parcelas}x` : ""}${p.detalhe ? ` (${p.detalhe})` : ""}: ${brl(p.valor)}${p.troco ? ` (troco ${brl(p.troco)})` : ""}</div>`).join("") : ""}
  ${kind === "pre" && sale.extra?.formaSugerida ? `<div>Forma sugerida: ${sale.extra.formaSugerida}</div>` : ""}
  ${e && kind !== "pre" ? `<h2>Entrega</h2><div>${e.rua}, ${e.numero}${e.complemento ? ` · ${e.complemento}` : ""}<br>${e.bairro} · ${e.cidade}/${e.uf} · CEP ${e.cep}<br>${e.referencia ? `Ref.: ${e.referencia}<br>` : ""}Tel.: ${e.telefone}<br>${fmtDate(e.data)} · ${e.periodo}${e.entregador ? ` · ${e.entregador}` : ""}</div>${e.aCobrar ? `<div class="t">COBRAR NA ENTREGA: ${brl(e.aCobrar)}</div>` : "<div>Pago no caixa</div>"}${e.obs ? `<div>Obs.: ${e.obs}</div>` : ""}` : ""}
  ${kind === "romaneio" ? `<div class="sig">Recebido por (nome e assinatura)</div>` : ""}
  ${kind === "pre" ? `<div class="code" style="margin-top:12px">|||| ${sale.name.replace("VND-", "")} ||||</div>` : ""}
  <p class="c">© VetFlow 1.0 · 404</p>`
}


/* ---------------- regras de edição ---------------- */
export const EDIT_WINDOW = 5 * 60 * 1000
/** Só quem vendeu edita, em até 5 min após a primeira finalização (ou após a devolução pelo caixa). */
export function editInfo(sale: Item, seller: string, now = Date.now()) {
  const start = sale.extra?.reabertaEm || sale.extra?.finalizadaEm
  const left = start ? EDIT_WINDOW - (now - start) : -1
  const own = sale.professional === seller || sale.extra?.operador === seller
  const statusOk = /aguardando pag|devolvida/i.test(sale.status)
  const can = own && statusOk && left > 0
  const reason = !statusOk ? "A venda já passou pelo caixa." : !own ? `Só ${sale.extra?.operador || sale.professional} pode editar esta venda.` : left <= 0 ? "O prazo de 5 minutos para edição terminou." : ""
  return { can, left: Math.max(0, left), reason }
}
export const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`

/* ---------------- valor por extenso ---------------- */
const U = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
const T = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
const C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]
function ate999(n: number): string {
  if (n === 100) return "cem"
  const c = Math.floor(n / 100), r = n % 100
  const parts: string[] = []
  if (c) parts.push(C[c])
  if (r) parts.push(r < 20 ? U[r] : T[Math.floor(r / 10)] + (r % 10 ? ` e ${U[r % 10]}` : ""))
  return parts.join(" e ")
}
export function extenso(valor: number) {
  const reais = Math.floor(valor + 1e-9)
  const cent = Math.round((valor - reais) * 100)
  const mi = Math.floor(reais / 1e6), mil = Math.floor((reais % 1e6) / 1000), resto = reais % 1000
  const parts: string[] = []
  if (mi) parts.push(`${ate999(mi)} ${mi === 1 ? "milhão" : "milhões"}`)
  if (mil) parts.push(mil === 1 ? "mil" : `${ate999(mil)} mil`)
  if (resto) parts.push(ate999(resto))
  let txt = parts.length ? parts.join(resto && (resto < 100 || resto % 100 === 0) ? " e " : " ") : ""
  if (reais) txt += reais === 1 ? " real" : mi && !mil && !resto ? " de reais" : " reais"
  if (cent) txt += `${reais ? " e " : ""}${ate999(cent)} ${cent === 1 ? "centavo" : "centavos"}`
  return txt || "zero real"
}

/* ---------------- documentos A4 ---------------- */
const A4_CSS = `
  body{font:12px/1.5 Arial,Helvetica,sans-serif;max-width:780px;margin:24px auto}
  .doc{border:1px solid #111;padding:18px 20px;margin-bottom:22px;page-break-inside:avoid}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
  .hd h1{font-size:18px;margin:0}.hd small{display:block;color:#444}
  .big{font-size:20px;font-weight:700}.box{border:1px solid #111;padding:6px 8px}.grid{display:grid;gap:8px}
  .lbl{font-size:10px;text-transform:uppercase;color:#555;display:block}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px 6px;text-align:left}th{background:#eee;font-size:11px}
  td.r,th.r{text-align:right}.chk{width:16px;height:16px;border:1px solid #111;display:inline-block}
  .sig{margin-top:40px;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:11px}
  .cut{border-top:1px dashed #777;margin:18px 0}
  @media print{body{margin:0}.doc{border-color:#000}}`

function unitHead(unitName: string, title: string, right: string) {
  return `<div class="hd"><div><h1>VetFlow · ${unitName}</h1><small>${unitLine(unitName) || "Gestão veterinária"}</small></div><div style="text-align:right"><div class="big">${title}</div><small>${right}</small></div></div>`
}
function clientBox(sale: Item, tutor?: Item) {
  return `<div class="box"><span class="lbl">Cliente</span><b>${sale.owner || "Consumidor final"}</b>${tutor?.cpf ? ` · CPF ${tutor.cpf}` : ""}${tutor?.phone ? ` · ${tutor.phone}` : ""}<br>${tutor?.address?.replace(" • ", " · ") || ""}</div>`
}
function itemsTable(itens: Line[]) {
  return `<table><tr><th>Código</th><th>Produto</th><th class="r">Qtd.</th><th class="r">Unitário</th><th class="r">Desc.</th><th class="r">Total</th></tr>${itens.map((l) => `<tr><td>${l.codigo || "—"}</td><td>${l.descricao}</td><td class="r">${l.qtd}</td><td class="r">${brl(l.preco)}</td><td class="r">${l.desconto ? `${l.desconto}%` : "—"}</td><td class="r">${brl(lineTotal(l))}</td></tr>`).join("")}</table>`
}

export function orcamentoHtml(sale: Item, unitName: string, tutor?: Item) {
  const itens: Line[] = sale.extra?.itens || []
  return `<div class="doc">${unitHead(unitName, "ORÇAMENTO", `${sale.name} · ${fmtDate(sale.date)}`)}
  ${clientBox(sale, tutor)}<p></p>${itemsTable(itens)}
  <table style="margin-top:8px;width:50%;margin-left:auto"><tr><td>Subtotal</td><td class="r">${brl(sale.extra?.subtotal || 0)}</td></tr><tr><td>Desconto</td><td class="r">− ${brl(sale.extra?.desconto || 0)}</td></tr>${sale.extra?.taxaEntrega ? `<tr><td>Entrega</td><td class="r">${brl(sale.extra.taxaEntrega)}</td></tr>` : ""}<tr><th>Total</th><th class="r">${brl(sale.amountValue || 0)}</th></tr></table>
  <p><b>Validade:</b> ${fmtDate(sale.dueDate)} · <b>Vendedor:</b> ${sale.professional || "—"}${sale.extra?.formaSugerida ? ` · <b>Pagamento previsto:</b> ${sale.extra.formaSugerida}` : ""}</p>
  <p style="font-size:11px;color:#444">Preços sujeitos à disponibilidade de estoque na data da compra. Este orçamento não reserva produtos.</p>
  <div class="grid" style="grid-template-columns:1fr 1fr;gap:40px"><div class="sig">${sale.professional || "Vendedor"}</div><div class="sig">De acordo · ${sale.owner || "Cliente"}</div></div></div>`
}

export function duplicatasHtml(sale: Item, unitName: string, tutor?: Item) {
  let pays: Pay[] = (sale.extra?.pagamentos || []).filter((p: Pay) => p.forma === "Duplicata" || p.forma === "Boleto")
  if (!pays.length) pays = [{ forma: "Duplicata", valor: sale.amountValue || 0, parcelas: 1, vencimentos: [addMonths(sale.date || localISO(), 1)] }]
  const out: string[] = []
  for (const p of pays) {
    const n = Math.max(1, p.parcelas)
    for (let k = 0; k < n; k++) {
      const v = Math.round((p.valor / n) * 100) / 100
      const venc = p.vencimentos?.[k] || ""
      out.push(`<div class="doc">${unitHead(unitName, "DUPLICATA", `Emissão ${fmtDate(sale.date)}`)}
      <div class="grid" style="grid-template-columns:1.2fr 1fr 1fr 1fr">
        <div class="box"><span class="lbl">Nº da duplicata</span><b>${sale.name.replace("VND-", "")}-${k + 1}/${n}</b></div>
        <div class="box"><span class="lbl">Venda</span><b>${sale.name}</b></div>
        <div class="box"><span class="lbl">Vencimento</span><b>${fmtDate(venc)}</b></div>
        <div class="box"><span class="lbl">Valor</span><b class="big">${brl(v)}</b></div>
      </div><p></p>
      <div class="box"><span class="lbl">Sacado</span><b>${sale.owner || "—"}</b>${tutor?.cpf ? ` · CPF ${tutor.cpf}` : ""}<br>${tutor?.address?.replace(" • ", " · ") || ""}${tutor?.phone ? ` · ${tutor.phone}` : ""}</div><p></p>
      <div class="box"><span class="lbl">Valor por extenso</span>${extenso(v)}</div>
      <p style="font-size:11px">Reconheço(emos) a exatidão desta duplicata, na importância acima, que pagarei(emos) a ${unitName}, ou à sua ordem, na praça e vencimento indicados.</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:40px"><div class="sig">Data do aceite ____/____/______</div><div class="sig">Assinatura do sacado</div></div></div>`)
    }
  }
  return out.join('<div class="cut"></div>') || "<p>Esta venda não tem duplicatas.</p>"
}

export function conferenciaHtml(sale: Item, unitName: string) {
  const itens: Line[] = sale.extra?.itens || []
  const e: Entrega | undefined = sale.extra?.entrega
  return `<div class="doc">${unitHead(unitName, "CONFERÊNCIA / SEPARAÇÃO", `${sale.name} · ${fmtDate(sale.date)} ${sale.time || ""}`)}
  <p><b>Cliente:</b> ${sale.owner || "Consumidor final"} · <b>Tipo:</b> ${sale.extra?.tipo || "Balcão"} · <b>Vendedor:</b> ${sale.professional || "—"}</p>
  ${e ? `<p><b>Entrega:</b> ${e.rua}, ${e.numero} · ${e.bairro} · ${fmtDate(e.data)} (${e.periodo})</p>` : ""}
  <table><tr><th>Código</th><th>Produto</th><th>Lote</th><th>Validade</th><th class="r">Qtd.</th><th>Separado</th><th>Conferido</th></tr>${itens.map((l) => `<tr><td>${l.codigo || "—"}</td><td>${l.descricao}</td><td>${l.lote || "—"}</td><td>${l.validade ? fmtDate(l.validade, { month: "2-digit", year: "numeric" }) : "—"}</td><td class="r"><b>${l.qtd}</b></td><td style="text-align:center"><span class="chk"></span></td><td style="text-align:center"><span class="chk"></span></td></tr>`).join("")}</table>
  <p>Volumes: ______ · Observações: ________________________________________________</p>
  <div class="grid" style="grid-template-columns:1fr 1fr;gap:40px"><div class="sig">Separado por</div><div class="sig">Conferido por</div></div></div>`
}

export function reciboHtml(sale: Item, unitName: string, tutor?: Item) {
  const pays: Pay[] = sale.extra?.pagamentos || []
  const v = pays.reduce((a, p) => a + p.valor, 0) || sale.extra?.pago || 0
  return `<div class="doc">${unitHead(unitName, "RECIBO", `${sale.name} · ${fmtDate(sale.date)}`)}
  <p style="font-size:14px;line-height:1.8">Recebemos de <b>${sale.owner || "Consumidor final"}</b>${tutor?.cpf ? `, CPF ${tutor.cpf},` : ""} a importância de <b>${brl(v)}</b> (${extenso(v)}), referente à venda <b>${sale.name}</b>, paga em ${pays.map((p) => `${p.forma}${p.parcelas > 1 ? ` ${p.parcelas}x` : ""} ${brl(p.valor)}`).join(", ") || "—"}.</p>
  <p>Para clareza, firmamos o presente.</p>
  <div class="sig" style="width:50%;margin-left:auto">${unitName}</div></div>`
}

/* ---------------- plano de pagamento (padrão ERP) ---------------- */
export const PLANOS = ["À vista", ...Array.from({ length: 12 }, (_, i) => `${i + 1}X`), ...Array.from({ length: 11 }, (_, i) => `1+${i + 1}X`)]
/** "3X" → 3 parcelas sem entrada; "1+3X" → entrada + 3 parcelas */
export function planoInfo(plano?: string) {
  const m = /^1\+(\d+)X$/.exec(plano || "")
  if (m) return { entrada: true, parcelas: Number(m[1]), total: Number(m[1]) + 1 }
  const n = /^(\d+)X$/.exec(plano || "")
  if (n) return { entrada: false, parcelas: Number(n[1]), total: Number(n[1]) }
  return { entrada: false, parcelas: 1, total: 1 }
}
export const DOCUMENTOS: [string, string][] = [["Dinheiro", "Dinheiro"], ["Pix", "Pix"], ["Cartão de débito", "Débito"], ["Cartão de crédito", "Crédito"], ["Duplicata", "Duplicata"], ["Cheque", "Cheque"], ["Boleto", "Boleto"], ["Fiado (anotado)", "Fiado"], ["Convênio", "Convênio"], ["Vale-crédito", "Vale-crédito"], ["Transferência", "Transferência"], ["Retirada", "Retirada"]]
