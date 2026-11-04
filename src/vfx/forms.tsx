import { localDateTime, localISO } from "../date"
import {
  AlertTriangle,
  Archive,
  BedDouble,
  BookOpen,
  BriefcaseMedical,
  Building2,
  CircleDollarSign,
  FileText,
  HeartPulse,
  KeyRound,
  Megaphone,
  PackagePlus,
  Pill,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Syringe,
  TestTube2,
  Video,
} from "lucide-react"
import { normalize, type Item, type ModuleSlug } from "../store"
import { type Ctx, type Field, type FormDef, type Values, rolePerms } from "./FormDrawer"
import { addDays, brl, parseMoney, todayISO } from "./ui"
import { validCnpj, validCpf } from "./ClienteForm"
import { localTime } from "../date"

/* ---------------- atalhos ---------------- */
function withoutId(item: Item): Partial<Item> {
  const { id: _id, createdAt: _created, ...rest } = item
  return rest
}
type Span = 1 | 2 | 3 | 4 | 5 | 6
const f = (k: string, label: string, t: Field["t"] = "text", span: Span = 3, extra: Partial<Field> = {}): Field => ({ k, label, t, span, ...extra })
const req = (field: Field): Field => ({ ...field, req: true })
const sel = (k: string, label: string, opts: Field["opts"], span: Span = 3, extra: Partial<Field> = {}) => f(k, label, "select", span, { opts, ...extra })
const pills = (k: string, label: string, opts: Field["opts"], span: Span = 6, extra: Partial<Field> = {}) => f(k, label, "pills", span, { opts, ...extra })
const multi = (k: string, label: string, opts: Field["opts"], span: Span = 6, extra: Partial<Field> = {}) => f(k, label, "multi", span, { opts, ...extra })
const tog = (k: string, label: string, def = false, small?: string, span: Span = 6) => f(k, label, "toggle", span, { def, small })
const animal = (label = "Paciente", required = true) => ({ ...f("animalId", label, "animal", 6), req: required })
const pro = (label = "Veterinário responsável", required = true, k = "professionalId", span: Span = 3) => ({ ...f(k, label, "professional", span), req: required })
const proNames = (ctx: Ctx) => ctx.data.profissionais.map((item) => item.name)
const unitNames = (ctx: Ctx) => ctx.units.map((unit) => unit.shortName)
const colors = ["#e94f17", "#2457c5", "#0f766e", "#6d4bc2", "#b4325e", "#9a6212", "#5b6474"]
const especies = ["Cão", "Gato", "Aves", "Roedores", "Répteis", "Equinos"]
const today = "today"
const nowHM = () => localTime()
const speciesOf = (ctx: Ctx, values: Values) => ctx.data.animais.find((a) => a.id === values.animalId)?.species || ""
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : NaN }
const isDog = (sp: string) => /c[ãa]o|canin/i.test(sp)
const isCat = (sp: string) => /gat|felin/i.test(sp)
/* vacinas por espécie (V-01) */
const VACINAS_CAO = ["Vacina V10", "Vacina V8", "Vacina antirrábica", "Vacina contra gripe canina", "Vacina contra giárdia", "Vacina contra leishmaniose"]
const VACINAS_GATO = ["Vacina antirrábica", "Vacina quádrupla felina (V4)", "Vacina quíntupla felina (V5)", "Vacina tríplice felina (V3)", "Vacina contra leucemia felina (FeLV)"]
const VACINAS_OUTRAS = ["Vacina antirrábica", "Vacina contra aftosa", "Vacina contra clostridioses", "Vacina contra brucelose", "Vacina contra influenza equina", "Vacina contra tétano"]
const vaccineOptions = (ctx: Ctx, values: Values) => {
  const sp = speciesOf(ctx, values)
  const base = values.grupo && values.grupo !== "Vacina" ? ["Vermífugo", "Antipulgas", "Antiparasitário"] : isDog(sp) ? VACINAS_CAO : isCat(sp) ? VACINAS_GATO : sp ? VACINAS_OUTRAS : [...new Set([...VACINAS_CAO, ...VACINAS_GATO])]
  return base
}
/* lotes do estoque com validade (V-02/M-19) */
const lotOptions = (ctx: Ctx, values: Values) => {
  const term = normalize(values.name || "").replace(/^vacina\s+/, "").split(" ").slice(0, 2).join(" ")
  return ctx.data.estoque
    .filter((i) => term && normalize(i.name).includes(term) && (i.quantity || 0) > 0)
    .map((i) => [i.id, `${(i.name.match(/lote (\d+)/) || [])[1] ? `Lote ${(i.name.match(/lote (\d+)/) || [])[1]}` : i.name} · ${i.quantity} un. · val. ${i.dueDate ? i.dueDate.split("-").reverse().join("/") : "—"}${i.dueDate && i.dueDate < todayISO() ? " · VENCIDO" : ""}`] as [string, string])
}
const tempAlert = (values: Values) => {
  const t = num(values.temperatura)
  if (values.temperatura && (Number.isNaN(t) || t < 30 || t > 45)) return "Temperatura inválida. Digite em °C, por exemplo 38,5."
  if (values.temperatura && (t < 35 || t > 43) && !window.confirm(`Temperatura de ${t} °C está fora da faixa usual (35–43 °C). Confirma o valor?`)) return "Confira a temperatura antes de salvar."
  return undefined
}
const weightProblem = (v: unknown, label = "Peso") => { if (v === undefined || v === null || v === "") return undefined; const n = num(v); return Number.isNaN(n) || n <= 0 ? `${label} deve ser um número maior que zero (ex.: 12,4).` : undefined }
const moneyNegative = (...vals: unknown[]) => vals.some((v) => v !== undefined && v !== "" && parseMoney(v) < 0)

export const serviceCatalog: [string, number][] = [
  ["Consulta clínica", 190],
  ["Retorno", 110],
  ["Vacinação", 145],
  ["Consulta dermatológica", 260],
  ["Consulta cardiológica", 310],
  ["Ultrassonografia", 280],
  ["Atendimento emergencial", 390],
  ["Consulta de felinos", 230],
]
const servicePrice = (name: string, ctx: Ctx) =>
  ctx.data.servicos.find((item) => item.name === name)?.amountValue ||
  serviceCatalog.find(([service]) => service === name)?.[1] ||
  0

function stockAdjust(ctx: Ctx, name: string, delta: number) {
  const term = normalize(name).split(" ").slice(0, 2).join(" ")
  const match = ctx.data.estoque.find((item) => normalize(item.name).includes(term))
  if (!match) return false
  const quantity = Math.max(0, (match.quantity || 0) + delta)
  ctx.updateItem("estoque", match.id, {
    quantity,
    subtitle: `${quantity} un. • mínimo ${match.minimum || 0}`,
    status: quantity < (match.minimum || 0) ? "Abaixo do mínimo" : "Disponível",
  })
  return true
}

/* =================================================================== */
const consultas: FormDef = {
  slug: "consultas",
  title: "Nova consulta",
  sub: "Emite a senha, abre o atendimento e registra a consulta completa.",
  icon: Stethoscope,
  color: "#c2410c",
  submit: "Salvar consulta",
  footer: (values, ctx) => (values.service ? `${values.service} · ${brl(parseMoney(values.valor) || servicePrice(values.service, ctx))}` : "Campos com * são obrigatórios"),
  sections: [
    { title: "Paciente", desc: "busca por nome, tutor ou raça", fields: [animal(), f("responsavel", "Responsável presente", "text", 3, { ph: "Tutor ou outro responsável" }), sel("convenio", "Convênio / plano", (ctx) => ["Particular", ...ctx.data.convenios.slice(0, 12).map((item) => item.name)])] },
    {
      title: "Atendimento",
      fields: [
        req(sel("service", "Tipo de atendimento", serviceCatalog.map(([name]) => name))),
        pro(),
        req(f("date", "Data", "date", 2, { def: today })),
        req(f("time", "Hora", "time", 2, { def: "09:00" })),
        sel("duracao", "Duração", ["15 min", "30 min", "45 min", "60 min"], 2, { def: "30 min" }),
        sel("sala", "Consultório / sala", ["Consultório 1", "Consultório 2", "Consultório 3", "Sala de procedimentos"]),
        sel("origem", "Origem", ["Agendado", "Encaixe", "Demanda espontânea", "Encaminhamento externo"], 3, { def: "Agendado" }),
        pills("prioridade", "Prioridade da senha", ["Normal", "Preferencial", "Urgente"], 6, { def: "Normal" }),
        pills("status", "Etapa na fila", ["Chegou", "Triagem", "Em atendimento", "Concluído", "Faltou", "Cancelado"], 6, { def: "Chegou", req: true }),
        f("resumo", "Resumo para a linha do tempo", "text", 6, { ph: "Ex.: retorno otite — reavaliar orelha esquerda" }),
      ],
    },
    {
      title: "Triagem",
      desc: "pode ser feita pela enfermagem",
      fields: [
        f("peso", "Peso (kg)", "text", 2), f("temperatura", "Temperatura (°C)", "text", 2), f("fc", "FC (bpm)", "text", 2), f("fr", "FR (mpm)", "text", 2), f("tpc", "TPC (s)", "text", 2), f("pas", "PAS (mmHg)", "text", 2),
        sel("mucosas", "Mucosas", ["Normocoradas", "Hipocoradas", "Hiperêmicas", "Ictéricas", "Cianóticas"]),
        sel("hidratacao", "Hidratação", ["Normal", "Desidratação leve (5%)", "Moderada (8%)", "Grave (≥10%)"]),
        pills("ecc", "Escore de condição corporal (1–9)", ["1", "2", "3", "4", "5", "6", "7", "8", "9"]),
        pills("dor", "Escala de dor (0–10)", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
      ],
    },
    {
      title: "Anamnese",
      fields: [
        req(f("queixa", "Queixa principal", "textarea", 6)),
        f("inicio", "Início e evolução"), f("alimentacao", "Alimentação"), f("ambiente", "Ambiente / contactantes"), f("medicacoes", "Medicações em uso"),
        tog("vacinasEmDia", "Vacinas em dia", false, undefined, 2), tog("vermifugoEmDia", "Vermífugo em dia", false, undefined, 2), tog("antipulgas", "Antipulgas em dia", false, undefined, 2),
        f("historico", "Histórico relevante", "text", 6),
      ],
    },
    {
      title: "Exame físico",
      desc: "marque só o que estiver alterado",
      fields: [
        multi("alterados", "Sistemas alterados", ["Pele e pelagem", "Ouvidos", "Olhos", "Cavidade oral", "Linfonodos", "Cardiovascular", "Respiratório", "Abdômen", "Locomotor", "Neurológico"]),
        f("achados", "Achados do exame", "textarea", 6),
        f("anexos", "Fotos e vídeos", "file", 6, { ph: "Anexar fotos, vídeos ou exames" }),
      ],
    },
    {
      title: "Diagnóstico",
      fields: [
        f("diagnostico", "Suspeitas / diagnóstico", "text", 6, { ph: "Ex.: otite externa bacteriana; Malassezia" }),
        pills("situacaoDx", "Situação do diagnóstico", ["Presuntivo", "Definitivo"], 3),
        pills("prognostico", "Prognóstico", ["Favorável", "Reservado", "Ruim"], 3),
        f("conduta", "Conduta / plano terapêutico", "textarea", 6),
      ],
    },
    {
      title: "Encerramento",
      fields: [
        f("valor", "Valor do atendimento", "money", 2, { hint: "vazio = preço do serviço" }),
        f("retorno", "Retorno", "date", 2),
        sel("cobranca", "Cobrança", ["Enviar para o caixa", "Cobrar agora (Pix)", "Faturar no convênio"], 2, { def: "Enviar para o caixa" }),
        tog("enviarResumo", "Registrar envio do resumo ao tutor (WhatsApp simulado)", true),
        tog("nps", "Pesquisa de satisfação (NPS) 24h depois", true),
      ],
    },
  ],
  fromItem: (item) => ({ service: item.service || item.name, queixa: item.notes || "", valor: item.amountValue ? brl(item.amountValue) : "" }),
  toItem: (values, ctx) => ({
    name: values.service,
    service: values.service,
    status: values.status || "Chegou",
    category: values.prioridade === "Urgente" ? "Emergência" : "Clínica",
    urgency: values.prioridade === "Urgente",
    amountValue: parseMoney(values.valor) || servicePrice(values.service, ctx),
    notes: values.queixa,
    diagnosis: values.diagnostico,
    treatment: values.conduta,
    weight: values.peso ? `${values.peso} kg` : undefined,
  }),
  after: (saved, values, ctx, isNew) => {
    if (isNew && values.retorno)
      ctx.addItem("agendas", { name: "Retorno", service: "Retorno", animalId: saved.animalId, professionalId: saved.professionalId, professional: saved.professional, date: values.retorno, time: values.time || "09:00", status: "Agendado", notes: `Retorno da consulta de ${saved.date}` })
    if (isNew && values.enviarResumo && saved.animal)
      ctx.addItem("comunicacao", { name: "Resumo da consulta", animalId: saved.animalId, status: "Enviada", category: "WhatsApp", extra: { mensagem: `Resumo do atendimento de ${saved.animal}: ${values.conduta || "orientações enviadas pela equipe."}` } })
  },
}

const profissionais: FormDef = {
  slug: "profissionais",
  title: "Novo profissional",
  sub: "Cria o crachá: dados pessoais, registro no CRMV, escala, comissão e acesso.",
  icon: BriefcaseMedical,
  color: "#2457c5",
  submit: "Salvar profissional",
  sections: [
    { title: "Identificação", fields: [req(f("nomeCompleto", "Nome completo", "text", 4)), sel("tratamento", "Tratamento", ["Dra.", "Dr.", "—"], 2, { def: "Dr." }), f("cpf", "CPF", "text", 2, { ph: "000.000.000-00" }), f("rg", "RG", "text", 2), f("nascimento", "Nascimento", "date", 2), f("cor", "Cor do crachá", "color", 3, { opts: colors, def: "#2457c5" }), f("bio", "Bio curta (site e app do tutor)", "text", 3)] },
    { title: "Contato", fields: [req(f("phone", "Celular / WhatsApp", "tel")), f("email", "E-mail", "email"), f("cep", "CEP", "text", 2), f("logradouro", "Logradouro", "text", 4), f("numero", "Nº", "text", 1), f("complemento", "Complemento", "text", 2), f("bairro", "Bairro", "text", 3), f("cidade", "Cidade", "text", 4), f("uf", "UF", "text", 2), f("emergNome", "Contato de emergência"), f("emergTel", "Telefone de emergência", "tel")] },
    { title: "Registro", desc: "necessário para assinar receitas e laudos", fields: [req(pills("funcao", "Função", ["Médico(a)-veterinário(a)", "Auxiliar / enfermagem", "Recepção", "Banho e tosa", "Gestão", "Financeiro"], 6, { def: "Médico(a)-veterinário(a)" })), f("crmv", "CRMV nº", "text", 2), f("crmvUf", "UF do CRMV", "text", 2, { def: "RO" }), sel("crmvSituacao", "Situação", ["Ativo", "Secundário", "Suspenso"], 2, { def: "Ativo" }), f("mapa", "Cadastro MAPA (controlados)"), f("seqReceitas", "Nº sequencial de receitas"), multi("especialidades", "Especialidades", ["Clínica geral", "Dermatologia", "Felinos", "Cirurgia", "Emergência", "Cardiologia", "Ortopedia", "Oftalmologia", "Anestesiologia", "Imagem", "Silvestres"]), f("certificado", "Certificado digital ICP-Brasil", "file", 3, { ph: "Enviar A1 (.pfx)" }), f("assinatura", "Assinatura digitalizada", "file", 3, { ph: "PNG transparente" }), f("formacao", "Formação", "text", 6)] },
    { title: "Vínculo", fields: [sel("vinculo", "Tipo de vínculo", ["PJ / prestador", "CLT", "Autônomo (RPA)", "Sócio(a)", "Estagiário(a)"], 2), f("admissao", "Admissão", "date", 2), f("cnpj", "CNPJ (se PJ)", "text", 2), multi("unidades", "Unidades em que atua", unitNames), multi("areas", "Áreas de atuação", ["Clínica", "Cirurgia", "Internação", "Anestesia", "Imagem", "Laboratório", "Teleatendimento", "Estética"]), req(pills("status", "Status", ["Ativo", "Plantão eventual", "Afastado", "Inativo"], 6, { def: "Ativo" }))] },
    { title: "Agenda", fields: [tog("agenda", "Atende com agenda própria", true), pills("escala", "Tipo de escala", ["Fixa semanal", "Variável"], 3, { def: "Fixa semanal" }), sel("duracaoPadrao", "Duração padrão da consulta", ["30 min", "40 min", "60 min"], 3, { def: "30 min" }), f("horarios", "Escala semanal", "rows", 6, { cols: [{ k: "dia", label: "Dia" }, { k: "entrada", label: "Entrada", t: "time" }, { k: "saida", label: "Saída", t: "time" }], def: [{ dia: "Seg–Sex", entrada: "08:00", saida: "18:00" }, { dia: "Sábado", entrada: "08:00", saida: "12:00" }], ph: "Adicionar dia" }), tog("encaixes", "Aceita encaixes", true, undefined, 3), tog("plantao", "Entra na escala de plantão", false, undefined, 3), tog("online", "Agendável online pelo tutor", true)] },
    { title: "Financeiro", fields: [tog("comissao", "Recebe comissão", true), f("comissaoPct", "Comissão padrão (%)", "number", 2, { def: "30" }), sel("baseComissao", "Base de cálculo", ["Valor líquido", "Valor bruto"], 2, { def: "Valor líquido" }), sel("limiteDesconto", "Limite de desconto", ["Sem desconto", "Até 5%", "Até 10%", "Limite da empresa", "Até 100%"], 2, { def: "Até 10%" }), f("pix", "Chave Pix para repasse", "text", 6)] },
    { title: "Acesso", fields: [tog("criarUsuario", "Criar usuário para este profissional", false, "envia convite para o e-mail cadastrado"), sel("perfil", "Perfil de acesso", ["Veterinário", "Administrador", "Enfermagem / auxiliar", "Recepção", "Financeiro"], 3, { def: "Veterinário" }), sel("acessoLocal", "Onde pode acessar", ["Somente na clínica", "Qualquer lugar"], 3, { def: "Somente na clínica" })] },
  ],
  fromItem: (item) => ({ nomeCompleto: item.name.replace(/^(Dr|Dra)\.\s*/, ""), tratamento: /^Dra\./.test(item.name) ? "Dra." : /^Dr\./.test(item.name) ? "Dr." : "—", phone: item.phone || "", email: item.email || "", crmv: (item.registration || "").replace(/^CRMV-\w+\s*/, ""), crmvUf: (item.registration || "CRMV-RO").match(/CRMV-(\w+)/)?.[1] || "RO", especialidades: item.category ? [item.category] : [] }),
  toItem: (values) => {
    const name = values.tratamento && values.tratamento !== "—" ? `${values.tratamento} ${values.nomeCompleto}` : values.nomeCompleto
    const registration = values.crmv ? `CRMV-${values.crmvUf || "RO"} ${values.crmv}` : ""
    const category = values.especialidades?.[0] || values.funcao
    return { name, registration, category, phone: values.phone, email: values.email, status: values.status, subtitle: [category, registration].filter(Boolean).join(" • ") }
  },
  after: (saved, values, ctx, isNew) => {
    if (isNew && values.criarUsuario)
      ctx.addItem("usuarios", { name: saved.name, email: values.email, status: "Convite pendente", category: values.perfil, subtitle: `${values.perfil} • convite enviado`, professionalId: saved.id, extra: { papel: values.perfil, permissoes: rolePerms(values.perfil) } })
  },
}

const vacinas: FormDef = {
  slug: "vacinas",
  title: "Registrar aplicação",
  sub: "Registra a dose, carimba a carteirinha e programa o próximo reforço.",
  icon: Syringe,
  color: "#0f766e",
  submit: "Registrar aplicação",
  footer: () => "Ao salvar: registro na carteirinha + baixa de 1 dose do lote escolhido",
  sections: [
    { title: "Paciente", fields: [animal(), f("peso", "Peso no dia (kg)", "text", 2), f("temperatura", "Temperatura (°C)", "text", 2), f("apto", "Apto(a) na avaliação", "toggle", 2, { def: true })] },
    {
      title: "Vacina",
      fields: [
        pills("grupo", "Grupo", ["Vacina", "Vermífugo", "Antiparasitário"], 6, { def: "Vacina" }),
        req(sel("name", "Vacina / produto", vaccineOptions, 3, { hint: "só as vacinas da espécie do paciente" })),
        sel("protocolo", "Protocolo", ["Filhote · 3 doses a cada 21 dias", "Reforço anual", "Dose única"], 3, { def: "Reforço anual" }),
        pills("dose", "Dose do protocolo", ["1ª", "2ª", "3ª", "Reforço anual", "Dose extra"], 6, { def: "Reforço anual" }),
        f("laboratorio", "Laboratório / fabricante"), f("nomeComercial", "Nome comercial"),
        sel("loteEstoque", "Lote do estoque", lotOptions, 6, { ph: "Escolha o lote (ou digite abaixo se for dose externa)" }),
        f("lote", "Lote (digitado)", "text", 2), f("fabricacao", "Fabricação", "text", 2, { ph: "MM/AAAA" }), f("validadeLote", "Validade do lote", "date", 2),
        sel("via", "Via", ["Subcutânea", "Intramuscular", "Intranasal", "Oral", "Tópica"], 2, { def: "Subcutânea" }), f("volume", "Volume", "text", 2, { def: "1 mL" }), sel("local", "Local de aplicação", ["Região escapular", "Membro post. direito", "Membro post. esquerdo", "Outro"], 2),
      ],
    },
    { title: "Aplicação", fields: [req(pills("status", "Situação", ["Aplicada", "A vencer", "Atrasada"], 6, { def: "Aplicada", hint: "“A vencer” = dose programada" })), req(f("date", "Data", "date", 3, { def: today })), f("time", "Hora", "time", 3, { def: nowHM }), pro(), sel("aplicadoPor", "Aplicado por", ["Próprio veterinário", "Auxiliar sob supervisão"], 3), tog("externa", "Dose aplicada em outra clínica (só histórico)")] },
    { title: "Próxima dose", fields: [f("proxima", "Próxima dose", "date", 3, { def: () => addDays(todayISO(), 365) }), sel("antecedencia", "Lembrar o tutor com", ["15 dias de antecedência", "7 dias", "30 dias"], 3, { def: "15 dias de antecedência" }), multi("canais", "Canais", ["WhatsApp", "E-mail", "SMS", "App do tutor"], 6, { def: ["WhatsApp"] }), tog("preAgendar", "Pré-agendar a próxima dose na agenda")] },
    { title: "Reação e cobrança", fields: [pills("reacao", "Reação adversa (até 30 min)", ["Nenhuma", "Leve · dor local", "Moderada · edema/febre", "Grave · anafilaxia"], 6, { def: "Nenhuma" }), f("notes", "Observações", "textarea", 6), tog("atestado", "Emitir atestado de vacinação", false, "com dados do animal, lote e CRMV"), tog("enviarCarteirinha", "Enviar carteirinha digital ao tutor", true), f("valor", "Valor", "money", 3), tog("baixaEstoque", "Dar baixa de 1 dose no estoque", true, undefined, 3)] },
  ],
  fromItem: (item) => ({ proxima: item.dueDate || "", valor: item.amountValue ? brl(item.amountValue) : "" }),
  validate: (values, ctx) => {
    const sp = speciesOf(ctx, values)
    if (values.grupo === "Vacina" && sp && values.name && !vaccineOptions(ctx, values).includes(values.name)) return `${values.name} não é indicada para ${sp}. Escolha uma vacina da espécie do paciente.`
    const w = weightProblem(values.peso); if (w) return w
    const t = tempAlert(values); if (t) return t
    if (values.status === "Aplicada" && !values.externa && !values.loteEstoque && !values.lote) return "Informe o lote: escolha um lote do estoque ou digite o lote."
    const lot = values.loteEstoque ? ctx.data.estoque.find((i) => i.id === values.loteEstoque) : undefined
    const validade = lot?.dueDate || values.validadeLote
    if (values.status === "Aplicada" && validade && validade < (values.date || todayISO())) return `O lote está vencido (validade ${validade.split("-").reverse().join("/")}). Use outro lote.`
    if (values.proxima && values.date && values.proxima <= values.date) return "A próxima dose precisa ser depois da data de aplicação."
  },
  toItem: (values, ctx) => {
    const lot = values.loteEstoque ? ctx.data.estoque.find((i) => i.id === values.loteEstoque) : undefined
    return { name: values.name, status: values.status, dueDate: values.proxima, amountValue: parseMoney(values.valor) || 145, category: values.grupo, extra: lot ? { lote: (lot.name.match(/lote (\d+)/) || [])[1] || lot.extra?.lote || values.lote, validadeLote: lot.dueDate, loteEstoque: lot.id } : undefined }
  },
  after: (saved, values, ctx, isNew) => {
    if (!isNew) return
    if (values.baixaEstoque && values.status === "Aplicada" && !values.externa) {
      const lot = values.loteEstoque ? ctx.data.estoque.find((i) => i.id === values.loteEstoque) : undefined
      if (lot) { const q = Math.max(0, (lot.quantity || 0) - 1); ctx.updateItem("estoque", lot.id, { quantity: q, subtitle: `${q} un. • mínimo ${lot.minimum || 0}`, status: q <= 0 ? "Esgotado" : q < (lot.minimum || 0) ? "Abaixo do mínimo" : lot.status, extra: { ...(lot.extra || {}), movimentos: [...(lot.extra?.movimentos || []), { em: new Date().toISOString(), qtd: -1, motivo: `Vacina aplicada · ${saved.animal || ""}` }] } }) }
      else stockAdjust(ctx, values.name, -1)
    }
    if (values.preAgendar && values.proxima) ctx.addItem("agendas", { name: "Vacinação", service: "Vacinação", animalId: saved.animalId, professionalId: saved.professionalId, professional: saved.professional, date: values.proxima, time: values.time || nowHM(), status: "Agendado", notes: `Reforço de ${values.name}` })
    if (values.atestado) ctx.addItem("documentos", { name: "Atestado de vacinação", animalId: saved.animalId, professionalId: saved.professionalId, professional: saved.professional, status: "Pendente", category: "Clínicos", extra: { gaveta: "Clínicos", vacina: values.name, lote: values.lote } })
  },
}

const prescricoes: FormDef = {
  slug: "prescricoes",
  title: "Nova receita",
  sub: "Preenche a folha do receituário; o tipo define a cor do papel e as exigências legais.",
  icon: FileText,
  color: "#8a6a4a",
  submit: "Emitir receita",
  sections: [
    { title: "Tipo", fields: [req(pills("tipo", "Tipo de receita", ["Simples", "Controle especial", "Manipulação"], 6, { def: "Simples" })), sel("modelo", "Modelo", ["Em branco", "Otite canina", "Pós-castração", "Dermatite alérgica", "Gastroenterite"], 3, { def: "Em branco" }), sel("consultaVinc", "Atendimento vinculado", (ctx) => ctx.data.consultas.slice(0, 10).map((item) => `${item.name} · ${item.animal} · ${item.date}`))] },
    { title: "Paciente", desc: "exigidos na receita controlada", fields: [animal(), f("tutorCpf", "CPF do tutor"), f("peso", "Peso atual (kg)"), f("tutorEndereco", "Endereço do tutor", "text", 6)] },
    { title: "Prescritor", fields: [pro("Veterinário prescritor"), f("mapa", "Cadastro MAPA"), sel("estabelecimento", "Estabelecimento (cabeçalho)", (ctx) => ctx.units.map((unit) => `${unit.name} · ${unit.street}, ${unit.number}`), 6)] },
    { title: "Medicamentos", desc: "dose calculada pelo peso do dia", fields: [{ ...f("itens", "Itens da receita", "rows", 6, { cols: [{ k: "med", label: "Medicamento", w: "1.6fr" }, { k: "dose", label: "Dose" }, { k: "via", label: "Via", t: "select", opts: ["Oral", "Tópico", "Otológico", "Oftálmico", "Injetável"] }, { k: "freq", label: "Frequência" }, { k: "dur", label: "Duração" }, { k: "qtd", label: "Qtd." }], def: [{ med: "", dose: "", via: "Oral", freq: "12/12 h", dur: "7 dias", qtd: "" }], ph: "Adicionar medicamento" }), req: true }] },
    { title: "Orientações", fields: [f("orientacoes", "Orientações ao tutor", "textarea", 6, { ph: "Dar com alimento, não interromper antes do prazo…" })] },
    { title: "Assinatura", fields: [req(f("date", "Emissão", "date", 2, { def: today })), sel("validade", "Validade", ["30 dias", "10 dias", "Uso contínuo · 6 meses"], 2, { def: "30 dias" }), sel("vias", "Vias", ["1 via", "2 vias"], 2, { def: (values: Values) => (values?.tipo === "Controle especial" ? "2 vias" : "1 via") }), pills("assinatura", "Assinatura", ["Imprimir e assinar à mão", "Certificado digital ICP-Brasil (integração não ativa)"], 6, { def: "Imprimir e assinar à mão" }), multi("enviar", "Depois de emitir", ["Imprimir"], 6, { def: [], hint: "O envio ao tutor é feito pelo botão “Enviar ao tutor”, só quando você clicar." }), pills("status", "Situação", ["Ativa", "Vencendo", "Renovação pendente", "Concluída"], 6, { def: "Ativa", req: true }), { ...f("aviso", "", "info", 6), small: "Receita de controle especial: 2 vias, CPF e endereço completos do tutor e dados completos do prescritor (nome, CRMV e endereço).", show: (values: Values) => values.tipo === "Controle especial" }] },
  ],
  fromItem: (item) => ({ itens: [{ med: item.name, dose: "", via: "Oral", freq: "12/12 h", dur: "7 dias", qtd: "" }] }),
  toItem: (values) => ({ name: values.itens?.find((row: Values) => row.med)?.med || "Receita", category: values.tipo, status: values.status }),
  validate: (values) => {
    const w = weightProblem(values.peso); if (w) return w
    if (values.tipo === "Controle especial") {
      if (!values.tutorCpf || !validCpf(values.tutorCpf)) return "Receita de controle especial exige o CPF válido do tutor."
      if (!values.tutorEndereco || String(values.tutorEndereco).trim().length < 10) return "Receita de controle especial exige o endereço completo do tutor."
      if (values.vias !== "2 vias") return "Receita de controle especial deve ser emitida em 2 vias."
    }
  },
  after: (_saved, values, _ctx, isNew) => {
    if (isNew && values.enviar?.includes("Imprimir")) window.setTimeout(() => window.print(), 300)
  },
}

const medicamentos: FormDef = {
  slug: "medicamentos",
  title: "Novo medicamento",
  sub: "Coloca um frasco novo na prateleira: identificação, dose de referência, preço, estoque e fiscal.",
  icon: Pill,
  color: "#2f78bf",
  submit: "Salvar medicamento",
  sections: [
    { title: "Identificação", fields: [f("ean", "Código de barras (EAN)"), f("codigo", "Código interno"), req(f("name", "Nome comercial")), req(f("principio", "Princípio ativo")), f("concentracao", "Concentração", "text", 2), sel("forma", "Forma farmacêutica", ["Comprimido", "Comprimido palatável", "Suspensão oral", "Injetável", "Pomada / creme", "Gotas otológicas", "Colírio", "Pipeta"], 2), f("apresentacao", "Apresentação", "text", 2), f("laboratorio", "Laboratório"), req(sel("grupo", "Grupo / classe terapêutica", ["Antibióticos", "Anti-inflamatórios", "Analgésicos", "Cardiológicos", "Dermatológicos", "Antiparasitários", "Gastrointestinais", "Suplementos", "Outros"])), pills("origem", "Origem do registro", ["Veterinário (MAPA)", "Humano (ANVISA)"], 3, { def: "Veterinário (MAPA)" }), f("registro", "Nº de registro"), multi("especies", "Espécies indicadas", especies, 6, { def: ["Cão", "Gato"] }), f("cor", "Cor do frasco", "color", 6, { opts: colors, def: "#e94f17" })] },
    { title: "Controle", fields: [pills("receita", "Exige receita", ["Venda livre", "Receita simples", "Controle especial"], 6, { def: "Receita simples" }), tog("antimicrobiano", "Antimicrobiano", false, undefined, 3), tog("controlado", "Produto controlado (MAPA)", false, undefined, 3), tog("hospitalar", "Uso exclusivo hospitalar", false, undefined, 3), tog("termolabil", "Termolábil (geladeira)", false, undefined, 3)] },
    { title: "Dose", desc: "alimenta a calculadora da receita", fields: [f("doses", "Dose de referência", "rows", 6, { cols: [{ k: "especie", label: "Espécie" }, { k: "min", label: "Mín. (mg/kg)", t: "number" }, { k: "max", label: "Máx. (mg/kg)", t: "number" }, { k: "freq", label: "Frequência" }, { k: "via", label: "Via" }], def: [{ especie: "Cão", min: "", max: "", freq: "12/12 h", via: "VO" }, { especie: "Gato", min: "", max: "", freq: "12/12 h", via: "VO" }] }), f("contraindicacoes", "Contraindicações / alertas", "textarea", 6), f("interacoes", "Interações a vigiar", "text", 6), f("posologia", "Posologia padrão (sugestão na receita)", "text", 6)] },
    { title: "Unidades", fields: [sel("unCompra", "Unidade de compra", ["Caixa", "Frasco", "Ampola", "Bisnaga"], 2, { def: "Caixa" }), sel("unUso", "Unidade de uso / venda", ["Comprimido", "mL", "Unidade", "g", "Dose"], 2, { def: "Comprimido" }), f("fator", "1 unidade de compra =", "text", 2, { ph: "14 comprimidos" }), tog("fracionavel", "Vende fracionado", false, undefined, 3), multi("fracoes", "Frações permitidas", ["½", "¼"], 3)] },
    { title: "Preço", fields: [pills("proposito", "Propósito", ["Venda e consumo interno", "Apenas venda", "Apenas consumo interno"], 6, { def: "Venda e consumo interno" }), f("custo", "Custo", "money", 2), f("markup", "Markup (%)", "number", 2), f("preco", "Preço de venda", "money", 2), f("comissao", "Comissão (%)", "number", 2), f("desconto", "Desconto máximo (%)", "number", 2), f("precoUnit", "Preço por unidade de uso", "money", 2), tog("listaPrecos", "Exibir na lista de preços", true, undefined, 3), tog("alterarPreco", "Permitir alterar preço na venda", false, undefined, 3)] },
    { title: "Estoque", fields: [tog("controlaEstoque", "Controlar estoque", true, undefined, 3), tog("loteValidade", "Controlar lote e validade", true, undefined, 3), f("estoqueInicial", "Estoque inicial", "number", 2), f("minimo", "Mínimo", "number", 2), f("maximo", "Máximo", "number", 2), f("lote", "Lote inicial", "text", 2), f("validade", "Validade", "date", 2), sel("avisoVenc", "Avisar vencimento", ["60 dias antes", "30 dias antes", "15 dias antes"], 2, { def: "60 dias antes" }), f("localizacao", "Localização"), f("fornecedor", "Fornecedor preferencial"), multi("unidades", "Unidades que vendem", unitNames)] },
    { title: "Fiscal", desc: "usado na NF-e / NFC-e", fields: [f("ncm", "NCM", "text", 2), f("cest", "CEST", "text", 2), f("cfop", "CFOP venda", "text", 2, { def: "5.102" }), sel("origemMerc", "Origem da mercadoria", ["0 · Nacional", "1 · Importação direta", "2 · Adquirida no mercado interno"], 3, { def: "0 · Nacional" }), sel("grupoTrib", "Grupo tributário", ["Medicamentos · ST", "Medicamentos · tributado", "Isento"], 3), f("anvisa", "Código ANVISA (NCM 3001–3006)", "text", 6, { ph: "até 13 dígitos" })] },
  ],
  fromItem: (item) => ({ grupo: item.category && item.category !== "Rotina" && item.category !== "Prioridade" ? item.category : "", preco: item.amountValue ? brl(item.amountValue) : "", controlado: item.status === "Controlado" }),
  toItem: (values) => ({ name: values.name, category: values.grupo, status: values.controlado || values.receita === "Controle especial" ? "Controlado" : "Disponível", amountValue: parseMoney(values.preco), subtitle: `${values.principio || values.name} • ${values.apresentacao || values.forma || "apresentação"}`, quantity: Number(values.estoqueInicial || 0), minimum: Number(values.minimo || 0) }),
  after: (saved, values, ctx, isNew) => {
    if (isNew && values.controlaEstoque && Number(values.estoqueInicial)) {
      const quantity = Number(values.estoqueInicial)
      const minimum = Number(values.minimo || 0)
      ctx.addItem("estoque", { name: saved.name, category: "Medicamentos", quantity, minimum, dueDate: values.validade, amountValue: quantity * parseMoney(values.custo), subtitle: `${quantity} un. • mínimo ${minimum}`, status: quantity < minimum ? "Abaixo do mínimo" : "Disponível", extra: { corredor: "B", lote: values.lote } })
    }
  },
}

const examAll = ["Hemograma completo", "Bioquímico hepático", "Perfil renal", "Urina tipo I", "Citologia de pele", "Ultrassom abdominal", "Raio-X de tórax", "Ecocardiograma", "Parasitológico de fezes", "Perfil pré-anestésico", "Check-up sênior"]
/* exames específicos de espécie (V-03) */
const examCat = ["Teste rápido FIV/FeLV"]
const examDog = ["Teste rápido cinomose", "Teste rápido parvovirose", "Teste de leishmaniose (DPP)", "Teste rápido 4Dx (erliquiose, anaplasma, Lyme, dirofilária)"]
const examOptions = (ctx: Ctx, values: Values) => { const sp = speciesOf(ctx, values); return [...examAll, ...(isCat(sp) ? examCat : isDog(sp) ? examDog : sp ? [] : [...examCat, ...examDog])] }
const exames: FormDef = {
  slug: "exames",
  title: "Solicitar exame",
  sub: "Cria o tubo na bancada: pedido, coleta, laboratório e liberação do laudo.",
  icon: TestTube2,
  color: "#6d4bc2",
  submit: "Solicitar exame",
  footer: (values) => `${(values.exames || []).length} exame(s) selecionado(s)`,
  sections: [
    { title: "Paciente", fields: [animal(), pro("Solicitante"), f("atendimento", "Atendimento vinculado", "text", 3, { ph: "Consulta, internação, pré-cirúrgico…" })] },
    { title: "Exames", desc: "um tubo por exame", fields: [{ ...multi("exames", "Exames solicitados", examOptions), req: true }] },
    { title: "Indicação", fields: [req(f("suspeita", "Suspeita / motivo", "textarea", 6)), f("medicacoes", "Medicações em uso"), pills("urgencia", "Urgência", ["Rotina", "Prioridade", "Urgente"], 3, { def: "Rotina" })] },
    { title: "Coleta", fields: [sel("material", "Material / amostra", ["Sangue total · EDTA", "Soro · tubo seco", "Urina · cistocentese", "Fezes", "Swab", "Imagem (sem coleta)"]), f("amostras", "Nº de amostras"), req(f("date", "Data da coleta", "date", 2, { def: today })), f("time", "Hora", "time", 2, { def: nowHM }), f("coletadoPor", "Coletado por", "text", 2), f("jejum", "Jejum exigido", "text", 2, { ph: "8 h" }), tog("jejumOk", "Jejum cumprido", false, undefined, 2), tog("sedacao", "Sob sedação", false, undefined, 2)] },
    { title: "Laboratório", fields: [pills("onde", "Onde será feito", ["Laboratório interno", "Laboratório parceiro", "Volante / imagem móvel"], 6, { def: "Laboratório interno" }), sel("labParceiro", "Laboratório parceiro", ["LabVet", "Diagnóstica Pet", "VetLab Norte"], 3, { show: (values: Values) => values.onde === "Laboratório parceiro" }), f("pedidoExterno", "Nº do pedido externo"), sel("convenio", "Convênio", (ctx) => ["Particular", ...ctx.data.convenios.slice(0, 8).map((item) => item.name)]), f("guia", "Guia de autorização"), f("obsLab", "Observações ao laboratório", "text", 6)] },
    { title: "Laudo", fields: [sel("responsavel", "Responsável pelo laudo", proNames), f("previsao", "Previsão", "text", 3, { ph: "Hoje 14:00" }), req(pills("status", "Etapa", ["Solicitado", "Aguardando resultado", "Aguardando assinatura", "Concluído"], 6, { def: "Solicitado", hint: "“Concluído” só depois de registrar o resultado e assinar o laudo" })), tog("avisar", "Avisar o solicitante quando o laudo ficar pronto", true), tog("liberarTutor", "Liberar ao tutor automaticamente após assinatura"), f("anexos", "Anexar resultado externo", "file", 6, { ph: "PDF, imagem ou DICOM" }), f("valor", "Valor total", "money", 3)] },
  ],
  fromItem: (item) => ({ exames: [item.name], urgencia: item.urgency ? "Urgente" : "Rotina", suspeita: item.notes || "" }),
  validate: (values, ctx) => {
    const sp = speciesOf(ctx, values)
    const allowed = examOptions(ctx, values)
    const bad = (values.exames || []).filter((e: string) => !allowed.includes(e))
    if (bad.length) return `${bad.join(", ")} não se aplica a ${sp || "esta espécie"}.`
    if (values.status === "Concluído" && !values.resultado) return "Para concluir, registre o resultado pelo botão “Registrar resultado” na tela de Exames."
  },
  toItem: (values) => ({ name: values.exames?.[0] || "Exame", status: values.status, urgency: values.urgencia === "Urgente", category: values.urgencia === "Urgente" ? "Urgente" : "Rotina", amountValue: parseMoney(values.valor) || 85, notes: values.suspeita }),
  after: (saved, values, ctx, isNew) => {
    if (!isNew) return
    ;(values.exames || []).slice(1).forEach((name: string) => ctx.addItem("exames", { ...withoutId(saved), name, extra: { ...values, exames: [name] } }))
  },
}

const procedimentos: FormDef = {
  slug: "procedimentos",
  title: "Novo procedimento",
  sub: "Cadastre o que a clínica oferece: nome, categoria, preço e como é feito.",
  icon: Sparkles,
  color: "#b4325e",
  submit: "Salvar procedimento",
  sections: [
    { title: "O que é", fields: [req(pills("naipe", "Categoria", ["Clínico", "Cirúrgico", "Diagnóstico", "Estético", "Terapêutico"], 6, { def: "Clínico" })), req(f("name", "Nome", "text", 4)), f("codigo", "Código", "text", 2), f("descricao", "Descrição para o tutor", "textarea", 6), multi("especies", "Espécies", ["Cão", "Gato", "Silvestres"], 6, { def: ["Cão", "Gato"] })] },
    { title: "Como é feito", fields: [f("duracao", "Duração média", "text", 2, { def: "30 min" }), sel("sala", "Sala", ["Consultório", "Sala de procedimentos", "Centro cirúrgico"], 2), f("jejum", "Jejum", "text", 2), multi("executores", "Quem pode executar", ["Veterinário", "Anestesista", "Auxiliar"], 6, { def: ["Veterinário"] }), tog("anestesia", "Requer anestesia / sedação", false, undefined, 3), tog("geraCirurgia", "Gera agendamento de cirurgia", false, undefined, 3), sel("termo", "Termo de consentimento", ["Nenhum", "Termo de anestesia e cirurgia", "Termo de procedimento"], 3, { def: "Nenhum" }), multi("prereq", "Exames pré-requisito", ["Hemograma", "Perfil renal", "ECG", "Raio-X"], 3), f("checklist", "Checklist da equipe", "rows", 6, { cols: [{ k: "etapa", label: "Etapa" }], def: [{ etapa: "" }], ph: "Adicionar etapa" })] },
    { title: "Insumos", desc: "baixa automática no estoque", fields: [f("insumos", "Insumos consumidos", "rows", 6, { cols: [{ k: "produto", label: "Produto", w: "2fr" }, { k: "qtd", label: "Qtd", t: "number" }, { k: "un", label: "Un." }], ph: "Adicionar insumo" })] },
    { title: "Preço", fields: [pills("modeloPreco", "Modelo de preço", ["Único", "Por porte"], 6, { def: "Único" }), req(f("preco", "Preço (ou porte M)", "money", 2)), f("precoP", "Porte P", "money", 2, { show: (values: Values) => values.modeloPreco === "Por porte" }), f("precoG", "Porte G", "money", 2, { show: (values: Values) => values.modeloPreco === "Por porte" }), f("precoGato", "Gato", "money", 2, { show: (values: Values) => values.modeloPreco === "Por porte" }), f("comissao", "Comissão do executor (%)", "number", 2), f("desconto", "Desconto máximo (%)", "number", 2), multi("convenios", "Convênios que cobrem", (ctx) => ctx.data.convenios.slice(0, 6).map((item) => item.name))] },
    { title: "Depois do procedimento", fields: [f("retorno", "Retorno sugerido", "text", 3, { ph: "10 dias" }), tog("autoRetorno", "Agendar retorno automaticamente", false, undefined, 3), f("orientacoes", "Orientações enviadas ao tutor", "textarea", 6)] },
  ],
  fromItem: (item) => ({ preco: item.amountValue ? brl(item.amountValue) : "", naipe: item.extra?.naipe || "Clínico" }),
  toItem: (values) => ({ name: values.name, category: values.naipe, amountValue: parseMoney(values.preco), status: "Ativo", subtitle: `${values.naipe} • ${values.duracao || "—"}`, extra: { catalogo: true } }),
}

const procedimentoExec: FormDef = {
  slug: "procedimentos",
  title: "Registrar procedimento",
  sub: "Registra que o procedimento foi (ou será) feito em um paciente.",
  icon: Sparkles,
  color: "#b4325e",
  submit: "Registrar",
  sections: [
    { title: "Procedimento", fields: [req(sel("name", "Procedimento", (ctx) => [...new Set(ctx.data.procedimentos.map((item) => item.name))])), animal(), pro(), req(f("date", "Data", "date", 3, { def: today })), f("time", "Hora", "time", 3, { def: "09:00" }), req(pills("status", "Situação", ["Agendado", "Em andamento", "Concluído", "Pendente"], 6, { def: "Agendado" })), f("valor", "Valor", "money", 3), f("notes", "Observações", "textarea", 6)] },
  ],
  toItem: (values, ctx) => ({ name: values.name, status: values.status, amountValue: parseMoney(values.valor) || ctx.data.procedimentos.find((item) => item.name === values.name)?.amountValue || 0 }),
}

const cirurgias: FormDef = {
  slug: "cirurgias",
  title: "Agendar cirurgia",
  sub: "Reserva a sala, monta a equipe e prepara o checklist de cirurgia segura.",
  icon: Scissors,
  color: "#1a2233",
  submit: "Agendar cirurgia",
  sections: [
    { title: "Paciente", fields: [animal(), req(pills("asa", "Classificação ASA", ["I · saudável", "II · doença leve", "III · grave", "IV · risco de vida", "V · moribundo", "E · emergência"])), f("contato", "Contato durante a cirurgia"), pills("rcp", "Autoriza RCP", ["Sim", "Não (DNR)"], 3, { def: "Sim" })] },
    { title: "Cirurgia", fields: [req(sel("name", "Procedimento", ["Castração", "Ovariohisterectomia", "Orquiectomia", "Limpeza dentária", "Retirada de nódulo", "Mastectomia", "Osteossíntese", "Enterotomia", "Cistotomia"], 4)), f("regiao", "Lado / região", "text", 2), pills("carater", "Caráter", ["Eletiva", "Urgência", "Emergência"], 6, { def: "Eletiva" }), f("indicacao", "Indicação / diagnóstico pré-operatório", "textarea", 6), f("associados", "Procedimentos associados"), tog("histopato", "Enviar peça para histopatológico", false, undefined, 3)] },
    { title: "Equipe e sala", fields: [pro("Cirurgião(ã)"), sel("anestesista", "Anestesista", proNames), sel("auxiliar", "Auxiliar cirúrgico", proNames), f("volante", "Volante / instrumentação"), req(sel("sala", "Sala", ["Sala 1", "Sala 2"], 2, { def: "Sala 1" })), req(f("date", "Data", "date", 2, { def: today })), req(f("time", "Início", "time", 1, { def: "14:00" })), sel("duracao", "Duração", ["1 h", "1 h 30", "2 h", "3 h", "4 h"], 1, { def: "1 h 30" })] },
    { title: "Pré-operatório", fields: [multi("preExames", "Exames pré-operatórios ok", ["Hemograma", "Bioquímica", "Raio-X de tórax", "Ecocardiograma", "Coagulograma"]), pills("termo", "Termo de anestesia", ["Não enviado", "Enviado", "Assinado"], 3, { def: "Não enviado" }), pills("orcamento", "Orçamento", ["Pendente", "Aprovado"], 3, { def: "Pendente" }), f("jejumSolido", "Jejum sólido", "text", 2, { def: "8 h" }), f("jejumHidrico", "Jejum hídrico", "text", 2, { def: "2 h" }), f("chegada", "Chegada do paciente", "time", 2), tog("instrucoes", "Mandar instruções de jejum ao tutor na véspera", true)] },
    { title: "Anestesia", fields: [f("mpa", "Medicação pré-anestésica"), f("inducao", "Indução"), sel("manutencao", "Manutenção", ["Inalatória · isoflurano", "Inalatória · sevoflurano", "TIVA"]), f("bloqueios", "Bloqueios locorregionais"), f("sonda", "Sonda endotraqueal", "text", 2), f("fluido", "Fluidoterapia", "text", 2), f("antibiotico", "Antibiótico profilático", "text", 2), multi("monitorizacao", "Monitorização", ["ECG", "SpO₂", "Capnografia", "PA não invasiva", "PA invasiva", "Temperatura"], 6, { def: ["ECG", "SpO₂", "Temperatura"] })] },
    { title: "Materiais", fields: [sel("caixa", "Caixa cirúrgica", ["Caixa geral nº 1", "Caixa geral nº 2", "Caixa geral nº 3", "Caixa ortopédica"]), f("fios", "Fios"), tog("sangue", "Reservar bolsa de sangue", false, undefined, 3), tog("bisturi", "Bisturi elétrico", true, undefined, 3)] },
    { title: "Pós", fields: [pills("destino", "Destino após a cirurgia", ["Alta no mesmo dia", "Internação 24 h", "UTI"], 6, { def: "Alta no mesmo dia" }), f("analgesia", "Analgesia pós"), f("pontos", "Retirada de pontos", "date", 3), req(pills("status", "Situação", ["Agendada", "Pré-operatório", "Em andamento", "Concluída", "Cancelada"], 6, { def: "Agendada" })), f("valor", "Valor do orçamento", "money", 3)] },
  ],
  fromItem: (item) => ({ valor: item.amountValue ? brl(item.amountValue) : "", carater: item.urgency ? "Urgência" : "Eletiva" }),
  toItem: (values) => ({ name: values.name, status: values.status, amountValue: parseMoney(values.valor), category: values.carater, urgency: values.carater !== "Eletiva" }),
  after: (saved, values, ctx, isNew) => {
    if (isNew && values.termo === "Enviado") ctx.addItem("documentos", { name: "Termo de consentimento", animalId: saved.animalId, professionalId: saved.professionalId, professional: saved.professional, status: "Pendente", category: "Clínicos", extra: { gaveta: "Clínicos", cirurgia: saved.name } })
  },
}

export const bedLayout: { room: string; beds: string[] }[] = [
  { room: "Canil", beds: ["C-01", "C-02", "C-03", "C-04", "C-05", "C-06"] },
  { room: "UTI", beds: ["U-01", "U-02"] },
  { room: "Gatil", beds: ["G-01", "G-02", "G-03", "G-04"] },
  { room: "Isolamento", beds: ["I-01", "I-02"] },
]
export const activeAdmission = (item: Item) => ["Em andamento", "Em observação"].includes(item.status)
export function bedAssignments(items: Item[], animals: Item[]) {
  const map = new Map<string, Item>()
  const active = items.filter(activeAdmission)
  active.forEach((item) => {
    if (item.extra?.box && !map.has(item.extra.box)) map.set(item.extra.box, item)
  })
  const queue: Item[] = []
  const dates = items.map((item) => item.date || item.createdAt.slice(0, 10)).sort()
  const cutoff = addDays(dates[dates.length - 1] || todayISO(), -21)
  active
    .filter((item) => !item.extra?.box && (item.date || item.createdAt.slice(0, 10)) >= cutoff)
    .forEach((item) => {
      const species = animals.find((candidate) => candidate.id === item.animalId)?.species
      const preferred = item.category === "UTI" || /UTI/i.test(item.name) ? "UTI" : species === "Gato" ? "Gatil" : "Canil"
      const order = [preferred, ...bedLayout.map((room) => room.room).filter((room) => room !== preferred && room !== "Isolamento")]
      const bed = order.flatMap((room) => bedLayout.find((entry) => entry.room === room)!.beds).find((code) => !map.has(code))
      if (bed) map.set(bed, item)
      else queue.push(item)
    })
  return { map, queue }
}

const internacoes: FormDef = {
  slug: "internacoes",
  title: "Nova internação",
  sub: "Escolhe a baia na planta, registra o quadro e deixa a primeira prescrição no relógio.",
  icon: BedDouble,
  color: "#2457c5",
  submit: "Internar",
  sections: [
    { title: "Paciente", fields: [animal(), req(pills("situacao", "Situação", ["Triagem / orçamento", "Internado"], 3, { def: "Internado" })), req(pills("gravidade", "Gravidade", ["Estável", "Atenção", "Crítico"], 3, { def: "Estável" })), pills("tipo", "Tipo", ["Clínica", "Pós-cirúrgica", "UTI", "Isolamento", "Observação < 12 h"], 6, { def: "Clínica" }), pro(), req(f("date", "Entrada", "date", 2, { def: today })), f("time", "Hora", "time", 1, { def: nowHM }), f("altaPrevista", "Alta prevista", "date", 3), sel("origem", "Origem", ["Consulta", "Emergência", "Pós-cirúrgico", "Transferência externa"])] },
    { title: "Baia", desc: "livres conforme o mapa de leitos", fields: [sel("box", "Baia", (ctx) => { const { map } = bedAssignments(ctx.data.internacoes, ctx.data.animais); return bedLayout.flatMap((room) => room.beds.filter((bed) => !map.has(bed)).map((bed) => [bed, `${room.room} · ${bed}`] as [string, string])) }, 6, { ph: "Escolher depois (fila de espera)" })] },
    { title: "Quadro clínico", fields: [req(sel("name", "Motivo", ["Observação clínica", "Pós-operatório", "Fluidoterapia", "UTI e monitoramento"])), pills("prognostico", "Prognóstico", ["Favorável", "Reservado", "Desfavorável"], 3), req(f("queixa", "Queixa / motivo da internação", "textarea", 6)), f("diagnostico", "Diagnóstico / suspeita", "text", 6), multi("condicoes", "Alergias e condições", ["Alérgico", "Cardiopata", "Diabético", "Sênior", "Nefropata", "Infectocontagioso"]), sel("dieta", "Dieta", ["Ração habitual", "Hipossódica", "Pastosa", "Jejum", "Sonda"]), f("restricoes", "Restrições")] },
    { title: "Monitorização", fields: [f("parametros", "Parâmetros a monitorar", "rows", 6, { cols: [{ k: "parametro", label: "Parâmetro" }, { k: "intervalo", label: "A cada" }, { k: "alerta", label: "Alertar se" }], def: [{ parametro: "FC", intervalo: "2 h", alerta: "> 160 bpm" }, { parametro: "Temperatura", intervalo: "4 h", alerta: "> 39,5 °C" }, { parametro: "Dor", intervalo: "4 h", alerta: "≥ 4/10" }] })] },
    { title: "Prescrição", desc: "vai para o relógio de medicação", fields: [f("prescricao", "Prescrição inicial", "rows", 6, { cols: [{ k: "item", label: "Item", w: "1.4fr" }, { k: "dose", label: "Dose" }, { k: "via", label: "Via", w: ".6fr" }, { k: "freq", label: "Frequência" }, { k: "inicio", label: "Início", t: "time" }], def: [{ item: "", dose: "", via: "IV", freq: "12/12 h", inicio: "08:00" }], ph: "Adicionar item" })] },
    { title: "Pertences", fields: [multi("pertences", "Pertences recebidos", ["Coleira", "Guia", "Caixa de transporte", "Roupa", "Ração própria", "Cobertor", "Brinquedo", "Medicação própria"]), f("obsPertences", "Observações", "text", 6)] },
    { title: "Tutor e custos", fields: [pills("rcp", "Autoriza RCP", ["Sim", "Não"], 3, { def: "Sim" }), pills("semAviso", "Procedimentos de urgência", ["Pode fazer", "Ligar antes"], 3, { def: "Ligar antes" }), f("diaria", "Diária", "money", 2), f("caucao", "Caução", "money", 2), sel("convenio", "Convênio", (ctx) => ["Particular", ...ctx.data.convenios.slice(0, 8).map((item) => item.name)], 2), sel("boletim", "Boletim ao tutor", ["2x ao dia · WhatsApp", "1x ao dia", "Só por telefone"], 3, { def: "2x ao dia · WhatsApp" }), sel("visitas", "Visitas", ["15h–16h · 20 min", "Não permitidas"], 3), tog("termo", "Gerar termo de internação para assinatura", true)] },
  ],
  validate: (values, ctx) => {
    if (values.altaPrevista && values.date && values.altaPrevista < values.date) return "A alta prevista não pode ser antes da data de entrada."
    const sp = speciesOf(ctx, values)
    const room = bedLayout.find((r) => r.beds.includes(values.box))?.room
    if (room === "Gatil" && sp && !isCat(sp) && !window.confirm(`A baia ${values.box} fica no Gatil, mas o paciente é ${sp}. Internar mesmo assim?`)) return "Escolha uma baia da ala adequada à espécie."
    if (room === "Canil" && isCat(sp) && !window.confirm(`A baia ${values.box} fica no Canil, mas o paciente é gato. Internar mesmo assim?`)) return "Escolha uma baia da ala adequada à espécie."
    if (values.box) { const { map } = bedAssignments(ctx.data.internacoes, ctx.data.animais); const occ = map.get(values.box); if (occ) return `A baia ${values.box} está ocupada por ${occ.animal || "outro paciente"}.` }
  },
  fromItem: (item) => ({ situacao: item.status === "Em observação" ? "Triagem / orçamento" : "Internado", gravidade: item.urgency ? "Crítico" : "Estável", queixa: item.notes || "" }),
  toItem: (values) => ({ name: values.name, status: values.situacao === "Internado" ? "Em andamento" : "Em observação", category: values.tipo, urgency: values.gravidade === "Crítico", amountValue: parseMoney(values.caucao), notes: values.queixa }),
  after: (saved, values, ctx, isNew) => {
    if (!isNew) return
    /* B-01: fixa a baia de quem já estava internado, para ninguém "pular" de baia */
    const { map } = bedAssignments(ctx.data.internacoes.filter((i) => i.id !== saved.id), ctx.data.animais)
    map.forEach((item, bed) => { if (!item.extra?.box) ctx.updateItem("internacoes", item.id, { extra: { ...(item.extra || {}), box: bed } }) })
    if (values.termo) ctx.addItem("documentos", { name: "Contrato de internação", animalId: saved.animalId, professionalId: saved.professionalId, professional: saved.professional, status: "Pendente", category: "Clínicos", extra: { gaveta: "Clínicos", internacaoId: saved.id } })
    if (saved.animalId) ctx.updateItem("animais", saved.animalId, { status: "Internado" })
  },
}

const protocolos: FormDef = {
  slug: "protocolos",
  title: "Novo protocolo",
  sub: "Monte o fluxograma etapa por etapa; decisões abrem ramos.",
  icon: BookOpen,
  color: "#6d4bc2",
  submit: "Salvar protocolo",
  sections: [
    { title: "Identificação", fields: [req(f("name", "Nome", "text", 4)), f("versao", "Versão", "text", 2, { def: "v1" }), sel("categoria", "Categoria", ["Emergência", "Anestesia", "Dor", "Infectologia", "Endocrinologia", "Vacinação", "Pós-operatório", "Cirurgia"]), multi("especies", "Espécies", ["Cão", "Gato"], 3, { def: ["Cão", "Gato"] }), f("cor", "Cor da aba", "color", 6, { opts: colors, def: "#6d4bc2" }), f("referencias", "Referências", "text", 6)] },
    { title: "Quando usar", fields: [req(f("criterios", "Critérios de entrada", "textarea", 6)), f("contraindicacoes", "Contraindicações / cuidados", "text", 6)] },
    { title: "Etapas", desc: "a ordem vira o fluxograma", fields: [{ ...f("etapas", "Etapas do fluxograma", "rows", 6, { cols: [{ k: "tipo", label: "Tipo", t: "select", opts: ["Ação", "Decisão", "Medicação", "Exame", "Monitorar", "Aguardar", "Fim"] }, { k: "titulo", label: "Etapa", w: "2fr" }, { k: "detalhe", label: "Detalhe / Sim→ Não→", w: "1.4fr" }, { k: "tempo", label: "Tempo" }], def: [{ tipo: "Ação", titulo: "", detalhe: "", tempo: "" }], ph: "Adicionar etapa" }), req: true }] },
    { title: "Doses", fields: [f("doses", "Doses vinculadas", "rows", 6, { cols: [{ k: "farmaco", label: "Fármaco" }, { k: "dose", label: "Dose" }, { k: "via", label: "Via" }, { k: "obs", label: "Observação" }], ph: "Adicionar fármaco" })] },
    { title: "Automação", fields: [tog("criaPrescricao", "Cria a prescrição ao aplicar", true), tog("solicitaExames", "Solicita os exames das etapas", true), tog("lancaProcedimentos", "Lança procedimentos na conta"), tog("avisaAtraso", "Avisa o responsável se uma etapa atrasar", true)] },
    { title: "Publicação", fields: [sel("autor", "Autor", proNames), sel("aprovador", "Aprovador", proNames), f("proximaRevisao", "Próxima revisão", "date"), req(sel("status", "Status", ["Em revisão", "Aprovado", "Ativo", "Arquivado"], 3, { def: "Em revisão" })), multi("visivel", "Visível para", ["Veterinários", "Enfermagem", "Recepção"], 6, { def: ["Veterinários", "Enfermagem"] }), tog("leitura", "Exigir leitura confirmada da equipe")] },
  ],
  toItem: (values) => ({ name: values.name, status: values.status, category: values.categoria, subtitle: `${values.categoria || "Protocolo"} • ${values.versao || "v1"} • ${(values.etapas || []).length} etapas` }),
}

const servicos: FormDef = {
  slug: "servicos",
  title: "Novo serviço",
  sub: "Serviço com descrição para o tutor, preço por porte, agenda e regras de execução.",
  icon: ShoppingBag,
  color: "#b9500a",
  submit: "Salvar serviço",
  sections: [
    { title: "Cardápio", fields: [req(f("name", "Nome", "text", 4)), f("codigo", "Código", "text", 2), req(sel("secao", "Seção do cardápio", ["Consultas", "Vacinas", "Exames", "Estética", "Cirurgias", "Hospedagem", "Leva e traz", "Outros"])), pills("area", "Área", ["Clínica", "Estética", "Pet shop"], 3, { def: "Clínica" }), f("descCurta", "Descrição curta (itálico no cardápio)", "text", 6), f("descricao", "Descrição completa para o tutor", "textarea", 6)] },
    { title: "Preço", fields: [pills("modelo", "Modelo", ["Único", "Por porte", "Por espécie"], 6, { def: "Único" }), req(f("preco", "Preço base", "money", 2)), ...(["P", "M", "G", "GG", "Gato"].map((porte) => f(`preco${porte}`, `Porte ${porte}`, "money", 1, { show: (values: Values) => values.modelo !== "Único" }))), f("custo", "Custo estimado", "money", 2), f("comissao", "Comissão (%)", "number", 2), f("promo", "Preço promocional", "money", 2), f("promoAte", "Promoção até", "date", 2), tog("combo", "Destacar como combo do mês", false, undefined, 6), tog("exibir", "Exibir preço no cardápio", true, undefined, 3), tog("alterar", "Permitir alterar na venda", false, undefined, 3)] },
    { title: "Agenda", fields: [tog("agendavel", "Pode ser agendado", true), sel("duracao", "Duração padrão", ["15 min", "30 min", "45 min", "60 min", "90 min"], 2, { def: "30 min" }), sel("recorrencia", "Recorrência sugerida", ["Não repete", "A cada 15 dias", "Mensal", "Anual"], 2, { def: "Não repete" }), f("capacidade", "Capacidade simultânea", "number", 2), tog("lembrete", "Lembrete automático 24 h antes", true), tog("online", "Agendável online pelo tutor", true)] },
    { title: "Execução", fields: [multi("executores", "Quem executa", ["Veterinário", "Auxiliar", "Banho e tosa"], 6, { def: ["Veterinário"] }), f("insumos", "Insumos consumidos", "rows", 6, { cols: [{ k: "produto", label: "Produto", w: "2fr" }, { k: "qtd", label: "Qtd", t: "number" }, { k: "un", label: "Un." }], ph: "Adicionar insumo" }), tog("fichaSaude", "Exige ficha de saúde (vacinas e pulgas)")] },
    { title: "Pacotes e convênios", fields: [tog("pacote", "Pode compor pacotes", true), multi("convenios", "Convênios que cobrem", (ctx) => ctx.data.convenios.slice(0, 6).map((item) => item.name)), multi("unidades", "Unidades que oferecem", unitNames)] },
    { title: "Fiscal", desc: "NFS-e", fields: [sel("lc116", "Item da lista (LC 116)", ["5.01 · medicina veterinária", "5.02 · hospitais/clínicas veterinárias", "5.08 · guarda, banho e tosa"], 4, { def: "5.01 · medicina veterinária" }), f("iss", "Alíquota ISS (%)", "number", 2, { def: "5" }), f("cnae", "CNAE", "text", 3, { def: "7500-1/00" }), { ...f("nfseAviso", "", "info", 6), small: "Emissão de NFS-e e combos automáticos: em breve (integração com a prefeitura ainda não ativa)." }] },
  ],
  fromItem: (item) => ({ preco: item.amountValue ? brl(item.amountValue) : "" }),
  validate: (values) => (moneyNegative(values.preco, values.custo, values.promo, values.precoP, values.precoM, values.precoG, values.precoGG, values.precoGato) ? "Preços e custos não podem ser negativos." : undefined),
  toItem: (values) => ({ name: values.name, amountValue: parseMoney(values.preco), status: "Ativo", category: values.secao, subtitle: `${brl(parseMoney(values.preco))} • ${values.duracao || "30 min"}` }),
}

const estoque: FormDef = {
  slug: "estoque",
  title: "Novo item de estoque",
  sub: "Cadastra um item de estoque com corredor, mínimo, lote e validade.",
  icon: PackagePlus,
  color: "#8a6a4a",
  submit: "Salvar item",
  sections: [
    { title: "Item", fields: [req(f("name", "Nome", "text", 4)), f("sku", "SKU", "text", 2), req(sel("category", "Categoria", ["Vacinas", "Medicamentos", "Materiais", "Rações", "Petiscos", "Coleiras e guias", "Higiene", "Brinquedos", "Camas", "Acessórios"], 2)), f("preco", "Preço de venda", "money", 2), sel("unidadeMedida", "Unidade", ["un", "cx", "frasco", "bolsa", "L", "kg"], 2, { def: "un" })] },
    { title: "Quantidades", fields: [req(f("quantity", "Quantidade atual", "number", 2)), req(f("minimum", "Mínimo", "number", 2)), f("maximo", "Máximo", "number", 2), f("lote", "Lote", "text", 2), f("dueDate", "Validade", "date", 2), f("custo", "Custo unitário", "money", 2), f("fornecedor", "Fornecedor", "text", 6)] },
  ],
  fromItem: (item) => ({ quantity: String(item.quantity ?? ""), minimum: String(item.minimum ?? ""), dueDate: item.dueDate || "", custo: item.extra?.custo ? brl(Number(item.extra.custo)) : item.quantity ? brl((item.amountValue || 0) / Math.max(1, item.quantity)) : "", preco: item.extra?.preco ? brl(Number(item.extra.preco)) : "" }),
  validate: (values) => {
    const q = num(values.quantity), mn = num(values.minimum), mx = values.maximo ? num(values.maximo) : NaN
    if (Number.isNaN(q) || q < 0) return "A quantidade não pode ser negativa."
    if (Number.isNaN(mn) || mn < 0) return "O mínimo não pode ser negativo."
    if (!Number.isNaN(mx) && mx < mn) return "O máximo precisa ser maior ou igual ao mínimo."
    if (moneyNegative(values.custo, values.preco)) return "Custo e preço não podem ser negativos."
  },
  toItem: (values) => {
    const quantity = Number(values.quantity || 0)
    const minimum = Number(values.minimum || 0)
    const expired = values.dueDate && values.dueDate < todayISO()
    return { name: values.name, category: values.category, quantity, minimum, dueDate: values.dueDate, amountValue: quantity * parseMoney(values.custo), extra: { custo: parseMoney(values.custo) || undefined, preco: parseMoney(values.preco) || undefined }, subtitle: `${quantity} ${values.unidadeMedida || "un"}. • mínimo ${minimum}`, status: quantity < minimum ? "Abaixo do mínimo" : expired ? "Vencido" : "Disponível" }
  },
}

const entradaNota: FormDef = {
  slug: "financeiro",
  title: "Entrada de nota",
  sub: "Recebe a compra: confere a NF-e, abastece as caixas, lança lote, validade e contas a pagar.",
  icon: Archive,
  color: "#8a6a4a",
  submit: "Dar entrada",
  footer: (values) => `${(values.itens || []).filter((row: Values) => row.produto).length} item(ns) · ${brl((values.itens || []).reduce((sum: number, row: Values) => sum + Number(row.qtd || 0) * parseMoney(row.custo), 0) + parseMoney(values.frete) - parseMoney(values.desconto) + parseMoney(values.impostos))}`,
  sections: [
    { title: "Origem", fields: [f("chave", "Chave de acesso", "text", 6, { ph: "44 dígitos (opcional)" }), { ...f("xmlAviso", "", "info", 6), small: "Importação automática do XML da NF-e: em breve. Por enquanto, digite os itens abaixo." }] },
    { title: "Nota fiscal", fields: [req(f("fornecedor", "Fornecedor", "text", 4)), f("cnpj", "CNPJ", "text", 2), req(f("numero", "Número NF", "text", 2)), f("serie", "Série", "text", 1, { def: "1" }), f("cfop", "CFOP", "text", 3, { def: "1.102" }), f("emissao", "Emissão", "date", 3, { def: today }), req(f("date", "Entrada", "date", 3, { def: today }))] },
    { title: "Itens", desc: "cada item abastece a caixa do mesmo nome", fields: [{ ...f("itens", "Itens da nota", "rows", 6, { cols: [{ k: "produto", label: "Produto", w: "1.6fr" }, { k: "qtd", label: "Qtd", t: "number" }, { k: "lote", label: "Lote" }, { k: "validade", label: "Validade", t: "date" }, { k: "custo", label: "Custo un." }], def: [{ produto: "", qtd: "", lote: "", validade: "", custo: "" }], ph: "Adicionar item" }), req: true }, f("dica", "", "info", 6, { small: "Produto que não existir no estoque vira uma caixa nova no corredor C." })] },
    { title: "Totais", fields: [f("frete", "Frete", "money", 2), f("desconto", "Desconto", "money", 2), f("impostos", "Impostos (ST/IPI)", "money", 2), pills("rateio", "Rateio de frete e impostos no custo", ["Proporcional ao valor", "Por quantidade", "Não ratear"], 6, { def: "Proporcional ao valor" })] },
    { title: "Contas a pagar", fields: [tog("gerar", "Gerar lançamento no financeiro", true), sel("forma", "Forma de pagamento", ["Boleto", "Pix", "Transferência", "Cartão corporativo"], 2, { def: "Boleto" }), sel("parcelas", "Parcelas", ["1x", "2x", "3x"], 2, { def: "1x" }), f("vencimento", "1º vencimento", "date", 2, { def: () => addDays(todayISO(), 30) })] },
    { title: "Conferência", fields: [tog("custoMedio", "Atualizar custo médio dos itens", true), tog("etiquetas", "Imprimir etiquetas das caixas", false), f("conferidoPor", "Recebido e conferido por", "text", 6)] },
  ],
  validate: (values) => {
    if (values.cnpj && !validCnpj(values.cnpj)) return "CNPJ do fornecedor inválido. Confira os 14 dígitos."
    if (values.chave && String(values.chave).replace(/\D/g, "").length !== 44) return "A chave de acesso da NF-e tem 44 dígitos."
    const rows = (values.itens || []).filter((r: Values) => r.produto)
    if (rows.some((r: Values) => !(num(r.qtd) > 0))) return "A quantidade de cada item precisa ser maior que zero."
    if (rows.some((r: Values) => r.validade && r.validade <= todayISO())) return "Há item com validade vencida ou de hoje. Confira o lote."
    if (moneyNegative(values.frete, values.desconto, values.impostos, ...rows.map((r: Values) => r.custo))) return "Valores não podem ser negativos."
  },
  toItem: (values) => {
    const total = (values.itens || []).reduce((sum: number, row: Values) => sum + Number(row.qtd || 0) * parseMoney(row.custo), 0) + parseMoney(values.frete) - parseMoney(values.desconto) + parseMoney(values.impostos)
    return { name: `NF ${values.numero} • ${values.fornecedor}`, subtitle: `Compra de estoque • ${(values.itens || []).length} itens`, category: "Despesa", kind: "Despesa", status: "A pagar", amountValue: total, dueDate: values.vencimento }
  },
  after: (_saved, values, ctx) => {
    ;(values.itens || []).filter((row: Values) => row.produto).forEach((row: Values) => {
      const qty = Number(row.qtd || 0)
      const found = stockAdjust(ctx, row.produto, qty)
      if (!found) ctx.addItem("estoque", { name: row.produto, category: "Materiais", quantity: qty, minimum: Math.max(1, Math.round(qty / 4)), dueDate: row.validade, amountValue: qty * parseMoney(row.custo), subtitle: `${qty} un. • mínimo ${Math.max(1, Math.round(qty / 4))}`, status: "Disponível", extra: { corredor: "C", lote: row.lote } })
    })
  },
}

const financeiro: FormDef = {
  slug: "financeiro",
  title: "Novo lançamento",
  sub: "Entrada, saída ou transferência — vira uma linha no extrato.",
  icon: CircleDollarSign,
  color: "#2b7a4b",
  submit: "Salvar lançamento",
  sections: [
    { title: "Tipo e valor", fields: [req(pills("tipo", "Tipo", ["Receita", "Despesa", "Transferência"], 6, { def: "Receita" })), req(f("valor", "Valor", "money", 2)), req(f("name", "Descrição", "text", 4))] },
    { title: "Classificação", fields: [sel("categoriaConta", "Categoria", (_ctx, values) => values.tipo === "Despesa" ? ["Despesas fixas", "Pessoal", "Compras / insumos", "Impostos", "Marketing", "Manutenção"] : ["Atendimentos", "Vendas de produtos", "Convênios", "Outras receitas"]), f("subcategoria", "Subcategoria"), sel("centro", "Centro de custo", ["Operação", "Centro cirúrgico", "Internação", "Estética", "Rede"]), f("competencia", "Competência", "text", 3, { ph: "MM/AAAA" }), f("contraparte", "Cliente / fornecedor"), sel("vinculo", "Vincular a", ["—", "Atendimento / venda", "Nota de entrada", "Convênio (repasse)"])] },
    { title: "Pagamento", fields: [req(pills("situacao", "Situação", ["Pendente", "Pago / recebido", "Vencido"], 6, { def: "Pendente" })), req(f("date", "Vencimento / data", "date", 2, { def: today })), f("dataPagamento", "Data do pagamento", "date", 2), sel("conta", "Conta / cartão", ["Banco · conta PJ", "Caixa da recepção", "Cartões a receber"], 2, { def: "Banco · conta PJ" }), sel("forma", "Forma", ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Boleto", "Débito automático", "Convênio"], 3, { def: "Pix" }), sel("parcelas", "Parcelamento", ["À vista", "2x", "3x", "6x", "12x"], 3, { def: "À vista" }), f("juros", "Juros / multa", "money", 3), f("descontoValor", "Desconto", "money", 3)] },
    { title: "Recorrência", fields: [tog("repetir", "Repetir este lançamento"), sel("frequencia", "Frequência", ["Mensal", "Semanal", "Anual"], 3, { def: "Mensal", show: (values: Values) => values.repetir }), sel("vezes", "Quantas vezes", ["2", "3", "6", "12"], 3, { def: "3", show: (values: Values) => values.repetir })] },
    { title: "Documentos", fields: [f("documento", "Nº do documento"), f("codigo", "Código de barras / Pix"), f("comprovante", "Comprovante", "file", 6), tog("nfse", "Emitir NFS-e (receitas)", false, undefined, 3), tog("conciliado", "Conciliado com o extrato", false, undefined, 3), f("notes", "Observações", "textarea", 6)] },
  ],
  validate: (values) => (parseMoney(values.valor) <= 0 ? "O valor precisa ser maior que zero." : moneyNegative(values.juros, values.descontoValor) ? "Juros e desconto não podem ser negativos." : undefined),
  fromItem: (item) => ({ tipo: item.category === "Despesa" ? "Despesa" : "Receita", valor: item.amountValue ? brl(item.amountValue) : "", situacao: /pago|recebido/i.test(item.status) ? "Pago / recebido" : /vencido/i.test(item.status) ? "Vencido" : "Pendente" }),
  toItem: (values) => {
    const despesa = values.tipo === "Despesa"
    const status = values.situacao === "Pago / recebido" ? (despesa ? "Pago" : "Recebido") : values.situacao === "Vencido" ? "Vencido" : despesa ? "A pagar" : "A receber"
    return { name: values.name, amountValue: parseMoney(values.valor) + parseMoney(values.juros) - parseMoney(values.descontoValor), category: despesa ? "Despesa" : "Receita", kind: values.tipo, status, subtitle: `${values.categoriaConta || values.tipo} • ${values.forma || ""}` }
  },
  after: (saved, values, ctx, isNew) => {
    if (!isNew || !values.repetir) return
    const times = Number(values.vezes || 3)
    for (let index = 1; index < times; index++) {
      const date = new Date(`${saved.date}T12:00:00`)
      if (values.frequencia === "Semanal") date.setDate(date.getDate() + 7 * index)
      else if (values.frequencia === "Anual") date.setFullYear(date.getFullYear() + index)
      else date.setMonth(date.getMonth() + index)
      ctx.addItem("financeiro", { ...withoutId(saved), date: localISO(date), status: saved.category === "Despesa" ? "A pagar" : "A receber", name: `${saved.name} (${index + 1}/${times})` } as Partial<Item>)
    }
  },
}

const convenios: FormDef = {
  slug: "convenios",
  title: "Novo convênio",
  sub: "Adiciona um cartão à wallet: operadora, contrato, coberturas e faturamento.",
  icon: ShieldCheck,
  color: "#2457c5",
  submit: "Salvar convênio",
  sections: [
    { title: "Operadora", fields: [req(f("name", "Nome fantasia")), f("razao", "Razão social"), f("cnpj", "CNPJ"), sel("tipo", "Tipo", ["Plano de saúde pet", "Seguro pet", "Plano próprio da clínica", "Empresa parceira / benefício"]), f("contato", "Contato comercial", "text", 2), f("telefone", "Telefone", "tel", 2), f("email", "E-mail", "email", 2), f("portal", "Portal de autorizações", "text", 6, { ph: "https://" }), f("cor", "Cor do cartão", "color", 6, { opts: colors, def: "#0f766e" })] },
    { title: "Contrato", fields: [f("numero", "Nº do contrato", "text", 2), f("inicio", "Início", "date", 2, { def: today }), f("fim", "Fim", "date", 2), sel("reajuste", "Reajuste", ["Anual · IPCA", "Anual · IGP-M", "Negociado"]), tog("renovacao", "Renovação automática", true, undefined, 3), f("contrato", "Contrato assinado", "file", 6)] },
    { title: "Planos", fields: [f("planos", "Planos da operadora", "rows", 6, { cols: [{ k: "plano", label: "Plano" }, { k: "carencia", label: "Carência" }, { k: "copart", label: "Coparticipação" }], def: [{ plano: "Essencial", carencia: "60 dias", copart: "30%" }, { plano: "Completo", carencia: "30 dias", copart: "20%" }] })] },
    { title: "Cobertura", desc: "por serviço do cardápio", fields: [f("cobertura", "Tabela de cobertura", "rows", 6, { cols: [{ k: "servico", label: "Serviço", w: "1.4fr" }, { k: "cobertura", label: "Cobertura", t: "select", opts: ["Coberto", "Coparticipação", "Carência", "Não coberto"] }, { k: "repasse", label: "Repasse" }, { k: "limite", label: "Limite/ano" }], def: [{ servico: "Consulta clínica", cobertura: "Coparticipação", repasse: "R$ 120", limite: "ilimitado" }, { servico: "Hemograma completo", cobertura: "Coberto", repasse: "R$ 48", limite: "6" }] })] },
    { title: "Faturamento", fields: [pills("faturar", "Como faturar", ["Guia por atendimento", "Lote mensal", "Portal da operadora"], 6, { def: "Lote mensal" }), f("fechamento", "Fechamento do lote", "text", 2, { def: "dia 25" }), f("prazo", "Prazo de pagamento", "text", 2, { def: "D+15" }), f("taxa", "Taxa administrativa (%)", "number", 2), f("prazoGlosa", "Prazo para recurso de glosa", "text", 3, { def: "30 dias" }), sel("conta", "Conta de recebimento", ["Banco · conta PJ"], 3, { def: "Banco · conta PJ" }), multi("documentos", "Documentos exigidos na guia", ["Carteirinha", "Guia assinada pelo tutor", "Laudo", "Foto do procedimento", "Receita"], 6, { def: ["Carteirinha", "Guia assinada pelo tutor"] })] },
    { title: "Elegibilidade", fields: [pills("validacao", "Validação da carteirinha", ["Manual", "Consulta no portal", "Integração (API)"], 6, { def: "Manual" }), multi("unidades", "Unidades credenciadas", unitNames), req(pills("status", "Status", ["Ativo", "Em análise", "Suspenso"], 6, { def: "Em análise" }))] },
  ],
  toItem: (values) => ({ name: values.name, status: values.status, category: values.tipo || "Plano de saúde pet", subtitle: `${values.tipo || "Convênio"} • ${values.prazo || "D+15"}` }),
}

const unidades: FormDef = {
  slug: "unidades",
  title: "Nova unidade",
  sub: "Finca um pino novo no mapa: dados legais, endereço, horário e estrutura.",
  icon: Building2,
  color: "#0f766e",
  submit: "Salvar unidade",
  sections: [
    { title: "Identificação", fields: [req(f("name", "Nome da unidade", "text", 4, { ph: "Unidade - Nome" })), f("sigla", "Sigla no pino", "text", 2), pills("tipo", "Tipo", ["Matriz", "Filial", "Ponto de coleta", "Hospital 24 h"], 6, { def: "Filial" }), req(f("cnpj", "CNPJ")), f("razao", "Razão social"), f("ie", "Inscrição estadual", "text", 2), f("im", "Inscrição municipal", "text", 2), f("crmvPj", "Registro CRMV (PJ)", "text", 2), sel("responsible", "Responsável técnico", proNames), f("alvara", "Alvará / licença sanitária")] },
    { title: "Endereço", fields: [req(f("cep", "CEP", "text", 2)), req(f("street", "Logradouro", "text", 4)), req(f("number", "Nº", "text", 1)), f("complemento", "Complemento", "text", 2), req(f("neighborhood", "Bairro")), req(f("city", "Cidade", "text", 4)), req(f("state", "UF", "text", 2)), f("referencia", "Ponto de referência", "text", 6)] },
    { title: "Contato", fields: [req(f("phone", "Telefone", "tel", 2)), f("whatsapp", "WhatsApp", "tel", 2), f("email", "E-mail", "email", 2), f("instagram", "Instagram"), f("gerente", "Gerente da unidade")] },
    { title: "Horário", fields: [tog("plantao24", "Atendimento 24 h"), f("horarios", "Funcionamento", "rows", 6, { cols: [{ k: "dia", label: "Dia" }, { k: "abre", label: "Abre", t: "time" }, { k: "fecha", label: "Fecha", t: "time" }], def: [{ dia: "Seg–Sex", abre: "08:00", fecha: "18:00" }, { dia: "Sábado", abre: "08:00", fecha: "12:00" }] })] },
    { title: "Estrutura", fields: [f("consultorios", "Consultórios", "number", 2), f("salas", "Salas cirúrgicas", "number", 2), f("canil", "Baias canil", "number", 2), f("gatil", "Baias gatil", "number", 2), f("uti", "UTI", "number", 2), f("isolamento", "Isolamento", "number", 2), multi("equipamentos", "Equipamentos", ["Raio-X digital", "Ultrassom", "Laboratório", "Anestesia inalatória", "Endoscopia", "Tomografia", "Oxigenoterapia"]), multi("servicos", "Serviços oferecidos", ["Clínica", "Emergência", "Internação", "Cirurgia", "Estética", "Teleatendimento"])] },
    { title: "Configurações", fields: [sel("tabela", "Tabela de preços", ["Herdar da matriz", "Própria"], 3, { def: "Herdar da matriz" }), sel("estoqueModo", "Estoque", ["Próprio", "Compartilhado com a matriz"], 3, { def: "Próprio" }), f("serie", "Série de NFS-e", "text", 3), sel("fuso", "Fuso horário", ["America/Porto_Velho", "America/Manaus", "America/Sao_Paulo"], 3, { def: "America/Porto_Velho" }), f("cor", "Cor do pino", "color", 6, { opts: colors, def: "#0f766e" }), req(pills("status", "Status", ["Ativa", "Inativa"], 6, { def: "Ativa" }))] },
  ],
  custom: (values, ctx, item) => {
    const base = { name: values.name.trim(), cnpj: values.cnpj, phone: values.phone, email: values.email || "", street: values.street, number: values.number, neighborhood: values.neighborhood, city: values.city, state: String(values.state).toUpperCase(), cep: values.cep, responsible: values.responsible || "", status: values.status as "Ativa" | "Inativa" }
    if (item) {
      ctx.updateUnit(item.id, { ...base, shortName: base.name.replace(/^Unidade\s*-\s*/i, ""), profile: `${base.street}, ${base.number} • ${base.city}/${base.state}`, extra: values })
      return item
    }
    const unit = ctx.addUnit(base)
    ctx.updateUnit(unit.id, { extra: values })
    return { id: unit.id, name: unit.name, subtitle: unit.city, status: unit.status, createdAt: new Date().toISOString() }
  },
  toItem: () => ({}),
}

const teleatendimentos: FormDef = {
  slug: "teleatendimentos",
  title: "Novo teleatendimento",
  sub: "Agenda a chamada, gera o link da sala e envia termo e pagamento ao tutor.",
  icon: Video,
  color: "#2f78bf",
  submit: "Agendar teleatendimento",
  sections: [
    { title: "Paciente", fields: [animal(), f("contato", "Enviar link para (WhatsApp)", "tel"), f("email", "E-mail", "email")] },
    { title: "Modalidade", fields: [req(pills("modalidade", "Modalidade", ["Teleconsulta", "Teleorientação", "Telemonitoramento", "Teleinterconsulta"], 6, { def: "Teleconsulta" })), req(sel("name", "Tipo de atendimento", ["Retorno remoto", "Orientação pós-operatória", "Avaliação de exames", "Triagem remota"])), f("vinculoAviso", "", "info", 6, { small: "Teleconsulta só para pacientes com atendimento presencial recente — confira o histórico antes de liberar a sala." })] },
    { title: "Horário", fields: [pro(), req(f("date", "Data", "date", 2, { def: today })), req(f("time", "Hora", "time", 2, { def: "17:00" })), sel("duracao", "Duração", ["20 min", "30 min", "45 min"], 2, { def: "20 min" })] },
    { title: "Sala", fields: [f("link", "Link da sala", "calc", 6, { calc: (values) => `vetflow.app/sala/${(values.animalId || "paciente").split("-").slice(-1)[0]}-${String(values.time || "").replace(":", "")}` }), tog("salaEspera", "Sala de espera (o veterinário admite)", true), tog("gravar", "Gravar a chamada", false, "pede consentimento do tutor no início"), tog("transcricao", "Transcrição e resumo automáticos no prontuário", true), tog("fotos", "Permitir que o tutor envie fotos durante a chamada", true)] },
    { title: "Pré-consulta", fields: [req(f("notes", "Motivo", "textarea", 6)), tog("questionario", "Enviar questionário antes", true), multi("pedir", "Pedir ao tutor", ["Foto da lesão", "Vídeo andando", "Peso atual", "Foto das fezes", "Exames anteriores"])] },
    { title: "Termo e pagamento", fields: [tog("termo", "Termo de consentimento para teleatendimento", true, "aceite digital antes de entrar"), f("valor", "Valor", "money", 3), sel("cobranca", "Cobrança", ["Pix antecipado (link)", "Cartão no link", "Depois, no caixa", "Sem custo (retorno)"], 3, { def: "Pix antecipado (link)" }), multi("lembretes", "Lembretes", ["24 h antes", "1 h antes", "5 min antes com o link"], 6, { def: ["24 h antes", "5 min antes com o link"] }), req(pills("status", "Situação", ["Agendado", "Em andamento", "Concluído", "Faltou"], 6, { def: "Agendado" }))] },
  ],
  fromItem: (item) => ({ modalidade: item.extra?.modalidade || "Teleconsulta", valor: item.amountValue ? brl(item.amountValue) : "" }),
  toItem: (values) => ({ name: values.name, status: values.status, category: values.modalidade, amountValue: parseMoney(values.valor) }),
}

const comunicacao: FormDef = {
  slug: "comunicacao",
  title: "Nova campanha",
  sub: "Mensagem em massa ou automática para um grupo de tutores.",
  icon: Megaphone,
  color: "#2b7a4b",
  submit: "Salvar campanha",
  sections: [
    { title: "Objetivo", fields: [req(f("name", "Nome interno", "text", 6)), req(pills("objetivo", "Objetivo", ["Lembrete de vacina", "Retorno", "Aniversário do pet", "Promoção / pacote", "Comunicado", "Pesquisa NPS", "Reativar sumidos"]))] },
    { title: "Público", fields: [sel("especie", "Espécie", ["Todas", "Cão", "Gato"], 2, { def: "Todas" }), f("semVisita", "Sem visita há (meses)", "number", 2), sel("statusTutor", "Situação do tutor", ["Todos", "Ativo", "Inadimplente"], 2, { def: "Todos" }), f("publico", "Público estimado", "calc", 6, { calc: (values, ctx) => `${audience(values, ctx).length} tutores receberão · os que optaram por não receber ficam de fora (LGPD)` })] },
    { title: "Canal", fields: [{ ...multi("canais", "Canais", ["WhatsApp", "E-mail", "SMS", "Notificação no app"], 6, { def: ["WhatsApp"] }), req: true }, sel("remetente", "Número remetente", (ctx) => ctx.units.map((unit) => `${unit.phone} · ${unit.shortName}`))] },
    { title: "Mensagem", fields: [req(f("mensagem", "Texto", "textarea", 6, { def: "Oi, {tutor}! O {pet} está com a vacina perto de vencer. Agende pelo link: {link_agendamento}" })), f("variaveis", "", "info", 6, { small: "Variáveis: {tutor} {pet} {ultima_visita} {vacina_vencida} {link_agendamento} {unidade}" }), f("midia", "Mídia", "file", 3), multi("botoes", "Botões", ["Agendar", "Falar com a clínica", "Não quero receber"], 3, { def: ["Agendar"] }), f("previa", "Prévia", "calc", 6, { calc: (values, ctx) => previewMessage(values.mensagem || "", ctx) })] },
    { title: "Envio", fields: [req(pills("quando", "Quando", ["Agora", "Agendar", "Automático por gatilho"], 6, { def: "Agendar" })), f("date", "Data", "date", 2, { def: today, show: (values: Values) => values.quando === "Agendar" }), f("time", "Hora", "time", 2, { def: "10:00", show: (values: Values) => values.quando === "Agendar" }), sel("gatilho", "Gatilho", ["X dias antes do vencimento da vacina", "No aniversário do pet", "Y dias após a consulta", "Sem visita há Z meses"], 6, { show: (values: Values) => values.quando === "Automático por gatilho" }), tog("comercial", "Respeitar horário comercial (8h–20h)", true), tog("teste", "Enviar teste para mim antes", false)] },
    { title: "Medição", fields: [sel("meta", "Meta", ["Agendamentos gerados", "Respostas", "Vendas do pacote"], 3, { def: "Agendamentos gerados" }), f("valorMeta", "Valor esperado", "text", 3), sel("servico", "Serviço vinculado", (ctx) => ctx.data.servicos.map((item) => item.name), 6)] },
  ],
  toItem: (values, ctx) => ({ name: values.name, status: values.quando === "Agora" ? "Enviada" : "Pendente", category: "Campanha", subtitle: `${audience(values, ctx).length} tutores • ${(values.canais || []).join(", ")}`, extra: { ...values, campanha: true, alcance: audience(values, ctx).length } }),
}

function audience(values: Values, ctx: Ctx) {
  const species = values.especie && values.especie !== "Todas" ? values.especie : ""
  const owners = new Set(ctx.data.animais.filter((item) => !species || item.species === species).map((item) => item.ownerId))
  return ctx.data.tutores.filter((tutor) => owners.has(tutor.id) && (values.statusTutor === "Todos" || !values.statusTutor || tutor.status === values.statusTutor))
}
function previewMessage(text: string, ctx: Ctx) {
  const tutor = ctx.data.tutores[0]
  const pet = ctx.data.animais.find((item) => item.ownerId === tutor?.id)
  return text
    .replaceAll("{tutor}", tutor?.name.split(" ")[0] || "Ana")
    .replaceAll("{pet}", pet?.name || "Thor")
    .replaceAll("{link_agendamento}", "vetflow.app/a/x81")
    .replaceAll("{unidade}", ctx.activeUnit.shortName)
    .replaceAll("{ultima_visita}", "12/08")
    .replaceAll("{vacina_vencida}", "V10")
}

const publicacoes: FormDef = {
  slug: "publicacoes",
  title: "Novo post",
  sub: "Monte o post, confirme a autorização de imagem e pendure no varal da semana.",
  icon: Sparkles,
  color: "#b4325e",
  submit: "Salvar post",
  sections: [
    { title: "Formato", fields: [req(pills("formato", "Formato", ["Post", "Carrossel", "Stories", "Reels", "Perfil no Google"], 6, { def: "Post" }))] },
    { title: "Mídia", fields: [f("midia", "Fotos e vídeos", "file", 6), pills("modeloArte", "Modelo de arte", ["Campanha laranja", "Dica rápida", "Antes e depois", "Conheça a equipe"], 6, { def: "Campanha laranja" }), f("textoImagem", "Texto sobre a imagem", "text", 6), f("alt", "Texto alternativo (acessibilidade)", "text", 6)] },
    { title: "Legenda", fields: [req(f("name", "Título interno", "text", 6)), req(f("legenda", "Legenda", "textarea", 6)), f("hashtags", "Hashtags", "text", 4), sel("local", "Local", unitNames, 2)] },
    { title: "Pet e autorização", fields: [{ ...animal("Pet em destaque (opcional)", false) }, tog("autorizacao", "Tutor autorizou o uso da imagem", false, "obrigatório quando há pet em destaque"), tog("marcarTutor", "Marcar o perfil do tutor")] },
    { title: "Canais", fields: [{ ...multi("canais", "Onde publicar", ["Instagram", "Facebook", "Perfil do Google"], 6, { def: ["Instagram"] }), req: true }, sel("cta", "Botão de ação", ["Agendar", "Ligar", "Saiba mais"], 3, { def: "Agendar" }), f("link", "Link", "text", 3, { def: "vetflow.app/agendar" })] },
    { title: "Agendamento", fields: [req(pills("status", "Situação", ["Rascunho", "Agendada", "Publicada"], 6, { def: "Agendada" })), req(f("date", "Data", "date", 3, { def: today })), f("time", "Hora", "time", 3, { def: "18:30" }), f("campanha", "Campanha vinculada"), sel("responsavelPost", "Responsável", proNames), tog("aprovacao", "Exigir aprovação do gestor antes de publicar")] },
  ],
  validate: (values) => (values.animalId && !values.autorizacao ? "Sem autorização de imagem do tutor o post não pode ser salvo com o pet em destaque." : undefined),
  toItem: (values) => ({ name: values.name, status: values.status, category: values.formato, notes: values.legenda }),
}

const documentos: FormDef = {
  slug: "documentos",
  title: "Novo documento",
  sub: "Gera a partir de um modelo, coleta assinaturas e arquiva na gaveta certa.",
  icon: Archive,
  color: "#6b4a26",
  submit: "Salvar documento",
  sections: [
    { title: "Tipo", fields: [req(pills("name", "Tipo", ["Termo de consentimento", "Laudo laboratorial", "Autorização cirúrgica", "Contrato de internação", "Atestado de saúde", "Atestado de vacinação", "Autorização de eutanásia", "Declaração", "Encaminhamento"])), pills("origem", "Começar de", ["Modelo da clínica", "Em branco", "PDF pronto"], 6, { def: "Modelo da clínica" })] },
    { title: "Vínculos", fields: [animal(), pro(), f("evento", "Evento", "text", 3, { ph: "Cirurgia, internação, consulta…" })] },
    { title: "Conteúdo", fields: [f("conteudo", "Texto do documento", "textarea", 6, { def: "Eu, {tutor.nome}, CPF {tutor.cpf}, responsável pelo animal {animal.nome}, espécie {animal.especie}, raça {animal.raca}, autorizo a realização de {procedimento} pelo(a) {vet.nome}, CRMV {vet.crmv}, ciente dos riscos explicados." }), f("riscos", "Riscos específicos deste caso", "textarea", 6), f("pdf", "PDF pronto", "file", 6, { show: (values: Values) => values.origem === "PDF pronto" })] },
    { title: "Conferência", fields: [f("conferencia", "Itens obrigatórios", "calc", 6, { calc: (values, ctx) => { const animalItem = ctx.data.animais.find((item) => item.id === values.animalId); const tutor = ctx.data.tutores.find((item) => item.id === animalItem?.ownerId); const pro = ctx.data.profissionais.find((item) => item.id === values.professionalId); return [`${ctx.activeUnit.name ? "✓" : "•"} Estabelecimento`, `${pro?.registration ? "✓" : "•"} Veterinário e CRMV`, `${tutor ? "✓" : "•"} Tutor`, `${tutor?.cpf ? "✓" : "•"} CPF do tutor`, `${animalItem ? "✓" : "•"} Animal`, "✓ Local, data e assinaturas"].join("   ") } })] },
    { title: "Assinaturas", fields: [multi("signatarios", "Quem assina", ["Tutor", "Veterinário", "Testemunha"], 6, { def: ["Tutor", "Veterinário"] }), sel("metodo", "Como o tutor assina", ["Link no WhatsApp + selfie", "Na tela da recepção", "Papel"], 3, { def: "Link no WhatsApp + selfie" }), f("prazo", "Prazo para assinar", "date", 3), tog("bloquear", "Bloquear o procedimento enquanto não assinar")] },
    { title: "Arquivo", fields: [sel("gaveta", "Gaveta", ["Clínicos", "Administrativos", "Fiscais e notas", "RH e equipe"], 3, { def: "Clínicos" }), sel("guarda", "Guardar por", ["5 anos", "10 anos", "Permanente"], 3, { def: "5 anos" }), f("etiquetas", "Etiquetas", "text", 6), tog("confidencial", "Confidencial (só veterinários e administração)"), tog("copiarProntuario", "Copiar para o prontuário do animal", true), req(pills("status", "Situação", ["Pendente", "Assinado", "Arquivado"], 6, { def: "Pendente" }))] },
  ],
  toItem: (values) => ({ name: values.name, status: values.status, category: values.gaveta || "Clínicos" }),
}

const ocorrencias: FormDef = {
  slug: "ocorrencias",
  title: "Nova ocorrência",
  sub: "Vira um post-it no mural e só sai de lá quando alguém resolver e registrar a causa.",
  icon: AlertTriangle,
  color: "#d9a514",
  submit: "Salvar ocorrência",
  sections: [
    { title: "O que houve", fields: [req(f("name", "Título (vira o post-it)", "text", 6)), f("descricao", "Descrição", "textarea", 6), req(pills("tipo", "Categoria", ["Equipamento", "Paciente / clínico", "Atendimento / tutor", "Estrutura predial", "Financeiro", "TI / sistema", "Biossegurança", "Equipe"])), req(pills("gravidade", "Gravidade", ["Baixa", "Média", "Alta", "Crítica"], 6, { def: "Média" }))] },
    { title: "Onde e quando", fields: [sel("setor", "Setor", ["Recepção", "Consultórios", "Centro cirúrgico", "Internação", "Laboratório", "Farmácia", "Banho e tosa"]), req(f("date", "Data", "date", 2, { def: today })), f("time", "Hora", "time", 1), f("equipamento", "Equipamento / patrimônio", "text", 6), { ...animal("Paciente envolvido (opcional)", false) }] },
    { title: "Evidências", fields: [f("anexos", "Fotos, vídeo ou áudio", "file", 6), f("testemunhas", "Quem presenciou", "text", 6)] },
    { title: "Tratativa", fields: [f("acao", "Ação imediata tomada", "textarea", 6), pro("Responsável"), f("prazo", "Prazo", "date"), tog("fornecedorExterno", "Precisa de assistência técnica / fornecedor"), f("fornecedor", "Fornecedor", "text", 3, { show: (values: Values) => values.fornecedorExterno }), f("custo", "Custo estimado", "money", 3), multi("avisar", "Avisar", ["Gestor da unidade", "Responsável técnico", "Equipe do setor", "Rede inteira"], 6, { def: ["Gestor da unidade"] })] },
    { title: "Encerramento", desc: "preenchido ao resolver", fields: [req(pills("status", "Coluna do mural", ["Aberta", "Em análise", "Resolvida"], 6, { def: "Aberta" })), sel("causa", "Causa raiz", ["Falha de equipamento", "Processo", "Falha humana", "Fornecedor", "Externa"]), f("resolvidoEm", "Resolvido em", "date"), f("preventiva", "Ação preventiva", "text", 6), tog("lancarFinanceiro", "Lançar o custo no financeiro")] },
  ],
  toItem: (values) => ({ name: values.name, status: values.status, category: values.gravidade, urgency: ["Alta", "Crítica"].includes(values.gravidade), amountValue: parseMoney(values.custo), notes: values.descricao }),
  after: (saved, values, ctx, isNew) => {
    if (isNew && values.lancarFinanceiro && parseMoney(values.custo)) ctx.addItem("financeiro", { name: `Ocorrência: ${saved.name}`, category: "Despesa", kind: "Despesa", status: "A pagar", amountValue: parseMoney(values.custo), subtitle: "Manutenção / ocorrência" })
  },
}

const usuarios: FormDef = {
  slug: "usuarios",
  title: "Novo usuário",
  sub: "Cria o acesso: quem é, que papel tem, quais portas abre e com que segurança.",
  icon: KeyRound,
  color: "#c98a1b",
  submit: "Salvar usuário",
  sections: [
    { title: "Pessoa", fields: [{ ...pro("Vincular a um profissional (opcional)", false, "professionalId", 6) }, req(f("name", "Nome", "text", 6)), req(f("email", "E-mail de acesso", "email")), f("phone", "Celular (2FA)", "tel")] },
    { title: "Papel", fields: [req(pills("papel", "Papel (cor da chave)", ["Administrador", "Veterinário", "Enfermagem / auxiliar", "Recepção", "Financeiro", "Personalizado"])), multi("unidades", "Unidades", unitNames, 6, { def: [] })] },
    { title: "Portas", desc: "pré-preenchido pelo papel", fields: [f("permissoes", "Permissões por módulo", "perms", 6, { def: rolePerms("Recepção") })] },
    { title: "Ações sensíveis", fields: [tog("verCusto", "Ver valores e preços de custo"), tog("excluir", "Excluir ou cancelar registros"), tog("assinar", "Assinar receitas, laudos e documentos"), tog("exportar", "Exportar dados de tutores"), tog("agendaOutros", "Ver e editar a agenda de outros profissionais", true), sel("limite", "Limite de desconto", ["Sem desconto", "Até 5%", "Até 10%", "Limite da empresa"], 3, { def: "Sem desconto" }), sel("caixa", "Pode abrir/fechar caixa", ["Não", "Sim"], 3, { def: "Não" })] },
    { title: "Segurança", fields: [tog("doisFatores", "Verificação em duas etapas", true), sel("local", "Onde pode acessar", ["Somente na rede da clínica", "Qualquer lugar"], 3, { def: "Somente na rede da clínica" }), sel("horario", "Horário permitido", ["Durante o turno ± 1 h", "Sempre"], 3, { def: "Sempre" }), f("expira", "Expira em", "date", 3), sel("sessao", "Encerrar sessão após", ["30 min parado", "2 h", "Nunca"], 3, { def: "30 min parado" })] },
    { title: "Termos", fields: [tog("lgpd", "Aceite do termo de confidencialidade (LGPD) no 1º acesso", true), multi("convite", "Enviar convite por", ["E-mail", "WhatsApp"], 6, { def: ["E-mail"] }), req(pills("status", "Situação", ["Convite pendente", "Ativo", "Bloqueado"], 6, { def: "Convite pendente" }))] },
  ],
  fromItem: (item) => ({ papel: item.extra?.papel || (/dr/i.test(item.name) ? "Veterinário" : "Recepção"), email: item.email || "" }),
  toItem: (values) => ({ name: values.name, email: values.email, phone: values.phone, status: values.status, category: values.papel, subtitle: `${values.papel} • ${values.email}` }),
}

export const forms: Partial<Record<ModuleSlug | "procedimentos-exec" | "estoque-nota", FormDef>> = {
  consultas,
  profissionais,
  vacinas,
  prescricoes,
  medicamentos,
  exames,
  procedimentos,
  "procedimentos-exec": procedimentoExec,
  cirurgias,
  internacoes,
  protocolos,
  servicos,
  estoque,
  "estoque-nota": entradaNota,
  financeiro,
  convenios,
  unidades,
  teleatendimentos,
  comunicacao,
  publicacoes,
  documentos,
  ocorrencias,
  usuarios,
}

export const statusOptions: Partial<Record<ModuleSlug, string[]>> = {
  consultas: ["Chegou", "Triagem", "Em atendimento", "Concluído", "Faltou", "Cancelado"],
  profissionais: ["Ativo", "Plantão eventual", "Afastado", "Inativo"],
  vacinas: ["Aplicada", "A vencer", "Atrasada"],
  prescricoes: ["Ativa", "Vencendo", "Renovação pendente", "Concluída"],
  medicamentos: ["Disponível", "Controlado", "Ativo", "Inativo"],
  exames: ["Solicitado", "Aguardando resultado", "Concluído", "Urgente"],
  procedimentos: ["Agendado", "Em andamento", "Concluído", "Pendente", "Ativo"],
  cirurgias: ["Agendada", "Pré-operatório", "Em andamento", "Concluída", "Cancelada"],
  internacoes: ["Em andamento", "Em observação", "Alta médica", "Encerrada"],
  protocolos: ["Em revisão", "Aprovado", "Ativo", "Arquivado"],
  servicos: ["Ativo", "Inativo"],
  estoque: ["Disponível", "Abaixo do mínimo", "Vencido"],
  financeiro: ["Recebido", "A receber", "Pago", "A pagar", "Vencido"],
  convenios: ["Ativo", "Em análise", "Suspenso"],
  teleatendimentos: ["Agendado", "Em andamento", "Concluído", "Faltou"],
  comunicacao: ["Enviada", "Lida", "Pendente", "Respondida"],
  publicacoes: ["Rascunho", "Agendada", "Publicada"],
  documentos: ["Pendente", "Assinado", "Arquivado"],
  ocorrencias: ["Aberta", "Em análise", "Resolvida"],
  usuarios: ["Ativo", "Convite pendente", "Bloqueado"],
  tutores: ["Ativo", "Inativo", "Inadimplente"],
  animais: ["Ativo", "Em tratamento", "Internado", "Inativo", "Falecido"],
  agendas: ["Agendado", "Confirmado", "Concluído", "Cancelado"],
  prontuarios: ["Concluído", "Em andamento"],
}

export function formFor(slug: string) {
  return forms[slug as keyof typeof forms]
}

export { HeartPulse }
