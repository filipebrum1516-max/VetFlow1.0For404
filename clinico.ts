import type { Item, UnitData } from "../store"

/* Condições clínicas que importam para anestesia e cirurgia. Ficam no cadastro do animal
   (extra.condicoes / extra.alergias) e aparecem na cirurgia como motivo de risco. */
export const CONDICOES = [
  "Cardiopatia",
  "Doença renal crônica",
  "Hepatopatia",
  "Diabetes mellitus",
  "Epilepsia / convulsões",
  "Braquicefálico (via aérea)",
  "Doença respiratória",
  "Coagulopatia",
  "Endocrinopatia (Cushing / hipotireoidismo)",
  "Obesidade",
  "Geriátrico",
  "Gestante",
] as const

/* palavras que, se aparecerem nas contraindicações de um protocolo, conflitam com a condição */
const CONFLITO: [string, RegExp][] = [
  ["Cardiopatia", /cardi|arritm|sopro/i],
  ["Doença renal crônica", /renal|rim|nefro/i],
  ["Hepatopatia", /hepat|f[ií]gado/i],
  ["Diabetes mellitus", /diabet|glic/i],
  ["Epilepsia / convulsões", /epilep|convuls/i],
  ["Braquicef", /braquic/i],
  ["Doença respiratória", /respirat|pulmon/i],
  ["Coagulopatia", /coagul|sangra/i],
  ["Gestante", /gest|prenh/i],
  ["Geriátrico", /idoso|geri/i],
]

export function condicoesDoAnimal(animal?: Item): string[] {
  const raw = animal?.extra?.condicoes
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? raw.split(/[;,]/) : []
  const outras = typeof animal?.extra?.outrasCondicoes === "string" ? animal.extra.outrasCondicoes.split(/[;,]/) : []
  return [...list, ...outras].map((v) => String(v).trim()).filter(Boolean)
}

export function alergiasDoAnimal(animal?: Item): string {
  return String(animal?.extra?.alergias || "").trim()
}

/** Contraindicações do protocolo que batem com as condições do paciente. */
export function conflitosProtocolo(protocolo: Item | undefined, condicoes: string[]): string[] {
  if (!protocolo) return []
  const texto = `${protocolo.extra?.contraindicacoes || ""}`
  if (!texto.trim()) return []
  return condicoes.filter((cond) => CONFLITO.some(([nome, re]) => (cond.startsWith(nome) || re.test(cond)) && re.test(texto)))
}

export const isAnestesico = (p: Item) => /anest/i.test(`${p.name} ${p.extra?.categoria || ""} ${p.category || ""}`)
export const isPosOp = (p: Item) => /p[óo]s-?op|dor|analges|profil/i.test(`${p.name} ${p.extra?.categoria || ""}`)

export function protocolosAnestesicos(data: UnitData) {
  return data.protocolos.filter((p) => !/arquiv/i.test(p.status) && isAnestesico(p))
}
