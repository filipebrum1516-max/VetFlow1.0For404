import { createPortal } from "react-dom"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  CalendarDays,
  Paperclip,
  Plus,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  normalize,
  useVetFlow,
  type Item,
  type ModuleSlug,
  type Unit,
  type UnitData,
  type UserProfile,
} from "../store"
import { colorFor, initials, parseMoney, todayISO, useDescartar } from "./ui"

/* ---------------- tipos do esquema ---------------- */
export type Ctx = {
  data: UnitData
  units: Unit[]
  activeUnit: Unit
  profile: UserProfile
  addItem: (module: ModuleSlug, item: Partial<Item>) => Item
  updateItem: (module: ModuleSlug, id: string, patch: Partial<Item>) => void
  addUnit: (unit: Omit<Unit, "id" | "shortName" | "profile">) => Unit
  updateUnit: (id: string, patch: Partial<Unit>) => void
  renameProfessional: (id: string, oldName: string, newName: string) => void
}

export type Values = Record<string, any>
type Opts = string[] | [string, string][] | ((ctx: Ctx, values: Values) => string[] | [string, string][])

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "money"
  | "date"
  | "time"
  | "select"
  | "textarea"
  | "toggle"
  | "pills"
  | "multi"
  | "animal"
  | "tutor"
  | "professional"
  | "color"
  | "rows"
  | "file"
  | "info"
  | "calc"
  | "perms"

export type Field = {
  k: string
  label: string
  t: FieldType
  span?: 1 | 2 | 3 | 4 | 5 | 6
  req?: boolean
  opts?: Opts
  ph?: string
  def?: any
  hint?: string
  cols?: { k: string; label: string; t?: "text" | "number" | "time" | "date" | "select"; opts?: string[]; w?: string }[]
  calc?: (values: Values, ctx: Ctx) => ReactNode
  show?: (values: Values) => boolean
  small?: string
}

export type Section = { title: string; desc?: string; fields: Field[] }

export type FormDef = {
  slug: ModuleSlug
  title: string
  editTitle?: string
  sub: string
  icon: LucideIcon
  color: string
  submit: string
  footer?: (values: Values, ctx: Ctx) => string
  sections: Section[]
  toItem: (values: Values, ctx: Ctx) => Partial<Item>
  fromItem?: (item: Item) => Values
  validate?: (values: Values, ctx: Ctx) => string | void
  after?: (saved: Item, values: Values, ctx: Ctx, isNew: boolean) => void
  /** salva fora do fluxo padrão (ex.: unidades) */
  custom?: (values: Values, ctx: Ctx, item?: Item) => Item | void
}

/* ---------------- utilidades ---------------- */
export function resolveOpts(opts: Opts | undefined, ctx: Ctx, values: Values) {
  const list = typeof opts === "function" ? opts(ctx, values) : opts || []
  return list.map((entry) =>
    Array.isArray(entry) ? entry : ([entry, entry] as [string, string]),
  )
}

function defaultFor(field: Field) {
  if (field.def === "today") return todayISO()
  if (field.def !== undefined)
    return typeof field.def === "function" ? field.def() : structuredCloneSafe(field.def)
  if (field.t === "toggle") return false
  if (field.t === "multi") return []
  if (field.t === "rows") return []
  if (field.t === "file") return []
  return ""
}

function structuredCloneSafe<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

function isEmpty(value: unknown) {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "boolean") return false
  return value === undefined || value === null || String(value).trim() === ""
}

export function useCtx(): Ctx {
  const store = useVetFlow()
  return {
    data: store.data,
    units: store.units,
    activeUnit: store.activeUnit,
    profile: store.profile,
    addItem: store.addItem,
    updateItem: store.updateItem,
    renameProfessional: store.renameProfessional,
    addUnit: store.addUnit,
    updateUnit: store.updateUnit,
  }
}

/** valores iniciais de um cadastro (novo ou edição) */
export function initialValues(def: FormDef, item?: Item, prefill?: Values) {
  const values: Values = {}
  def.sections.forEach((section) =>
    section.fields.forEach((field) => {
      if (field.t !== "info" && field.t !== "calc") values[field.k] = defaultFor(field)
    }),
  )
  if (item) {
    Object.assign(values, {
      name: item.name,
      status: item.status,
      date: item.date,
      time: item.time,
      animalId: item.animalId,
      tutorId: item.extra?.tutorId || (!item.animalId ? item.ownerId : undefined),
      professionalId: item.professionalId,
      notes: item.notes,
      category: item.category,
    })
    Object.keys(values).forEach((key) => {
      if (values[key] === undefined) values[key] = ""
    })
    if (def.fromItem) Object.assign(values, def.fromItem(item))
    if (item.extra) Object.assign(values, item.extra)
  }
  if (prefill) Object.assign(values, prefill)
  return values
}

/* ---------------- componente principal ---------------- */
export default function FormDrawer({
  def,
  item,
  prefill,
  onClose,
  onSaved,
}: {
  def: FormDef
  item?: Item
  prefill?: Values
  onClose: () => void
  onSaved?: (item: Item, isNew: boolean) => void
}) {
  const ctx = useCtx()
  const [values, setValues] = useState<Values>(() => initialValues(def, item, prefill))
  const [valoresIniciais] = useState(() => JSON.stringify(initialValues(def, item, prefill)))
  const descartar = useDescartar(onClose, JSON.stringify(values) !== valoresIniciais)
  /* Nova consulta: pode começar a partir de um agendamento já feito (tutor e animal vêm prontos) */
  const porAgenda = def.slug === "consultas" && !item
  const [abaOrigem, setAbaOrigem] = useState<"nova" | "agenda">("nova")
  const [buscaAg, setBuscaAg] = useState("")
  const [agendaEscolhida, setAgendaEscolhida] = useState<Item | null>(null)
  const hojeIso = todayISO()
  const agendamentos = useMemo(() => {
    if (!porAgenda) return []
    const q = normalize(buscaAg.trim())
    const jaConsultados = new Set(ctx.data.consultas.map((c) => String(c.extra?.agendaId || "")).filter(Boolean))
    return ctx.data.agendas
      .filter((a) => (a.date || "") >= hojeIso && !/cancel|conclu|falt|em atendimento/i.test(a.status || "") && !jaConsultados.has(a.id))
      .filter((a) => !q || normalize(`${a.animal || ""} ${a.owner || ""} ${a.service || a.name} ${a.professional || ""}`).includes(q))
      .sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`))
      .slice(0, 60)
  }, [porAgenda, buscaAg, ctx.data.agendas, ctx.data.consultas, hojeIso])
  const usarAgendamento = (ag: Item) => {
    const campoServico = def.sections.flatMap((sec) => sec.fields).find((fd) => fd.k === "service")
    const opcoes = typeof campoServico?.opts === "function" ? campoServico.opts(ctx, values) : campoServico?.opts || []
    const nomes = (opcoes as (string | [string, string])[]).map((o) => (Array.isArray(o) ? o[0] : o))
    const servico = ag.service || ag.name
    const prof = ctx.data.profissionais.find((pr) => pr.name === ag.professional)
    const pet = ctx.data.animais.find((an) => an.id === ag.animalId) || ctx.data.animais.find((an) => an.name === ag.animal && an.owner === ag.owner)
    setValues((cur) => ({
      ...cur,
      animalId: pet?.id || cur.animalId,
      responsavel: ag.owner || cur.responsavel,
      service: nomes.includes(servico) ? servico : nomes.find((n) => /consulta cl/i.test(n)) || cur.service,
      professionalId: prof?.id || cur.professionalId,
      date: hojeIso,
      time: (ag.date || "") === hojeIso && ag.time ? ag.time : cur.time,
      origem: "Agendado",
      resumo: cur.resumo || `${servico}${ag.notes ? ` — ${ag.notes}` : ""}`,
      queixa: cur.queixa || ag.notes || "",
      _agendaId: ag.id,
    }))
    setAgendaEscolhida(ag)
    setAbaOrigem("nova")
    window.setTimeout(() => bodyRef.current?.scrollTo({ top: 0 }), 0)
  }
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [step, setStep] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const scrollingTo = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") descartar.tentar()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  })

  const set = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const goTo = (index: number) => {
    const target = sectionRefs.current[index]
    setStep(index)
    if (target && bodyRef.current) {
      scrollingTo.current = index
      bodyRef.current.scrollTo({ top: target.offsetTop - 4, behavior: "smooth" })
      window.setTimeout(() => (scrollingTo.current = null), 600)
    }
  }

  const onScroll = () => {
    if (scrollingTo.current !== null || !bodyRef.current) return
    const top = bodyRef.current.scrollTop
    const atBottom =
      top + bodyRef.current.clientHeight >= bodyRef.current.scrollHeight - 8
    if (atBottom) return setStep(def.sections.length - 1)
    let current = 0
    sectionRefs.current.forEach((section, index) => {
      if (section && section.offsetTop - 60 <= top) current = index
    })
    setStep(current)
  }

  const sectionHasError = (index: number) =>
    def.sections[index].fields.some((field) => errors[field.k])
  const sectionComplete = (index: number) =>
    def.sections[index].fields
      .filter((field) => field.req)
      .every((field) => !isEmpty(values[field.k]))

  const save = () => {
    const nextErrors: Record<string, string> = {}
    def.sections.forEach((section) =>
      section.fields.forEach((field) => {
        if (field.show && !field.show(values)) return
        if (field.req && isEmpty(values[field.k])) nextErrors[field.k] = "Campo obrigatório"
        if (field.t === "rows" && field.req) {
          const rows = (values[field.k] || []) as Values[]
          const firstKey = field.cols?.[0]?.k
          if (!rows.some((row) => firstKey && String(row[firstKey] || "").trim()))
            nextErrors[field.k] = "Adicione ao menos uma linha"
        }
        if (field.t === "email" && values[field.k] && !/^\S+@\S+\.\S+$/.test(values[field.k]))
          nextErrors[field.k] = "E-mail inválido"
      }),
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const firstSection = def.sections.findIndex((section) =>
        section.fields.some((field) => nextErrors[field.k]),
      )
      setFormError("Revise os campos destacados antes de salvar.")
      goTo(Math.max(0, firstSection))
      return
    }
    const custom = def.validate?.(values, ctx)
    if (custom) {
      setFormError(custom)
      return
    }
    setFormError("")
    if (def.custom) {
      const saved = def.custom(values, ctx, item)
      if (saved) onSaved?.(saved, !item)
      onClose()
      return
    }
    const mapped = def.toItem(values, ctx)
    const animal = values.animalId
      ? ctx.data.animais.find((candidate) => candidate.id === values.animalId)
      : undefined
    const tutorSel = !animal && values.tutorId ? ctx.data.tutores.find((candidate) => candidate.id === values.tutorId) : undefined
    const professional = values.professionalId
      ? ctx.data.profissionais.find((candidate) => candidate.id === values.professionalId)
      : undefined
    const extra = { ...(item?.extra || {}), ...values, ...(mapped.extra || {}) }
    const patch: Partial<Item> = {
      date: values.date || item?.date,
      time: values.time || item?.time,
      notes: values.notes || item?.notes,
      ...(animal
        ? {
            animalId: animal.id,
            animal: animal.name,
            owner: animal.owner,
            ownerId: animal.ownerId,
            subtitle: `${animal.name} • ${animal.owner}`,
          }
        : {}),
      ...(tutorSel ? { ownerId: tutorSel.id, owner: tutorSel.name } : {}),
      ...(professional
        ? { professionalId: professional.id, professional: professional.name }
        : {}),
      ...mapped,
      extra,
    }
    if (patch.amountValue !== undefined) patch.amountValue = parseMoney(patch.amountValue)
    if (patch.amountValue)
      patch.amount = patch.amountValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    let saved: Item
    if (item) {
      ctx.updateItem(def.slug, item.id, patch)
      if (def.slug === "profissionais" && patch.name && patch.name !== item.name) ctx.renameProfessional(item.id, item.name, patch.name)
      saved = { ...item, ...patch } as Item
    } else {
      saved = ctx.addItem(def.slug, patch)
    }
    if (porAgenda && values._agendaId) {
      ctx.updateItem(def.slug, saved.id, { extra: { ...(saved.extra || {}), agendaId: values._agendaId } })
      ctx.updateItem("agendas", values._agendaId, { status: "Em atendimento" })
    }
    def.after?.(saved, values, ctx, !item)
    onSaved?.(saved, !item)
    onClose()
  }

  return createPortal(

    <div className="vx-drawer-layer" onMouseDown={descartar.tentar}>
      <aside
        className="vx-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={item ? def.editTitle || `Editar ${item.name}` : def.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="vx-dh">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="vx-dt">
              {item ? def.editTitle || `Editar · ${item.name}` : def.title}
            </h2>
          </div>
          <button className="vx-xb" aria-label="Fechar" onClick={descartar.tentar} type="button">
            <X />
          </button>
        </div>
        {porAgenda && (
          <div className="vx-origem" role="tablist" aria-label="Como iniciar a consulta">
            <button type="button" role="tab" aria-selected={abaOrigem === "nova"} className={abaOrigem === "nova" ? "on" : ""} onClick={() => setAbaOrigem("nova")}><Plus /> Nova consulta</button>
            <button type="button" role="tab" aria-selected={abaOrigem === "agenda"} className={abaOrigem === "agenda" ? "on" : ""} onClick={() => setAbaOrigem("agenda")}><CalendarDays /> Por agendamento <span>{agendamentos.length}</span></button>
          </div>
        )}
        {porAgenda && abaOrigem === "agenda" && (
          <div className="vx-db vx-ag-pick">
            <p className="vx-ag-hint">Escolha um agendamento: paciente, tutor, veterinário e tipo de atendimento já entram preenchidos.</p>
            <div className="vx-ag-search"><Search /><input autoFocus placeholder="Buscar animal, tutor ou serviço" value={buscaAg} onChange={(e) => setBuscaAg(e.target.value)} /></div>
            <div className="vx-ag-list">
              {agendamentos.map((ag) => (
                <button type="button" key={ag.id} className="vx-ag-item" onClick={() => usarAgendamento(ag)}>
                  <span className="vx-ag-when"><b>{ag.time || "--:--"}</b><small>{ag.date === hojeIso ? "Hoje" : (ag.date || "").split("-").reverse().slice(0, 2).join("/")}</small></span>
                  <span className="vx-ag-main"><strong>{ag.animal || ag.name}</strong><small>{ag.owner || "Tutor não informado"}</small></span>
                  <span className="vx-ag-main"><strong>{ag.service || ag.name}</strong><small>{ag.professional || "—"}</small></span>
                  <span className="vx-ag-st">{ag.status}</span>
                </button>
              ))}
              {!agendamentos.length && <p className="vx-ag-vazio">Nenhum agendamento de hoje em diante{buscaAg ? ` para “${buscaAg}”` : ""}.</p>}
            </div>
          </div>
        )}
        <div className="vx-db" ref={bodyRef} onScroll={onScroll} style={porAgenda && abaOrigem === "agenda" ? { display: "none" } : undefined}>
          {agendaEscolhida && porAgenda && (
            <div className="vx-ag-banner">
              <CalendarDays />
              <span>Consulta a partir do agendamento de <b>{agendaEscolhida.date === hojeIso ? "hoje" : (agendaEscolhida.date || "").split("-").reverse().join("/")} às {agendaEscolhida.time}</b> · {agendaEscolhida.animal} ({agendaEscolhida.owner})</span>
              <button type="button" onClick={() => { setAgendaEscolhida(null); setValues((cur) => ({ ...cur, _agendaId: undefined })) }} aria-label="Desvincular agendamento"><X /></button>
            </div>
          )}
          {def.sections.map((section, index) => (
            <section
              className="vx-sec"
              key={section.title}
              ref={(element) => {
                sectionRefs.current[index] = element
              }}
            >
              <div className="vx-sh">
                <span className="n">{index + 1}</span>
                <b>{section.title}</b>
                {section.desc && <span className="d">{section.desc}</span>}
              </div>
              <div className="vx-g">
                {section.fields
                  .filter((field) => !field.show || field.show(values))
                  .map((field) => (
                    <FieldView
                      key={field.k}
                      field={field}
                      value={values[field.k]}
                      values={values}
                      error={errors[field.k]}
                      ctx={ctx}
                      onChange={(value) => set(field.k, value)}
                      setValues={setValues}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
        {formError && (
          <div
            className="vx-note"
            role="alert"
            style={{ margin: "0 26px 10px", display: "flex", gap: 8, alignItems: "center" }}
          >
            <AlertTriangle size={16} color="#b4322a" />
            <span>{formError}</span>
          </div>
        )}
        <div className="vx-df">
          <span className="sp">
            {def.footer ? def.footer(values, ctx) : "Campos com * são obrigatórios"}
          </span>
          <button className="vx-btn vx-btn-g" type="button" onClick={descartar.tentar}>
            Cancelar
          </button>
          <button className="vx-btn vx-btn-p" type="button" onClick={save}>
            {item ? "Salvar alterações" : def.submit}
          </button>
        </div>
      </aside>
      {descartar.node}
    </div>,
    document.body,
  )
}

/* ---------------- campos ---------------- */
function FieldView({
  field,
  value,
  values,
  error,
  ctx,
  onChange,
  setValues,
}: {
  field: Field
  value: any
  values: Values
  error?: string
  ctx: Ctx
  onChange: (value: any) => void
  setValues: (fn: (values: Values) => Values) => void
}) {
  const span = `vx-c${field.span || 3}`
  const label = (
    <span className="vx-fl">
      {field.label} {field.req && <i>*</i>}
    </span>
  )
  const err = error ? <span className="vx-err">{error}</span> : field.hint ? <span className="vx-hint">{field.hint}</span> : null
  const cls = `vx-in ${error ? "bad" : ""}`

  switch (field.t) {
    case "info":
      return <div className={`vx-note ${span}`}>{field.small || field.label}</div>
    case "calc":
      return (
        <div className={`vx-f ${span}`}>
          {label}
          <div className="vx-okn">{field.calc?.(values, ctx)}</div>
        </div>
      )
    case "textarea":
      return (
        <label className={`vx-f ${span}`}>
          {label}
          <textarea className={cls} value={value || ""} placeholder={field.ph} onChange={(event) => onChange(event.target.value)} />
          {err}
        </label>
      )
    case "select": {
      const options = resolveOpts(field.opts, ctx, values)
      return (
        <label className={`vx-f ${span}`}>
          {label}
          <select className={cls} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
            <option value="">{field.ph || "Selecione"}</option>
            {options.map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
            {value && !options.some(([key]) => key === value) && <option value={value}>{value}</option>}
          </select>
          {err}
        </label>
      )
    }
    case "professional": {
      return (
        <label className={`vx-f ${span}`}>
          {label}
          <select className={cls} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
            <option value="">{field.ph || "Selecione o profissional"}</option>
            {ctx.data.profissionais.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name} {professional.registration ? `· ${professional.registration}` : ""}
              </option>
            ))}
          </select>
          {err}
        </label>
      )
    }
    case "toggle":
      return (
        <div className={span}>
          <button type="button" className="vx-tr" role="switch" aria-checked={!!value} onClick={() => onChange(!value)}>
            <span>
              {field.label}
              {field.small && <small>{field.small}</small>}
            </span>
            <span className={`vx-tg ${value ? "on" : ""}`} />
          </button>
        </div>
      )
    case "pills":
    case "multi": {
      const options = resolveOpts(field.opts, ctx, values)
      const multi = field.t === "multi"
      const selected: string[] = multi ? value || [] : []
      return (
        <div className={`vx-f ${span}`}>
          {label}
          <div className="vx-pills" role={multi ? "group" : "radiogroup"} aria-label={field.label}>
            {options.map(([key, text]) => {
              const on = multi ? selected.includes(key) : value === key
              return (
                <button
                  type="button"
                  key={key}
                  className={`vx-pill ${on ? "on" : ""}`}
                  aria-pressed={on}
                  onClick={() =>
                    onChange(
                      multi
                        ? on
                          ? selected.filter((entry) => entry !== key)
                          : [...selected, key]
                        : on && !field.req
                          ? ""
                          : key,
                    )
                  }
                >
                  {text}
                </button>
              )
            })}
          </div>
          {err}
        </div>
      )
    }
    case "color": {
      const options = resolveOpts(field.opts, ctx, values)
      return (
        <div className={`vx-f ${span}`}>
          {label}
          <div className="vx-pills">
            {options.map(([key]) => (
              <button
                type="button"
                key={key}
                aria-label={`Cor ${key}`}
                className={`vx-swatch ${value === key ? "on" : ""}`}
                style={{ background: key }}
                onClick={() => onChange(key)}
              />
            ))}
          </div>
        </div>
      )
    }
    case "file":
      return <FileField field={field} value={value || []} onChange={onChange} span={span} label={label} />
    case "animal":
      return <AnimalField field={field} value={value} onChange={onChange} ctx={ctx} span={span} label={label} err={err} setValues={setValues} />
    case "tutor":
      return (
        <div className={`vx-f ${span || "vx-c6"}`}>
          {label}
          <TutorBusca tutores={ctx.data.tutores} animais={ctx.data.animais} value={value || ""} onChange={onChange} placeholder={field.ph} />
          {err}
        </div>
      )
    case "rows":
      return <RowsField field={field} value={value || []} onChange={onChange} span={span} label={label} err={err} />
    case "perms":
      return <PermsField value={value || {}} onChange={onChange} span={span} label={label} />
    default:
      return (
        <label className={`vx-f ${span}`}>
          {label}
          <input
            className={cls}
            type={
              field.t === "money"
                ? "text"
                : field.t === "tel"
                  ? "tel"
                  : field.t === "email"
                    ? "email"
                    : field.t
            }
            inputMode={field.t === "money" ? "decimal" : undefined}
            value={value ?? ""}
            placeholder={field.ph || (field.t === "money" ? "R$ 0,00" : undefined)}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => {
              if (field.t === "money" && value)
                onChange(
                  parseMoney(value).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
                )
            }}
          />
          {err}
        </label>
      )
  }
}

function FileField({
  field,
  value,
  onChange,
  span,
  label,
}: {
  field: Field
  value: string[]
  onChange: (value: string[]) => void
  span: string
  label: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={`vx-f ${span}`}>
      {label}
      <button
        type="button"
        className="vx-tr"
        style={{ border: "1.5px dashed rgba(26,34,51,.25)", justifyContent: "center", color: "var(--vx-muted)" }}
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const names = Array.from(event.dataTransfer.files).map((file) => file.name)
          onChange([...value, ...names])
        }}
      >
        <Paperclip size={15} /> {field.ph || "Clique ou arraste arquivos"}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const names = Array.from(event.target.files || []).map((file) => file.name)
          onChange([...value, ...names])
          event.target.value = ""
        }}
      />
      {value.length > 0 && (
        <div className="vx-pills">
          {value.map((name, index) => (
            <span className="vx-chip" key={`${name}-${index}`}>
              {name}
              <button
                type="button"
                aria-label={`Remover ${name}`}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit", display: "grid", padding: 0 }}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function AnimalField({
  field,
  value,
  onChange,
  ctx,
  span,
  label,
  err,
}: {
  field: Field
  value: string
  onChange: (value: string) => void
  ctx: Ctx
  span: string
  label: ReactNode
  err: ReactNode
  setValues: (fn: (values: Values) => Values) => void
}) {
  const [query, setQuery] = useState("")
  const selected = ctx.data.animais.find((animal) => animal.id === value)
  const results = useMemo(() => {
    if (query.trim().length < 1) return ctx.data.animais.slice(0, 6)
    const term = normalize(query)
    return ctx.data.animais
      .filter((animal) =>
        normalize(`${animal.name} ${animal.owner || ""} ${animal.breed || ""}`).includes(term),
      )
      .slice(0, 8)
  }, [ctx.data.animais, query])
  const tutor = selected ? ctx.data.tutores.find((candidate) => candidate.id === selected.ownerId) : undefined
  return (
    <div className={`vx-f ${span || "vx-c6"}`}>
      {label}
      {selected ? (
        <div className="vx-pick">
          <span className="vx-av" style={{ width: 44, height: 44, borderRadius: 14, background: colorFor(selected.name) }}>
            {initials(selected.name)}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block" }}>
              {selected.name} · {selected.subtitle}
            </strong>
            <small style={{ display: "block", color: "var(--vx-muted)", fontSize: 12 }}>
              Tutor {selected.owner} {tutor?.phone ? `· ${tutor.phone}` : ""} · {selected.status}
            </small>
          </span>
          <button type="button" className="vx-chip" onClick={() => onChange("")}>
            Trocar
          </button>
        </div>
      ) : (
        <div>
          <label className="vx-search" style={{ borderRadius: 12, height: 42 }}>
            <Search />
            <input
              aria-label={field.label}
              value={query}
              placeholder={field.ph || "Buscar paciente por nome, tutor ou raça"}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="vx-pick-list" role="listbox">
            {results.length ? (
              results.map((animal) => (
                <button type="button" key={animal.id} onClick={() => onChange(animal.id)}>
                  <span className="vx-av" style={{ width: 30, height: 30, fontSize: 10, background: colorFor(animal.id) }}>
                    {initials(animal.name)}
                  </span>
                  <span>
                    <strong>{animal.name}</strong>
                    <small>
                      {animal.subtitle} · tutor {animal.owner}
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="vx-hint" style={{ padding: 12, margin: 0 }}>
                Nenhum paciente encontrado. Cadastre-o em Animais.
              </p>
            )}
          </div>
        </div>
      )}
      {err}
    </div>
  )
}

/**
 * Busca de tutor com sugestões (nome, telefone, CPF ou nome do pet) — mesmo modelo da busca de paciente.
 * Usada nos formulários e nas fichas.
 */
export function TutorBusca({ tutores, animais = [], value, onChange, placeholder }: { tutores: Item[]; animais?: Item[]; value: string; onChange: (id: string) => void; placeholder?: string }) {
  const [query, setQuery] = useState("")
  const selected = tutores.find((t) => t.id === value)
  const petsOf = (id: string) => animais.filter((a) => a.ownerId === id)
  const results = useMemo(() => {
    const term = normalize(query.trim())
    const digits = query.replace(/\D/g, "")
    if (!term) return tutores.slice(0, 6)
    return tutores
      .filter((t) => {
        const pets = animais.filter((a) => a.ownerId === t.id).map((a) => a.name).join(" ")
        return normalize(`${t.name} ${pets}`).includes(term) || (digits.length >= 3 && [t.phone, t.cpf, t.rg, t.extra?.cpf].some((v) => String(v || "").replace(/\D/g, "").includes(digits)))
      })
      .slice(0, 8)
  }, [tutores, animais, query])
  if (selected) {
    const pets = petsOf(selected.id)
    return (
      <div className="vx-pick">
        <span className="vx-av" style={{ width: 44, height: 44, borderRadius: 14, background: colorFor(selected.name) }}>{initials(selected.name)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block" }}>{selected.name}</strong>
          <small style={{ display: "block", color: "var(--vx-muted)", fontSize: 12 }}>
            {selected.phone || "sem telefone"} · {pets.length ? pets.map((a) => a.name).join(", ") : "sem animais"} · {selected.status || "Ativo"}
          </small>
        </span>
        <button type="button" className="vx-chip" onClick={() => onChange("")}>Trocar</button>
      </div>
    )
  }
  return (
    <div>
      <label className="vx-search" style={{ borderRadius: 12, height: 42 }}>
        <Search />
        <input aria-label={placeholder || "Buscar tutor"} value={query} placeholder={placeholder || "Buscar tutor por nome, telefone, CPF ou pet"} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="vx-pick-list" role="listbox">
        {results.length ? (
          results.map((t) => {
            const pets = petsOf(t.id)
            return (
              <button type="button" key={t.id} onClick={() => onChange(t.id)}>
                <span className="vx-av" style={{ width: 30, height: 30, fontSize: 10, background: colorFor(t.id) }}>{initials(t.name)}</span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.phone || "sem telefone"}{pets.length ? ` · ${pets.map((a) => a.name).slice(0, 3).join(", ")}` : ""}</small>
                </span>
              </button>
            )
          })
        ) : (
          <p className="vx-hint" style={{ padding: 12, margin: 0 }}>Nenhum tutor encontrado. Cadastre-o em Tutores.</p>
        )}
      </div>
    </div>
  )
}

function RowsField({
  field,
  value,
  onChange,
  span,
  label,
  err,
}: {
  field: Field
  value: Values[]
  onChange: (value: Values[]) => void
  span: string
  label: ReactNode
  err: ReactNode
}) {
  const cols = field.cols || []
  const template = `${cols.map((col) => col.w || "1fr").join(" ")} 34px`
  const update = (index: number, key: string, cell: string) =>
    onChange(value.map((row, i) => (i === index ? { ...row, [key]: cell } : row)))
  return (
    <div className={`vx-f ${span || "vx-c6"}`} style={{ gridColumn: "span 6" }}>
      {label}
      <div className="vx-rows" style={{ overflowX: "auto" }}>
        <div className="r" style={{ gridTemplateColumns: template }}>
          {cols.map((col) => (
            <span key={col.k}>{col.label}</span>
          ))}
          <span />
        </div>
        {value.map((row, index) => (
          <div className="r" style={{ gridTemplateColumns: template }} key={index}>
            {cols.map((col) =>
              col.t === "select" ? (
                <select
                  key={col.k}
                  className="vx-in"
                  aria-label={col.label}
                  value={row[col.k] || ""}
                  onChange={(event) => update(index, col.k, event.target.value)}
                >
                  <option value="">—</option>
                  {(col.opts || []).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  key={col.k}
                  className="vx-in"
                  aria-label={col.label}
                  type={col.t || "text"}
                  value={row[col.k] || ""}
                  onChange={(event) => update(index, col.k, event.target.value)}
                />
              ),
            )}
            <button
              type="button"
              className="vx-mini-x"
              aria-label="Remover linha"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="vx-add"
        onClick={() => onChange([...value, Object.fromEntries(cols.map((col) => [col.k, ""]))])}
      >
        <Plus size={14} style={{ verticalAlign: -2 }} /> {field.ph || "Adicionar linha"}
      </button>
      {err}
    </div>
  )
}

export const permModules = [
  "Animais e tutores",
  "Consultas e agenda",
  "Prontuários",
  "Internações e cirurgias",
  "Vacinas e exames",
  "Prescrições",
  "Estoque",
  "Financeiro",
  "Relatórios",
  "Sistema e usuários",
] as const
export const permLevels = ["Fechado", "Ver", "Editar", "Total"] as const

export function rolePerms(role: string): Record<string, string> {
  const all = (level: string) => Object.fromEntries(permModules.map((module) => [module, level]))
  if (/admin/i.test(role)) return all("Total")
  if (/veterin/i.test(role))
    return { ...all("Editar"), Estoque: "Ver", Financeiro: "Fechado", Relatórios: "Ver", "Sistema e usuários": "Fechado" }
  if (/enferm|auxiliar/i.test(role))
    return { ...all("Editar"), Prescrições: "Ver", "Consultas e agenda": "Ver", Financeiro: "Fechado", Relatórios: "Fechado", "Sistema e usuários": "Fechado" }
  if (/recep/i.test(role))
    return { ...all("Ver"), "Animais e tutores": "Editar", "Consultas e agenda": "Editar", Prontuários: "Fechado", Financeiro: "Ver", "Sistema e usuários": "Fechado" }
  if (/vendedor/i.test(role))
    return { ...all("Fechado"), "Animais e tutores": "Editar", Estoque: "Ver", "Consultas e agenda": "Ver", Relatórios: "Ver" }
  if (/caixa/i.test(role))
    return { ...all("Fechado"), "Animais e tutores": "Editar", Estoque: "Ver", Financeiro: "Editar", Relatórios: "Ver" }
  if (/estoque/i.test(role))
    return { ...all("Fechado"), Estoque: "Total", Relatórios: "Ver" }
  if (/entregador/i.test(role))
    return { ...all("Fechado"), "Animais e tutores": "Ver" }
  if (/financ/i.test(role))
    return { ...all("Fechado"), Financeiro: "Total", Relatórios: "Editar", Estoque: "Ver", "Animais e tutores": "Ver" }
  return all("Ver")
}

function PermsField({
  value,
  onChange,
  span,
  label,
}: {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  span: string
  label: ReactNode
}) {
  return (
    <div className={`vx-f ${span}`} style={{ gridColumn: "span 6" }}>
      {label}
      <div className="vx-rows">
        <div className="r" style={{ gridTemplateColumns: "1.4fr repeat(4, 1fr)" }}>
          <span>Módulo</span>
          {permLevels.map((level) => (
            <span key={level}>{level}</span>
          ))}
        </div>
        {permModules.map((module) => (
          <div className="r" key={module} style={{ gridTemplateColumns: "1.4fr repeat(4, 1fr)" }}>
            <b>{module}</b>
            {permLevels.map((level) => {
              const on = (value[module] || "Ver") === level
              return (
                <button
                  type="button"
                  key={level}
                  aria-label={`${module}: ${level}`}
                  aria-pressed={on}
                  className={`vx-pill ${on ? "on" : ""}`}
                  style={{ minHeight: 30, justifyContent: "center", padding: 0 }}
                  onClick={() => onChange({ ...value, [module]: level })}
                >
                  {on ? "●" : "○"}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
