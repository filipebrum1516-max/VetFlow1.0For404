import { localISO } from "./date"
import type { Item, UnitData } from "./store"
import { bedAssignments } from "./vfx/forms"

/** Cálculos compartilhados: o mesmo número aparece igual no Painel, em Animais e em Unidades (B-09, B-10, B-12, B-13, M-37). */
export const isActivePatient = (animal: Item) => !/falec|óbito|obito|inativ|arquiv/i.test(animal.status || "")
const addDays = (iso: string, days: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + days); return localISO(d) }
const dateOf = (item: Item) => (item.date || "").slice(0, 10)

export const TOTAL_BEDS = 14

export function clinicMetrics(data: UnitData | undefined, today = localISO()) {
  if (!data) return { patients: 0, inTreatment: 0, hospitalized: 0, beds: TOTAL_BEDS, todayAgenda: 0, lateVaccines: 0, tutors: 0, team: 0, revenue: (_d: number) => 0, receipts: (_d: number) => [] as Item[] }
  const receipts = (days: number) => data.financeiro.filter((item) => item.category === "Receita" && /receb/i.test(item.status) && dateOf(item) > addDays(today, -days) && dateOf(item) <= today)
  return {
    patients: data.animais.filter(isActivePatient).length,
    inTreatment: data.animais.filter((a) => /tratamento|internad/i.test(a.status || "")).length,
    hospitalized: Math.min(TOTAL_BEDS, bedAssignments(data.internacoes, data.animais).map.size),
    beds: TOTAL_BEDS,
    todayAgenda: (["agendas", "cirurgias", "teleatendimentos"] as const).reduce((n, slug) => n + data[slug].filter((item) => dateOf(item) === today && item.time && !/cancel/i.test(item.status)).length, 0),
    lateVaccines: data.vacinas.filter((item) => /atrasad/i.test(item.status)).length,
    tutors: data.tutores.filter((t) => !/inativ/i.test(t.status || "")).length,
    team: data.profissionais.filter((p) => !/inativ/i.test(p.status || "")).length,
    receipts,
    revenue: (days: number) => receipts(days).reduce((sum, item) => sum + (item.amountValue || 0), 0),
  }
}
