/* Listas no padrão Animais/Tutores das telas de cadastro (Medicamentos, Estoque, Profissionais, Serviços, Convênios). */
import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { BadgeCheck, Boxes, CalendarClock, CalendarDays, CalendarPlus, CircleDollarSign, CirclePause, CirclePlay, Clock3, FileStack, FileText, HeartHandshake, Layers, PackagePlus, PackageX, Pill, ReceiptText, ShieldCheck, ShoppingCart, Sparkles, Stethoscope, TrendingUp, TriangleAlert, UserCheck, Users } from "lucide-react"
import { normalize, useVetFlow, type Item, type UnitData } from "../store"
import { usePageForms } from "./hooks"
import RowActions, { RowButton } from "./RowActions"
import { addDays, brl, colorFor, fmtDate, hash, itemDate, matches, parseMoney, todayISO } from "./ui"
import { CadastroLista, Duo, Ident, Status, categoriaUtil, initialsOf, subUtil } from "./CadastroLista"

/* ================= Medicamentos ================= */
export function grupoMed(item: Item) {
  if (item.extra?.grupo) return String(item.extra.grupo)
  if (categoriaUtil(item.category)) return item.category as string
  const name = normalize(item.name)
  if (/amoxi|cefalex|enroflox|doxici|metronid|azitro/.test(name)) return "Antibióticos"
  if (/predni|melox|carprof|cortic/.test(name)) return "Anti-inflamatórios"
  if (/dipiron|tramad|gabapent|metadon/.test(name)) return "Analgésicos"
  if (/pimoben|enalapr|furosem/.test(name)) return "Cardiológicos"
  if (/omega|vitamin|suplem/.test(name)) return "Suplementos"
  return "Outros"
}
const baseName = (name: string) => name.replace(/\s*#\d+$/, "")
export function estoqueMed(data: UnitData, item: Item) {
  const term = normalize(baseName(item.name)).split(" ")[0]
  const lots = data.estoque.filter((stock) => normalize(stock.name).startsWith(term))
  if (!lots.length) return item.quantity !== undefined ? { quantity: item.quantity, minimum: item.minimum || 0, due: item.extra?.validade as string | undefined } : undefined
  const exact = lots.filter((lot) => normalize(lot.name) === normalize(item.name))
  const same = exact.length ? exact : [lots[0]]
  const due = same.map((lot) => lot.dueDate).filter(Boolean).sort()[0]
  return { quantity: same.reduce((n, lot) => n + (lot.quantity || 0), 0), minimum: Math.max(...same.map((lot) => lot.minimum || 0)), due }
}
export function situacaoMed(data: UnitData, item: Item) {
  const s = estoqueMed(data, item)
  if (!s) return { label: "Sem controle", tone: "gray", fill: 0, color: "#8a92a0" }
  const fill = Math.max(0.04, Math.min(1, s.quantity / Math.max(1, s.minimum * 3)))
  if (s.quantity <= 0) return { label: "Esgotado", tone: "red", fill: 0.04, color: "#c62f22" }
  if (s.quantity < s.minimum) return { label: "Acabando", tone: "orange", fill, color: "#d9480f" }
  if (s.quantity < s.minimum * 1.5) return { label: "Atenção", tone: "orange", fill, color: "#b7791f" }
  return { label: "Estoque bom", tone: "green", fill, color: "#1f8a4c" }
}

export function MedicamentosLista({ modo }: { modo: ReactNode }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("medicamentos")
  const [query, setQuery] = useState("")
  const [grupo, setGrupo] = useState("Todos os grupos")
  const [sit, setSit] = useState("Todas as situações")
  const limite = addDays(todayISO(), 60)

  const enriched = useMemo(
    () => data.medicamentos.map((item) => ({ item, grupo: grupoMed(item), estoque: estoqueMed(data, item), sit: situacaoMed(data, item) })),
    [data],
  )
  const grupos = useMemo(() => [...new Set(enriched.map((r) => r.grupo))].sort(), [enriched])
  const rows = enriched
    .filter((r) => matches(r.item, query) && (grupo === "Todos os grupos" || r.grupo === grupo))
    .filter((r) => sit === "Todas as situações" || (sit === "Acabando ou esgotado" ? /acab|esgot/i.test(r.sit.label) : sit === "Vencendo" ? !!r.estoque?.due && r.estoque.due <= limite : sit === "Controlados" ? /control/i.test(r.item.status) : r.sit.label === sit))
    .sort((a, b) => a.item.name.localeCompare(b.item.name, "pt-BR"))
  const faltando = enriched.filter((r) => /acab|esgot/i.test(r.sit.label)).length
  const vencendo = enriched.filter((r) => r.estoque?.due && r.estoque.due <= limite).length
  const controlados = enriched.filter((r) => /control/i.test(r.item.status)).length

  return (
    <CadastroLista
      crumb="Medicamentos"
      title="Medicamentos"
      headerActions={
        <>
          {modo}
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/estoque?novo=1&form=estoque-nota")}><PackagePlus /> Repor estoque</button>
        </>
      }
      kpis={[
        { label: "Medicamentos cadastrados", value: enriched.length, detail: `${grupos.length} grupos terapêuticos`, icon: <Pill />, tone: "orange" },
        { label: "Estoque bom", value: enriched.filter((r) => r.sit.label === "Estoque bom").length, detail: "acima do mínimo", icon: <ShieldCheck />, tone: "aqua" },
        { label: "Acabando ou esgotados", value: faltando, detail: "precisam de reposição", icon: <TriangleAlert />, tone: "red" },
        { label: "Vencem em 60 dias", value: vencendo, detail: `${controlados} de controle especial`, icon: <CalendarClock />, tone: "gray" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar por nome, princípio ativo ou grupo..."
      filtros={[
        { label: "Grupo", icon: <Layers />, value: grupo, onChange: setGrupo, options: ["Todos os grupos", ...grupos] },
        { label: "Situação", icon: <TriangleAlert />, value: sit, onChange: setSit, options: ["Todas as situações", "Estoque bom", "Acabando ou esgotado", "Vencendo", "Controlados", "Sem controle"] },
      ]}
      novo={{ label: "Novo medicamento", onClick: () => forms.open() }}
      rows={rows}
      rowKey={(r) => r.item.id}
      onRow={(r) => navigate(`/medicamentos/${r.item.id}`)}
      noun="medicamentos"
      vazio="Nenhum medicamento encontrado"
      colunas={[
        { label: "Medicamento", w: "minmax(260px,1.4fr)", cell: (r) => <Ident title={r.item.name} sub={r.item.extra?.principio || subUtil(r.item.subtitle)} icon={<Pill />} color={r.item.extra?.cor || colorFor(r.grupo)} tag={/control/i.test(r.item.status) ? "Controle especial" : undefined} /> },
        { label: "Grupo", w: "minmax(150px,.8fr)", cell: (r) => <Duo title={r.grupo} sub={r.item.extra?.forma || r.item.extra?.apresentacao} /> },
        { label: "Estoque", w: "minmax(140px,.7fr)", cell: (r) => (
          <div className="cl-duo">
            <strong>{r.estoque ? `${r.estoque.quantity} un.` : "—"}</strong>
            <small>{r.estoque ? `mínimo ${r.estoque.minimum}` : "não controla"}</small>
            {r.estoque && <span className="cl-bar"><i style={{ width: `${r.sit.fill * 100}%`, background: r.sit.color }} /></span>}
          </div>
        ) },
        { label: "Validade", w: "minmax(110px,.55fr)", cell: (r) => <Duo title={r.estoque?.due ? fmtDate(r.estoque.due) : "—"} sub={r.estoque?.due && r.estoque.due <= limite ? "vence em breve" : r.estoque?.due ? "no prazo" : ""} /> },
        { label: "Preço", w: "110px", cell: (r) => <span className="cl-money">{r.item.amountValue ? brl(r.item.amountValue) : "—"}</span> },
        { label: "Situação", w: "140px", cell: (r) => <Status status={r.sit.label} toneOverride={r.sit.tone} /> },
      ]}
      acoes={(r) => (
        <RowActions name={r.item.name} onView={() => navigate(`/medicamentos/${r.item.id}`)} onEdit={() => forms.open("medicamentos", r.item)} onDelete={() => navigate(`/medicamentos/${r.item.id}?excluir=1`)}>
          <RowButton title="Prescrever" onClick={() => forms.open("prescricoes", undefined, { itens: [{ med: r.item.name, dose: "", via: "Oral", freq: "12/12 h", dur: "7 dias", qtd: "" }] })}><FileText /></RowButton>
        </RowActions>
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ================= Estoque ================= */
const CORREDORES: [string, string][] = [["A", "Vacinas"], ["B", "Medicamentos"], ["C", "Materiais"], ["D", "Rações"], ["E", "Petiscos"], ["F", "Coleiras e guias"], ["G", "Higiene"], ["H", "Brinquedos"], ["I", "Camas"], ["J", "Acessórios"]]
const aisleByCat: Record<string, string> = Object.fromEntries(CORREDORES.map(([k, v]) => [v, k]))
const aisleName: Record<string, string> = Object.fromEntries([...CORREDORES, ["Z", "Outros"]])
const aisleOf = (item: Item) => String(item.extra?.corredor || aisleByCat[item.category || ""] || "Z")
const out = (item: Item) => (item.quantity || 0) <= 0
const low = (item: Item) => !out(item) && (item.quantity || 0) < (item.minimum || 0)
const expiring = (item: Item) => !!item.dueDate && item.dueDate <= addDays(todayISO(), 60)

export function EstoqueLista({ modo, filtroInicial = "Todos" }: { modo: ReactNode; filtroInicial?: string }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("estoque")
  const [query, setQuery] = useState("")
  const [filtro, setFiltro] = useState(filtroInicial)
  const [corredor, setCorredor] = useState("")
  const corredores = useMemo(() => [...new Set(data.estoque.map(aisleOf))].sort(), [data.estoque])
  const rows = data.estoque
    .filter((item) => matches(item, query) && (!corredor || aisleOf(item) === corredor))
    .filter((item) => filtro === "Todos" || (filtro === "Acabando" ? low(item) : filtro === "Esgotado" ? out(item) : expiring(item)))
    .sort((a, b) => Number(out(b)) - Number(out(a)) || Number(low(b)) - Number(low(a)) || a.name.localeCompare(b.name, "pt-BR"))
  const valor = data.estoque.reduce((n, item) => n + (item.amountValue || 0), 0)
  const sit = (item: Item) => (out(item) ? ["Esgotado", "red"] : low(item) ? ["Acabando", "orange"] : expiring(item) ? ["Vencendo", "orange"] : ["Em estoque", "green"])

  return (
    <CadastroLista
      crumb="Estoque"
      title="Estoque"
      headerActions={
        <>
          {modo}
          <button className="vx-btn vx-btn-g" onClick={() => forms.open("estoque-nota")}><PackagePlus /> Entrada de nota</button>
        </>
      }
      kpis={[
        { label: "Itens em estoque", value: data.estoque.length, detail: `${brl(valor)} em mercadoria`, icon: <Boxes />, tone: "orange" },
        { label: "Acabando", value: data.estoque.filter(low).length, detail: "abaixo do mínimo", icon: <TriangleAlert />, tone: "aqua" },
        { label: "Esgotados", value: data.estoque.filter(out).length, detail: "sem unidades", icon: <PackageX />, tone: "red" },
        { label: "Vencem em 60 dias", value: data.estoque.filter(expiring).length, detail: "confira os lotes", icon: <CalendarClock />, tone: "gray" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar por item, lote ou SKU..."
      filtros={[
        { label: "Situação", icon: <TriangleAlert />, value: filtro, onChange: setFiltro, options: [["Todos", "Todas as situações"], "Acabando", "Esgotado", "Vencendo"] },
        { label: "Corredor", icon: <Layers />, value: corredor, onChange: setCorredor, options: [["", "Todos os corredores"], ...corredores.map((c) => [c, `Corredor ${c} · ${aisleName[c] || c}`] as [string, string])] },
      ]}
      novo={{ label: "Novo item", onClick: () => forms.open("estoque") }}
      rows={rows}
      rowKey={(item) => item.id}
      onRow={(item) => navigate(`/estoque/${item.id}`)}
      noun="itens"
      vazio="Nenhum item encontrado"
      colunas={[
        { label: "Item", w: "minmax(260px,1.4fr)", cell: (item) => <Ident title={item.name} sub={item.extra?.sku ? `SKU ${item.extra.sku}` : item.extra?.fornecedor || subUtil(item.subtitle)} icon={<Boxes />} color={colorFor(item.category || "Outros")} tag={item.extra?.pedidoEm ? `Pedido em ${fmtDate(item.extra.pedidoEm)}` : undefined} /> },
        { label: "Categoria", w: "minmax(150px,.8fr)", cell: (item) => <Duo title={item.category || "Outros"} sub={`Corredor ${aisleOf(item)} · ${aisleName[aisleOf(item)] || "Outros"}`} /> },
        { label: "Quantidade", w: "minmax(140px,.7fr)", cell: (item) => {
          const fill = Math.max(0.04, Math.min(1, (item.quantity || 0) / Math.max(1, (item.minimum || 1) * 3)))
          return (
            <div className="cl-duo">
              <strong>{item.quantity ?? 0} un.</strong>
              <small>mínimo {item.minimum ?? 0}</small>
              <span className="cl-bar"><i style={{ width: `${fill * 100}%`, background: out(item) ? "#c62f22" : low(item) ? "#d9480f" : "#1f8a4c" }} /></span>
            </div>
          )
        } },
        { label: "Validade", w: "minmax(110px,.55fr)", cell: (item) => <Duo title={item.dueDate ? fmtDate(item.dueDate) : "—"} sub={item.extra?.lote ? `Lote ${item.extra.lote}` : ""} /> },
        { label: "Valor", w: "120px", cell: (item) => <span className="cl-money">{item.amountValue ? brl(item.amountValue) : "—"}</span> },
        { label: "Situação", w: "130px", cell: (item) => { const [l, t] = sit(item); return <Status status={l} toneOverride={t} /> } },
      ]}
      acoes={(item) => (
        <RowActions name={item.name} onView={() => navigate(`/estoque/${item.id}`)} onEdit={() => forms.open("estoque", item)} onDelete={() => navigate(`/estoque/${item.id}?excluir=1`)}>
          {(low(item) || out(item)) && (
            <RowButton title="Repor (entrada de nota)" onClick={() => forms.open("estoque-nota", undefined, { itens: [{ produto: item.name, qtd: String(Math.max(1, (item.minimum || 0) * 3 - (item.quantity || 0))) }] })}><ShoppingCart /></RowButton>
          )}
        </RowActions>
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ================= Profissionais ================= */
export function ProfissionaisLista({ modo }: { modo: ReactNode }) {
  const { data, staff } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("profissionais")
  const [query, setQuery] = useState("")
  const [tipo, setTipo] = useState("Todos")
  const [sit, setSit] = useState("Todas")
  const isVet = (item: Item) => /crmv/i.test(item.registration || item.subtitle) || /^dra?\./i.test(item.name)
  const team = useMemo(() => {
    const norm = (t: string) => t.toLowerCase().replace(/^(dra?\.)\s*/, "").trim()
    const known = new Set(data.profissionais.map((p) => norm(p.name)))
    const extra = staff.filter((u) => !known.has(norm(u.displayName)) && !known.has(norm(u.name))).map((u) => ({
      id: `staff-${u.id}`, name: u.displayName, subtitle: `${u.role} • ${u.email}`, status: u.active ? "Ativo" : "Inativo", category: u.role,
      registration: u.crmv || (u.code ? `Cód. ${u.code}` : "—"), phone: `@${u.username}`, email: u.email, unitId: "", createdAt: "", extra: { staffId: u.id, papel: u.role },
    }) as unknown as Item)
    return [...data.profissionais, ...extra]
  }, [data.profissionais, staff])
  const hoje = todayISO()
  const agendaHoje = data.agendas.filter((a) => itemDate(a) === hoje)
  const countFor = (item: Item) => agendaHoje.filter((a) => a.professionalId === item.id).length
  const rows = team
    .filter((item) => matches(item, query))
    .filter((item) => tipo === "Todos" || (tipo === "Veterinários" ? isVet(item) : !isVet(item)))
    .filter((item) => sit === "Todas" || (sit === "Ativos" ? /ativo|plant/i.test(item.status) && !/inativo/i.test(item.status) : /inativo/i.test(item.status)))
    .sort((a, b) => a.name.replace(/^dra?\.\s*/i, "").localeCompare(b.name.replace(/^dra?\.\s*/i, ""), "pt-BR"))
  const abrir = (item: Item) => navigate(item.extra?.staffId ? `/usuarios?u=${item.extra.staffId}` : `/profissionais/${item.id}`)

  return (
    <CadastroLista
      crumb="Profissionais"
      title="Profissionais"
      headerActions={modo}
      kpis={[
        { label: "Equipe", value: team.length, detail: "profissionais e usuários", icon: <Users />, tone: "orange" },
        { label: "Veterinários", value: team.filter(isVet).length, detail: "com CRMV", icon: <Stethoscope />, tone: "aqua" },
        { label: "Ativos", value: team.filter((p) => /ativo|plant/i.test(p.status) && !/inativo/i.test(p.status)).length, detail: "atendendo ou de plantão", icon: <UserCheck />, tone: "green" },
        { label: "Atendimentos hoje", value: agendaHoje.length, detail: "na agenda da unidade", icon: <CalendarDays />, tone: "gray" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar por nome, função, CRMV ou e-mail..."
      filtros={[
        { label: "Tipo", icon: <Stethoscope />, value: tipo, onChange: setTipo, options: [["Todos", "Toda a equipe"], "Veterinários", ["Equipe", "Demais funções"]] },
        { label: "Situação", icon: <UserCheck />, value: sit, onChange: setSit, options: [["Todas", "Todas as situações"], "Ativos", "Inativos"] },
      ]}
      novo={{ label: "Novo profissional", onClick: () => forms.open() }}
      rows={rows}
      rowKey={(item) => item.id}
      onRow={abrir}
      noun="profissionais"
      vazio="Nenhum profissional encontrado"
      colunas={[
        { label: "Profissional", w: "minmax(260px,1.4fr)", cell: (item) => <Ident title={item.name} sub={item.registration || "—"} initials={initialsOf(item.name)} color={item.extra?.cor || colorFor(item.name)} /> },
        { label: "Função", w: "minmax(160px,.9fr)", cell: (item) => <Duo title={item.category || item.extra?.funcao || "—"} sub={isVet(item) ? "Médico(a)-veterinário(a)" : item.extra?.papel || "Equipe"} /> },
        { label: "Contato", w: "minmax(170px,.9fr)", cell: (item) => <Duo title={item.phone || "—"} sub={item.email || item.extra?.email || ""} /> },
        { label: "Agenda hoje", w: "120px", cell: (item) => <Duo title={item.extra?.staffId ? "—" : `${countFor(item)} atend.`} sub={item.extra?.staffId ? "sem agenda" : "hoje"} /> },
        { label: "Situação", w: "140px", cell: (item) => <Status status={item.status} /> },
      ]}
      acoes={(item) => (
        <RowActions name={item.name} onView={() => abrir(item)} onEdit={item.extra?.staffId ? undefined : () => forms.open("profissionais", item)} onDelete={item.extra?.staffId ? undefined : () => navigate(`/profissionais/${item.id}?excluir=1`)}>
          {!item.extra?.staffId && <RowButton title="Ver agenda" onClick={() => navigate(`/agendas?pro=${encodeURIComponent(item.name)}`)}><CalendarDays /></RowButton>}
        </RowActions>
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ================= Servicos ================= */
const sectionOf = (item: Item) => {
  if (item.extra?.secao) return String(item.extra.secao)
  if (/vacin/i.test(item.name)) return "Vacinas"
  if (/ultra|exame|raio|hemo/i.test(item.name)) return "Exames"
  if (/banho|tosa|hidrat/i.test(item.name)) return "Estética"
  if (/cirurg|castra/i.test(item.name)) return "Cirurgias"
  return "Consultas"
}
const order = ["Consultas", "Vacinas", "Exames", "Estética", "Cirurgias", "Hospedagem", "Leva e traz", "Outros"]
const duracaoOf = (item: Item) => item.extra?.duracao || item.subtitle?.split(" • ").find((p) => /min|h\b/.test(p)) || "—"

export function ServicosLista({ modo }: { modo: ReactNode }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("servicos")
  const [query, setQuery] = useState("")
  const [secao, setSecao] = useState("Todas")
  const [porte, setPorte] = useState("Base")
  const uso = useMemo(() => {
    const m = new Map<string, number>()
    data.consultas.forEach((c) => m.set(c.service || c.name, (m.get(c.service || c.name) || 0) + 1))
    return m
  }, [data.consultas])
  const secoes = useMemo(() => [...new Set(data.servicos.map(sectionOf))].sort((a, b) => order.indexOf(a) - order.indexOf(b)), [data.servicos])
  const priceOf = (item: Item) => (porte !== "Base" && item.extra?.[`preco${porte}`] ? parseMoney(item.extra[`preco${porte}`]) : item.amountValue || 0)
  const rows = data.servicos
    .filter((item) => matches(item, query) && (secao === "Todas" || sectionOf(item) === secao))
    .sort((a, b) => order.indexOf(sectionOf(a)) - order.indexOf(sectionOf(b)) || a.name.localeCompare(b.name, "pt-BR"))
  const precos = data.servicos.map((s) => s.amountValue || 0).filter(Boolean)
  const top = [...uso.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <CadastroLista
      crumb="Serviços"
      title="Serviços"
      headerActions={modo}
      kpis={[
        { label: "Serviços no cardápio", value: data.servicos.length, detail: `${secoes.length} seções`, icon: <ReceiptText />, tone: "orange" },
        { label: "Ticket médio", value: brl(precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : 0), detail: "preço base", icon: <TrendingUp />, tone: "aqua" },
        { label: "Mais pedido", value: top ? top[1] : 0, detail: top ? top[0] : "sem histórico", icon: <Sparkles />, tone: "green" },
        { label: "Agendáveis", value: data.servicos.filter((s) => s.extra?.agendavel !== false).length, detail: "aparecem na agenda", icon: <CalendarPlus />, tone: "gray" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar serviço ou código..."
      filtros={[
        { label: "Seção", icon: <Layers />, value: secao, onChange: setSecao, options: [["Todas", "Todas as seções"], ...secoes] },
        { label: "Porte", icon: <Clock3 />, value: porte, onChange: setPorte, options: [["Base", "Preço base"], ["P", "Porte P"], ["M", "Porte M"], ["G", "Porte G"], ["GG", "Porte GG"], ["Gato", "Gato"]] },
      ]}
      novo={{ label: "Novo serviço", onClick: () => forms.open() }}
      rows={rows}
      rowKey={(item) => item.id}
      onRow={(item) => navigate(`/servicos/${item.id}`)}
      noun="serviços"
      vazio="Nenhum serviço encontrado"
      colunas={[
        { label: "Serviço", w: "minmax(260px,1.4fr)", cell: (item) => <Ident title={item.name} sub={item.extra?.descCurta || (item.extra?.codigo ? `Código ${item.extra.codigo}` : undefined)} icon={<ReceiptText />} color={colorFor(sectionOf(item))} tag={item.extra?.combo ? "Combo do mês" : undefined} /> },
        { label: "Seção", w: "minmax(140px,.8fr)", cell: (item) => <Duo title={sectionOf(item)} sub={item.extra?.area || "Clínica"} /> },
        { label: "Duração", w: "120px", cell: (item) => <Duo title={duracaoOf(item)} sub={item.extra?.agendavel === false ? "sem agenda" : "agendável"} /> },
        { label: "Uso", w: "120px", cell: (item) => <Duo title={`${uso.get(item.name) || 0}×`} sub="atendimentos" /> },
        { label: porte === "Base" ? "Preço" : `Preço ${porte}`, w: "130px", cell: (item) => <span className="cl-money">{priceOf(item) ? brl(priceOf(item)) : "—"}</span> },
        { label: "Situação", w: "120px", cell: (item) => <Status status={item.status || "Ativo"} /> },
      ]}
      acoes={(item) => (
        <RowActions name={item.name} onView={() => navigate(`/servicos/${item.id}`)} onEdit={() => forms.open("servicos", item)} onDelete={() => navigate(`/servicos/${item.id}?excluir=1`)}>
          <RowButton title="Agendar" onClick={() => navigate(`/agendas?locate=1&servico=${encodeURIComponent(item.name)}`)}><CalendarPlus /></RowButton>
        </RowActions>
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ================= Convenios ================= */
export function ConveniosLista({ modo }: { modo: ReactNode }) {
  const { data, updateItem, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("convenios")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos")
  const [tipo, setTipo] = useState("Todos")
  const statsOf = (item: Item) => {
    const seed = hash(item.id)
    const guias = data.consultas.filter((c) => c.extra?.convenio === item.name)
    return { vidas: 20 + (seed % 140), repasse: 900 + (seed % 9000) + guias.reduce((s, g) => s + (g.amountValue || 0), 0), prazo: item.extra?.prazo || ["D+15", "D+20", "D+30", "D+45"][seed % 4], guias: 30 + (seed % 70) + guias.length, glosas: (seed % 6) * 70 }
  }
  const tipoOf = (item: Item) => String(item.extra?.tipo || categoriaUtil(item.category) || "Plano de saúde pet")
  const tipos = [...new Set(data.convenios.map(tipoOf))]
  const rows = data.convenios
    .filter((item) => matches(item, query) && (status === "Todos" || item.status === status) && (tipo === "Todos" || tipoOf(item) === tipo))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  const ativos = data.convenios.filter((c) => /ativo/i.test(c.status))
  const total = data.convenios.reduce((acc, c) => { const s = statsOf(c); return { vidas: acc.vidas + s.vidas, repasse: acc.repasse + s.repasse, glosas: acc.glosas + s.glosas } }, { vidas: 0, repasse: 0, glosas: 0 })
  const faturar = (item: Item) => {
    const s = statsOf(item)
    addItem("financeiro", { name: `Lote ${item.name}`, category: "Receita", kind: "Receita", status: "A receber", amountValue: s.repasse, subtitle: `Faturamento de convênio • ${s.prazo}` })
    forms.toast(`Lote de ${item.name} faturado: ${brl(s.repasse)} a receber.`)
  }
  const alternar = (item: Item) => {
    const next = item.status === "Suspenso" ? "Ativo" : "Suspenso"
    updateItem("convenios", item.id, { status: next })
    forms.toast(`${item.name} agora está ${next.toLowerCase()}.`)
  }

  return (
    <CadastroLista
      crumb="Convênios"
      title="Convênios"
      headerActions={modo}
      kpis={[
        { label: "Convênios ativos", value: ativos.length, detail: `de ${data.convenios.length} cadastrados`, icon: <HeartHandshake />, tone: "orange" },
        { label: "Vidas atendidas", value: total.vidas.toLocaleString("pt-BR"), detail: "pacientes com plano", icon: <Users />, tone: "aqua" },
        { label: "A receber", value: brl(total.repasse), detail: "repasses em aberto", icon: <CircleDollarSign />, tone: "green" },
        { label: "Glosas", value: brl(total.glosas), detail: "valores recusados", icon: <FileStack />, tone: "red" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar convênio, operadora ou CNPJ..."
      filtros={[
        { label: "Situação", icon: <BadgeCheck />, value: status, onChange: setStatus, options: [["Todos", "Todas as situações"], "Ativo", "Em análise", "Suspenso"] },
        { label: "Tipo", icon: <HeartHandshake />, value: tipo, onChange: setTipo, options: [["Todos", "Todos os tipos"], ...tipos] },
      ]}
      novo={{ label: "Novo convênio", onClick: () => forms.open() }}
      rows={rows}
      rowKey={(item) => item.id}
      onRow={(item) => navigate(`/convenios/${item.id}`)}
      noun="convênios"
      vazio="Nenhum convênio encontrado"
      colunas={[
        { label: "Convênio", w: "minmax(250px,1.3fr)", cell: (item) => <Ident title={item.name} sub={item.extra?.cnpj ? `CNPJ ${item.extra.cnpj}` : item.extra?.razao || item.extra?.contato || undefined} initials={initialsOf(item.name)} color={item.extra?.cor || colorFor(item.name)} /> },
        { label: "Tipo", w: "minmax(150px,.8fr)", cell: (item) => <Duo title={tipoOf(item)} sub={item.extra?.faturar || "Lote mensal"} /> },
        { label: "Vidas · guias", w: "130px", cell: (item) => { const s = statsOf(item); return <Duo title={`${s.vidas} vidas`} sub={`${s.guias} guias`} /> } },
        { label: "Repasse", w: "140px", cell: (item) => { const s = statsOf(item); return <Duo title={<span className="cl-money">{brl(s.repasse)}</span>} sub={`prazo ${s.prazo}`} /> } },
        { label: "Glosas", w: "110px", cell: (item) => <span className="cl-money">{brl(statsOf(item).glosas)}</span> },
        { label: "Situação", w: "130px", cell: (item) => <Status status={item.status} /> },
      ]}
      acoesW="200px"
      acoes={(item) => (
        <RowActions name={item.name} onView={() => navigate(`/convenios/${item.id}`)} onEdit={() => forms.open("convenios", item)} onDelete={() => navigate(`/convenios/${item.id}?excluir=1`)}>
          <RowButton title="Faturar lote" onClick={() => faturar(item)}><CircleDollarSign /></RowButton>
          <RowButton title={item.status === "Suspenso" ? "Reativar" : "Suspender"} onClick={() => alternar(item)}>{item.status === "Suspenso" ? <CirclePlay /> : <CirclePause />}</RowButton>
        </RowActions>
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}
