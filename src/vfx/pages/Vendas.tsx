import { localDateTime, localISO } from "../../date"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, Check, Clock, FileText, Lock, MapPin, Package, Pencil, ScanBarcode, Search, Send, ShoppingCart, Trash2, Truck, User, UserPlus, Users, X } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { brl, Confirm, fmtDate, initials, itemDate, normalizeText, parseMoney, todayISO, Page } from "../ui"
import { codeOf, DOCUMENTOS, orcamentoHtml, printHtml, editInfo, planoInfo, PLANOS, LIMITE_DESCONTO, LIMITE_FIADO, lineTotal, minutesSince, mmss, nextNumber, nowTime, priceOf, saleTone, shortCode, stamp, type Entrega, type Line } from "../vendasShared"
import { PrintBar } from "../PrintMenu"
import Layer from "../OpLayer"
import ClienteForm, { fromItem, toItem, type ClienteData } from "../ClienteForm"

type Tipo = "Balcão" | "Retirada" | "Entrega"
const TIPOS: Tipo[] = ["Balcão", "Retirada", "Entrega"]
const SUGERIDAS = ["Dinheiro", "Pix", "Débito", "Crédito", "Duplicata", "Fiado", "Boleto", "Transferência", "Cheque", "Convênio", "Vale-crédito"]
const STATUS_LIST = ["Todas", "Aguardando pagamento", "Paga", "Em entrega", "Concluída", "Devolvida ao vendedor", "Cancelada"]
const BLANK_ADDR = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "RO", referencia: "", telefone: "", data: "", periodo: "Manhã", taxa: "10,00", obs: "" }

const REGISTROS = ["Venda", "Orçamento", "Transferência"] as const
type Registro = (typeof REGISTROS)[number]
const SECOES = ["Vendas", "Faturamento", "Devoluções", "Observação", "Outras informações", "Entrega"] as const
type Secao = (typeof SECOES)[number]
const BLANK_OUTRAS = { pedidoCliente: "", cpfNota: true, placa: "", destino: "", ref: "" }

const Tag = ({ s }: { s: string }) => <span className={`op-tag ${saleTone(s)}`}>{s}</span>

export default function Vendas() {
  const { data, activeUnit, profile, addItem, updateItem, staff, user, units, verifyPassword } = useVetFlow()
  const navigate = useNavigate()
  const seller = profile?.displayName || "Recepção"
  const all = data.vendas || []
  const sales = useMemo(() => all.filter((item) => item.kind === "Venda"), [all])
  const [tab, setTab] = useState<"nova" | "lista" | "orc">("nova")
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id) }, [])
  const [toast, setToast] = useState("")
  const showToast = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 3200) }

  /* ---------------- venda em edição ---------------- */
  const [editing, setEditing] = useState<Item | null>(null)
  const [tipo, setTipo] = useState<Tipo>("Balcão")
  const [clientId, setClientId] = useState("")
  const [cart, setCart] = useState<Line[]>([])
  const [descMode, setDescMode] = useState<"%" | "R$">("%")
  const [descValue, setDescValue] = useState("")
  const [sugerida, setSugerida] = useState("Pix")
  const [docEmitir, setDocEmitir] = useState("Cupom não fiscal")
  const [obs, setObs] = useState("")
  const [addr, setAddr] = useState({ ...BLANK_ADDR, data: todayISO() })
  const [useCadastro, setUseCadastro] = useState(true)
  /* liberação de desconto: guarda até quantos % o administrador autorizou nesta venda */
  const [approval, setApproval] = useState<{ pct: number; por: string; em: string } | null>(null)
  const [adminPass, setAdminPass] = useState("")
  const [adminUser, setAdminUser] = useState("")
  const [approvalErr, setApprovalErr] = useState("")
  const [approvalTries, setApprovalTries] = useState(0)
  const [descMotivo, setDescMotivo] = useState("")
  const [askApproval, setAskApproval] = useState(false)
  const [sent, setSent] = useState<Item | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const numero = editing?.name || nextNumber(sales, "VND")

  /* ---------------- cabeçalho estilo ERP ---------------- */
  const [registro, setRegistro] = useState<Registro>("Venda")
  const [sec, setSec] = useState<Secao>("Vendas")
  const [plano, setPlano] = useState("À vista")
  const [outras, setOutras] = useState({ ...BLANK_OUTRAS })
  const vendedores = useMemo(() => staff.filter((u) => u.active && u.role !== "Entregador" && u.role !== "Estoque"), [staff])
  const [vendedorId, setVendedorId] = useState(user?.id || "")
  const [ajudanteId, setAjudanteId] = useState("")
  const vendedorSel = staff.find((u) => u.id === vendedorId) || user || null
  const vendName = vendedorSel?.displayName || seller
  const vendCode = vendedorSel?.code || "—"
  const vendRef = useRef<HTMLSelectElement>(null)
  const ajudRef = useRef<HTMLSelectElement>(null)
  const [svcMode, setSvcMode] = useState(false)
  const [selLine, setSelLine] = useState<number | null>(null)
  const [obsLine, setObsLine] = useState<number | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const interno = editing?.extra?.interno || String(all.length + 1).padStart(6, "0")
  const documentoLabel = (DOCUMENTOS.find(([, v]) => v === sugerida) || [sugerida])[0]

  /* reservas: itens de vendas que ainda não passaram no caixa */
  const reserved = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of sales) {
      if (!/aguardando pag|devolvida/i.test(sale.status) || sale.id === editing?.id) continue
      for (const line of (sale.extra?.itens || []) as Line[]) if (line.tipo === "Produto" && line.ref) map.set(line.ref, (map.get(line.ref) || 0) + line.qtd)
    }
    return map
  }, [sales, editing])
  const available = (item: Item) => Math.max(0, (item.quantity || 0) - (reserved.get(item.id) || 0))

  /* ---------------- cliente ---------------- */
  const [cq, setCq] = useState("")
  const [cIdx, setCIdx] = useState(0)
  const [cadastro, setCadastro] = useState<{ initial: ClienteData; existing: Item | null } | null>(null)
  const [cFilter, setCFilter] = useState<"todos" | "debito" | "pj">("todos")
  const clientRef = useRef<HTMLInputElement>(null)
  const client = clientId === "cf" ? null : data.tutores.find((item) => item.id === clientId) || null
  const petsByOwner = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const a of data.animais) if (a.ownerId) m.set(a.ownerId, [...(m.get(a.ownerId) || []), a.name])
    return m
  }, [data.animais])
  /* busca: nome, apelido, CPF/CNPJ, telefone/WhatsApp, e-mail, animal, bairro, cidade ou código */
  type Hit = { tutor: Item; pets: string[]; why: string; score: number }
  const buscaClientes = (raw0: string, limite: number, todos = false): Hit[] => {
    const raw = raw0.trim()
    const q = normalizeText(raw)
    const digits = raw.replace(/\D/g, "")
    const words = q.split(/\s+/).filter(Boolean)
    const out: Hit[] = []
    for (const tutor of data.tutores) {
      if (cFilter === "debito" && !((tutor.amountValue || 0) > 0)) continue
      if (cFilter === "pj" && tutor.personType !== "Jurídica") continue
      const pets = petsByOwner.get(tutor.id) || []
      if (!q && !digits) { if (todos) out.push({ tutor, pets, why: "", score: 1 }); continue }
      const c = tutor.extra?.cadastro || {}
      const name = normalizeText(`${tutor.name} ${c.fantasia || ""}`)
      const docD = (tutor.cpf || "").replace(/\D/g, "")
      const phD = `${tutor.phone || ""} ${c.whatsapp || ""}`.replace(/\D/g, "")
      const code = tutor.id.replace(/\D/g, "").slice(-5)
      let score = 0, why = ""
      if (digits.length >= 3 && docD.startsWith(digits)) { score = 100; why = tutor.personType === "Jurídica" ? "CNPJ" : "CPF" }
      else if (digits.length >= 4 && phD.includes(digits)) { score = 90; why = "Telefone" }
      else if (digits.length >= 1 && digits === raw && code.endsWith(digits)) { score = 70; why = "Código" }
      else if (words.length && name.startsWith(q)) { score = 80; why = "Nome" }
      else if (words.length && name.split(/\s+/).some((w) => w.startsWith(q))) { score = 75; why = "Nome" }
      else if (words.length && words.every((w) => name.includes(w))) { score = 60; why = "Nome" }
      else if (words.length && pets.some((p) => normalizeText(p).includes(q))) { score = 50; why = `Animal: ${pets.find((p) => normalizeText(p).includes(q))}` }
      else if (q.includes("@") && normalizeText(tutor.email || "").includes(q)) { score = 50; why = "E-mail" }
      else if (words.length && normalizeText(`${tutor.address || ""} ${c.bairro || ""} ${c.cidade || ""}`).includes(q)) { score = 30; why = "Endereço" }
      if (score) out.push({ tutor, pets, why, score })
    }
    return out.sort((x, y) => y.score - x.score || x.tutor.name.localeCompare(y.tutor.name)).slice(0, limite)
  }
  const clientHits = useMemo(() => cq.trim() ? buscaClientes(cq, 8) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cq, cFilter, data.tutores, petsByOwner])
  /* tabela de clientes (F11 ou Enter na busca) */
  const [cliTab, setCliTab] = useState<string | null>(null)
  const [cliIdx, setCliIdx] = useState(0)
  const cliRows = useMemo(() => cliTab === null ? [] : buscaClientes(cliTab, 300, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cliTab, cFilter, data.tutores, petsByOwner])
  const abrirTabelaClientes = (q: string) => { setCliTab(q); setCliIdx(0) }
  const limiteDe = (t?: Item | null) => (t?.extra?.limiteCredito ?? LIMITE_FIADO) as number
  const fiado = useMemo(() => {
    if (!client) return { aberto: 0, limite: LIMITE_FIADO, bloqueado: false }
    let aberto = client.amountValue || 0
    for (const sale of sales) if (sale.ownerId === client.id && sale.status !== "Cancelada") for (const p of sale.extra?.pagamentos || []) if (p.forma === "Fiado") aberto += p.valor
    return { aberto, limite: limiteDe(client), bloqueado: !!client.extra?.bloqueadoFiado }
  }, [client, sales])
  const openCadastro = (existing: Item | null, prefill = "") => setCadastro({ initial: fromItem(existing, prefill), existing })
  const saveCadastro = (d: ClienteData) => {
    const patch = toItem(d, activeUnit.city || "")
    if (cadastro?.existing) {
      const ex = cadastro.existing
      updateItem("tutores", ex.id, { ...patch, status: ex.status === "Inadimplente" ? ex.status : "Ativo", extra: { ...(ex.extra || {}), ...(patch.extra || {}) } })
      setClientId(ex.id)
      showToast(`Cadastro de ${patch.name} atualizado.`)
    } else {
      const t = addItem("tutores", { id: `${activeUnit.id}-tutores-${Date.now()}`, ...patch })
      setClientId(t.id)
      showToast(`Cliente ${t.name} cadastrado e selecionado.`)
    }
    setCadastro(null); setCq("")
    window.setTimeout(() => prodRef.current?.focus(), 0)
  }
  const pickClient = (tutor: Item) => {
    setClientId(tutor.id); setCq(""); setCIdx(0); setCliTab(null)
    window.setTimeout(() => prodRef.current?.focus(), 0)
  }


  /* endereço do cadastro */
  useEffect(() => {
    if (tipo !== "Entrega" || !useCadastro) return
    if (client) {
      const [ruaNum = "", cidade = activeUnit.city || ""] = (client.address || "").split(" • ")
      const [rua = "", num = ""] = ruaNum.split(", ")
      setAddr((a) => ({ ...a, rua, numero: num, cidade, telefone: client.phone || a.telefone }))
    }
  }, [tipo, client, useCadastro, activeUnit.city])
  const [cepMsg, setCepMsg] = useState("")
  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8) return
    setCepMsg("Buscando CEP…")
    try {
      const ctrl = new AbortController()
      const t = window.setTimeout(() => ctrl.abort(), 3500)
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: ctrl.signal })
      window.clearTimeout(t)
      const j = await res.json()
      if (j.erro) throw new Error("cep")
      setAddr((a) => ({ ...a, rua: j.logradouro || a.rua, bairro: j.bairro || a.bairro, cidade: j.localidade || a.cidade, uf: j.uf || a.uf }))
      setCepMsg("Endereço preenchido pelo CEP.")
    } catch {
      setCepMsg("Não foi possível consultar o CEP. Preencha manualmente.")
    }
  }

  /* ---------------- produtos ---------------- */
  const [pq, setPq] = useState("")
  const [pIdx, setPIdx] = useState(0)
  const [qtyNext, setQtyNext] = useState(1)
  const prodRef = useRef<HTMLInputElement>(null)
  /* abre a lista para cima quando não há espaço embaixo (ex.: perto da barra de atalhos) */
  const [dropUp, setDropUp] = useState(false)
  const measureDrop = () => { const r = prodRef.current?.getBoundingClientRect(); if (r) setDropUp(window.innerHeight - r.bottom < 380 && r.top > 380) }
  const prodHits = useMemo(() => {
    const q = normalizeText(pq.trim())
    if (!q) return [] as Item[]
    const digits = pq.replace(/\D/g, "")
    if (svcMode) return (data.servicos || []).filter((item) => normalizeText(item.name).includes(q)).slice(0, 8)
    return data.estoque.filter((item) => normalizeText(item.name).includes(q) || (digits.length >= 3 && (codeOf(item).includes(digits) || shortCode(item).includes(digits)))).slice(0, 8)
  }, [pq, data.estoque, data.servicos, svcMode])
  const addService = (item: Item, qty = qtyNext) => {
    setCart((current) => [...current, { tipo: "Serviço", ref: item.id, codigo: shortCode(item), descricao: item.name, qtd: qty, preco: item.amountValue || Number(item.extra?.preco) || 0, desconto: 0, vendedor: vendCode }])
    setPq(""); setPIdx(0); setQtyNext(1)
    prodRef.current?.focus()
  }
  const addProduct = (item: Item, qty = qtyNext) => {
    if (svcMode) return addService(item, qty)
    const disp = available(item) - (cart.find((l) => l.ref === item.id)?.qtd || 0)
    if (disp <= 0) { showToast(`${item.name} sem estoque disponível.`); return }
    const q = Math.min(qty, disp)
    setCart((current) => {
      const found = current.find((l) => l.ref === item.id)
      if (found) return current.map((l) => (l === found ? { ...l, qtd: l.qtd + q } : l))
      return [...current, { tipo: "Produto", ref: item.id, codigo: shortCode(item), descricao: item.name, qtd: q, preco: priceOf(item), desconto: 0, vendedor: vendCode, lote: (item.name.match(/lote (\d+)/) || [])[1] || `L${shortCode(item)}`, validade: item.dueDate }]
    })
    if (q < qty) showToast(`Só ${q} disponível de ${item.name}.`)
    setPq(""); setPIdx(0); setQtyNext(1)
    prodRef.current?.focus()
  }
  const onProdKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setPIdx((i) => Math.min(prodHits.length - 1, i + 1)) }
    if (event.key === "ArrowUp") { event.preventDefault(); setPIdx((i) => Math.max(0, i - 1)) }
    if (event.key === "Enter") {
      event.preventDefault()
      const exact = data.estoque.find((item) => codeOf(item) === pq.trim())
      const hit = exact || prodHits[pIdx]
      if (hit) addProduct(hit)
    }
    if (event.key === "Escape") setPq("")
  }
  const setLine = (i: number, patch: Partial<Line>) => setCart((c) => c.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const stockOf = (ref?: string) => data.estoque.find((s) => s.id === ref)

  /* ---------------- totais ---------------- */
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0)
  const descNum = parseMoney(descValue)
  const desconto = Math.min(subtotal, descMode === "%" ? (subtotal * descNum) / 100 : descNum)
  const descPct = subtotal ? (desconto / subtotal) * 100 : 0
  const maxItemDesc = cart.reduce((m, l) => Math.max(m, l.desconto || 0), 0)
  /* desconto efetivo = itens + desconto geral, sobre o valor cheio */
  const bruto = cart.reduce((s, l) => s + l.qtd * l.preco, 0)
  const descEfetivo = bruto ? ((bruto - (subtotal - desconto)) / bruto) * 100 : 0
  const pctPedido = Math.round(Math.max(descEfetivo, maxItemDesc) * 100) / 100
  const isAdmin = user?.role === "Administrador"
  const acimaLimite = pctPedido > LIMITE_DESCONTO + 1e-9
  const approved = !!approval && pctPedido <= approval.pct + 1e-9
  const needApproval = acimaLimite && !isAdmin && !approved
  const admins = staff.filter((u) => u.active && u.role === "Administrador")
  const openApproval = () => { setAdminPass(""); setApprovalErr(""); setAdminUser(admins[0]?.id || ""); setAskApproval(true) }
  const confirmApproval = () => {
    if (approvalTries >= 5) { setApprovalErr("Muitas tentativas. Chame o administrador até o balcão."); return }
    const adm = admins.find((u) => u.id === adminUser)
    if (!adm || !verifyPassword(adm, adminPass)) {
      setApprovalTries((t) => t + 1)
      setApprovalErr(`Senha do administrador incorreta.${approvalTries + 1 >= 3 ? ` ${5 - approvalTries - 1} tentativa(s) restante(s).` : ""}`)
      setAdminPass("")
      return
    }
    setApproval({ pct: pctPedido, por: adm.displayName, em: stamp() })
    setApprovalTries(0); setAskApproval(false); setAdminPass("")
    showToast(`Desconto de ${pctPedido.toFixed(1).replace(".", ",")}% liberado por ${adm.displayName}.`)
  }
  const taxa = tipo === "Entrega" ? parseMoney(addr.taxa) : 0
  const total = Math.max(0, subtotal - desconto + taxa)
  const itensCount = cart.reduce((s, l) => s + l.qtd, 0)

  const releaseLock = () => {
    if (!editing) return
    const cur = sales.find((x) => x.id === editing.id)
    if (cur?.extra?.emEdicao) updateItem("vendas", cur.id, { extra: { ...cur.extra, emEdicao: undefined } })
  }
  const reset = (release = true) => {
    if (release) releaseLock()
    setEditing(null); setTipo("Balcão"); setClientId(""); setCart([]); setDescValue(""); setSugerida("Pix"); setObs("")
    setAddr({ ...BLANK_ADDR, data: todayISO() }); setUseCadastro(true); setApproval(null); setApprovalTries(0); setDescMotivo(""); setErrors([]); setCepMsg("")
    setRegistro("Venda"); setSec("Vendas"); setPlano("À vista"); setOutras({ ...BLANK_OUTRAS }); setAjudanteId(""); setVendedorId(user?.id || ""); setSvcMode(false); setSelLine(null); setObsLine(null)
    window.setTimeout(() => clientRef.current?.focus(), 0)
  }

  const validate = () => {
    const errs: string[] = []
    if (!cart.length) errs.push("Adicione pelo menos um produto.")
    if (sugerida === "Fiado" && !client) errs.push("Venda anotada (fiado) precisa de um cliente identificado.")
    if (sugerida === "Fiado" && fiado.bloqueado) errs.push("Este cliente está com vendas anotadas bloqueadas no cadastro.")
    if (sugerida === "Fiado" && client && fiado.aberto + total > fiado.limite) errs.push(`Limite de fiado excedido: em aberto ${brl(fiado.aberto)} + esta venda passa de ${brl(fiado.limite)}.`)
    if (tipo === "Entrega") {
      if (!addr.rua || !addr.numero || !addr.bairro || !addr.cidade) errs.push("Preencha rua, número, bairro e cidade da entrega.")
      if (!addr.telefone) errs.push("Informe um telefone para a entrega.")
      if (!addr.data) errs.push("Informe a data da entrega.")
    }
    setErrors(errs)
    return errs.length === 0
  }

  const finalize = (asQuoteArg = false) => {
    const asQuote = asQuoteArg || registro === "Orçamento"
    if (registro === "Transferência" && !asQuoteArg) {
      const prods = cart.filter((l) => l.tipo === "Produto")
      const errs = [!prods.length && "Adicione os produtos a transferir.", !outras.destino && "Escolha a unidade de destino em Outras informações."].filter(Boolean) as string[]
      if (errs.length) { setErrors(errs); if (!outras.destino) setSec("Outras informações"); return }
      for (const l of prods) {
        const st = stockOf(l.ref)
        if (st) { const q = Math.max(0, (st.quantity || 0) - l.qtd); updateItem("estoque", st.id, { quantity: q, subtitle: `${q} un. • mínimo ${st.minimum}`, status: q <= 0 ? "Esgotado" : q < (st.minimum || 0) ? "Abaixo do mínimo" : st.status }) }
      }
      const destino = units.find((u) => u.id === outras.destino)?.name || outras.destino
      const t = addItem("vendas", { id: `${activeUnit.id}-vendas-trf-${Date.now()}`, name: nextNumber(all, "TRF"), kind: "Transferência", status: "Transferida", date: todayISO(), time: nowTime(), subtitle: `Para ${destino}`, owner: destino, professional: vendName, amountValue: subtotal, extra: { itens: cart, subtotal, interno, registro, destino, operador: seller, obs, historico: [`${stamp()} · Transferência para ${destino} por ${seller}`] } })
      showToast(`${t.name}: ${prods.reduce((a, l) => a + l.qtd, 0)} un. transferidas para ${destino}. Estoque baixado.`)
      reset()
      return
    }
    if (editing && !asQuote) {
      const cur = sales.find((x) => x.id === editing.id) || editing
      const info = editInfo(cur, seller)
      if (!info.can) { setErrors([`Não foi possível salvar a correção: ${info.reason}`]); return }
    }
    if (asQuote) {
      if (!cart.length) { setErrors(["Adicione pelo menos um produto."]); return }
    } else {
      if (!validate()) return
      if (acimaLimite && !descMotivo.trim()) { setErrors([`Informe o motivo do desconto acima de ${LIMITE_DESCONTO}% (fica registrado na venda).`]); return }
      if (needApproval) { openApproval(); return }
    }
    const entrega: Entrega | undefined = tipo === "Entrega" ? {
      status: "Aguardando liberação", entregador: "", cep: addr.cep, rua: addr.rua, numero: addr.numero, complemento: addr.complemento, bairro: addr.bairro, cidade: addr.cidade, uf: addr.uf,
      referencia: addr.referencia, telefone: addr.telefone, data: addr.data, periodo: addr.periodo, taxa, aCobrar: 0, obs: addr.obs, historico: [`${stamp()} · Entrega criada por ${seller}`],
    } : undefined
    const base = {
      subtitle: client ? client.name : "Consumidor final",
      owner: client?.name || "Consumidor final",
      ownerId: client?.id,
      professional: vendName,
      amountValue: total,
      extra: {
        ...(editing?.extra || {}),
        itens: cart, subtotal, desconto, taxaEntrega: taxa, tipo, formaSugerida: sugerida, documentoEmitir: docEmitir, obs, pago: 0, pagamentos: [], entrega,
        descontoPct: pctPedido, descontoLiberado: acimaLimite ? { ...(isAdmin ? { por: user?.displayName, em: stamp(), pct: pctPedido } : approval), motivo: descMotivo.trim() } : undefined,
        interno, registro: asQuote ? "Orçamento" : "Venda", plano, documento: documentoLabel, vendedorCodigo: vendCode, operador: seller,
        ajudante: staff.find((u) => u.id === ajudanteId)?.displayName || undefined, outras,
        enviadaAs: nowTime(),
        finalizadaEm: editing?.extra?.finalizadaEm || Date.now(),
        emEdicao: undefined,
        historico: [...(editing?.extra?.historico || []), `${stamp()} · ${editing ? "Corrigida e reenviada" : "Enviada ao caixa"} por ${seller}`],
      },
    }
    if (asQuote) {
      const q = addItem("vendas", { ...base, id: `${activeUnit.id}-vendas-orc-${Date.now()}`, name: nextNumber(all, "ORC"), kind: "Orçamento", status: "Aberto", date: todayISO(), time: nowTime(), dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localISO(d) })() })
      showToast(`Orçamento ${q.name} salvo (válido por 7 dias).`)
      reset()
      return
    }
    let sale: Item
    if (editing) {
      updateItem("vendas", editing.id, { ...base, status: "Aguardando pagamento" })
      sale = { ...editing, ...base, status: "Aguardando pagamento" } as Item
    } else {
      sale = addItem("vendas", { ...base, id: `${activeUnit.id}-vendas-${Date.now()}`, name: numero, kind: "Venda", status: "Aguardando pagamento", date: todayISO(), time: nowTime() })
    }
    setSent(sale)
    reset(false)
  }

  /* atalhos (padrão do ERP) */
  const focusClient = () => { setSec("Vendas"); abrirTabelaClientes(cq) }
  const focusProd = (svc = false) => { setSvcMode(svc); setSec("Vendas"); window.setTimeout(() => prodRef.current?.focus(), 0) }
  const deleteLine = () => {
    if (!cart.length) return
    const i = selLine != null && selLine < cart.length ? selLine : cart.length - 1
    setCart((c) => c.filter((_, k) => k !== i)); setSelLine(null)
    showToast(`Item ${i + 1} apagado.`)
  }
  const obsItem = () => { if (cart.length) setObsLine(selLine != null && selLine < cart.length ? selLine : cart.length - 1) }
  const sair = () => {
    if (obsLine != null) return setObsLine(null)
    if (pq) return setPq("")
    if (cart.length) return setSairVenda(true)
    reset()
  }
  const [sairVenda, setSairVenda] = useState(false)
  /* Ctrl+P: com itens, imprime a pré-venda em A4 (orçamento/conferência); sem itens, imprime a tela */
  const imprimir = () => {
    if (!cart.length) { window.print(); return }
    const due = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localISO(d) })()
    const draft = { id: "draft", name: numero, subtitle: "", status: "Rascunho", createdAt: new Date().toISOString(), kind: "Venda", date: todayISO(), time: nowTime(), dueDate: due, owner: client?.name || "Consumidor final", ownerId: client?.id, professional: vendName, amountValue: total, extra: { itens: cart, subtotal, desconto, taxaEntrega: taxa, tipo, formaSugerida: sugerida, plano, entrega: tipo === "Entrega" ? { ...addr, taxa, aCobrar: 0, status: "", entregador: "" } : undefined } } as Item
    printHtml(numero, orcamentoHtml(draft, activeUnit.name, client || undefined), true)
  }
  /* atalhos: tecla F do ERP + alternativa com Alt (algumas teclas F são presas pelo navegador ou pelo Windows) */
  const [picker, setPicker] = useState<"vendedor" | "ajudante" | null>(null)
  const [pickQ, setPickQ] = useState("")
  const [pickIdx, setPickIdx] = useState(0)
  const openPicker = (k: "vendedor" | "ajudante") => { setPickQ(""); setPickIdx(0); setPicker(k) }
  const pickList = useMemo(() => {
    const base = picker === "ajudante" ? [{ id: "", displayName: "Nenhum", code: "—", role: "" }, ...staff.filter((u) => u.active && u.id !== vendedorId)] : vendedores
    const q = normalizeText(pickQ.trim())
    return base.filter((u) => !q || normalizeText(`${u.code || ""} ${u.displayName} ${u.role}`).includes(q))
  }, [picker, pickQ, staff, vendedores, vendedorId])
  const choose = (id: string) => {
    if (picker === "vendedor") { setVendedorId(id); showToast(`Vendedor: ${staff.find((u) => u.id === id)?.displayName}`) }
    else { setAjudanteId(id); showToast(id ? `Ajudante: ${staff.find((u) => u.id === id)?.displayName}` : "Sem ajudante") }
    setPicker(null)
  }
  const FKEYS: [string, string, () => void, string][] = [
    ["F5", "Incluir", () => focusProd(false), "Alt+I"],
    ["F3", "Apagar", deleteLine, "Alt+A"],
    ["F4", "Leitura", () => focusProd(false), "Alt+L"],
    ["F6", "Vendedor", () => openPicker("vendedor"), "Alt+V"],
    ["F7", "Ajudante", () => openPicker("ajudante"), "Alt+J"],
    ["F8", "Serviços", () => focusProd(true), "Alt+S"],
    ["F9", "Obs. item", obsItem, "Alt+O"],
    ["F11", "Cliente", focusClient, "Alt+C"],
    ["F10", "Salvar", () => finalize(), "Alt+G"],
    ["F2", "Finaliza", () => finalize(), "Ctrl+Enter"],
    ["Ctrl+P", "Imprimir", imprimir, "Alt+P"],
    ["Esc", "Sair", sair, "Esc"],
  ]
  useEffect(() => {
    if (tab !== "nova") return undefined
    const onKey = (event: KeyboardEvent) => {
      if (sent) { if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); setSent(null) } return }
      if (cadastro || askApproval || picker || cliTab !== null || sairVenda) return
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      const k = event.ctrlKey && key === "P" ? "Ctrl+P"
        : event.ctrlKey && key === "Enter" ? "Ctrl+Enter"
        : event.altKey && !event.ctrlKey && key.length === 1 ? `Alt+${key}`
        : key === "Escape" ? "Esc" : key
      const tgt = event.target as HTMLElement
      if (k === "Esc" && tgt?.closest?.(".op-drop, .op-search") && pq) { setPq(""); return }
      if (k === "Esc" && tgt && /INPUT|TEXTAREA/.test(tgt.tagName) && (tgt as HTMLInputElement).value && tgt !== prodRef.current) return
      const hit = FKEYS.find(([f, , , alt]) => f === k || alt === k)
      if (hit) { event.preventDefault(); event.stopPropagation(); hit[2]() }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  })

  /* ---------------- vendas realizadas ---------------- */
  const [lq, setLq] = useState("")
  const [lStatus, setLStatus] = useState("Todas")
  const [lTipo, setLTipo] = useState("Todos")
  const [mine, setMine] = useState(true)
  const [detail, setDetail] = useState<Item | null>(null)
  const [cancelSale, setCancelSale] = useState<Item | null>(null)
  const [motivo, setMotivo] = useState("")
  const listed = useMemo(() => {
    const q = normalizeText(lq.trim())
    return sales
      .filter((s) => (!mine || s.professional === seller) && (lStatus === "Todas" || s.status === lStatus) && (lTipo === "Todos" || (s.extra?.tipo || "Balcão") === lTipo) && (!q || normalizeText(`${s.name} ${s.owner} ${s.professional}`).includes(q)))
      .sort((a, b) => `${itemDate(b)}${b.time}`.localeCompare(`${itemDate(a)}${a.time}`))
  }, [sales, lq, lStatus, lTipo, mine, seller])
  const quotes = useMemo(() => all.filter((x) => x.kind === "Orçamento").sort((a, b) => `${itemDate(b)}${b.time || ""}`.localeCompare(`${itemDate(a)}${a.time || ""}`)), [all])
  const fromQuote = (qt: Item) => {
    reset()
    setTipo((qt.extra?.tipo as Tipo) || "Balcão"); setClientId(qt.ownerId || "cf"); setCart(qt.extra?.itens || [])
    setDescMode("R$"); setDescValue(qt.extra?.desconto ? String(qt.extra.desconto).replace(".", ",") : ""); setSugerida(qt.extra?.formaSugerida || "Pix")
    updateItem("vendas", qt.id, { status: "Convertido" })
    setTab("nova"); showToast(`Itens do ${qt.name} carregados. Confira e finalize.`)
  }
  const [limit, setLimit] = useState(60)
  const counts = useMemo(() => ({ aguardando: sales.filter((s) => s.status === "Aguardando pagamento").length, devolvidas: sales.filter((s) => s.status === "Devolvida ao vendedor").length }), [sales])

  const loadForEdit = (sale: Item) => {
    const info = editInfo(sale, seller)
    if (!info.can) { showToast(info.reason); return }
    updateItem("vendas", sale.id, { extra: { ...sale.extra, emEdicao: seller } })
    setEditing(sale)
    setTipo((sale.extra?.tipo as Tipo) || "Balcão")
    setClientId(sale.ownerId || "cf")
    setCart(sale.extra?.itens || [])
    setDescMode("R$"); setDescValue(sale.extra?.desconto ? String(sale.extra.desconto).replace(".", ",") : "")
    setSugerida(sale.extra?.formaSugerida || "Pix"); setObs(sale.extra?.obs || "")
    setPlano(sale.extra?.plano || "À vista"); setOutras({ ...BLANK_OUTRAS, ...(sale.extra?.outras || {}) }); setRegistro("Venda")
    const vend = staff.find((u) => u.displayName === sale.professional); if (vend) setVendedorId(vend.id)
    const e: Entrega | undefined = sale.extra?.entrega
    if (e) { setUseCadastro(false); setAddr({ ...BLANK_ADDR, ...e, taxa: String(e.taxa).replace(".", ","), complemento: e.complemento || "", referencia: e.referencia || "", obs: e.obs || "" }) }
    setDetail(null); setTab("nova")
  }
  const doCancel = () => {
    const sale = cancelSale!
    const wasPaid = /paga|conclu|em entrega/i.test(sale.status)
    if (wasPaid) {
      for (const l of (sale.extra?.itens || []) as Line[]) {
        const st = stockOf(l.ref)
        if (st && l.tipo === "Produto") updateItem("estoque", st.id, { quantity: (st.quantity || 0) + l.qtd, subtitle: `${(st.quantity || 0) + l.qtd} un. • mínimo ${st.minimum}` })
      }
      if (sale.extra?.pago) addItem("financeiro", { id: `${activeUnit.id}-financeiro-est-${Date.now()}`, name: `${sale.name} • Estorno`, subtitle: sale.owner || "", category: "Despesa", status: "Pago", date: todayISO(), amountValue: sale.extra.pago })
    }
    const e = sale.extra?.entrega
    updateItem("vendas", sale.id, { status: "Cancelada", extra: { ...sale.extra, motivoCancelamento: motivo, entrega: e ? { ...e, status: "Cancelada" } : e, historico: [...(sale.extra?.historico || []), `${stamp()} · Cancelada por ${seller}: ${motivo || "sem motivo"}`] } })
    showToast(`${sale.name} cancelada.${wasPaid ? " Estoque devolvido e valor estornado." : " Reserva liberada."}`)
    setCancelSale(null); setDetail(null); setMotivo("")
  }

  return (
    <Page bg="#f6eee2" blobs={[["#ffc9a3", -80, 140, 520, 460], ["#a8e2b8", "72%", -60, 380, 360]]} crumb="Vendas" title="Vendas" sub="Monte a venda, consulte o estoque e envie direto para o caixa. Tudo online, sem papel.">
      <div className="op op-vx">
      <div className="op-bar">
        <h1><ShoppingCart size={18} /> Vendas</h1>
        <span className="sep" />
        {tab === "nova" ? (
          <div className="op-meta">
            <span>Nº <span className="op-num">{numero}</span></span>
            <span><b>{fmtDate(todayISO())}</b> · {nowTime()}</span>
            <span>Vendedor <b>{seller}</b></span>
            <span className="op-hide-sm">Unidade <b>{activeUnit.name}</b></span>
            {editing && <span className="op-tag violet"><Pencil size={12} /> Editando {editing.name} · resta {mmss(editInfo(sales.find((x) => x.id === editing.id) || editing, seller, now).left)}</span>}
          </div>
        ) : (
          <div className="op-meta"><span><b>{listed.length}</b> vendas</span><span><b>{counts.aguardando}</b> aguardando o caixa</span></div>
        )}
        <span className="grow" />
        <div className="op-tabs" role="tablist">
          <button role="tab" className={tab === "nova" ? "on" : ""} onClick={() => setTab("nova")}>Nova venda</button>
          <button role="tab" className={tab === "lista" ? "on" : ""} onClick={() => setTab("lista")}>Vendas realizadas {counts.devolvidas > 0 && <span className="cnt">{counts.devolvidas}</span>}</button>
          <button role="tab" className={tab === "orc" ? "on" : ""} onClick={() => setTab("orc")}>Orçamentos</button>
        </div>
        <button className="op-btn sm" onClick={() => navigate("/caixa")}>Ir para o caixa</button>
      </div>

      {tab === "nova" && (
        <div className="op-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 360px" }}>
          <div className="op-col">
            {/* cabeçalho ERP */}
            <div className="op-card op-erp">
              <div className="op-erp-top">
                <div className="op-erp-f"><span>Nota</span><b className="op-num">{registro === "Orçamento" ? nextNumber(all, "ORC") : registro === "Transferência" ? nextNumber(all, "TRF") : numero}</b></div>
                <div className="op-erp-f"><span>Nº interno</span><b className="mono">{interno}</b></div>
                <div className="op-erp-f"><span>Emissão</span><b>{fmtDate(todayISO())}</b></div>
                <div className="op-erp-f"><span>Hora</span><b className="mono">{new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b></div>
                <div className="op-erp-f grow"><span>Tipo de registro</span>
                  <div className="op-tabs">{REGISTROS.map((r) => <button key={r} className={registro === r ? "on" : ""} disabled={!!editing && r !== "Venda"} onClick={() => setRegistro(r)}>{r}</button>)}</div>
                </div>
              </div>
              <div className="op-erp-row">
                <label className="op-f"><span>Vendedor <kbd>F6</kbd></span>
                  <select ref={vendRef} className="op-in" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                    {vendedores.map((u) => <option key={u.id} value={u.id}>{u.code || "—"} · {u.displayName}</option>)}
                  </select>
                </label>
                <label className="op-f"><span>Ajudante <kbd>F7</kbd></span>
                  <select ref={ajudRef} className="op-in" value={ajudanteId} onChange={(e) => setAjudanteId(e.target.value)}>
                    <option value="">Nenhum</option>
                    {staff.filter((u) => u.active && u.id !== vendedorId).map((u) => <option key={u.id} value={u.id}>{u.code || "—"} · {u.displayName}</option>)}
                  </select>
                </label>
                <div className="op-f"><span>Tipo de venda</span>
                  <div className="op-tabs">{TIPOS.map((t) => <button key={t} className={tipo === t ? "on" : ""} onClick={() => { setTipo(t); if (t === "Entrega") setSec("Entrega") }}>{t === "Entrega" && <Truck size={14} />}{t}</button>)}</div>
                </div>
                <label className="op-f"><span>Plano de pagamento</span>
                  <select className="op-in" value={plano} onChange={(e) => setPlano(e.target.value)}>{PLANOS.map((p) => <option key={p}>{p}</option>)}</select>
                </label>
                <label className="op-f"><span>Forma de pagamento sugerida</span>
                  <select className="op-in" value={sugerida} onChange={(e) => setSugerida(e.target.value)}>{DOCUMENTOS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="op-f"><span>Documento a emitir</span>
                  <select className="op-in" value={docEmitir} onChange={(e) => setDocEmitir(e.target.value)}>{["Cupom não fiscal", "Recibo", "Nota fiscal (em breve)"].map((d) => <option key={d} disabled={/em breve/.test(d)}>{d}</option>)}</select>
                </label>
              </div>
              <div className="op-erp-tabs" role="tablist">
                {SECOES.map((x) => <button key={x} role="tab" aria-selected={sec === x} className={sec === x ? "on" : ""} onClick={() => setSec(x)}>{x}{x === "Entrega" && tipo === "Entrega" ? <i className="dot" /> : null}{x === "Observação" && obs ? <i className="dot" /> : null}</button>)}
              </div>
              {sec === "Faturamento" && (() => {
                const pi = planoInfo(plano)
                const venc = (i: number) => { const d = new Date(); d.setMonth(d.getMonth() + (pi.entrada ? i : i + (pi.total > 1 ? 1 : 0))); return localISO(d) }
                const v = pi.total ? total / pi.total : total
                return (
                  <div className="op-cb">
                    <div className="op-table">
                      <div className="op-tr op-th" style={{ gridTemplateColumns: "70px minmax(0,1fr) 130px 120px" }}><span>Parcela</span><span>Forma</span><span>Vencimento</span><span className="r">Valor</span></div>
                      {Array.from({ length: pi.total }, (_, i) => (
                        <div key={i} className="op-tr" style={{ gridTemplateColumns: "70px minmax(0,1fr) 130px 120px" }}><span className="mono">{i + 1}/{pi.total}</span><span>{pi.entrada && i === 0 ? "Entrada" : documentoLabel}</span><span className="num">{fmtDate(i === 0 && (pi.entrada || pi.total === 1) ? todayISO() : venc(i))}</span><b className="r num">{brl(v)}</b></div>
                      ))}
                    </div>
                    <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>Prévia do faturamento. O caixa confirma valores, datas e a forma real de recebimento.</p>
                  </div>
                )
              })()}
              {sec === "Devoluções" && (() => {
                const devs = sales.filter((x) => client && x.ownerId === client.id && /cancel|devolv/i.test(x.status)).slice(0, 8)
                return <div className="op-cb">{!client ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Selecione o cliente para ver devoluções e cancelamentos anteriores.</p> : devs.length ? <div className="op-table">{devs.map((d) => <div key={d.id} className="op-tr" style={{ gridTemplateColumns: "120px 110px minmax(0,1fr) 110px" }}><span className="mono">{d.name}</span><span className="num muted">{fmtDate(itemDate(d))}</span><span><Tag s={d.status} />{d.extra?.motivoCancelamento ? <small>{d.extra.motivoCancelamento}</small> : null}</span><b className="r num">{brl(d.amountValue || 0)}</b></div>)}</div> : <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nenhuma devolução registrada para {client.name}.</p>}</div>
              })()}
              {sec === "Observação" && <div className="op-cb"><textarea className="op-in" style={{ minHeight: 90 }} placeholder="Observação da venda (sai no pedido e aparece para o caixa)" value={obs} onChange={(e) => setObs(e.target.value)} /></div>}
              {sec === "Outras informações" && (
                <div className="op-cb">
                  <div className="op-fields" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                    <label className="op-f"><span>Pedido do cliente</span><input className="op-in" value={outras.pedidoCliente} onChange={(e) => setOutras({ ...outras, pedidoCliente: e.target.value })} /></label>
                    <label className="op-f"><span>Referência / fazenda</span><input className="op-in" value={outras.ref} onChange={(e) => setOutras({ ...outras, ref: e.target.value })} /></label>
                    <label className="op-f"><span>Placa do veículo</span><input className="op-in" value={outras.placa} onChange={(e) => setOutras({ ...outras, placa: e.target.value.toUpperCase() })} /></label>
                    <label className="op-f"><span>Unidade de destino {registro === "Transferência" ? "*" : ""}</span>
                      <select className="op-in" value={outras.destino} onChange={(e) => setOutras({ ...outras, destino: e.target.value })}><option value="">—</option>{units.filter((u) => u.id !== activeUnit.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    </label>
                  </div>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 10 }}><input type="checkbox" checked={outras.cpfNota} onChange={(e) => setOutras({ ...outras, cpfNota: e.target.checked })} /> CPF/CNPJ do cliente na nota</label>
                </div>
              )}
              {sec === "Entrega" && tipo !== "Entrega" && <div className="op-cb"><div className="op-note info"><Truck size={14} /> Esta venda é {tipo.toLowerCase()}. <button className="op-link" onClick={() => setTipo("Entrega")}>Transformar em entrega</button></div></div>}
              {registro !== "Venda" && <div className="op-cb" style={{ paddingTop: 0 }}><div className="op-note info">{registro === "Orçamento" ? "Orçamento: salva os itens por 7 dias, sem reservar estoque e sem ir ao caixa." : "Transferência: os produtos saem deste estoque para a unidade de destino. Não passa pelo caixa."}</div></div>}
            </div>

            {/* cliente */}
            <div className="op-card">
              <div className="op-ch"><h2><User /> Cliente <kbd>F11</kbd></h2>
                {!client && clientId !== "cf" && <div style={{ display: "flex", gap: 6 }}><button className="op-btn sm" onClick={() => abrirTabelaClientes(cq)}><Users /> Ver clientes</button><button className="op-btn sm" onClick={() => openCadastro(null, cq)}><UserPlus /> Novo cliente</button><button className="op-btn sm" onClick={() => setClientId("cf")}>Consumidor final</button></div>}
                {(client || clientId === "cf") && <span style={{ display: "flex", gap: 14 }}>{client && <button className="op-link" onClick={() => openCadastro(client)}>Editar cadastro</button>}<button className="op-link" onClick={() => abrirTabelaClientes("")}>Trocar cliente</button></span>}
              </div>
              <div className="op-cb">
                {client ? (
                  <>
                    <div className="op-client">
                      <span className="op-av">{initials(client.name)}</span>
                      <div><strong>{client.name}{client.extra?.cadastro?.fantasia ? <span className="muted" style={{ fontWeight: 500 }}> · {client.extra.cadastro.fantasia}</span> : null}</strong><small>{client.cpf ? `${client.personType === "Jurídica" ? "CNPJ" : "CPF"} ${client.cpf} · ` : ""}{client.phone}{client.email ? ` · ${client.email}` : ""}</small><small>{(client.address || "").replace(" • ", " · ") || "Sem endereço cadastrado"}{client.extra?.cadastro?.bairro ? ` · ${client.extra.cadastro.bairro}` : ""}</small></div>
                      {client.status === "Inadimplente" ? <span className="op-tag red">Inadimplente</span> : <span className="op-tag green">Ativo</span>}
                    </div>
                    <div className="op-credit">
                      <div><span>Em aberto (anotado)</span><b className={fiado.aberto > 0 ? "" : "muted"}>{brl(fiado.aberto)}</b></div>
                      <div><span>Limite de crédito</span><b>{brl(fiado.limite)}</b></div>
                      <div><span>Disponível</span><b>{brl(Math.max(0, fiado.limite - fiado.aberto))}</b>
                        <span className="op-meter"><i className={fiado.aberto / fiado.limite > 0.9 ? "bad" : fiado.aberto / fiado.limite > 0.6 ? "warn" : ""} style={{ width: `${Math.min(100, (fiado.aberto / fiado.limite) * 100)}%` }} /></span></div>
                    </div>
                    {client.status === "Inadimplente" && <div className="op-note bad" style={{ marginTop: 10 }}><AlertTriangle /> Cliente com pagamento em atraso. Venda anotada (fiado) não recomendada.</div>}
                    {fiado.bloqueado && <div className="op-note bad" style={{ marginTop: 10 }}><AlertTriangle /> Vendas anotadas (fiado) bloqueadas no cadastro deste cliente.</div>}
                    {(!client.cpf || !client.address) && <div className="op-note info" style={{ marginTop: 10 }}><AlertTriangle /> Cadastro incompleto: {[!client.cpf && "CPF/CNPJ", !client.address && "endereço"].filter(Boolean).join(" e ")}. <button className="op-link" onClick={() => openCadastro(client)}>Completar agora</button></div>}
                  </>
                ) : clientId === "cf" ? (
                  <div className="op-client"><span className="op-av">CF</span><div><strong>Consumidor final</strong><small>Venda sem identificação do cliente.</small></div><span /></div>
                ) : (
                  <><div className="op-search">
                    <Search />
                    <input ref={clientRef} className="op-in lg" autoFocus placeholder="Nome, CPF/CNPJ, telefone, e-mail, animal, bairro ou código" value={cq} onChange={(e) => { setCq(e.target.value); setCIdx(0) }}
                      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setCIdx((i) => Math.min(clientHits.length, i + 1)) } if (e.key === "ArrowUp") { e.preventDefault(); setCIdx((i) => Math.max(0, i - 1)) } if (e.key === "Enter") { e.preventDefault(); if (cIdx > 0 && clientHits[cIdx]) pickClient(clientHits[cIdx].tutor); else if (cIdx > 0 && cIdx === clientHits.length && cq.trim()) openCadastro(null, cq); else abrirTabelaClientes(cq) } if (e.key === "Escape") setCq("") }} />
                    {cq.trim().length >= 1 && (
                      <div className="op-drop">
                        {clientHits.map(({ tutor, pets, why }, i) => (
                          <div key={tutor.id} className={`op-tr click ${i === cIdx ? "act" : ""}`} style={{ gridTemplateColumns: "minmax(0,1.5fr) 150px minmax(0,1fr) 120px" }} onMouseDown={(e) => { e.preventDefault(); pickClient(tutor) }}>
                            <span className="op-hit-main"><strong>{tutor.name}</strong><small>{tutor.cpf ? `${tutor.personType === "Jurídica" ? "CNPJ" : "CPF"} ${tutor.cpf}` : "sem documento"} · {(tutor.address || "").split(" • ")[1] || (tutor.address || "").split(" • ")[0] || "sem endereço"}</small></span>
                            <span><span className="mono">{tutor.phone}</span><small>encontrado por {why.toLowerCase()}</small></span>
                            <span className="muted">{pets.length ? `🐾 ${pets.slice(0, 3).join(", ")}${pets.length > 3 ? ` +${pets.length - 3}` : ""}` : "sem animais"}</span>
                            <span className="r">{(tutor.amountValue || 0) > 0 ? <span className="op-tag amber">deve {brl(tutor.amountValue || 0)}</span> : <span className="muted">sem débito</span>}</span>
                          </div>
                        ))}
                        {!clientHits.length && <div className="op-empty">Nenhum cliente encontrado para “{cq.trim()}”.</div>}
                        <div className={`op-tr click new ${cIdx === clientHits.length ? "act" : ""}`} style={{ gridTemplateColumns: "1fr" }} onMouseDown={(e) => { e.preventDefault(); openCadastro(null, cq) }}><span><UserPlus size={14} /> Cadastrar novo cliente {/\d/.test(cq) ? "com este documento/telefone" : `“${cq.trim()}”`}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="op-tabs" style={{ marginTop: 8 }}>{([["todos", "Todos"], ["debito", "Com débito"], ["pj", "Empresas"]] as const).map(([k, l]) => <button key={k} className={cFilter === k ? "on" : ""} onClick={() => setCFilter(k)}>{l}</button>)}</div></>
                )}
              </div>
            </div>

            {/* produtos */}
            <div className="op-card">
              <div className="op-ch"><h2><Package /> Itens <kbd>F5</kbd></h2>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="op-tabs" style={{ padding: 2 }}><button className={!svcMode ? "on" : ""} onClick={() => focusProd(false)}>Produtos</button><button className={svcMode ? "on" : ""} onClick={() => focusProd(true)}>Serviços <kbd>F8</kbd></button></span>
                  <span className="muted" style={{ fontSize: 12 }}>{itensCount} {itensCount === 1 ? "item" : "itens"}</span>
                </span></div>
              <div className="op-cb" style={{ display: "flex", gap: 8 }}>
                <label className="op-f" style={{ width: 76 }}><span>Qtd.</span><input className="op-in lg r" inputMode="numeric" value={qtyNext} onChange={(e) => setQtyNext(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} /></label>
                <div className="op-f grow"><span>Produto</span>
                  <div className="op-search">
                    <ScanBarcode />
                    <input ref={prodRef} className="op-in lg" placeholder={svcMode ? "Buscar serviço: consulta, banho, vacina…" : "Nome, código ou código de barras (leitor F4)"} value={pq} onFocus={measureDrop} onChange={(e) => { setPq(e.target.value); setPIdx(0); measureDrop() }} onKeyDown={onProdKey} />
                    {prodHits.length > 0 && (
                      <div className={`op-drop ${dropUp ? "up" : ""}`}>
                        <div className="op-tr op-th" style={{ gridTemplateColumns: "70px minmax(0,1fr) 120px 80px 90px" }}><span>Código</span><span>Produto</span><span>Lote · validade</span><span className="r">Disp.</span><span className="r">Preço</span></div>
                        {prodHits.map((item, i) => {
                          if (svcMode) return (
                            <div key={item.id} className={`op-tr click ${i === pIdx ? "act" : ""}`} style={{ gridTemplateColumns: "70px minmax(0,1fr) 120px 80px 90px" }} onMouseDown={(e) => { e.preventDefault(); addService(item) }}>
                              <span className="mono muted">{shortCode(item)}</span><span><strong>{item.name}</strong><small>Serviço</small></span><span className="muted">—</span><span className="r muted">—</span><b className="r num">{brl(item.amountValue || 0)}</b>
                            </div>
                          )
                          const disp = available(item)
                          return (
                            <div key={item.id} className={`op-tr click ${i === pIdx ? "act" : ""}`} style={{ gridTemplateColumns: "70px minmax(0,1fr) 120px 80px 90px", opacity: disp ? 1 : 0.55 }} onMouseDown={(e) => { e.preventDefault(); addProduct(item) }}>
                              <span className="mono muted">{shortCode(item)}</span>
                              <span><strong>{item.name.replace(/ • lote \d+/, "")}</strong><small>{item.category}</small></span>
                              <span className="muted">{(item.name.match(/lote (\d+)/) || [])[1] || `L${shortCode(item)}`} · {fmtDate(item.dueDate, { month: "2-digit", year: "2-digit" })}</span>
                              <span className="r">{disp ? <b className="num" style={{ color: disp < (item.minimum || 0) ? "var(--amber)" : undefined }}>{disp}</b> : <span className="op-tag red plain">Esgotado</span>}</span>
                              <b className="r num">{brl(priceOf(item))}</b>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="op-table">
                <div className="op-tr op-th" style={{ gridTemplateColumns: "24px minmax(0,1fr) 96px 54px 84px 58px 94px 40px 26px" }}><span>#</span><span>Código · Descrição</span><span>Quant.</span><span className="r" title="Disponível = estoque menos o que já está reservado em outras vendas (mesmo número da busca)">Disp.</span><span className="r">Preço</span><span className="r">Desc. %</span><span className="r">Vl. total</span><span className="r">Vend.</span><span /></div>
                {cart.length === 0 && <div className="op-empty">Nenhum produto. Busque pelo nome ou passe o leitor de código de barras.</div>}
                {cart.map((line, i) => {
                  const st = stockOf(line.ref)
                  const disp = st && line.tipo === "Produto" ? available(st) : 999
                  return (
                    <div key={`${line.ref}-${i}`} className={`op-tr click ${selLine === i ? "act" : ""}`} onClick={() => setSelLine(i)} style={{ gridTemplateColumns: "24px minmax(0,1fr) 96px 54px 84px 58px 94px 40px 26px" }}>
                      <span className="muted num">{i + 1}</span>
                      <span><small className="mono" style={{ marginTop: 0 }}>{line.codigo || "—"}</small><strong>{line.descricao.replace(/ • lote \d+/, "")}</strong><small>{line.tipo === "Serviço" ? "Serviço" : <>Lote {line.lote || "—"}{line.validade ? ` · val. ${fmtDate(line.validade, { month: "2-digit", year: "2-digit" })}` : ""}{disp - line.qtd < (st?.minimum || 0) && st ? " · estoque ficará baixo" : ""}</>}</small>{line.obs ? <small style={{ color: "var(--or)" }}>Obs.: {line.obs}</small> : null}
                        {obsLine === i && <input className="op-in" autoFocus style={{ height: 28, marginTop: 4 }} placeholder="Observação do item (Enter salva)" defaultValue={line.obs || ""} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { setLine(i, { obs: (e.target as HTMLInputElement).value }); setObsLine(null) } if (e.key === "Escape") { e.stopPropagation(); setObsLine(null) } }} onBlur={(e) => { setLine(i, { obs: e.target.value }); setObsLine(null) }} />}</span>
                      <span className="op-qty"><button onClick={() => setLine(i, { qtd: Math.max(1, line.qtd - 1) })}>−</button><input value={line.qtd} onChange={(e) => setLine(i, { qtd: Math.max(1, Math.min(disp, Number(e.target.value.replace(/\D/g, "")) || 1)) })} aria-label="Quantidade" /><button onClick={() => setLine(i, { qtd: Math.min(disp, line.qtd + 1) })}>+</button></span>
                      <span className="r num">{st ? <b style={{ color: available(st) - line.qtd < 0 ? "var(--red, #b4322a)" : available(st) - line.qtd < (st.minimum || 0) ? "var(--amber)" : undefined }}>{available(st)}</b> : <span className="muted">—</span>}</span>
                      <span className="r num">{brl(line.preco)}</span>
                      <input className="op-in r" style={{ height: 30 }} value={line.desconto || ""} placeholder="0" onChange={(e) => setLine(i, { desconto: Math.min(100, Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0) })} aria-label="Desconto do item" />
                      <b className="r num">{brl(lineTotal(line))}</b>
                      <span className="r mono muted">{line.vendedor || vendCode}</span>
                      <button className="op-x" aria-label="Remover" onClick={(e) => { e.stopPropagation(); setCart((c) => c.filter((_, k) => k !== i)) }}><Trash2 /></button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* entrega */}
            {tipo === "Entrega" && (sec === "Entrega" || sec === "Vendas") && (
              <div className="op-card">
                <div className="op-ch"><h2><MapPin /> Endereço de entrega</h2>
                  {client && <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5 }}><input type="checkbox" checked={useCadastro} onChange={(e) => setUseCadastro(e.target.checked)} /> Usar endereço do cadastro</label>}
                </div>
                <div className="op-cb">
                  <div className="op-fields" style={{ gridTemplateColumns: "130px minmax(0,2fr) 90px minmax(0,1fr)" }}>
                    <label className="op-f"><span>CEP</span><input className="op-in" placeholder="00000-000" value={addr.cep} onChange={(e) => { const v = e.target.value; setAddr({ ...addr, cep: v }); if (v.replace(/\D/g, "").length === 8) lookupCep(v) }} /></label>
                    <label className="op-f"><span>Rua *</span><input className="op-in" value={addr.rua} onChange={(e) => setAddr({ ...addr, rua: e.target.value })} /></label>
                    <label className="op-f"><span>Número *</span><input className="op-in" value={addr.numero} onChange={(e) => setAddr({ ...addr, numero: e.target.value })} /></label>
                    <label className="op-f"><span>Complemento</span><input className="op-in" value={addr.complemento} onChange={(e) => setAddr({ ...addr, complemento: e.target.value })} /></label>
                  </div>
                  <div className="op-fields" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 70px minmax(0,1.4fr)", marginTop: 10 }}>
                    <label className="op-f"><span>Bairro *</span><input className="op-in" value={addr.bairro} onChange={(e) => setAddr({ ...addr, bairro: e.target.value })} /></label>
                    <label className="op-f"><span>Cidade *</span><input className="op-in" value={addr.cidade} onChange={(e) => setAddr({ ...addr, cidade: e.target.value })} /></label>
                    <label className="op-f"><span>UF</span><input className="op-in" maxLength={2} value={addr.uf} onChange={(e) => setAddr({ ...addr, uf: e.target.value.toUpperCase() })} /></label>
                    <label className="op-f"><span>Ponto de referência</span><input className="op-in" value={addr.referencia} onChange={(e) => setAddr({ ...addr, referencia: e.target.value })} /></label>
                  </div>
                  <div className="op-fields" style={{ gridTemplateColumns: "150px 150px 180px 110px minmax(0,1fr)", marginTop: 10 }}>
                    <label className="op-f"><span>Telefone *</span><input className="op-in" value={addr.telefone} onChange={(e) => setAddr({ ...addr, telefone: e.target.value })} /></label>
                    <label className="op-f"><span>Data *</span><input className="op-in" type="date" value={addr.data} onChange={(e) => setAddr({ ...addr, data: e.target.value })} /></label>
                    <div className="op-f"><span>Período</span><div className="op-tabs">{["Manhã", "Tarde", "Noite"].map((p) => <button key={p} className={addr.periodo === p ? "on" : ""} onClick={() => setAddr({ ...addr, periodo: p })}>{p}</button>)}</div></div>
                    <label className="op-f"><span>Taxa (R$)</span><input className="op-in r" value={addr.taxa} onChange={(e) => setAddr({ ...addr, taxa: e.target.value })} /></label>
                    <label className="op-f"><span>Observações para o entregador</span><input className="op-in" placeholder="Ex.: deixar na portaria" value={addr.obs} onChange={(e) => setAddr({ ...addr, obs: e.target.value })} /></label>
                  </div>
                  {cepMsg && <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>{cepMsg}</p>}
                </div>
              </div>
            )}
          </div>

          {/* resumo */}
          <div className="op-col op-sticky">
            <div className="op-card">
              <div className="op-ch"><h2>Resumo</h2><span className="op-num">{numero}</span></div>
              <div className="op-cb op-sum">
                <div><span>Itens</span><b>{itensCount}</b></div>
                <div><span>Subtotal</span><b>{brl(bruto)}</b></div>
                {bruto - subtotal > 0.004 && <div><span className="muted">Descontos nos itens</span><b>− {brl(bruto - subtotal)}</b></div>}
                <div>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>Desconto
                    <span className="op-tabs" style={{ padding: 2 }}>{(["%", "R$"] as const).map((m) => <button key={m} style={{ height: 22, padding: "0 7px" }} className={descMode === m ? "on" : ""} onClick={() => setDescMode(m)}>{m}</button>)}</span>
                  </span>
                  <input className="op-in r" style={{ width: 92, height: 30 }} placeholder="0" value={descValue} onChange={(e) => setDescValue(e.target.value)} aria-label="Desconto geral" />
                </div>
                {desconto > 0 && <div><span className="muted">Desconto aplicado ({descPct.toFixed(1).replace(".", ",")}%)</span><b>− {brl(desconto)}</b></div>}
                {tipo === "Entrega" && <div><span>Taxa de entrega</span><b>{brl(taxa)}</b></div>}
                {pctPedido > 0 && <div className="op-desc-meter"><span>Desconto total {pctPedido.toFixed(1).replace(".", ",")}%</span><span className="bar"><i className={acimaLimite ? "over" : ""} style={{ width: `${Math.min(100, (pctPedido / (LIMITE_DESCONTO * 2)) * 100)}%` }} /><em style={{ left: "50%" }} title={`Limite ${LIMITE_DESCONTO}%`} /></span><small>limite {LIMITE_DESCONTO}%</small></div>}
                {acimaLimite && <label className="op-f"><span>Motivo do desconto acima de {LIMITE_DESCONTO}% *</span><input className="op-in" value={descMotivo} placeholder="Ex.: cliente antigo, produto com avaria" onChange={(e) => setDescMotivo(e.target.value)} /></label>}
                {needApproval && <div className="op-note warn" style={{ alignItems: "center" }}><Lock size={14} /> Desconto acima de {LIMITE_DESCONTO}%: precisa da senha do administrador. <button className="op-link" onClick={openApproval}>Liberar agora</button></div>}
                {acimaLimite && isAdmin && <div className="op-note ok"><Check /> Você é administrador: desconto acima de {LIMITE_DESCONTO}% permitido.</div>}
                {approved && acimaLimite && !isAdmin && <div className="op-note ok"><Check /> Liberado por {approval!.por} até {approval!.pct.toFixed(1).replace(".", ",")}%.</div>}
              </div>
              <div className="op-total"><span>Total</span><b>{brl(total)}</b></div>
            </div>
            <div className="op-card">
              <div className="op-ch"><h2>Pagamento</h2><span className="op-tag plain">{plano}{planoInfo(plano).total > 1 ? ` · ${planoInfo(plano).total}× ${brl(total / planoInfo(plano).total)}` : ""}</span></div>
              <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="op-chips">{DOCUMENTOS.map(([l, f]) => <button key={f} className={`op-chip ${sugerida === f ? "on" : ""}`} onClick={() => setSugerida(f)}>{l}</button>)}</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>Forma de pagamento e plano são uma indicação: o recebimento é feito e confirmado no caixa.</p>
              </div>
            </div>
            {errors.length > 0 && <div className="op-note bad" style={{ flexDirection: "column", gap: 4 }}>{errors.map((e) => <span key={e}>• {e}</span>)}</div>}
            <button className="op-btn pri lg" onClick={() => finalize()}><Send /> {registro === "Orçamento" ? "Salvar orçamento" : registro === "Transferência" ? "Confirmar transferência" : "Salvar e enviar ao caixa"} <kbd>F10</kbd></button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="op-btn grow" onClick={() => finalize(true)}><FileText /> Salvar como orçamento</button>
              <button className="op-btn dan" onClick={() => reset()}><X /> {editing ? "Descartar edição" : "Limpar"}</button>
            </div>
            {cart.length > 0 && (
              <div ref={printRef} className="op-card op-cb" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Imprimir antes de finalizar</span>
                <PrintBar sale={{ id: "draft", name: numero, subtitle: "", status: "Rascunho", createdAt: new Date().toISOString(), kind: "Venda", date: todayISO(), time: nowTime(), dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return localISO(d) })(), owner: client?.name || "Consumidor final", ownerId: client?.id, professional: seller, amountValue: total, extra: { itens: cart, subtotal, desconto, taxaEntrega: taxa, tipo, formaSugerida: sugerida, entrega: tipo === "Entrega" ? { ...addr, taxa, aCobrar: 0, status: "", entregador: "" } : undefined } } as Item} unitName={activeUnit.name} tutor={client || undefined} only={["Orçamento", "Conferência", "Duplicata"]} />
              </div>
            )}
          </div>
          <div className="op-fkeys" role="toolbar" aria-label="Atalhos">
            {FKEYS.map(([k, l, fn, alt]) => <button key={k} className={k === "F2" ? "pri" : k === "Esc" ? "k-esc" : ""} title={alt !== k ? `${k} ou ${alt}` : k} onClick={fn}><kbd>{k}</kbd>{l}{alt !== k && <small className="alt">{alt}</small>}</button>)}
          </div>
        </div>
      )}

      {tab === "lista" && (
        <div className="op-card">
          <div className="op-cb" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="op-tabs"><button className={mine ? "on" : ""} onClick={() => setMine(true)}>Minhas vendas</button><button className={!mine ? "on" : ""} onClick={() => setMine(false)}>Todas</button></div>
            <div className="op-search" style={{ width: 300 }}><Search /><input className="op-in" placeholder="Nº da venda, cliente ou vendedor" value={lq} onChange={(e) => setLq(e.target.value)} /></div>
            <select className="op-in" style={{ width: 210 }} value={lStatus} onChange={(e) => setLStatus(e.target.value)}>{STATUS_LIST.map((s) => <option key={s}>{s}</option>)}</select>
            <select className="op-in" style={{ width: 140 }} value={lTipo} onChange={(e) => setLTipo(e.target.value)}>{["Todos", ...TIPOS].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="op-table">
            <div className="op-tr op-th" style={{ gridTemplateColumns: "118px 110px minmax(0,1.4fr) minmax(0,1fr) 96px 110px 180px 96px" }}><span>Nº</span><span>Data</span><span>Cliente</span><span>Vendedor</span><span>Tipo</span><span className="r">Total</span><span>Situação</span><span>Edição</span></div>
            {listed.slice(0, limit).map((s) => {
              const info = editInfo(s, seller, now)
              return (
                <div key={s.id} className="op-tr click" style={{ gridTemplateColumns: "118px 110px minmax(0,1.4fr) minmax(0,1fr) 96px 110px 180px 96px" }} onClick={() => setDetail(s)}>
                  <span className="mono" style={{ fontWeight: 700 }}>{s.name}</span>
                  <span className="muted num">{fmtDate(itemDate(s), { day: "2-digit", month: "2-digit" })} {s.time}</span>
                  <span>{s.owner || "Consumidor final"}</span>
                  <span className="muted">{s.professional}</span>
                  <span>{s.extra?.tipo === "Entrega" ? <span className="op-tag blue plain"><Truck size={12} /> Entrega</span> : <span className="muted">{s.extra?.tipo || "Balcão"}</span>}</span>
                  <b className="r num">{brl(s.amountValue || 0)}</b>
                  <span><Tag s={s.status} /></span>
                  <span>{info.can ? <span className="op-tag amber plain"><Clock size={12} /> {mmss(info.left)}</span> : <span className="muted" title={info.reason}><Lock size={13} /></span>}</span>
                </div>
              )
            })}
            {!listed.length && <div className="op-empty">{mine ? "Você ainda não tem vendas com esses filtros." : "Nenhuma venda encontrada."}</div>}
            {listed.length > limit && <div className="op-empty"><button className="op-btn sm" onClick={() => setLimit(limit + 60)}>Mostrar mais ({listed.length - limit})</button></div>}
          </div>
        </div>
      )}

      {tab === "orc" && (
        <div className="op-card">
          <div className="op-table">
            <div className="op-tr op-th" style={{ gridTemplateColumns: "118px 100px minmax(0,1.4fr) minmax(0,1fr) 110px 110px 130px 230px" }}><span>Nº</span><span>Data</span><span>Cliente</span><span>Vendedor</span><span>Validade</span><span className="r">Total</span><span>Situação</span><span /></div>
            {quotes.map((qt) => (
              <div key={qt.id} className="op-tr" style={{ gridTemplateColumns: "118px 100px minmax(0,1.4fr) minmax(0,1fr) 110px 110px 130px 230px", overflow: "visible" }}>
                <span className="mono" style={{ fontWeight: 700 }}>{qt.name}</span>
                <span className="muted num">{fmtDate(itemDate(qt), { day: "2-digit", month: "2-digit" })}</span>
                <span>{qt.owner || "Consumidor final"}</span>
                <span className="muted">{qt.professional}</span>
                <span className="num">{fmtDate(qt.dueDate)}</span>
                <b className="r num">{brl(qt.amountValue || 0)}</b>
                <span><Tag s={qt.status} /></span>
                <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", overflow: "visible" }}>
                  <PrintBar sale={qt} unitName={activeUnit.name} tutor={data.tutores.find((t) => t.id === qt.ownerId)} />
                  {!/convert|recus/i.test(qt.status) && <button className="op-btn sm pri" onClick={() => fromQuote(qt)}>Converter em venda</button>}
                </span>
              </div>
            ))}
            {!quotes.length && <div className="op-empty">Nenhum orçamento salvo.</div>}
          </div>
        </div>
      )}

      {/* detalhe */}
      {detail && (() => {
        const d = all.find((x) => x.id === detail.id) || detail
        const info = editInfo(d, seller, now)
        const e = d.extra?.entrega as Entrega | undefined
        const steps = ["Venda finalizada", "Pago no caixa", ...(e ? ["Entregue"] : []), "Concluída"]
        const stage = /cancel/i.test(d.status) ? -1 : /conclu/i.test(d.status) ? steps.length - 1 : e && /entregue/i.test(e.status) ? 2 : /paga|em entrega|a cobrar/i.test(d.status) ? 1 : 0
        return (
        <Layer className="op-drawer-layer" onMouseDown={() => setDetail(null)}>
          <aside className="op-drawer" onMouseDown={(ev) => ev.stopPropagation()}>
            <div className="op-ch"><h2 style={{ fontSize: 14, textTransform: "none", letterSpacing: 0 }}><span className="op-num">{d.name}</span> <Tag s={d.status} /></h2><button className="op-x" onClick={() => setDetail(null)} aria-label="Fechar"><X /></button></div>
            <div className="body">
              <div className="op-steps">{steps.map((st, i) => <div key={st} className={i <= stage ? "done" : ""}><i>{i < stage || (i === stage && i === steps.length - 1) ? <Check size={12} /> : i + 1}</i><span>{st}</span></div>)}</div>
              <div className="op-sec">Imprimir</div>
              <PrintBar sale={d} unitName={activeUnit.name} tutor={data.tutores.find((t) => t.id === d.ownerId)} />
              {d.status === "Devolvida ao vendedor" && <div className="op-note warn"><AlertTriangle /> Devolvida pelo caixa: {d.extra?.motivoDevolucao || "corrigir a venda"}.</div>}
              {d.extra?.emEdicao && <div className="op-note info"><Pencil /> Em edição por {d.extra.emEdicao}. O caixa aguarda a correção.</div>}
              {info.can ? <div className="op-note warn"><Clock /> Você pode editar esta venda por mais <b>{mmss(info.left)}</b>.</div> : /aguardando pag|devolvida/i.test(d.status) && <div className="op-note info"><Lock /> {info.reason}</div>}
              <dl className="op-dl">
                <dt>Cliente</dt><dd>{d.owner || "Consumidor final"}</dd>
                <dt>Data</dt><dd>{fmtDate(itemDate(d))} · {d.time} · {minutesSince(itemDate(d), d.time)}</dd>
                <dt>Vendedor</dt><dd>{d.professional}</dd>
                <dt>Tipo</dt><dd>{d.extra?.tipo || "Balcão"}</dd>
                {d.extra?.formaSugerida && <><dt>Forma sugerida</dt><dd>{d.extra.formaSugerida}</dd></>}
                {d.extra?.recebidoPor && <><dt>Recebido por</dt><dd>{d.extra.recebidoPor} às {d.extra.recebidoAs}</dd></>}
              </dl>
              <div className="op-sec">Itens</div>
              <div className="op-card">{((d.extra?.itens || []) as Line[]).map((l, i) => <div key={i} className="op-tr" style={{ gridTemplateColumns: "40px minmax(0,1fr) 100px" }}><span className="num muted">{l.qtd}×</span><span>{l.descricao}</span><b className="r num">{brl(lineTotal(l))}</b></div>)}</div>
              <div className="op-sum">
                <div><span>Subtotal</span><b>{brl(d.extra?.subtotal || 0)}</b></div>
                <div><span>Desconto</span><b>− {brl(d.extra?.desconto || 0)}</b></div>
                {!!d.extra?.taxaEntrega && <div><span>Entrega</span><b>{brl(d.extra.taxaEntrega)}</b></div>}
                <div><span style={{ fontWeight: 700 }}>Total</span><b className="op-big">{brl(d.amountValue || 0)}</b></div>
              </div>
              {((d.extra?.pagamentos || []).length > 0) && <><div className="op-sec">Pagamentos</div><div className="op-sum">{(d.extra?.pagamentos || []).map((p: { forma: string; valor: number; parcelas: number; vencimentos?: string[] }, i: number) => <div key={i}><span>{p.forma}{p.parcelas > 1 ? ` · ${p.parcelas}x` : ""}{p.vencimentos?.length ? <small className="muted"> · venc. {p.vencimentos.map((v) => fmtDate(v, { day: "2-digit", month: "2-digit" })).join(", ")}</small> : null}</span><b>{brl(p.valor)}</b></div>)}</div></>}
              {e && <><div className="op-sec">Entrega</div><dl className="op-dl"><dt>Endereço</dt><dd>{e.rua}, {e.numero}{e.complemento ? ` · ${e.complemento}` : ""} · {e.bairro} · {e.cidade}/{e.uf}</dd><dt>Quando</dt><dd>{fmtDate(e.data)} · {e.periodo}</dd><dt>Entregador</dt><dd>{e.entregador || "—"}</dd><dt>Situação</dt><dd><Tag s={e.status} /></dd>{e.recebidoPor && <><dt>Recebido por</dt><dd>{e.recebidoPor}</dd></>}</dl></>}
              {(d.extra?.historico || []).length > 0 && <><div className="op-sec">Histórico</div><ul className="op-timeline">{(d.extra?.historico || []).map((h: string, i: number) => <li key={i}>{h}</li>)}</ul></>}
            </div>
            <div className="foot">
              <span className="grow" />
              {/aguardando pag|devolvida/i.test(d.status) && <button className="op-btn" disabled={!info.can} title={info.reason} onClick={() => loadForEdit(d)}><Pencil /> Editar{info.can ? ` (${mmss(info.left)})` : ""}</button>}
              {d.status !== "Cancelada" && d.status !== "Concluída" && <button className="op-btn dan" onClick={() => setCancelSale(d)}>Cancelar venda</button>}
            </div>
          </aside>
        </Layer>
        )
      })()}

      {cadastro && <ClienteForm initial={cadastro.initial} existing={cadastro.existing} tutores={data.tutores} unitCity={activeUnit.city || ""} onClose={() => setCadastro(null)} onSave={saveCadastro} />}
      {cancelSale && (
        <Layer className="op-modal-layer" onMouseDown={() => setCancelSale(null)}>
          <div className="op-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2>Cancelar {cancelSale.name}</h2></div>
            <div className="op-cb">
              <p style={{ margin: 0 }}>{/paga|conclu|em entrega/i.test(cancelSale.status) ? "Os produtos voltam ao estoque e o valor pago é estornado no financeiro." : "A reserva dos produtos é liberada e a venda sai da fila do caixa."}</p>
              <label className="op-f"><span>Motivo</span><input className="op-in" autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu" /></label>
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setCancelSale(null)}>Voltar</button><button className="op-btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={doCancel}>Cancelar venda</button></div>
          </div>
        </Layer>
      )}

      {sairVenda && <Confirm title="Descartar esta venda?" text="Os itens lançados nesta venda serão perdidos." cancel="Continuar vendendo" confirm="Descartar" danger onCancel={() => setSairVenda(false)} onConfirm={() => { setSairVenda(false); reset() }} />}
      {cliTab !== null && (
        <Layer className="op-modal-layer" onMouseDown={() => setCliTab(null)}>
          <div className="op-modal vd-cli" onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2><Users /> Clientes <kbd>F11</kbd></h2><span className="muted" style={{ fontSize: 12 }}>{cliRows.length}{cliRows.length >= 300 ? "+" : ""} {cliRows.length === 1 ? "cliente" : "clientes"}</span></div>
            <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="op-search"><Search />
                <input className="op-in lg" autoFocus placeholder="Digite o nome (ex.: Ma), CPF/CNPJ, telefone, animal ou bairro" value={cliTab} onChange={(e) => { setCliTab(e.target.value); setCliIdx(0) }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setCliIdx((i) => Math.min(cliRows.length - 1, i + 1)) }
                    if (e.key === "ArrowUp") { e.preventDefault(); setCliIdx((i) => Math.max(0, i - 1)) }
                    if (e.key === "Enter" && cliRows[cliIdx]) { e.preventDefault(); pickClient(cliRows[cliIdx].tutor) }
                    if (e.key === "Escape") { e.preventDefault(); setCliTab(null) }
                  }} />
              </div>
              <div className="op-tabs">{([["todos", "Todos"], ["debito", "Com débito"], ["pj", "Empresas"]] as const).map(([k, l]) => <button key={k} className={cFilter === k ? "on" : ""} onClick={() => { setCFilter(k); setCliIdx(0) }}>{l}</button>)}</div>
              <div className="op-table vd-cli-table">
                <div className="op-tr op-th" style={{ gridTemplateColumns: "64px minmax(0,1.5fr) 150px minmax(0,1fr) 120px" }}><span>Código</span><span>Cliente</span><span>Telefone</span><span>Animais</span><span className="r">Situação</span></div>
                {cliRows.map(({ tutor, pets }, i) => (
                  <div key={tutor.id} className={`op-tr click ${i === cliIdx ? "act" : ""}`} style={{ gridTemplateColumns: "64px minmax(0,1.5fr) 150px minmax(0,1fr) 120px" }} onMouseEnter={() => setCliIdx(i)} onClick={() => pickClient(tutor)}>
                    <span className="mono muted">{tutor.id.replace(/\D/g, "").slice(-5) || "—"}</span>
                    <span className="op-hit-main"><strong>{tutor.name}</strong><small>{tutor.cpf ? `${tutor.personType === "Jurídica" ? "CNPJ" : "CPF"} ${tutor.cpf}` : "sem documento"} · {(tutor.address || "").split(" • ")[1] || (tutor.address || "").split(" • ")[0] || "sem endereço"}</small></span>
                    <span className="mono">{tutor.phone || "—"}</span>
                    <span className="muted">{pets.length ? `${pets.slice(0, 3).join(", ")}${pets.length > 3 ? ` +${pets.length - 3}` : ""}` : "sem animais"}</span>
                    <span className="r">{(tutor.amountValue || 0) > 0 ? <span className="op-tag amber">deve {brl(tutor.amountValue || 0)}</span> : <span className="op-tag green">em dia</span>}</span>
                  </div>
                ))}
                {!cliRows.length && <div className="op-empty">Nenhum cliente encontrado para “{cliTab.trim()}”.</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>↑ ↓ para escolher · Enter seleciona · Esc fecha</p>
                <span style={{ display: "flex", gap: 6 }}><button className="op-btn sm" onClick={() => { setCliTab(null); setClientId("cf") }}>Consumidor final</button><button className="op-btn sm pri" onClick={() => { const q = cliTab; setCliTab(null); openCadastro(null, q) }}><UserPlus /> Novo cliente</button></span>
              </div>
            </div>
          </div>
        </Layer>
      )}
      {picker && (
        <Layer className="op-modal-layer" onMouseDown={() => setPicker(null)}>
          <div className="op-modal" style={{ width: 380 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2><User /> Escolher {picker === "vendedor" ? "vendedor" : "ajudante"} <kbd>{picker === "vendedor" ? "F6" : "F7"}</kbd></h2></div>
            <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="op-in" autoFocus placeholder="Código ou nome" value={pickQ} onChange={(e) => { setPickQ(e.target.value); setPickIdx(0) }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setPickIdx((i) => Math.min(pickList.length - 1, i + 1)) }
                  if (e.key === "ArrowUp") { e.preventDefault(); setPickIdx((i) => Math.max(0, i - 1)) }
                  if (e.key === "Enter" && pickList[pickIdx]) { e.preventDefault(); choose(pickList[pickIdx].id) }
                  if (e.key === "Escape") { e.preventDefault(); setPicker(null) }
                }} />
              <div className="op-table" style={{ maxHeight: 300, overflowY: "auto" }}>
                {pickList.map((u, i) => (
                  <div key={u.id || "none"} className={`op-tr click ${i === pickIdx ? "act" : ""} ${(picker === "vendedor" ? vendedorId : ajudanteId) === u.id ? "sel" : ""}`} style={{ gridTemplateColumns: "56px minmax(0,1fr) auto" }} onMouseEnter={() => setPickIdx(i)} onClick={() => choose(u.id)}>
                    <span className="mono muted">{u.code || "—"}</span><strong>{u.displayName}</strong><span className="muted" style={{ fontSize: 12 }}>{u.role}</span>
                  </div>
                ))}
                {!pickList.length && <div className="op-empty">Ninguém encontrado.</div>}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>↑ ↓ para escolher · Enter confirma · Esc fecha</p>
            </div>
          </div>
        </Layer>
      )}

      {askApproval && (
        <Layer className="op-modal-layer" onMouseDown={() => setAskApproval(false)}>
          <div className="op-modal" style={{ width: 400 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="op-ch"><h2><Lock /> Liberação de desconto</h2></div>
            <div className="op-cb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="op-desc-ask"><b>{pctPedido.toFixed(1).replace(".", ",")}%</b><span>de desconto pedido<br />limite do vendedor: {LIMITE_DESCONTO}%</span></div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Desconto de {brl(bruto - (subtotal - desconto))} nesta venda. Para liberar, um administrador precisa digitar a própria senha.</p>
              <label className="op-f"><span>Administrador</span>
                <select className="op-in" value={adminUser} onChange={(e) => setAdminUser(e.target.value)}>{admins.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}</select>
              </label>
              <label className="op-f"><span>Senha do administrador</span><input className="op-in" type="password" autoFocus autoComplete="off" placeholder="••••••" value={adminPass} onChange={(e) => { setAdminPass(e.target.value); setApprovalErr("") }} onKeyDown={(e) => { if (e.key === "Enter") confirmApproval() }} /></label>
              {approvalErr && <div className="op-note bad"><AlertTriangle /> {approvalErr}</div>}
            </div>
            <div className="foot"><button className="op-btn" onClick={() => setAskApproval(false)}>Voltar e ajustar desconto</button><button className="op-btn pri" disabled={!adminPass} onClick={confirmApproval}>Liberar desconto</button></div>
          </div>
        </Layer>
      )}

      {sent && (
        <Layer className="op-modal-layer">
          <div className="op-modal">
            <div className="op-cb" style={{ alignItems: "center", textAlign: "center", padding: "26px 22px" }}>
              <span className="op-av" style={{ width: 52, height: 52, background: "var(--green-soft)", color: "var(--green)" }}><Send size={22} /></span>
              <div><div className="op-num" style={{ fontSize: 16 }}>{sent.name}</div></div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Venda enviada ao caixa</h3>
              <p className="muted" style={{ margin: 0 }}>{sent.owner} · <b style={{ color: "var(--ink)" }}>{brl(sent.amountValue || 0)}</b>. Ela já aparece na fila do caixa{sent.extra?.tipo === "Entrega" ? " e, após o pagamento, vai para Entregas" : ""}.</p>
              <div className="op-note warn" style={{ textAlign: "left" }}><Clock /> Você pode editar esta venda por 5 minutos em Vendas realizadas. Depois disso, só cancelando.</div>
            </div>
            <div className="foot" style={{ justifyContent: "center" }}>
              <PrintBar sale={sent} unitName={activeUnit.name} tutor={data.tutores.find((t) => t.id === sent.ownerId)} only={["Pré-venda", "Conferência", "Duplicata", "Orçamento"]} />
              <button className="op-btn pri" autoFocus onClick={() => setSent(null)}>Nova venda <kbd>Enter</kbd></button>
            </div>
          </div>
        </Layer>
      )}
      {toast && <Layer className="op-toast"><Check /> {toast}</Layer>}
      </div>
    </Page>
  )
}
