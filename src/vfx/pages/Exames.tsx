import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, Check, ChevronLeft, Syringe, Pencil, Plus, Printer, Search, Trash2, X } from "lucide-react"
import { localISO } from "../../date"
import { normalize, useVetFlow, type Item } from "../../store"
import { fmtDate, itemDate, matches, Page, Pager, SearchBox, Seg, usePaged, useQueryFlag, useQueryParam, useToast } from "../ui"
import {
  CATALOGO,
  examNo,
  fmtNum,
  isCanceled,
  isUrgent,
  LEUCO,
  materialFor,
  metodoFor,
  parseNum,
  PHASES,
  phaseOf,
  rowsFor,
  STATUS_FOR,
  type ExamRow,
} from "./examesRef"
import { printLaudos, type LaudoCtx } from "./examesPrint"

type Filter = "Todos" | "Aguardando" | "Laudos" | "Urgentes" | "Impressão"
const FILTERS: Filter[] = ["Todos", "Aguardando", "Laudos", "Urgentes", "Impressão"]

const inFilter = (item: Item, f: Filter) => {
  const p = phaseOf(item)
  if (f === "Aguardando") return p <= 2
  if (f === "Laudos") return p === 3
  if (f === "Urgentes") return isUrgent(item) && p < 4
  if (f === "Impressão") return p === 4
  return true
}
const PHASE_TONE = ["gray", "orange", "blue", "purple", "green"]
const patientKey = (item: Item) => item.animalId || `nome:${item.animal || item.id}`
const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
const toLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function PhaseBadge({ item }: { item: Item }) {
  const p = phaseOf(item)
  return <span className={`exm-badge t-${isCanceled(item) ? "red" : PHASE_TONE[p]}`}>{isCanceled(item) ? "Cancelado" : PHASES[p]}</span>
}

function Stepper({ item }: { item: Item }) {
  const p = phaseOf(item)
  return (
    <ol className="exm-steps" aria-label={`Fase: ${PHASES[p]}`}>
      {PHASES.map((label, i) => (
        <li key={label} className={i < p ? "done" : i === p ? "now" : ""}>
          <i>{i < p ? <Check size={11} /> : i + 1}</i>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}

/* =====================================================================
   Página
   ===================================================================== */
export default function Exames() {
  const { data, activeUnit, user } = useVetFlow()
  const [toast, showToast] = useToast()
  const param = useQueryParam("filtro")
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(param as Filter) ? (param as Filter) : "Todos")
  const [query, setQuery] = useState("")
  const [openKey, setOpenKey] = useState("")
  const [request, setRequest] = useState<{ animalId?: string } | null>(null)

  useQueryFlag(useCallback((params: URLSearchParams) => {
    const animal = params.get("animal") || ""
    const match = data.animais.find((a) => a.id === animal) || data.animais.find((a) => animal && normalize(a.name) === normalize(animal))
    setRequest({ animalId: match?.id })
  }, [data.animais]))

  const animals = useMemo(() => new Map(data.animais.map((a) => [a.id, a])), [data.animais])
  const searched = useMemo(() => data.exames.filter((e) => !isCanceled(e) && (matches(e, query) || normalize(examNo(e)).includes(normalize(query)))), [data.exames, query])
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, searched.filter((e) => inFilter(e, f)).length])) as Record<Filter, number>, [searched])

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const e of searched) {
      if (!inFilter(e, filter)) continue
      const k = patientKey(e)
      const list = map.get(k)
      if (list) list.push(e)
      else map.set(k, [e])
    }
    const out = [...map.entries()].map(([key, exams]) => {
      exams.sort((a, b) => `${itemDate(b)}${b.time || ""}`.localeCompare(`${itemDate(a)}${a.time || ""}`))
      return { key, exams, last: `${itemDate(exams[0])}${exams[0].time || ""}`, urgent: exams.some((e) => isUrgent(e) && phaseOf(e) < 4) }
    })
    return out.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.last.localeCompare(a.last))
  }, [searched, filter])

  const paged = usePaged(groups, 12, [filter, query])
  const allOf = (key: string) => data.exames.filter((e) => patientKey(e) === key && !isCanceled(e))
  const openExams = openKey ? allOf(openKey) : []

  const ctx = (animalId?: string): LaudoCtx => {
    const u = activeUnit
    const extra = (u.extra || {}) as Record<string, any>
    const logo = extra.logo || extra.logoUrl || extra.logotipo || `${window.location.origin}/assets/vetflow-logo.png`
    return {
      clinic: {
        name: u.name,
        phone: u.phone,
        email: u.email,
        site: extra.site || extra.website || u.email,
        address: [[u.street, u.number].filter(Boolean).join(", "), u.city && `${u.city}/${u.state}`].filter(Boolean).join(" · "),
        logo,
      },
      animal: animalId ? animals.get(animalId) : undefined,
      crmvOf: (name?: string) => data.profissionais.find((p) => p.name === name)?.registration || "",
    }
  }
  const print = (exams: Item[]) => {
    const ready = exams.filter((e) => phaseOf(e) === 4)
    if (!ready.length) return showToast("Só exames liberados podem ser impressos.")
    printLaudos(ready, ctx(ready[0].animalId))
  }

  return (
    <Page
      bg="#f1eefa"
      blobs={[["#c9b8ff", 40, 240, 560, 480], ["#a7e3f0", "45%", -80, 380, 380], ["#ffc9d4", "85%", "70%", 340, 340]]}
      crumb="Exames"
      title="Exames"
      sub="Um card por paciente. Abra o card e use Editar para avançar as fases: Solicitado → Amostra colhida → Em análise → Resultado lançado → Liberado."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar exame, nº ou paciente" />
          <Seg<Filter> options={FILTERS.map((f) => [f, `${f} ${counts[f] ? `(${counts[f]})` : ""}`.trim()] as [Filter, string])} value={filter} onChange={setFilter} label="Filtrar exames" />
          <button className="vx-btn vx-btn-p" type="button" onClick={() => setRequest({})}>
            <Plus /> Solicitar exame
          </button>
        </>
      }
    >
      <div className="exm-grid">
        {paged.visible.map((g) => {
          const first = g.exams[0]
          const a = first.animalId ? animals.get(first.animalId) : undefined
          const all = allOf(g.key)
          const done = all.filter((e) => phaseOf(e) === 4).length
          const allReady = all.length > 0 && done === all.length
          return (
            <button key={g.key} type="button" className={`exm-card ${g.urgent ? "urgent" : ""}`} onClick={() => setOpenKey(g.key)} aria-label={`Abrir exames de ${first.animal}`}>
              <div className="exm-card-hd">
                <span className="exm-ava">{(first.animal || "?").charAt(0).toUpperCase()}</span>
                <span className="exm-who">
                  <strong>{first.animal || "Paciente"}</strong>
                  <small>Tutor: {first.owner || a?.owner || "—"}</small>
                  <small>{[a?.species || first.species, a?.breed || first.breed].filter(Boolean).join(" · ") || "—"}</small>
                </span>
                {g.urgent && <span className="exm-badge t-red"><AlertTriangle size={11} /> Urgente</span>}
              </div>
              <ul className="exm-list">
                {g.exams.slice(0, 4).map((e) => (
                  <li key={e.id}>
                    <code>{examNo(e)}</code>
                    <span>{e.name}</span>
                    <PhaseBadge item={e} />
                  </li>
                ))}
                {g.exams.length > 4 && <li className="more">+ {g.exams.length - 4} exame(s)</li>}
              </ul>
              <div className="exm-card-ft">
                <span>{fmtDate(itemDate(first))}{first.time ? ` · ${first.time}` : ""} · {first.professional || "—"}</span>
                {allReady ? <span className="exm-ready"><Printer size={13} /> Pronto p/ impressão</span> : <span>{done}/{all.length} liberado(s)</span>}
              </div>
            </button>
          )
        })}
      </div>
      {!groups.length && <div className="vx-glass vx-empty" style={{ marginTop: 20 }}>Nenhum exame neste filtro.</div>}
      {groups.length > 12 && (
        <div className="vx-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
          <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} label={`Página ${paged.page} de ${paged.pages}`} />
        </div>
      )}

      {openKey && openExams.length > 0 && (
        <PatientDrawer
          exams={openExams}
          animal={openExams[0].animalId ? animals.get(openExams[0].animalId) : undefined}
          userName={user?.displayName || "Equipe"}
          onClose={() => setOpenKey("")}
          onToast={showToast}
          onPrint={print}
          onAdd={(animalId) => setRequest({ animalId })}
        />
      )}
      {request && (
        <RequestDrawer
          animalId={request.animalId}
          onClose={() => setRequest(null)}
          onSaved={(key, n) => { setRequest(null); setOpenKey(key); showToast(`${n} exame(s) solicitado(s).`) }}
        />
      )}
      {toast}
    </Page>
  )
}

/* =====================================================================
   Drawer genérico
   ===================================================================== */
function Drawer({ title, sub, onClose, onBack, footer, children, wide }: { title: string; sub?: string; onClose: () => void; onBack?: () => void; footer?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="exd-backdrop" onMouseDown={onClose}>
      <aside className={`exd ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header>
          {onBack ? <button type="button" onClick={onBack} aria-label="Voltar"><ChevronLeft /></button> : <span />}
          <div><strong>{title}</strong>{sub && <small>{sub}</small>}</div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X /></button>
        </header>
        <div className="exd-scroll">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  )
}

/* =====================================================================
   Card aberto: paciente + exames, fases no modo Editar
   ===================================================================== */
type EditDraft = Record<string, { urgency: boolean; material: string; metodo: string; professionalId: string; notes: string }>

function PatientDrawer({ exams, animal, userName, onClose, onToast, onPrint, onAdd }: {
  exams: Item[]
  animal?: Item
  userName: string
  onClose: () => void
  onToast: (t: string) => void
  onPrint: (exams: Item[]) => void
  onAdd: (animalId?: string) => void
}) {
  const { data, updateItem, deleteItem } = useVetFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditDraft>({})
  const [coleta, setColeta] = useState<{ id: string; em: string; por: string } | null>(null)
  const [resultFor, setResultFor] = useState("")
  const first = exams[0]
  const sorted = [...exams].sort((a, b) => examNo(a).localeCompare(examNo(b)))
  const ready = sorted.filter((e) => phaseOf(e) === 4)
  const allReady = ready.length === sorted.length

  const startEdit = () => {
    setDraft(Object.fromEntries(sorted.map((e) => [e.id, {
      urgency: isUrgent(e),
      material: e.extra?.material || materialFor(e.name),
      metodo: e.extra?.metodo || metodoFor(e.name),
      professionalId: e.professionalId || data.profissionais.find((p) => p.name === e.professional)?.id || "",
      notes: e.notes || "",
    }])))
    setEditing(true)
  }
  const saveEdit = () => {
    for (const e of sorted) {
      const d = draft[e.id]
      if (!d) continue
      const pro = data.profissionais.find((p) => p.id === d.professionalId)
      updateItem("exames", e.id, {
        urgency: d.urgency,
        category: d.urgency ? "Urgente" : "Rotina",
        status: /urgent/i.test(e.status) ? "Solicitado" : e.status,
        professionalId: pro?.id || e.professionalId,
        professional: pro?.name || e.professional,
        notes: d.notes,
        extra: { ...(e.extra || {}), material: d.material, metodo: d.metodo },
      })
    }
    setEditing(false)
    onToast("Alterações salvas.")
  }
  const setPhase = (e: Item, phase: number, extra: Record<string, unknown> = {}) => {
    updateItem("exames", e.id, { status: STATUS_FOR[phase], extra: { ...(e.extra || {}), ...extra } })
    onToast(`${examNo(e)} · ${e.name} → ${PHASES[phase]}`)
  }
  const confirmColeta = () => {
    const e = sorted.find((x) => x.id === coleta?.id)
    if (!e || !coleta) return
    if (!coleta.por.trim()) return onToast("Informe quem colheu a amostra.")
    setPhase(e, 1, { coleta: { em: new Date(coleta.em).toISOString(), por: coleta.por.trim() } })
    setColeta(null)
  }
  const remove = (e: Item) => {
    if (!window.confirm(`Excluir o exame ${examNo(e)} (${e.name})? Esta ação não pode ser desfeita.`)) return
    deleteItem("exames", e.id)
    onToast(`${examNo(e)} excluído.`)
    if (sorted.length === 1) onClose()
  }

  const target = sorted.find((e) => e.id === resultFor)
  if (target) {
    return <ResultDrawer exam={target} animal={animal} onBack={() => setResultFor("")} onClose={onClose} onSaved={(msg) => { setResultFor(""); onToast(msg) }} />
  }

  return (
    <Drawer
      title={first.animal || "Paciente"}
      sub={`${sorted.length} exame(s) · ${ready.length} liberado(s)`}
      onClose={onClose}
      footer={editing ? (
        <>
          <button type="button" className="exd-btn" onClick={() => setEditing(false)}>Cancelar</button>
          <button type="button" className="exd-btn primary" onClick={saveEdit}><Check size={15} /> Salvar alterações</button>
        </>
      ) : (
        <>
          <button type="button" className="exd-btn" onClick={startEdit}><Pencil size={15} /> Editar</button>
          {allReady
            ? <button type="button" className="exd-btn primary" onClick={() => onPrint(sorted)}><Printer size={15} /> Imprimir todos ({sorted.length})</button>
            : <button type="button" className="exd-btn primary" onClick={() => onAdd(first.animalId)}><Plus size={15} /> Adicionar exame</button>}
        </>
      )}
    >
      <div className="exd-patient">
        <span className="exm-ava big">{(first.animal || "?").charAt(0).toUpperCase()}</span>
        <div>
          <strong>{first.animal}</strong>
          <small>{[animal?.species || first.species, animal?.breed || first.breed, animal?.sex].filter(Boolean).join(" · ") || "—"}</small>
          <small>Tutor: <b>{first.owner || animal?.owner || "—"}</b>{animal?.weight ? ` · Peso ${animal.weight}` : ""}</small>
        </div>
      </div>
      {editing && <div className="exd-hint">Modo edição: avance as fases de cada exame, lance o resultado e ajuste os dados do pedido.</div>}

      {sorted.map((e) => {
        const p = phaseOf(e)
        const x = e.extra || {}
        const d = draft[e.id]
        return (
          <div key={e.id} className={`exd-exam ${isUrgent(e) && p < 4 ? "urgent" : ""}`}>
            <div className="exd-exam-hd">
              <code>{examNo(e)}</code>
              <strong>{e.name}</strong>
              {isUrgent(e) && p < 4 && <span className="exm-badge t-red">Urgente</span>}
              <PhaseBadge item={e} />
            </div>
            <Stepper item={e} />
            <dl className="exd-info">
              <div><dt>Solicitado</dt><dd>{fmtDate(itemDate(e))}{e.time ? ` ${e.time}` : ""} · {e.professional || "—"}</dd></div>
              <div><dt>Material</dt><dd>{x.material || materialFor(e.name) || "—"}</dd></div>
              {x.coleta && <div><dt>Coleta</dt><dd>{new Date(x.coleta.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {x.coleta.por}</dd></div>}
              {(x.liberadoEm || x.assinadoEm) && <div><dt>Liberado</dt><dd>{fmtDate(x.liberadoEm || x.assinadoEm)} · {x.liberadoPor || x.assinadoPor || "—"}</dd></div>}
              {e.notes && <div className="wide"><dt>Observações</dt><dd>{e.notes}</dd></div>}
            </dl>

            {editing && d && (
              <div className="exd-edit">
                <label className="exd-check"><input type="checkbox" checked={d.urgency} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...d, urgency: ev.target.checked } })} /> Urgente</label>
                <label><span>Material</span><input value={d.material} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...d, material: ev.target.value } })} /></label>
                <label><span>Método</span><input value={d.metodo} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...d, metodo: ev.target.value } })} /></label>
                <label><span>Veterinário solicitante</span>
                  <select value={d.professionalId} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...d, professionalId: ev.target.value } })}>
                    <option value="">—</option>
                    {data.profissionais.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                </label>
                <label className="wide"><span>Observações</span><textarea rows={2} value={d.notes} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...d, notes: ev.target.value } })} /></label>

                {coleta?.id === e.id && (
                  <div className="exd-coleta wide">
                    <label><span>Data e hora da coleta</span><input type="datetime-local" value={coleta.em} onChange={(ev) => setColeta({ ...coleta, em: ev.target.value })} /></label>
                    <label><span>Coletado por</span><input value={coleta.por} onChange={(ev) => setColeta({ ...coleta, por: ev.target.value })} /></label>
                    <div className="exd-row"><button type="button" className="exd-btn sm" onClick={() => setColeta(null)}>Cancelar</button><button type="button" className="exd-btn sm primary" onClick={confirmColeta}><Check size={14} /> Confirmar coleta</button></div>
                  </div>
                )}

                <div className="exd-row wide">
                  {p === 0 && coleta?.id !== e.id && <button type="button" className="exd-btn sm primary" onClick={() => setColeta({ id: e.id, em: toLocalInput(), por: userName })}><Syringe size={14} /> Amostra colhida</button>}
                  {p === 1 && <button type="button" className="exd-btn sm primary" onClick={() => setPhase(e, 2, { analiseEm: new Date().toISOString() })}>Iniciar análise</button>}
                  {p >= 1 && p <= 3 && <button type="button" className="exd-btn sm primary" onClick={() => setResultFor(e.id)}>{p === 3 ? "Editar resultado" : "Lançar resultado"}</button>}
                  {p === 3 && <button type="button" className="exd-btn sm" onClick={() => setResultFor(e.id)}>Revisar e liberar</button>}
                  {p === 4 && <button type="button" className="exd-btn sm" onClick={() => setPhase(e, 3, { liberadoEm: undefined, liberadoPor: undefined, assinado: false, assinadoEm: undefined })}>Reabrir laudo</button>}
                  {p > 0 && p < 4 && <button type="button" className="exd-btn sm ghost" onClick={() => setPhase(e, p - 1)}>Voltar etapa</button>}
                  <button type="button" className="exd-btn sm danger" onClick={() => remove(e)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            )}

            {!editing && p === 4 && (
              <div className="exd-row">
                <button type="button" className="exd-btn sm primary" onClick={() => onPrint([e])}><Printer size={14} /> Imprimir</button>
              </div>
            )}
          </div>
        )
      })}
    </Drawer>
  )
}

/* =====================================================================
   Lançar resultado
   ===================================================================== */
function ResultDrawer({ exam, animal, onBack, onClose, onSaved }: { exam: Item; animal?: Item; onBack: () => void; onClose: () => void; onSaved: (msg: string) => void }) {
  const { data, updateItem, user } = useVetFlow()
  const species = animal?.species || exam.species
  const saved: ExamRow[] | undefined = Array.isArray(exam.extra?.resultados) ? exam.extra?.resultados : undefined
  const tpl = useMemo<ExamRow[] | undefined>(() => {
    const base = rowsFor(exam.name, species)
    if (!base) return saved?.length ? saved.map((r) => ({ ...r })) : undefined
    return base.map((r) => {
      const old = saved?.find((s) => s.n === r.n)
      return old ? { ...r, min: old.min, max: old.max } : r
    })
  }, [exam.name, species]) // eslint-disable-line react-hooks/exhaustive-deps

  const [vals, setVals] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    saved?.forEach((s) => { out[s.n] = s.isPct ? String(s.pct ?? "") : fmtNum(s.v, s.dec).replace(/\./g, "") })
    return out
  })
  const [refs, setRefs] = useState<Record<string, [string, string]>>(() => Object.fromEntries((tpl || []).map((r) => [r.n, [String(r.min).replace(".", ","), String(r.max).replace(".", ",")]])))
  const [laudo, setLaudo] = useState<string>(exam.extra?.laudo || "")
  const vets = data.profissionais
  const defaultVet = vets.find((v) => v.name === exam.extra?.liberadoPor)?.id || vets.find((v) => user && v.name.includes(user.name.split(" ")[0]))?.id || exam.professionalId || vets[0]?.id || ""
  const [vetId, setVetId] = useState(defaultVet)
  const [error, setError] = useState("")

  const leuco = parseNum(vals[LEUCO])
  const pctSum = (tpl || []).filter((r) => r.isPct && !r.calc).reduce((s, r) => s + (parseNum(vals[r.n]) || 0), 0)
  const neutroPct = (tpl || []).filter((r) => /mielóc|bastonet|segment/i.test(r.n)).reduce((s, r) => s + (parseNum(vals[r.n]) || 0), 0)

  const build = (): ExamRow[] | string => {
    if (!tpl) return []
    const rows: ExamRow[] = []
    const missing: string[] = []
    for (const r of tpl) {
      const [mn, mx] = refs[r.n] || [String(r.min), String(r.max)]
      const min = parseNum(mn), max = parseNum(mx)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return `Referência inválida em ${r.n}.`
      if (r.isPct) {
        const pct = r.calc ? neutroPct : parseNum(vals[r.n] || "0")
        if (!Number.isFinite(pct)) { missing.push(r.n); continue }
        if (!Number.isFinite(leuco)) return "Informe os Leucócitos totais para calcular o leucograma."
        rows.push({ ...r, min, max, pct, v: Math.round((pct * leuco) / 100) })
      } else {
        const v = parseNum(vals[r.n])
        if (!Number.isFinite(v)) { missing.push(r.n); continue }
        rows.push({ ...r, min, max, v })
      }
    }
    return missing.length ? `Preencha com números: ${missing.join(", ")}.` : rows
  }

  const save = (release: boolean) => {
    const rows = build()
    if (typeof rows === "string") return setError(rows)
    if (!tpl && laudo.trim().length < 10) return setError("Escreva o laudo descritivo (mínimo de 10 letras).")
    const vet = vets.find((v) => v.id === vetId)
    if (release && !vet) return setError("Escolha o veterinário responsável pela liberação.")
    const now = new Date().toISOString()
    updateItem("exames", exam.id, {
      status: release ? STATUS_FOR[4] : STATUS_FOR[3],
      extra: {
        ...(exam.extra || {}),
        ...(tpl ? { resultados: rows } : {}),
        laudo: laudo.trim(),
        lancadoEm: exam.extra?.lancadoEm || now,
        lancadoPor: user?.displayName || "",
        ...(release ? { liberadoEm: now, liberadoPor: vet?.name, liberadoCrmv: vet?.registration || "", assinado: true, assinadoEm: now, assinadoPor: vet?.name } : {}),
      },
    })
    onSaved(release ? `${examNo(exam)} liberado. Já pode imprimir.` : `Resultado de ${examNo(exam)} salvo. Falta liberar.`)
  }

  let lastSec = ""
  return (
    <Drawer
      wide
      title={`Resultado · ${exam.name}`}
      sub={`${examNo(exam)} · ${exam.animal}${species ? ` · ${species}` : ""}`}
      onBack={onBack}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="exd-btn" onClick={() => save(false)}>Salvar resultado</button>
          <button type="button" className="exd-btn primary" onClick={() => save(true)}><Check size={15} /> Salvar e liberar</button>
        </>
      }
    >
      {tpl && (
        <div className="exr-table" role="table">
          <div className="exr-row exr-head" role="row"><span>Parâmetro</span><span>Resultado</span><span>Absoluto</span><span>Referência (mín – máx)</span></div>
          {tpl.map((r) => {
            const newSec = r.sec !== lastSec
            lastSec = r.sec || ""
            const v = r.isPct ? (r.calc ? neutroPct : parseNum(vals[r.n] || "0")) : parseNum(vals[r.n])
            const abs = r.isPct && Number.isFinite(leuco) && Number.isFinite(v) ? Math.round((v * leuco) / 100) : r.isPct ? NaN : v
            const [mn, mx] = refs[r.n] || ["", ""]
            const out = Number.isFinite(abs) && (abs < parseNum(mn) || abs > parseNum(mx))
            return (
              <Fragment key={r.n}>
              {newSec && <div className="exr-sec">{r.sec}</div>}
              <div className={`exr-row ${out ? "out" : ""}`} role="row">
                <span>{r.n}</span>
                <span className="exr-in">
                  {r.calc
                    ? <b>{fmtNum(neutroPct, 0)} %</b>
                    : <><input inputMode="decimal" aria-label={r.n} value={vals[r.n] || ""} placeholder={r.isPct ? "0" : ""} onChange={(ev) => setVals({ ...vals, [r.n]: ev.target.value })} /><em>{r.isPct ? "%" : r.u}</em></>}
                </span>
                <span className="exr-abs">{r.isPct ? `${fmtNum(abs, 0)} ${r.u}` : ""}</span>
                <span className="exr-ref">
                  <input aria-label={`${r.n} mínimo`} value={mn} onChange={(ev) => setRefs({ ...refs, [r.n]: [ev.target.value, mx] })} />
                  <i>–</i>
                  <input aria-label={`${r.n} máximo`} value={mx} onChange={(ev) => setRefs({ ...refs, [r.n]: [mn, ev.target.value] })} />
                </span>
              </div>
              </Fragment>
            )
          })}
          {tpl.some((r) => r.isPct) && (
            <div className={`exr-sum ${Math.abs(pctSum - 100) > 0.5 ? "warn" : ""}`}>Soma do diferencial: <b>{fmtNum(pctSum, 0)} %</b>{Math.abs(pctSum - 100) > 0.5 ? " (deveria somar 100 %)" : " ✓"}</div>
          )}
        </div>
      )}
      <label className="exr-f">
        <span>{tpl ? "Observações do laudo" : "Laudo descritivo *"}</span>
        <textarea rows={tpl ? 3 : 8} value={laudo} onChange={(ev) => setLaudo(ev.target.value)} />
      </label>
      <label className="exr-f">
        <span>Veterinário responsável (assina o laudo)</span>
        <select value={vetId} onChange={(ev) => setVetId(ev.target.value)}>
          {vets.map((v) => <option key={v.id} value={v.id}>{v.name}{v.registration ? ` · ${v.registration}` : ""}</option>)}
        </select>
      </label>
      {error && <div className="exr-err" role="alert">{error}</div>}
    </Drawer>
  )
}

/* =====================================================================
   Solicitar exame (um ou mais para o mesmo paciente)
   ===================================================================== */
function RequestDrawer({ animalId: initial, onClose, onSaved }: { animalId?: string; onClose: () => void; onSaved: (patientKey: string, n: number) => void }) {
  const { data, addItem, activeUnitId } = useVetFlow()
  const [animalId, setAnimalId] = useState(initial || "")
  const [q, setQ] = useState("")
  const [chosen, setChosen] = useState<string[]>([])
  const [custom, setCustom] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [proId, setProId] = useState(data.profissionais[0]?.id || "")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  const animal = data.animais.find((a) => a.id === animalId)
  const results = useMemo(() => {
    if (!q.trim()) return []
    const n = normalize(q)
    return data.animais.filter((a) => normalize(`${a.name} ${a.owner || ""} ${a.breed || ""}`).includes(n)).slice(0, 8)
  }, [q, data.animais])
  const catalog = useMemo(() => [...new Set([...CATALOGO, ...data.exames.map((e) => e.name)])].sort((a, b) => a.localeCompare(b, "pt-BR")), [data.exames])
  const toggle = (name: string) => setChosen(chosen.includes(name) ? chosen.filter((c) => c !== name) : [...chosen, name])
  const addCustom = () => { const t = custom.trim(); if (t && !chosen.includes(t)) setChosen([...chosen, t]); setCustom("") }

  const save = () => {
    if (!animal) return setError("Escolha o paciente.")
    if (!chosen.length) return setError("Escolha ao menos um exame.")
    const pro = data.profissionais.find((p) => p.id === proId)
    const base = Math.max(data.exames.length, ...data.exames.map((e) => Number(e.extra?.numero) || 0))
    const stamp = Date.now()
    const today = localISO(new Date())
    chosen.forEach((name, i) => {
      addItem("exames", {
        id: `${activeUnitId}-exames-${stamp}-${i}`,
        name,
        subtitle: `${animal.name} • ${animal.owner || ""}`,
        status: STATUS_FOR[0],
        animalId: animal.id,
        animal: animal.name,
        owner: animal.owner,
        ownerId: animal.ownerId,
        species: animal.species,
        breed: animal.breed,
        professional: pro?.name,
        professionalId: pro?.id,
        urgency: urgent,
        category: urgent ? "Urgente" : "Rotina",
        date: today,
        time: nowHM(),
        notes: notes.trim(),
        extra: { numero: base + 1 + i, material: materialFor(name), metodo: metodoFor(name), solicitadoEm: new Date().toISOString() },
      })
    })
    onSaved(animal.id, chosen.length)
  }

  return (
    <Drawer
      title="Solicitar exame"
      sub="Escolha o paciente e um ou mais exames"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="exd-btn" onClick={onClose}>Cancelar</button>
          <button type="button" className="exd-btn primary" onClick={save}><Check size={15} /> Solicitar {chosen.length > 1 ? `${chosen.length} exames` : "exame"}</button>
        </>
      }
    >
      <div className="exr-f">
        <span>Paciente *</span>
        {animal ? (
          <div className="exd-picked">
            <span className="exm-ava">{animal.name.charAt(0).toUpperCase()}</span>
            <div><strong>{animal.name}</strong><small>{animal.species} · {animal.breed} · Tutor: {animal.owner}</small></div>
            <button type="button" className="exd-btn sm ghost" onClick={() => setAnimalId("")}>Trocar</button>
          </div>
        ) : (
          <div className="exd-search">
            <label><Search size={15} /><input autoFocus value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Nome do animal, tutor ou raça" /></label>
            {results.map((a) => (
              <button key={a.id} type="button" onClick={() => { setAnimalId(a.id); setQ("") }}>
                <strong>{a.name}</strong><small>{a.species} · {a.breed} · {a.owner}</small>
              </button>
            ))}
            {q.trim() && !results.length && <small className="exd-none">Nenhum paciente encontrado.</small>}
          </div>
        )}
      </div>

      <div className="exr-f">
        <span>Exames *</span>
        <div className="exd-chips">
          {catalog.map((name) => (
            <button key={name} type="button" className={chosen.includes(name) ? "on" : ""} onClick={() => toggle(name)} aria-pressed={chosen.includes(name)}>
              {chosen.includes(name) && <Check size={12} />} {name}
            </button>
          ))}
          {chosen.filter((c) => !catalog.includes(c)).map((name) => (
            <button key={name} type="button" className="on" onClick={() => toggle(name)}><Check size={12} /> {name}</button>
          ))}
        </div>
        <div className="exd-custom">
          <input value={custom} onChange={(ev) => setCustom(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addCustom() } }} placeholder="Outro exame (digite e Enter)" />
          <button type="button" className="exd-btn sm" onClick={addCustom}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div className="exd-two">
        <label className="exr-f"><span>Prioridade</span>
          <select value={urgent ? "u" : "r"} onChange={(ev) => setUrgent(ev.target.value === "u")}>
            <option value="r">Rotina</option>
            <option value="u">Urgente</option>
          </select>
        </label>
        <label className="exr-f"><span>Veterinário solicitante</span>
          <select value={proId} onChange={(ev) => setProId(ev.target.value)}>
            {data.profissionais.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <label className="exr-f"><span>Observações / suspeita clínica</span><textarea rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} /></label>
      {error && <div className="exr-err" role="alert">{error}</div>}
    </Drawer>
  )
}
