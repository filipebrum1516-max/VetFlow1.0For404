import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router"
import { ArrowRight, BookOpen, Edit3, ExternalLink, Trash2, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, HeartPulse, Lock, PawPrint, Plus, Scissors, ShieldAlert, Syringe, TriangleAlert, Undo2, UserRound, X } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { FichaLivre } from "../Ficha"
import { addDays, Confirm, fmtDate, fmtLong, hash, itemDate, matches, Page, Pager, SearchBox, StatusPill, todayISO, usePaged } from "../ui"
import { alergiasDoAnimal, condicoesDoAnimal, conflitosProtocolo, isAnestesico, isPosOp } from "../clinico"

/*
 * Cirurgias em duas abas, como Consultas:
 *  - "Cirurgias de hoje": o dia em ordem de horário, cada paciente com as 4 etapas.
 *  - "Todas as cirurgias": acompanhamento geral com filtros (situação, risco, protocolo).
 * Para passar de uma etapa para a outra a equipe precisa preencher o que a etapa exige
 * (protocolo anestésico, MPA, checklist, procedimento, intercorrências, destino...).
 */

type Values = Record<string, any>
const ETAPAS = [
  { key: "preop", label: "Pré-operatório", status: "Pré-operatório", icon: ClipboardCheck, tone: "orange" },
  { key: "anestesia", label: "Anestesia", status: "Anestesia", icon: Syringe, tone: "violet" },
  { key: "cirurgia", label: "Cirurgia", status: "Em andamento", icon: Scissors, tone: "red" },
  { key: "recuperacao", label: "Recuperação", status: "Recuperação", icon: HeartPulse, tone: "teal" },
] as const
const CONCLUIDA = 4
const PROCEDIMENTOS = ["Castração", "Ovariohisterectomia", "Orquiectomia", "Limpeza dentária", "Profilaxia dentária", "Retirada de nódulo", "Mastectomia", "Osteossíntese", "Enterotomia", "Cistotomia"]
const ASA = ["I · saudável", "II · doença leve", "III · grave", "IV · risco de vida", "V · moribundo", "E · emergência"]
const COLS = "86px minmax(0,1.2fr) minmax(0,1fr) 128px"

const timeOf = (item: Item) => item.time || `${String(8 + (hash(item.id) % 9)).padStart(2, "0")}:00`
const roomOf = (item: Item) => item.extra?.sala || (hash(item.id) % 2 ? "Sala 2" : "Sala 1")
const cancelada = (item: Item) => /cancel/i.test(item.status)
const nowISO = () => new Date().toISOString()
const nowHM = () => new Date().toTimeString().slice(0, 5)
const hm = (iso?: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : "")

/** -1 agendada · 0 pré-op · 1 anestesia · 2 cirurgia · 3 recuperação · 4 concluída */
function faseOf(item: Item): number {
  if (/conclu/i.test(item.status)) return CONCLUIDA
  const raw = item.extra?.fase
  if (raw !== undefined && raw !== null && raw !== "" && Number.isFinite(Number(raw))) return Math.max(-1, Math.min(3, Number(raw)))
  if (/recupera/i.test(item.status)) return 3
  if (/andamento/i.test(item.status)) return 2
  if (/anest/i.test(item.status)) return 1
  if (/pr[ée]-?op/i.test(item.status)) return 0
  return -1
}
/* horários de entrada em cada etapa (com o formato antigo: inicio/fim) */
function marcos(item: Item): Record<string, string | undefined> {
  const t = { ...(item.extra?.t || {}) }
  if (!t.preop && item.extra?.inicio) t.preop = item.extra.inicio
  if (!t.fim && item.extra?.fim) t.fim = item.extra.fim
  return t
}
const minutos = (a?: string, b?: string) => (a ? Math.max(0, Math.round(((b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime()) / 60000)) : null)
const fmtMin = (min: number | null) => (min === null ? "—" : min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`)
/** duração de uma etapa (pré-op, anestesia e cirurgia; recuperação não é medida) */
function duracao(item: Item, i: number): number | null {
  const t = marcos(item)
  const start = t[ETAPAS[i].key]
  if (!start) return null
  const next = t[ETAPAS[i + 1]?.key || "fim"]
  if (!next && faseOf(item) !== i) return null
  return minutos(start, next)
}

/* ---------------- risco ---------------- */
function riscoDe(item: Item, animal: Item | undefined, protocolo: Item | undefined) {
  const ex = item.extra || {}
  const motivos: string[] = []
  const marcada = ex.risco === "Sim" || ex.risco === true
  if (marcada) motivos.push(ex.motivoRisco ? `Marcada pela equipe: ${ex.motivoRisco}` : "Marcada como cirurgia de risco pela equipe")
  const asa = String(ex.asa || "")
  if (/^(III|IV|V|E)\b/.test(asa)) motivos.push(`Classificação ASA ${asa}`)
  if (/emerg/i.test(String(ex.carater || ""))) motivos.push("Cirurgia de emergência")
  const conds = [...new Set([...condicoesDoAnimal(animal), ...(Array.isArray(ex.condicoes) ? ex.condicoes : [])])]
  conds.forEach((c) => motivos.push(`Doença / condição: ${c}`))
  const alergia = alergiasDoAnimal(animal)
  if (alergia) motivos.push(`Alergia / restrição: ${alergia}`)
  const conflitos = conflitosProtocolo(protocolo, conds)
  conflitos.forEach((c) => motivos.push(`O protocolo “${protocolo?.name}” tem contraindicação ligada a ${c}`))
  return { risco: motivos.length > 0, motivos, conds, alergia, conflitos }
}

/* ---------------- exigências de cada passagem ---------------- */
type GField = {
  k: string
  label: string
  t: "text" | "number" | "time" | "textarea" | "select" | "pills" | "multi" | "check" | "protocol" | "protocolPos" | "pro"
  req?: boolean
  min?: number
  opts?: string[]
  ph?: string
  wide?: boolean
  hint?: string
  show?: (v: Values) => boolean
}
type Gate = { title: string; desc: string; cta: string; sections: { title: string; fields: GField[] }[]; check?: (v: Values) => string }

const GATES: Gate[] = [
  {
    title: "Receber o paciente e iniciar o pré-operatório",
    desc: "Confirme a chegada, o jejum, o termo e a avaliação pré-anestésica.",
    cta: "Iniciar pré-operatório",
    sections: [
      {
        title: "Chegada e avaliação",
        fields: [
          { k: "chegada", label: "Hora de chegada", t: "time", req: true },
          { k: "peso", label: "Peso atual (kg)", t: "number", req: true, ph: "Ex.: 12,4" },
          { k: "fc", label: "FC (bpm)", t: "number", req: true },
          { k: "fr", label: "FR (mpm)", t: "number", req: true },
          { k: "temperatura", label: "Temperatura (°C)", t: "number", req: true },
          { k: "mucosas", label: "Mucosas / TPC", t: "text", ph: "Normocoradas, TPC < 2 s" },
          { k: "asa", label: "Classificação ASA confirmada", t: "pills", req: true, opts: ASA, wide: true },
        ],
      },
      {
        title: "Preparo",
        fields: [
          { k: "jejumOk", label: "Jejum sólido e hídrico cumpridos conforme orientado", t: "check", req: true, wide: true },
          { k: "termoOk", label: "Termo de consentimento e de anestesia assinado pelo tutor", t: "check", req: true, wide: true },
          { k: "exames", label: "Exames pré-operatórios avaliados", t: "multi", req: true, min: 1, wide: true, opts: ["Hemograma", "Bioquímica", "Raio-X de tórax", "Ecocardiograma", "Coagulograma", "Glicemia", "Dispensados"] },
          { k: "examesJust", label: "Por que os exames foram dispensados?", t: "textarea", req: true, wide: true, show: (v) => (v.exames || []).includes("Dispensados") },
        ],
      },
    ],
  },
  {
    title: "Liberar para a anestesia",
    desc: "Sem protocolo anestésico, cuidados pré-operatórios e checklist o paciente não entra em anestesia.",
    cta: "Liberar para anestesia",
    sections: [
      {
        title: "Protocolo anestésico",
        fields: [
          { k: "protocoloId", label: "Protocolo utilizado", t: "protocol", req: true, wide: true },
          { k: "anestesista", label: "Anestesista responsável", t: "pro", req: true },
        ],
      },
      {
        title: "Cuidados pré-operatórios realizados",
        fields: [
          { k: "cuidados", label: "Marque o que foi feito (mínimo 2)", t: "multi", req: true, min: 2, wide: true, opts: ["Acesso venoso", "Fluidoterapia iniciada", "Tricotomia da área", "Antibiótico profilático", "Esvaziamento vesical", "Proteção ocular", "Aquecimento ativo", "Pré-oxigenação"] },
          { k: "antibiotico", label: "Antibiótico profilático (fármaco, dose e hora)", t: "text", req: true, wide: true, show: (v) => (v.cuidados || []).includes("Antibiótico profilático") },
        ],
      },
      {
        title: "Medicação pré-anestésica (MPA)",
        fields: [
          { k: "mpa", label: "Fármacos e doses aplicados", t: "textarea", req: true, wide: true, hint: "Vem do protocolo escolhido. Ajuste se a dose aplicada foi diferente." },
          { k: "mpaHora", label: "Hora da MPA", t: "time", req: true },
        ],
      },
      {
        title: "Checklist antes da anestesia",
        fields: [
          { k: "chkIdent", label: "Paciente identificado e conferido com o prontuário", t: "check", req: true, wide: true },
          { k: "chkProc", label: "Procedimento e lado / região confirmados", t: "check", req: true, wide: true },
          { k: "chkAlergia", label: "Doenças, alergias e medicações em uso revisadas", t: "check", req: true, wide: true },
          { k: "chkEquip", label: "Aparelho de anestesia, oxigênio e aspirador testados", t: "check", req: true, wide: true },
        ],
      },
    ],
  },
  {
    title: "Iniciar a cirurgia",
    desc: "Registre a indução, a via aérea e a monitorização, confirme o procedimento e faça a pausa cirúrgica.",
    cta: "Iniciar cirurgia",
    sections: [
      {
        title: "Indução e via aérea",
        fields: [
          { k: "inducao", label: "Indução (fármaco e dose)", t: "text", req: true, wide: true },
          { k: "inducaoHora", label: "Hora da indução", t: "time", req: true },
          { k: "via", label: "Via aérea", t: "pills", req: true, opts: ["Intubação endotraqueal", "Máscara laríngea / V-gel", "Máscara facial"], wide: true },
          { k: "sonda", label: "Nº da sonda", t: "text", req: true, show: (v) => v.via === "Intubação endotraqueal" },
          { k: "manutencao", label: "Manutenção", t: "pills", req: true, opts: ["Inalatória · isoflurano", "Inalatória · sevoflurano", "TIVA"], wide: true },
        ],
      },
      {
        title: "Monitorização",
        fields: [
          { k: "monitorizacao", label: "Em uso (mínimo 2)", t: "multi", req: true, min: 2, wide: true, opts: ["ECG", "SpO₂", "Capnografia", "PA não invasiva", "PA invasiva", "Temperatura"] },
          { k: "parametrosOk", label: "Parâmetros estáveis para a incisão (FC, SpO₂, PA, temperatura)", t: "check", req: true, wide: true },
        ],
      },
      {
        title: "Procedimento cirúrgico",
        fields: [
          { k: "procedimento", label: "Procedimento", t: "select", req: true, opts: PROCEDIMENTOS },
          { k: "regiao", label: "Lado / região", t: "text", req: true, ph: "Ex.: linha média ventral" },
          { k: "tecnica", label: "Técnica / abordagem", t: "text", req: true, wide: true, ph: "Ex.: celiotomia mediana pré-retroumbilical, técnica das 3 pinças" },
        ],
      },
      {
        title: "Pausa cirúrgica",
        fields: [{ k: "chkTimeout", label: "A equipe confirmou em voz alta paciente, procedimento, lado e riscos", t: "check", req: true, wide: true }],
      },
    ],
  },
  {
    title: "Finalizar a cirurgia",
    desc: "Descreva o que foi feito, registre intercorrências e confira a contagem antes de sair da sala.",
    cta: "Finalizar e ir para recuperação",
    sections: [
      {
        title: "O que foi feito",
        fields: [
          { k: "descricao", label: "Descrição do procedimento realizado", t: "textarea", req: true, wide: true },
          { k: "achados", label: "Achados transoperatórios", t: "textarea", wide: true },
        ],
      },
      {
        title: "Intercorrências",
        fields: [
          { k: "intercorrencia", label: "Houve intercorrência?", t: "pills", req: true, opts: ["Nenhuma", "Sim"] },
          { k: "intercorrenciaDesc", label: "O que aconteceu e o que foi feito", t: "textarea", req: true, wide: true, show: (v) => v.intercorrencia === "Sim" },
          { k: "sangramento", label: "Sangramento", t: "pills", req: true, opts: ["Mínimo", "Moderado", "Intenso"] },
        ],
      },
      {
        title: "Fechamento",
        fields: [
          { k: "contagem", label: "Contagem de compressas, agulhas e instrumentais conferida", t: "check", req: true, wide: true },
          { k: "fios", label: "Fios utilizados", t: "text" },
          { k: "histopato", label: "Peça para histopatológico", t: "pills", req: true, opts: ["Não", "Sim · peça identificada"] },
        ],
      },
    ],
  },
  {
    title: "Encerrar a recuperação",
    desc: "Registre o despertar, a dor e a analgesia e defina o destino do paciente.",
    cta: "Encerrar cirurgia",
    sections: [
      {
        title: "Despertar",
        fields: [
          { k: "extubacao", label: "Hora da extubação / despertar", t: "time", req: true },
          { k: "temperaturaRec", label: "Temperatura (°C)", t: "number", req: true },
          { k: "consciencia", label: "Consciência", t: "pills", req: true, opts: ["Alerta", "Sonolento", "Sedado"] },
          { k: "dor", label: "Escala de dor (0–10)", t: "pills", req: true, opts: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], wide: true },
          { k: "resgate", label: "Analgesia de resgate aplicada e dor reavaliada", t: "check", req: true, wide: true, show: (v) => Number(v.dor) >= 4 },
        ],
      },
      {
        title: "Analgesia e destino",
        fields: [
          { k: "analgesia", label: "Analgesia pós-operatória prescrita", t: "text", req: true, wide: true },
          { k: "protocoloPosId", label: "Protocolo pós-operatório (opcional)", t: "protocolPos", wide: true },
          { k: "destino", label: "Destino", t: "pills", req: true, opts: ["Alta no mesmo dia", "Internação 24 h", "UTI"], wide: true },
          { k: "abrirInternacao", label: "Abrir a internação agora", t: "check", wide: true, show: (v) => !!v.destino && v.destino !== "Alta no mesmo dia" },
          { k: "orientacoes", label: "Orientações dadas ao tutor", t: "textarea", req: true, wide: true, show: (v) => v.destino === "Alta no mesmo dia" },
        ],
      },
    ],
    check: (v) => (v.destino === "Alta no mesmo dia" && v.consciencia === "Sedado" ? "Paciente sedado não recebe alta. Escolha internação ou aguarde o despertar." : ""),
  },
]

const vazio = (v: unknown) => v === undefined || v === null || v === false || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0)
function faltando(gate: Gate, v: Values): string[] {
  const out: string[] = []
  gate.sections.forEach((s) =>
    s.fields.forEach((f) => {
      if (!f.req || (f.show && !f.show(v))) return
      if (f.t === "multi" ? (v[f.k] || []).length < (f.min || 1) : vazio(v[f.k])) out.push(f.label)
    }),
  )
  const extra = gate.check?.(v)
  if (extra) out.push(extra)
  return out
}
const dosesDe = (p: Item | undefined, fase: RegExp) =>
  ((p?.extra?.doses || []) as { farmaco: string; dose: string; via: string; obs?: string; fase?: string }[])
    .filter((d) => d.farmaco && fase.test(`${d.fase || ""} ${d.obs || ""}`))
    .map((d) => `${d.farmaco} ${d.dose}${d.via ? ` ${d.via}` : ""}`)
    .join(" + ")

/* valores iniciais da passagem, a partir do agendamento e do protocolo */
function inicial(fase: number, item: Item, protocolos: Item[]): Values {
  const ex = item.extra || {}
  const reg = ex.registro || {}
  const proto = protocolos.find((p) => p.id === ex.protocoloId)
  switch (fase) {
    case -1:
      return { chegada: ex.chegada || nowHM(), asa: ex.asa || "", exames: ex.preExames || [], ...reg.preop }
    case 0:
      return { anestesista: ex.anestesista || "", protocoloId: ex.protocoloId || "", mpa: dosesDe(proto, /mpa|pr[ée]-?anest/i) || ex.mpa || "", mpaHora: nowHM(), cuidados: [], ...reg.anestesia }
    case 1:
      return {
        inducao: dosesDe(proto, /indu/i) || ex.inducao || "",
        inducaoHora: nowHM(),
        manutencao: ex.manutencao || (/sevo/i.test(dosesDe(proto, /manut/i)) ? "Inalatória · sevoflurano" : /tiva|infus/i.test(dosesDe(proto, /manut/i)) ? "TIVA" : "Inalatória · isoflurano"),
        monitorizacao: ex.monitorizacao || ["ECG", "SpO₂", "Temperatura"],
        procedimento: item.name,
        regiao: ex.regiao || "",
        ...reg.cirurgia,
      }
    case 2:
      return { fios: ex.fios || "", histopato: ex.histopato ? "Sim · peça identificada" : "", ...reg.recuperacao }
    default:
      return { extubacao: nowHM(), analgesia: ex.analgesia || "", destino: ex.destino || "", abrirInternacao: true, protocoloPosId: ex.protocoloPosId || "", ...reg.fim }
  }
}
const GATE_KEY = ["preop", "anestesia", "cirurgia", "recuperacao", "fim"]

/* ======================================================================== */

export default function Cirurgias() {
  const { data, updateItem, addItem, profile } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("cirurgias")
  const [aba, setAba] = useState<"hoje" | "todas">(() => (new URLSearchParams(window.location.search).get("aba") === "todas" ? "todas" : "hoje"))
  const [query, setQuery] = useState("")
  const [day, setDay] = useState(() => todayISO())
  const [filtro, setFiltro] = useState("Todas")
  const [soRisco, setSoRisco] = useState(false)
  const [filtroProto, setFiltroProto] = useState("")
  const [abertaId, setAbertaId] = useState("")
  const [gateId, setGateId] = useState("")
  const [voltarId, setVoltarId] = useState("")
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((v) => v + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const animalDe = (item: Item) => data.animais.find((a) => a.id === item.animalId)
  const protoDe = (id?: string) => (id ? data.protocolos.find((p) => p.id === id) : undefined)
  const info = (item: Item) => riscoDe(item, animalDe(item), protoDe(item.extra?.protocoloId))
  const byId = (id: string) => data.cirurgias.find((c) => c.id === id)

  const doDia = useMemo(
    () => data.cirurgias.filter((item) => itemDate(item) === day && !cancelada(item) && matches(item, query)).sort((a, b) => timeOf(a).localeCompare(timeOf(b))),
    [data.cirurgias, day, query],
  )
  const fases = doDia.map(faseOf)
  const kpi = {
    agendadas: fases.filter((f) => f === -1).length,
    curso: fases.filter((f) => f >= 0 && f <= 2).length,
    recuperacao: fases.filter((f) => f === 3).length,
    concluidas: fases.filter((f) => f === CONCLUIDA).length,
    risco: doDia.filter((item) => info(item).risco).length,
  }

  const todas = useMemo(
    () =>
      data.cirurgias
        .filter((item) => matches(item, query))
        .filter((item) => {
          const f = faseOf(item)
          if (filtro === "Agendadas") return f === -1 && !cancelada(item)
          if (filtro === "Em curso") return f >= 0 && f <= 3 && !cancelada(item)
          if (filtro === "Concluídas") return f === CONCLUIDA
          if (filtro === "Canceladas") return cancelada(item)
          return true
        })
        .filter((item) => !soRisco || riscoDe(item, data.animais.find((a) => a.id === item.animalId), data.protocolos.find((p) => p.id === item.extra?.protocoloId)).risco)
        .filter((item) => !filtroProto || item.extra?.protocoloId === filtroProto || item.extra?.protocoloPosId === filtroProto)
        .sort((a, b) => `${itemDate(b)}${timeOf(b)}`.localeCompare(`${itemDate(a)}${timeOf(a)}`)),
    [data.cirurgias, data.animais, data.protocolos, query, filtro, soRisco, filtroProto],
  )
  const paged = usePaged(todas, 12, [query, filtro, soRisco, filtroProto, aba])
  const protocolosUsados = useMemo(() => {
    const ids = new Set(data.cirurgias.flatMap((c) => [c.extra?.protocoloId, c.extra?.protocoloPosId]).filter(Boolean))
    return data.protocolos.filter((p) => ids.has(p.id))
  }, [data.cirurgias, data.protocolos])

  /* passa para a próxima etapa gravando o que foi exigido */
  const confirmarPassagem = (item: Item, values: Values) => {
    const fase = faseOf(item)
    const prox = fase + 1
    const key = GATE_KEY[prox]
    const ex = item.extra || {}
    const t = { ...marcos(item), [key]: nowISO() }
    const registro = { ...(ex.registro || {}), [key]: { ...values, em: nowISO(), por: profile?.displayName || "Equipe" } }
    const extra: Values = { ...ex, fase: Math.min(3, prox), t, registro, inicio: t.preop, ...(prox === CONCLUIDA ? { fim: t.fim } : {}) }
    const patch: Partial<Item> = {}
    if (prox === 0) Object.assign(extra, { peso: values.peso, asa: values.asa, chegada: values.chegada, preExames: values.exames })
    if (prox === 1) {
      Object.assign(extra, { protocoloId: values.protocoloId, anestesista: values.anestesista, mpa: values.mpa, cuidados: values.cuidados })
      const proto = protoDe(values.protocoloId)
      if (proto) {
        const usos = (proto.extra?.aplicacoes || []) as Values[]
        if (!usos.some((u) => u.cirurgiaId === item.id))
          updateItem("protocolos", proto.id, { extra: { ...(proto.extra || {}), aplicacoes: [{ animal: item.animal || "", animalId: item.animalId, em: todayISO(), por: profile?.displayName || "Equipe", cirurgiaId: item.id, origem: `Cirurgia · ${item.name}` }, ...usos] } })
      }
    }
    if (prox === 2) {
      Object.assign(extra, { inducao: values.inducao, manutencao: values.manutencao, monitorizacao: values.monitorizacao, regiao: values.regiao, tecnica: values.tecnica })
      if (values.procedimento && values.procedimento !== item.name) patch.name = values.procedimento
    }
    if (prox === 3) Object.assign(extra, { histopato: /sim/i.test(values.histopato || ""), fios: values.fios })
    if (prox === CONCLUIDA) {
      Object.assign(extra, { destino: values.destino, analgesia: values.analgesia, protocoloPosId: values.protocoloPosId || ex.protocoloPosId })
      if (values.destino !== "Alta no mesmo dia" && values.abrirInternacao && item.animalId) {
        addItem("internacoes", {
          name: `Pós-operatório de ${(patch.name || item.name).toLowerCase()}`,
          animalId: item.animalId, animal: item.animal, owner: item.owner, ownerId: item.ownerId, subtitle: item.subtitle,
          professionalId: item.professionalId, professional: item.professional,
          status: "Em observação", category: values.destino === "UTI" ? "UTI" : "Clínica", date: todayISO(), time: nowHM(),
          extra: { gravidade: values.destino === "UTI" ? "Crítico" : "Atenção", origem: "Cirurgia", cirurgiaId: item.id },
        })
        updateItem("animais", item.animalId, { status: "Internado" })
      }
    }
    updateItem("cirurgias", item.id, { ...patch, status: prox === CONCLUIDA ? "Concluída" : ETAPAS[prox].status, extra })
    setGateId("")
    forms.toast(prox === CONCLUIDA ? `${item.animal}: cirurgia encerrada · ${values.destino}.` : `${item.animal}: etapa “${ETAPAS[prox].label}” iniciada.`)
  }

  const voltarEtapa = (item: Item, motivo: string) => {
    const fase = faseOf(item)
    if (fase < 0) return
    const ex = item.extra || {}
    const t = { ...marcos(item) }
    delete t[GATE_KEY[fase]]
    const destino = fase - 1
    updateItem("cirurgias", item.id, {
      status: destino < 0 ? "Agendada" : ETAPAS[destino].status,
      extra: { ...ex, fase: destino, t, retornos: [...(ex.retornos || []), { de: fase === CONCLUIDA ? "Concluída" : ETAPAS[fase].label, motivo, em: nowISO(), por: profile?.displayName || "Equipe" }] },
    })
    setVoltarId("")
    forms.toast(`${item.animal}: voltou para ${destino < 0 ? "Agendada" : ETAPAS[destino].label}.`)
  }

  const gateItem = gateId ? byId(gateId) : undefined
  const listaAtual = aba === "hoje" ? doDia : paged.visible
  const aberta = (abertaId && listaAtual.find((c) => c.id === abertaId)) || listaAtual[0]
  const escolher = (id: string) => {
    setAbertaId(id)
    if (window.innerWidth < 1100) window.setTimeout(() => document.querySelector(".sg-grid .cd-side-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40)
  }
  const painel = aberta ? (
    <PainelCirurgia
      key={aberta.id}
      item={aberta}
      animal={animalDe(aberta)}
      protocolo={protoDe(aberta.extra?.protocoloId)}
      protocoloPos={protoDe(aberta.extra?.protocoloPosId)}
      risco={info(aberta)}
      onNext={() => setGateId(aberta.id)}
      onBack={() => setVoltarId(aberta.id)}
      onEdit={() => forms.open("cirurgias", aberta)}
      onDelete={() => navigate(`/cirurgias/${aberta.id}?excluir=1`)}
      go={(path) => navigate(path)}
    />
  ) : null
  const voltarItem = voltarId ? byId(voltarId) : undefined

  return (
    <Page
      className="sg-page sg-or"
      bg="#060a09"
      bgDark="#060a09"
      crumb="Cirurgias"
      title="Cirurgias"
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar paciente, tutor ou cirurgia" />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("cirurgias", undefined, { date: day })}>
            <Plus /> Agendar cirurgia
          </button>
        </>
      }
    >
      <div className="sg-monitor" aria-hidden="true">
        <svg viewBox="0 0 600 40" preserveAspectRatio="none"><path d="M0 22 H120 l8 -2 l6 4 l8 -18 l8 30 l7 -14 h40 l6 -3 l6 3 H330 l8 -2 l6 4 l8 -18 l8 30 l7 -14 h40 l6 -3 l6 3 H600" /></svg>
        <span>Centro cirúrgico · {data.cirurgias.filter((c) => itemDate(c) === todayISO() && faseOf(c) >= 0 && faseOf(c) <= 3).length} em sala agora</span>
      </div>
      <div className="pc-tabs" role="tablist">
        <button role="tab" aria-selected={aba === "hoje"} className={aba === "hoje" ? "on" : ""} onClick={() => setAba("hoje")}>
          {day === todayISO() ? "Cirurgias de hoje" : "Cirurgias do dia"} <b>{doDia.length}</b>
        </button>
        <button role="tab" aria-selected={aba === "todas"} className={aba === "todas" ? "on" : ""} onClick={() => setAba("todas")}>
          Todas as cirurgias <b>{data.cirurgias.length}</b>
        </button>
      </div>

      {aba === "hoje" ? (
        <>
          <div className="vx-row cx-daybar">
            <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><ChevronLeft /></button>
            <strong>{fmtLong(day)}</strong>
            <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><ChevronRight /></button>
            {day !== todayISO() && <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setDay(todayISO())}>Hoje</button>}
          </div>

          <div className="sg-kpis">
            <div><small>Agendadas</small><strong>{kpi.agendadas}</strong><span>aguardando o paciente</span></div>
            <div><small>Em curso</small><strong>{kpi.curso}</strong><span>pré-op, anestesia ou cirurgia</span></div>
            <div><small>Em recuperação</small><strong>{kpi.recuperacao}</strong><span>despertando</span></div>
            <div><small>Concluídas</small><strong>{kpi.concluidas}</strong><span>de {doDia.length} no dia</span></div>
            <div className={kpi.risco ? "sg-kpi-risk" : ""}><small>Cirurgias de risco</small><strong>{kpi.risco}</strong><span>exigem atenção da equipe</span></div>
          </div>

          {!doDia.length && (
            <div className="vx-empty cx-empty">
              Nenhuma cirurgia neste dia.
              <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => forms.open("cirurgias", undefined, { date: day })}><Plus /> Agendar cirurgia</button>
            </div>
          )}

          {doDia.length > 0 && (
            <div className="cd-grid sg-grid">
              <div className="sg-list cd-list">
                {doDia.map((item) => (
                  <CartaoCirurgia
                    key={item.id}
                    item={item}
                    atual={aberta?.id === item.id}
                    protocolo={protoDe(item.extra?.protocoloId)}
                    risco={info(item)}
                    onOpen={() => escolher(item.id)}
                    onNext={() => setGateId(item.id)}
                    onBack={() => setVoltarId(item.id)}
                  />
                ))}
              </div>
              <div className="cd-side-wrap">{painel}</div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="sg-filters">
            <div className="vx-seg" role="tablist" aria-label="Situação">
              {["Todas", "Agendadas", "Em curso", "Concluídas", "Canceladas"].map((op) => (
                <button key={op} type="button" role="tab" aria-selected={filtro === op} className={filtro === op ? "on" : ""} onClick={() => setFiltro(op)}>{op}</button>
              ))}
            </div>
            <button type="button" className={`sg-risk-toggle ${soRisco ? "on" : ""}`} aria-pressed={soRisco} onClick={() => setSoRisco(!soRisco)}>
              <ShieldAlert /> Só cirurgias de risco
            </button>
            <select className="vx-in sg-proto-filter" value={filtroProto} onChange={(e) => setFiltroProto(e.target.value)} aria-label="Filtrar por protocolo">
              <option value="">Todos os protocolos</option>
              {protocolosUsados.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="cd-grid sg-grid">
          <div className="cd-list">
          <div className="vx-table sg-table">
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS }}>
              <span>Data</span><span>Paciente / tutor</span><span>Cirurgia</span><span>Situação</span>
            </div>
            {paged.visible.map((item) => {
              const r = info(item)
              return (
                <div key={item.id} className={`vx-tr sg-tr ${aberta?.id === item.id ? "cur" : ""}`} aria-current={aberta?.id === item.id ? "true" : undefined} style={{ gridTemplateColumns: COLS, cursor: "pointer" }} onClick={() => escolher(item.id)}>
                  <span className="vx-mono" data-label="Data">{fmtDate(itemDate(item))}<small className="vx-muted" style={{ display: "block" }}>{timeOf(item)}</small></span>
                  <span data-label="Paciente"><strong>{item.animal || "—"}</strong>{r.risco && <b className="sg-risk-tag" title={r.motivos.join("\n")}><ShieldAlert /> Risco</b>}<small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
                  <span data-label="Cirurgia">{item.name}<small className="vx-muted" style={{ display: "block" }}>{roomOf(item)} · {item.professional || "—"}</small></span>
                  <span data-label="Situação"><StatusPill status={item.status} /></span>
                </div>
              )
            })}
            {!todas.length && <div className="vx-empty">Nenhuma cirurgia encontrada com esses filtros.</div>}
          </div>
          {paged.pages > 1 && (
            <div className="vx-row" style={{ justifyContent: "center", marginTop: 12 }}>
              <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
            </div>
          )}
          </div>
          <div className="cd-side-wrap">{painel}</div>
          </div>
        </>
      )}

      {gateItem && faseOf(gateItem) < CONCLUIDA && (
        <Passagem
          key={`${gateItem.id}-${faseOf(gateItem)}`}
          item={gateItem}
          risco={info(gateItem)}
          onCancel={() => setGateId("")}
          onConfirm={(values) => confirmarPassagem(gateItem, values)}
        />
      )}
      {voltarItem && (
        <Confirm
          title="Voltar uma etapa?"
          text={`${voltarItem.animal} volta de ${faseOf(voltarItem) === CONCLUIDA ? "Concluída" : ETAPAS[faseOf(voltarItem)].label} para ${faseOf(voltarItem) <= 0 ? "Agendada" : ETAPAS[Math.min(3, faseOf(voltarItem) - 1)].label}. O motivo fica registrado na cirurgia.`}
          confirm="Voltar etapa"
          reason="Motivo do retorno"
          onCancel={() => setVoltarId("")}
          onConfirm={(motivo) => voltarEtapa(voltarItem, motivo)}
        />
      )}
      {forms.node}
    </Page>
  )
}

/* ---------------- cartão do dia ---------------- */
type Risco = ReturnType<typeof riscoDe>
function CartaoCirurgia({ item, atual, protocolo, risco, onOpen, onNext, onBack }: { item: Item; atual: boolean; protocolo?: Item; risco: Risco; onOpen: () => void; onNext: () => void; onBack: () => void }) {
  const fase = faseOf(item)
  const concluida = fase === CONCLUIDA
  const live = fase >= 0 && fase <= 2
  return (
    <article className={`sg-card ${live ? "live" : ""} ${risco.risco ? "risk" : ""} ${concluida ? "done" : ""} ${atual ? "cur" : ""}`} aria-current={atual ? "true" : undefined} onClick={onOpen}>
      <div className="sg-head">
        <div className="sg-time">
          <strong>{timeOf(item)}</strong>
          <span>{roomOf(item)}</span>
        </div>
        <button className="sg-who" onClick={onOpen} title="Abrir a cirurgia">
          <strong><PawPrint />{item.animal || "Paciente"}</strong>
          <span>{item.name} · {item.owner || "tutor não informado"}</span>
          <span className="sg-team"><UserRound /> {item.professional || "—"}{item.extra?.anestesista ? ` · Anestesia: ${item.extra.anestesista}` : ""}</span>
        </button>
        <div className="sg-state">
          <StatusPill status={item.status} />
          {fase >= 0 && !concluida && fase <= 2 && <span className="sg-clock"><Clock3 /> {ETAPAS[fase].label} há {fmtMin(duracao(item, fase))}</span>}
        </div>
      </div>

      <div className="sg-tags">
        {risco.risco && (
          <button type="button" className="sg-risk" onClick={onOpen} title="Ver por que é de risco">
            <ShieldAlert /> <b>Cirurgia de risco</b> <span>{risco.motivos[0]}{risco.motivos.length > 1 ? ` +${risco.motivos.length - 1}` : ""}</span>
          </button>
        )}
        {protocolo ? (
          <span className={`sg-proto ${risco.conflitos.length ? "warn" : ""}`}><BookOpen /> Protocolo: <b>{protocolo.name}</b></span>
        ) : (
          !concluida && <span className="sg-proto pending"><Lock /> Protocolo anestésico será exigido antes da anestesia</span>
        )}
      </div>

      <ol className="sg-steps" aria-label="Etapas">
        {ETAPAS.map((etapa, i) => {
          const state = i < fase || concluida ? "done" : i === fase ? "on" : ""
          const Icon = etapa.icon
          const dur = i < 3 ? duracao(item, i) : null
          return (
            <li key={etapa.key} className={`${state} t-${etapa.tone}`}>
              <i>{state === "done" ? <Check /> : <Icon />}</i>
              <span>
                <b>{etapa.label}</b>
                <small>{i === 3 ? (state === "on" ? "em andamento" : state === "done" ? "encerrada" : "—") : dur === null ? "—" : `${fmtMin(dur)}${state === "on" ? " até agora" : ""}`}</small>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="sg-foot">
        <span className="sg-next-hint">
          {concluida ? `Encerrada${item.extra?.destino ? ` · ${item.extra.destino}` : ""}` : `Próximo passo: ${GATES[fase + 1].title.toLowerCase()}`}
        </span>
        <div className="sg-foot-actions" onClick={(e) => e.stopPropagation()}>
          {fase >= 0 && <button type="button" className="vx-btn vx-btn-g vx-btn-sm" onClick={onBack} title="Voltar uma etapa"><Undo2 /> Voltar</button>}
          {!concluida && (
            <button type="button" className="vx-btn vx-btn-p" onClick={onNext}>
              {GATES[fase + 1].cta} <ArrowRight />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* ---------------- gaveta lateral ---------------- */
function Sheet({ title, sub, onClose, children, foot, wide }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div className="vx-drawer-layer sg-layer" onMouseDown={onClose}>
      <aside className={`sg-sheet ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <header className="sg-sheet-head">
          <div>{title}{sub && <p>{sub}</p>}</div>
          <button type="button" className="vx-icon-btn" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <div className="sg-sheet-body">{children}</div>
        {foot && <footer className="sg-sheet-foot">{foot}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

/* ---------------- passagem de etapa (com exigências) ---------------- */
function Passagem({ item, risco, onCancel, onConfirm }: { item: Item; risco: Risco; onCancel: () => void; onConfirm: (v: Values) => void }) {
  const { data } = useVetFlow()
  const fase = faseOf(item)
  const gate = GATES[fase + 1]
  const [v, setV] = useState<Values>(() => inicial(fase, item, data.protocolos))
  const [tentou, setTentou] = useState(false)
  const falta = faltando(gate, v)
  const set = (k: string, value: unknown) => setV((cur) => ({ ...cur, [k]: value }))
  const anest = data.protocolos.filter((p) => !/arquiv/i.test(p.status) && isAnestesico(p))
  const outros = data.protocolos.filter((p) => !/arquiv/i.test(p.status) && !isAnestesico(p))
  const pos = data.protocolos.filter((p) => !/arquiv/i.test(p.status) && isPosOp(p))
  const escolher = (id: string) => {
    const proto = data.protocolos.find((p) => p.id === id)
    setV((cur) => ({ ...cur, protocoloId: id, mpa: dosesDe(proto, /mpa|pr[ée]-?anest/i) || cur.mpa }))
  }
  const proto = data.protocolos.find((p) => p.id === v.protocoloId)
  const conflitos = conflitosProtocolo(proto, risco.conds)
  const erro = (f: GField) => tentou && falta.includes(f.label)

  const campo = (f: GField) => {
    if (f.show && !f.show(v)) return null
    const label = <span className="sg-flabel">{f.label}{f.req && <em> *</em>}</span>
    const cls = `sg-field ${f.wide ? "wide" : ""} ${erro(f) ? "err" : ""}`
    switch (f.t) {
      case "check":
        return (
          <label key={f.k} className={`${cls} sg-checkrow ${v[f.k] ? "on" : ""}`}>
            <input type="checkbox" checked={!!v[f.k]} onChange={(e) => set(f.k, e.target.checked)} />
            <span>{f.label}{f.req && <em> *</em>}</span>
          </label>
        )
      case "pills":
        return (
          <div key={f.k} className={cls}>
            {label}
            <div className="vx-pills" role="radiogroup" aria-label={f.label}>
              {(f.opts || []).map((o) => <button key={o} type="button" role="radio" aria-checked={v[f.k] === o} className={`vx-pill ${v[f.k] === o ? "on" : ""}`} onClick={() => set(f.k, o)}>{o}</button>)}
            </div>
          </div>
        )
      case "multi": {
        const list: string[] = v[f.k] || []
        return (
          <div key={f.k} className={cls}>
            {label}
            <div className="vx-pills">
              {(f.opts || []).map((o) => {
                const on = list.includes(o)
                return <button key={o} type="button" aria-pressed={on} className={`vx-pill ${on ? "on" : ""}`} onClick={() => set(f.k, on ? list.filter((x) => x !== o) : [...list, o])}>{on && <Check size={13} />}{o}</button>
              })}
            </div>
          </div>
        )
      }
      case "select":
        return (
          <label key={f.k} className={cls}>
            {label}
            <select className="vx-in" value={v[f.k] || ""} onChange={(e) => set(f.k, e.target.value)}>
              <option value="">Escolha</option>
              {[...new Set([...(f.opts || []), ...(v[f.k] ? [v[f.k]] : [])])].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        )
      case "pro":
        return (
          <label key={f.k} className={cls}>
            {label}
            <select className="vx-in" value={v[f.k] || ""} onChange={(e) => set(f.k, e.target.value)}>
              <option value="">Escolha</option>
              {data.profissionais.map((p) => <option key={p.id}>{p.name}</option>)}
            </select>
          </label>
        )
      case "protocol":
        return (
          <div key={f.k} className={cls}>
            {label}
            <select className="vx-in" value={v[f.k] || ""} onChange={(e) => escolher(e.target.value)}>
              <option value="">Escolha o protocolo anestésico</option>
              {anest.length > 0 && <optgroup label="Protocolos de anestesia">{anest.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
              {outros.length > 0 && <optgroup label="Outros protocolos">{outros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
            </select>
            {proto && <ResumoProtocolo protocolo={proto} conflitos={conflitos} />}
            {!anest.length && <small className="sg-hint">Nenhum protocolo de anestesia cadastrado. Cadastre em Protocolos (categoria Anestesia).</small>}
          </div>
        )
      case "protocolPos":
        return (
          <label key={f.k} className={cls}>
            {label}
            <select className="vx-in" value={v[f.k] || ""} onChange={(e) => set(f.k, e.target.value)}>
              <option value="">Nenhum</option>
              {pos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )
      case "textarea":
        return (
          <label key={f.k} className={cls}>
            {label}
            <textarea className="vx-in sg-ta" rows={3} value={v[f.k] || ""} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} />
            {f.hint && <small className="sg-hint">{f.hint}</small>}
          </label>
        )
      default:
        return (
          <label key={f.k} className={cls}>
            {label}
            <input className="vx-in" type={f.t === "time" ? "time" : "text"} inputMode={f.t === "number" ? "decimal" : undefined} value={v[f.k] || ""} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} />
            {f.hint && <small className="sg-hint">{f.hint}</small>}
          </label>
        )
    }
  }

  return (
    <Sheet
      wide
      onClose={onCancel}
      title={
        <>
          <span className="sg-gate-step">{fase + 1 < ETAPAS.length ? `Etapa ${fase + 2} de 4 · ${ETAPAS[fase + 1].label}` : "Encerramento"}</span>
          <h3>{gate.title}</h3>
        </>
      }
      sub={`${item.animal} · ${item.name} · ${gate.desc}`}
      foot={
        <>
          <span className={`sg-missing ${falta.length ? "" : "ok"}`}>
            {falta.length ? <><Lock /> Faltam {falta.length} {falta.length === 1 ? "item" : "itens"} para liberar</> : <><Check /> Tudo preenchido</>}
          </span>
          <button type="button" className="vx-btn vx-btn-g" onClick={onCancel}>Agora não</button>
          <button
            type="button"
            className={`vx-btn vx-btn-p ${falta.length ? "is-locked" : ""}`}
            aria-disabled={falta.length > 0}
            onClick={() => (falta.length ? setTentou(true) : onConfirm(v))}
          >
            {gate.cta} <ArrowRight />
          </button>
        </>
      }
    >
      {risco.risco && (
        <div className="sg-banner">
          <ShieldAlert />
          <div>
            <b>Cirurgia de risco</b>
            <ul>{risco.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        </div>
      )}
      {tentou && falta.length > 0 && (
        <div className="sg-banner warn" role="alert">
          <TriangleAlert />
          <div><b>Preencha antes de continuar:</b><ul>{falta.map((m) => <li key={m}>{m}</li>)}</ul></div>
        </div>
      )}
      {gate.sections.map((s) => (
        <section key={s.title} className="sg-gsec">
          <h4>{s.title}</h4>
          <div className="sg-grid">{s.fields.map(campo)}</div>
        </section>
      ))}
    </Sheet>
  )
}

function ResumoProtocolo({ protocolo, conflitos }: { protocolo: Item; conflitos: string[] }) {
  const doses = (protocolo.extra?.doses || []) as { farmaco: string; dose: string; via: string; fase?: string; obs?: string }[]
  return (
    <div className="sg-proto-card">
      <div className="sg-proto-top">
        <b><BookOpen /> {protocolo.name}</b>
        <StatusPill status={protocolo.status} />
      </div>
      {doses.length > 0 ? (
        <ul className="sg-doses">
          {doses.filter((d) => d.farmaco).map((d, i) => (
            <li key={i}><small>{d.fase || "Dose"}</small><span><b>{d.farmaco}</b> {d.dose} {d.via}</span></li>
          ))}
        </ul>
      ) : (
        <small className="sg-hint">Este protocolo não tem doses cadastradas. Informe a MPA manualmente.</small>
      )}
      {protocolo.extra?.contraindicacoes && <p className="sg-contra"><b>Cuidados / contraindicações:</b> {protocolo.extra.contraindicacoes}</p>}
      {conflitos.length > 0 && (
        <p className="sg-conflict"><TriangleAlert /> Atenção: o paciente tem {conflitos.join(", ")} — verifique a compatibilidade com este protocolo.</p>
      )}
    </div>
  )
}

/* ---------------- painel da cirurgia (abre ao clicar) ---------------- */
function PainelCirurgia({ item, animal, protocolo, protocoloPos, risco, onNext, onBack, onEdit, onDelete, go }: {
  item: Item; animal?: Item; protocolo?: Item; protocoloPos?: Item; risco: Risco
  onNext: () => void; onBack: () => void; onEdit: () => void; onDelete: () => void; go: (path: string) => void
}) {
  const fase = faseOf(item)
  const concluida = fase === CONCLUIDA
  const ex = item.extra || {}
  const reg = ex.registro || {}
  const t = marcos(item)
  const resumo: Record<string, [string, unknown][]> = {
    preop: [["Chegada", reg.preop?.chegada || ex.chegada], ["Peso", reg.preop?.peso ? `${reg.preop.peso} kg` : ex.peso ? `${ex.peso} kg` : ""], ["FC / FR / T", reg.preop ? `${reg.preop.fc} bpm · ${reg.preop.fr} mpm · ${reg.preop.temperatura} °C` : ""], ["ASA", reg.preop?.asa || ex.asa], ["Exames", (reg.preop?.exames || ex.preExames || []).join(", ")]],
    anestesia: [["Protocolo", protocolo?.name], ["Anestesista", reg.anestesia?.anestesista || ex.anestesista], ["Cuidados pré-op", (reg.anestesia?.cuidados || ex.cuidados || []).join(", ")], ["MPA", reg.anestesia ? `${reg.anestesia.mpa} (${reg.anestesia.mpaHora})` : ex.mpa]],
    cirurgia: [["Indução", reg.cirurgia ? `${reg.cirurgia.inducao} (${reg.cirurgia.inducaoHora})` : ex.inducao], ["Via aérea", reg.cirurgia ? `${reg.cirurgia.via}${reg.cirurgia.sonda ? ` nº ${reg.cirurgia.sonda}` : ""}` : ""], ["Manutenção", reg.cirurgia?.manutencao || ex.manutencao], ["Monitorização", (reg.cirurgia?.monitorizacao || []).join(", ")], ["Técnica", reg.cirurgia ? `${reg.cirurgia.tecnica} · ${reg.cirurgia.regiao}` : ex.regiao]],
    recuperacao: [["Descrição", reg.recuperacao?.descricao], ["Intercorrências", reg.recuperacao ? (reg.recuperacao.intercorrencia === "Sim" ? reg.recuperacao.intercorrenciaDesc : "Nenhuma") : ""], ["Sangramento", reg.recuperacao?.sangramento], ["Histopatológico", reg.recuperacao?.histopato]],
    fim: [["Despertar", reg.fim?.extubacao], ["Dor", reg.fim ? `${reg.fim.dor}/10 · ${reg.fim.consciencia}` : ""], ["Analgesia", reg.fim?.analgesia || ex.analgesia], ["Protocolo pós-op", protocoloPos?.name], ["Destino", reg.fim?.destino || ex.destino]],
  }
  const linha = [...ETAPAS.map((e) => ({ key: e.key, label: e.label, icon: e.icon })), { key: "fim", label: "Encerramento", icon: Check }]

  const riscoSec = (
    <>
      <section className={`sg-psec ${risco.risco ? "sg-psec-risk" : ""}`}>
        <h4><ShieldAlert /> {risco.risco ? "Por que é uma cirurgia de risco" : "Risco"}</h4>
        {risco.risco ? <ul className="sg-reasons">{risco.motivos.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="sg-muted">Nenhum fator de risco registrado no agendamento nem no cadastro do animal.</p>}
        {animal ? (
          <button type="button" className="vx-btn vx-btn-g vx-btn-sm" onClick={() => go(`/animais?ficha=${encodeURIComponent(animal.id)}`)}>
            <PawPrint /> Abrir cadastro de {animal.name}
          </button>
        ) : null}
      </section>

      <section className="sg-psec">
        <h4><BookOpen /> Protocolos vinculados</h4>
        {protocolo ? (
          <>
            <ResumoProtocolo protocolo={protocolo} conflitos={risco.conflitos} />
            <button type="button" className="vx-btn vx-btn-g vx-btn-sm" onClick={() => go(`/protocolos?id=${encodeURIComponent(protocolo.id)}`)}>Ver protocolo anestésico</button>
          </>
        ) : (
          <p className="sg-muted"><Lock size={14} /> Nenhum protocolo anestésico vinculado ainda. Ele é exigido para liberar o paciente para a anestesia.</p>
        )}
        {protocoloPos && (
          <p className="sg-pos">Pós-operatório: <button type="button" className="sg-link" onClick={() => go(`/protocolos?id=${encodeURIComponent(protocoloPos.id)}`)}>{protocoloPos.name}</button></p>
        )}
      </section>
    </>
  )
  const etapasSec = (
      <section className="sg-psec">
        <h4><Clock3 /> Etapas e durações</h4>
        <div className="sg-durs">
          {[0, 1, 2].map((i) => (
            <div key={i}><small>{ETAPAS[i].label}</small><strong>{fmtMin(duracao(item, i))}</strong></div>
          ))}
        </div>
        <ol className="sg-timeline">
          {linha.map((e, i) => {
            const feito = !!t[e.key] && (i < fase || concluida)
            const on = i === fase && !concluida
            const Icon = e.icon
            const rows = (resumo[e.key] || []).filter(([, val]) => val && String(val).trim() && !/undefined/.test(String(val)))
            return (
              <li key={e.key} className={`${feito ? "done" : ""} ${on ? "on" : ""}`}>
                <i><Icon /></i>
                <div>
                  <b>{e.label}</b>
                  <small>{t[e.key] ? `às ${hm(t[e.key])}${reg[e.key]?.por ? ` · ${reg[e.key].por}` : ""}` : "ainda não iniciada"}</small>
                  {rows.length > 0 && (
                    <dl>{rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{String(val)}</dd></div>)}</dl>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {(ex.retornos || []).length > 0 && (
          <div className="sg-retornos">
            <b>Retornos de etapa</b>
            {(ex.retornos as Values[]).map((r, i) => <p key={i}>{fmtDate(r.em.slice(0, 10))} {hm(r.em)} · saiu de {r.de} · {r.motivo} ({r.por})</p>)}
          </div>
        )}
      </section>
  )
  const equipeSec = (
      <section className="sg-psec">
        <h4><UserRound /> Equipe e sala</h4>
        <dl className="sg-dl">
          <div><dt>Cirurgião(ã)</dt><dd>{item.professional || "—"}</dd></div>
          <div><dt>Anestesista</dt><dd>{ex.anestesista || "—"}</dd></div>
          <div><dt>Auxiliar</dt><dd>{ex.auxiliar || "—"}</dd></div>
          <div><dt>Sala</dt><dd>{roomOf(item)}</dd></div>
          <div><dt>Caráter</dt><dd>{ex.carater || (item.urgency ? "Urgência" : "Eletiva")}</dd></div>
          <div><dt>Indicação</dt><dd>{ex.indicacao || "—"}</dd></div>
        </dl>
      </section>
  )
  return (
    <div className="sg-side">
      <FichaLivre
        titulo={`${item.animal || "Paciente"} · ${item.name}`}
        sub={`${fmtDate(itemDate(item))} · ${timeOf(item)} · ${roomOf(item)} · ${item.owner || "tutor não informado"}`}
        status={item.status}
        tom={cancelada(item) ? "gray" : risco.risco && !concluida ? "red" : concluida ? "" : "orange"}
        avatar={<PawPrint size={28} />}
        cor={risco.risco ? "#b4322a" : "#0f766e"}
        acoes={[
          ...(!concluida && !cancelada(item) ? [{ label: GATES[fase + 1].cta, icon: <ArrowRight />, main: true, onClick: onNext }] : []),
          { label: "Editar", icon: <Edit3 />, onClick: onEdit },
          ...(fase >= 0 ? [{ label: "Voltar etapa", icon: <Undo2 />, onClick: onBack }] : []),
          { label: "Ficha completa", icon: <ExternalLink />, onClick: () => go(`/cirurgias/${item.id}`) },
          { label: "Excluir", icon: <Trash2 />, danger: true, onClick: onDelete },
        ]}
        abas={[
          { label: "Etapas", content: etapasSec },
          { label: "Risco e protocolo", content: riscoSec },
          { label: "Equipe", content: equipeSec },
        ]}
      />
    </div>
  )
}
