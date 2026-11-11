/*
 * Exames: catálogo, fases, numeração e valores de referência (cão / gato).
 * Usado pela tela de Exames (cards por paciente) e pela impressão do laudo.
 */
import type { Item } from "../../store"

/** Linha de resultado salva em item.extra.resultados (compatível com o formato antigo {n,u,min,max,v}). */
export type ExamRow = {
  n: string
  u: string
  min: number
  max: number
  v: number
  /** Seção do laudo (ERITROGRAMA, LEUCOGRAMA...). */
  sec?: string
  /** Linha do leucograma informada em %: v é o valor absoluto calculado. */
  isPct?: boolean
  pct?: number
  /** Linha calculada automaticamente (Neutrófilos totais). */
  calc?: boolean
  /** Casas decimais na impressão. */
  dec?: number
}

/* ---------------- fases ---------------- */
export const PHASES = ["Solicitado", "Amostra colhida", "Em análise", "Resultado lançado", "Liberado"] as const
/** Status gravado no item para cada fase (\"Concluído\" mantém compatibilidade com painéis e relatórios). */
export const STATUS_FOR = ["Solicitado", "Amostra colhida", "Em análise", "Resultado lançado", "Concluído"] as const

export function phaseOf(item: Item): number {
  const s = item.status || ""
  if (/conclu|liberad/i.test(s)) return 4
  if (/assinatura|lan[çc]ad/i.test(s)) return 3
  if (/an[áa]lise|aguardando resultado/i.test(s)) return 2
  if (/colhid/i.test(s)) return 1
  return 0
}

export const isUrgent = (item: Item) => !!item.urgency || /urgent/i.test(item.status || "") || item.category === "Urgente"
export const isCanceled = (item: Item) => /cancel/i.test(item.status || "")

/** Número do exame: EX-0001. Exames antigos (sem número salvo) usam o final do id. */
export function examNo(item: Item) {
  const saved = Number(item.extra?.numero)
  if (saved) return `EX-${String(saved).padStart(4, "0")}`
  return `EX-${String(item.id.split("-").pop() || "").replace(/\D/g, "").slice(-4).padStart(4, "0")}`
}

/* ---------------- catálogo ---------------- */
export const CATALOGO = [
  "Hemograma completo",
  "Bioquímico renal",
  "Perfil renal",
  "Bioquímico hepático",
  "Urina tipo I",
  "Parasitológico de fezes",
  "Glicemia",
  "Raio-X de tórax",
  "Ultrassom abdominal",
  "Ecocardiograma",
  "Citologia de pele",
]

export function materialFor(name: string) {
  if (/hemograma|pr[ée]-anest|check/i.test(name)) return "Sangue total - EDTA"
  if (/renal|hep[aá]t|bioq|glice/i.test(name)) return "Soro"
  if (/urina/i.test(name)) return "Urina"
  if (/fezes|parasit/i.test(name)) return "Fezes"
  if (/citolog/i.test(name)) return "Lâmina - citologia"
  if (/raio|ultra|eco|imag/i.test(name)) return "Exame de imagem"
  return ""
}

export function metodoFor(name: string) {
  if (/hemograma|pr[ée]-anest|check/i.test(name)) return "Hemograma automatizado + contagem diferencial em lâmina"
  if (/renal|hep[aá]t|bioq|glice/i.test(name)) return "Colorimétrico / cinético automatizado"
  if (/urina/i.test(name)) return "Tira reagente + sedimentoscopia"
  if (/fezes|parasit/i.test(name)) return "Flutuação e sedimentação"
  if (/raio|ultra|eco|imag/i.test(name)) return "Exame de imagem"
  return ""
}

/* ---------------- referências ---------------- */
type Def = { n: string; u: string; sec: string; cao: [number, number]; gato: [number, number]; isPct?: boolean; calc?: boolean; dec?: number }

export const LEUCO = "Leucócitos"
const HEMO_RE = /hemograma|pr[ée]-anest|check-up/i

const HEMO: Def[] = [
  { n: "Hemácias", u: "milhões/mm³", sec: "ERITROGRAMA", cao: [5.5, 8.5], gato: [5, 10], dec: 2 },
  { n: "Hematócrito", u: "%", sec: "ERITROGRAMA", cao: [37, 55], gato: [24, 45], dec: 1 },
  { n: "Hemoglobina", u: "g/dL", sec: "ERITROGRAMA", cao: [12, 18], gato: [8, 15], dec: 1 },
  { n: "VCM", u: "fL", sec: "ERITROGRAMA", cao: [60, 77], gato: [39, 55], dec: 2 },
  { n: "HCM", u: "pg", sec: "ERITROGRAMA", cao: [19.5, 24.5], gato: [12.5, 17.5], dec: 2 },
  { n: "CHCM", u: "g/dL", sec: "ERITROGRAMA", cao: [32, 36], gato: [30, 36], dec: 2 },
  { n: "RDW", u: "%", sec: "ERITROGRAMA", cao: [12, 16], gato: [14, 18], dec: 1 },
  { n: "Eritroblastos", u: "/100 leuco", sec: "ERITROGRAMA", cao: [0, 1], gato: [0, 1], dec: 0 },
  { n: LEUCO, u: "/mm³", sec: "LEUCOGRAMA", cao: [6000, 17000], gato: [5500, 19500], dec: 0 },
  { n: "Mielócitos", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 0], gato: [0, 0], isPct: true, dec: 0 },
  { n: "Metamielócitos", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 0], gato: [0, 0], isPct: true, dec: 0 },
  { n: "Bastonetes", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 300], gato: [0, 300], isPct: true, dec: 0 },
  { n: "Segmentados", u: "/mm³", sec: "LEUCOGRAMA", cao: [3000, 11500], gato: [2500, 12500], isPct: true, dec: 0 },
  { n: "Neutrófilos totais", u: "/mm³", sec: "LEUCOGRAMA", cao: [3000, 11800], gato: [2500, 12800], isPct: true, calc: true, dec: 0 },
  { n: "Eosinófilos", u: "/mm³", sec: "LEUCOGRAMA", cao: [100, 1250], gato: [0, 1500], isPct: true, dec: 0 },
  { n: "Basófilos", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 100], gato: [0, 100], isPct: true, dec: 0 },
  { n: "Linfócitos", u: "/mm³", sec: "LEUCOGRAMA", cao: [1000, 4800], gato: [1500, 7000], isPct: true, dec: 0 },
  { n: "Linfócitos atípicos", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 0], gato: [0, 0], isPct: true, dec: 0 },
  { n: "Monócitos", u: "/mm³", sec: "LEUCOGRAMA", cao: [150, 1350], gato: [0, 850], isPct: true, dec: 0 },
  { n: "Plasmócitos", u: "/mm³", sec: "LEUCOGRAMA", cao: [0, 0], gato: [0, 0], isPct: true, dec: 0 },
  { n: "Plaquetas", u: "/mm³", sec: "PLAQUETOGRAMA", cao: [200000, 500000], gato: [300000, 800000], dec: 0 },
]

const SIMPLE: [RegExp, string, Omit<Def, "sec">[]][] = [
  [/renal/i, "BIOQUÍMICA", [
    { n: "Ureia", u: "mg/dL", cao: [21, 60], gato: [30, 65], dec: 1 },
    { n: "Creatinina", u: "mg/dL", cao: [0.5, 1.5], gato: [0.8, 1.8], dec: 2 },
    { n: "SDMA", u: "µg/dL", cao: [0, 14], gato: [0, 14], dec: 1 },
  ]],
  [/hep[aá]t|bioqu/i, "BIOQUÍMICA", [
    { n: "ALT (TGP)", u: "U/L", cao: [10, 88], gato: [6, 83], dec: 0 },
    { n: "Fosfatase alcalina", u: "U/L", cao: [20, 150], gato: [25, 93], dec: 0 },
    { n: "Albumina", u: "g/dL", cao: [2.6, 3.3], gato: [2.1, 3.3], dec: 2 },
  ]],
  [/glice/i, "BIOQUÍMICA", [{ n: "Glicose", u: "mg/dL", cao: [65, 118], gato: [70, 150], dec: 0 }]],
  [/urina/i, "URINÁLISE", [
    { n: "Densidade", u: "", cao: [1.015, 1.045], gato: [1.035, 1.06], dec: 3 },
    { n: "pH", u: "", cao: [5, 7], gato: [5, 7], dec: 1 },
    { n: "Proteína", u: "mg/dL", cao: [0, 30], gato: [0, 30], dec: 0 },
  ]],
]

/** Modelo de linhas para lançar o resultado (v = NaN até ser preenchido). Sem modelo = exame descritivo (laudo em texto). */
export function rowsFor(name: string, species?: string): ExamRow[] | undefined {
  const gato = /gat|felin/i.test(species || "")
  const mk = (d: Omit<Def, "sec">, sec: string): ExamRow => {
    const [min, max] = gato ? d.gato : d.cao
    return { n: d.n, u: d.u, sec, min, max, v: NaN, isPct: d.isPct, calc: d.calc, dec: d.dec }
  }
  if (HEMO_RE.test(name)) return HEMO.map((d) => mk(d, d.sec))
  const simple = SIMPLE.find(([re]) => re.test(name))
  return simple ? simple[2].map((d) => mk(d, simple[1])) : undefined
}

/* ---------------- números no padrão brasileiro ---------------- */
/** Aceita "3,93", "6.150", "6150", "172.000", "1.015" (densidade) etc. */
export function parseNum(raw: unknown): number {
  const t = String(raw ?? "").trim().replace(/\s/g, "")
  if (!t) return NaN
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."))
  if (/^\d{1,3}(\.\d{3})+$/.test(t) && !/^1\.0\d\d$/.test(t)) return Number(t.replace(/\./g, ""))
  return Number(t)
}

export function fmtNum(v: number, dec?: number) {
  if (!Number.isFinite(v)) return "—"
  return dec === undefined
    ? v.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
    : v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
