import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  PawPrint,
  Printer,
  Stethoscope,
  Syringe,
  TestTube2,
  Trash2,
  Users,
} from "lucide-react"
import { modules, useVetFlow, type Item, type ModuleSlug } from "../store"
import FormDrawer, { permModules, type Field } from "./FormDrawer"
import { formFor, statusOptions } from "./forms"
import { brl, colorFor, Confirm, fmtDate, initials, itemDate, StatusPill, useToast } from "./ui"

const animalTabs: [string, ModuleSlug | "historico"][] = [
  ["Histórico", "historico"],
  ["Consultas", "consultas"],
  ["Vacinas", "vacinas"],
  ["Prescrições", "prescricoes"],
  ["Exames", "exames"],
  ["Procedimentos", "procedimentos"],
  ["Cirurgias", "cirurgias"],
  ["Internações", "internacoes"],
  ["Documentos", "documentos"],
]
const proTabs: [string, ModuleSlug][] = [
  ["Agenda", "agendas"],
  ["Consultas", "consultas"],
  ["Cirurgias", "cirurgias"],
  ["Prescrições", "prescricoes"],
  ["Exames", "exames"],
  ["Internações", "internacoes"],
  ["Teleatendimentos", "teleatendimentos"],
]
const tutorTabs: [string, ModuleSlug][] = [
  ["Animais", "animais"],
  ["Consultas", "consultas"],
  ["Financeiro", "financeiro"],
  ["Comunicação", "comunicacao"],
  ["Documentos", "documentos"],
]
const historyModules: ModuleSlug[] = ["consultas", "vacinas", "prescricoes", "exames", "procedimentos", "cirurgias", "internacoes", "documentos", "teleatendimentos", "agendas"]

function moduleName(slug: string) {
  return modules.find(([key]) => key === slug)?.[1] || slug
}

function display(value: unknown, field: Field | undefined, lookup: (kind: "animal" | "pro", id: string) => string): ReactNode {
  if (value === undefined || value === null || value === "") return "—"
  if (field?.t === "toggle" || typeof value === "boolean") return value ? "Sim" : "Não"
  if (field?.t === "animal") return lookup("animal", String(value))
  if (field?.t === "professional") return lookup("pro", String(value))
  if (field?.t === "date") return fmtDate(String(value))
  if (field?.t === "perms" && typeof value === "object")
    return (
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {permModules.map((module) => (
          <span className="vx-chip" key={module}>
            {module}: {(value as Record<string, string>)[module] || "Ver"}
          </span>
        ))}
      </span>
    )
  if (Array.isArray(value)) {
    if (!value.length) return "—"
    if (typeof value[0] === "object") {
      const cols = field?.cols || Object.keys(value[0]).map((k) => ({ k, label: k }))
      return (
        <span className="vx-rows" style={{ display: "flex", marginTop: 4 }}>
          <span className="r" style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
            {cols.map((col) => (
              <span key={col.k}>{col.label}</span>
            ))}
          </span>
          {value.map((row, index) => (
            <span className="r" key={index} style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
              {cols.map((col) => (
                <span key={col.k}>{String((row as Record<string, unknown>)[col.k] ?? "—") || "—"}</span>
              ))}
            </span>
          ))}
        </span>
      )
    }
    return value.join(", ")
  }
  return String(value)
}

export default function Detail({
  renderLegacyForm,
}: {
  renderLegacyForm?: (module: ModuleSlug, item: Item, close: () => void) => ReactNode
}) {
  const { module = "", id = "" } = useParams()
  const slug = module as ModuleSlug
  const store = useVetFlow()
  const { data, deleteItem, updateItem } = store
  const navigate = useNavigate()
  const [tab, setTab] = useState("Resumo")
  const [edit, setEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, showToast] = useToast()
  // Registros financeiros, vendas e prontuários nunca são apagados: são cancelados ou estornados com motivo (L-05, L-08, M-13).
  const keepHistory = ["financeiro", "vendas", "caixa", "prontuarios", "prescricoes", "documentos"].includes(slug)
  const cancelWord = slug === "financeiro" || slug === "vendas" || slug === "caixa" ? "Estornar" : "Cancelar"
  const list = data[slug] || []
  const index = list.findIndex((record) => record.id === id)
  const item = list[index]
  useEffect(() => {
    setTab("Resumo")
  }, [id])

  const animal = useMemo(
    () =>
      item
        ? slug === "animais"
          ? item
          : data.animais.find((candidate) => candidate.id === item.animalId) ||
            data.animais.find((candidate) => candidate.name === item.animal)
        : undefined,
    [data.animais, item, slug],
  )
  const tutor = useMemo(
    () =>
      item
        ? slug === "tutores"
          ? item
          : data.tutores.find((candidate) => candidate.id === (animal?.ownerId || item.ownerId)) ||
            data.tutores.find((candidate) => candidate.name === item.owner)
        : undefined,
    [animal, data.tutores, item, slug],
  )
  const professional = item ? data.profissionais.find((candidate) => candidate.id === item.professionalId) : undefined

  if (id === "novo") return <Navigate to={`/${slug}?novo=1`} replace />
  if (!item)
    return (
      <div className="vx vx-page" style={{ ["--vx-bg" as string]: "#f6efe7" }}>
        <div className="vx-glass vx-empty" style={{ padding: 40 }}>
          <strong>Registro não encontrado</strong>
          <span>Ele pode ter sido excluído ou pertencer a outra unidade.</span>
          <button className="vx-btn vx-btn-p" onClick={() => navigate(`/${slug}`)}>
            Voltar para {moduleName(slug)}
          </button>
        </div>
      </div>
    )

  const def = formFor(slug)
  const relatedTabs: [string, string][] =
    slug === "profissionais"
      ? proTabs
      : slug === "tutores"
        ? tutorTabs
        : animal
          ? animalTabs
          : []
  const relatedItems = (key: string): { slug: ModuleSlug; item: Item }[] => {
    if (key === "historico")
      return historyModules
        .flatMap((moduleSlug) => (data[moduleSlug] || []).filter((record) => record.animalId === animal?.id && record.id !== item.id).map((record) => ({ slug: moduleSlug, item: record })))
        .sort((a, b) => itemDate(b.item).localeCompare(itemDate(a.item)))
    const target = key as ModuleSlug
    const records = data[target] || []
    let filtered: Item[]
    if (slug === "profissionais") filtered = records.filter((record) => record.professionalId === item.id || record.professional === item.name)
    else if (slug === "tutores")
      filtered = target === "animais" ? records.filter((record) => record.ownerId === item.id) : records.filter((record) => record.ownerId === item.id || record.owner === item.name)
    else filtered = records.filter((record) => record.animalId === animal?.id && record.id !== item.id)
    return filtered
      .sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
      .map((record) => ({ slug: target, item: record }))
  }

  const lookup = (kind: "animal" | "pro", value: string) =>
    kind === "animal"
      ? data.animais.find((candidate) => candidate.id === value)?.name || value
      : data.profissionais.find((candidate) => candidate.id === value)?.name || value

  const summary: [string, ReactNode][] = [
    ["Nome / título", item.name],
    ["Situação", <StatusPill key="s" status={item.status} />],
    ["Data", fmtDate(item.date || item.createdAt)],
    ...(item.time ? ([["Horário", item.time]] as [string, ReactNode][]) : []),
    ...(animal && slug !== "animais" ? ([["Paciente", `${animal.name} · ${animal.subtitle}`]] as [string, ReactNode][]) : []),
    ...(tutor && slug !== "tutores" ? ([["Tutor", tutor.name]] as [string, ReactNode][]) : []),
    ...(item.professional ? ([["Profissional", item.professional]] as [string, ReactNode][]) : []),
    ...(item.category ? ([["Categoria", item.category]] as [string, ReactNode][]) : []),
    ...(item.amountValue ? ([["Valor", brl(item.amountValue)]] as [string, ReactNode][]) : []),
    ...(item.phone ? ([["Telefone", item.phone]] as [string, ReactNode][]) : []),
    ...(item.email ? ([["E-mail", item.email]] as [string, ReactNode][]) : []),
    ...(item.registration ? ([["Registro", item.registration]] as [string, ReactNode][]) : []),
    ...(item.quantity !== undefined ? ([["Quantidade", `${item.quantity} (mínimo ${item.minimum ?? 0})`]] as [string, ReactNode][]) : []),
    ...(item.dueDate ? ([["Vencimento / próxima data", fmtDate(item.dueDate)]] as [string, ReactNode][]) : []),
    ...(item.species ? ([["Espécie / raça", `${item.species} · ${item.breed || "—"}`]] as [string, ReactNode][]) : []),
    ...(item.address ? ([["Endereço", item.address]] as [string, ReactNode][]) : []),
  ]

  const fullSections = def
    ? def.sections
        .map((section) => ({
          title: section.title,
          rows: section.fields
            .filter((field) => !["info", "calc"].includes(field.t) && item.extra && item.extra[field.k] !== undefined && item.extra[field.k] !== "")
            .map((field) => [field.label || field.k, display(item.extra?.[field.k], field, lookup), field] as [string, ReactNode, Field]),
        }))
        .filter((section) => section.rows.length)
    : []

  const tabs: [string, number | null][] = [
    ["Resumo", null],
    ...(fullSections.length ? ([["Cadastro completo", null]] as [string, null][]) : []),
    // M-16: não mostra a aba do próprio módulo (ex.: "Consultas" dentro de uma consulta) nem abas vazias fora da ficha do animal/tutor.
    ...relatedTabs
      .filter(([, key]) => key !== slug)
      .map(([label, key]) => [label, relatedItems(key).length] as [string, number])
      .filter(([, count]) => count > 0 || ["animais", "tutores", "profissionais"].includes(slug)),
  ]

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(`/${slug}`)
  }
  const prev = index > 0 ? list[index - 1] : undefined
  const next = index < list.length - 1 ? list[index + 1] : undefined
  const statuses = statusOptions[slug] || [...new Set(list.map((record) => record.status))].slice(0, 8)
  const quick = (path: string) => navigate(path)
  const animalParam = animal ? `&animal=${encodeURIComponent(animal.id)}` : ""

  const activeKey = relatedTabs.find(([label]) => label === tab)?.[1]
  return (
    <div className="vx vx-page" style={{ ["--vx-bg" as string]: "#f4efe8" }}>
      <div className="vx-blob" style={{ background: colorFor(item.id), left: -120, top: 80, width: 460, height: 420, opacity: 0.35 }} />
      <div className="vx-blob" style={{ background: "#9fe3c6", right: -80, top: 360, width: 380, height: 380, opacity: 0.4 }} />
      <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="vx-btn vx-btn-g vx-btn-sm" onClick={goBack}>
          <ArrowLeft /> Voltar
        </button>
        <div className="vx-row" style={{ gap: 8 }}>
          <span className="vx-crumb">
            <b>{moduleName(slug)}</b> · {index + 1} de {list.length}
          </span>
          <button className="vx-icon-btn" aria-label="Registro anterior" disabled={!prev} onClick={() => prev && navigate(`/${slug}/${prev.id}`, { replace: true })}>
            <ChevronLeft />
          </button>
          <button className="vx-icon-btn" aria-label="Próximo registro" disabled={!next} onClick={() => next && navigate(`/${slug}/${next.id}`, { replace: true })}>
            <ChevronRight />
          </button>
        </div>
      </div>

      <section className="vx-glass vx-detail-hero">
        <span className="vx-av" style={{ background: colorFor(item.id) }}>
          {initials(item.name)}
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="vx-lbl">{moduleName(slug)} · ficha completa</div>
          <h1>{item.name}</h1>
          <div className="vx-sub" style={{ marginTop: 0 }}>{item.subtitle}</div>
          <div className="vx-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <StatusPill status={item.status} />
            <label className="vx-chip" style={{ paddingRight: 4 }}>
              Mudar situação
              <select
                aria-label="Mudar situação"
                value={item.status}
                onChange={(event) => {
                  updateItem(slug, item.id, { status: event.target.value })
                  showToast(`Situação alterada para ${event.target.value}.`)
                }}
                style={{ border: 0, background: "transparent", font: "inherit", color: "inherit", fontWeight: 800 }}
              >
                {[item.status, ...statuses.filter((status) => status !== item.status)].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="vx-actions">
          <button className="vx-btn vx-btn-g" onClick={() => window.print()}>
            <Printer /> Imprimir
          </button>
          <button className="vx-btn vx-btn-g" onClick={() => setEdit(true)}>
            <Edit3 /> Editar
          </button>
          {slug === "financeiro" && !/receb|pago|estorn|cancel/i.test(item.status) && (
            <button className="vx-btn vx-btn-p" onClick={() => { const paid = item.category === "Receita" ? "Recebido" : "Pago"; updateItem(slug, item.id, { status: paid, extra: { ...(item.extra || {}), pagoEm: new Date().toISOString() } }); showToast(`Lançamento marcado como ${paid.toLowerCase()}.`) }}>
              Marcar como {item.category === "Receita" ? "recebido" : "pago"}
            </button>
          )}
          {!(keepHistory && /estorn|cancel/i.test(item.status)) && (
            <button className="vx-btn vx-btn-d" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {keepHistory ? cancelWord : "Excluir"}
            </button>
          )}
        </div>
      </section>

      <div className="vx-tabs" role="tablist">
        {tabs.map(([label, count]) => (
          <button key={label} role="tab" aria-selected={tab === label} className={tab === label ? "on" : ""} onClick={() => setTab(label)}>
            {label} {count !== null && <em>{count}</em>}
          </button>
        ))}
      </div>

      <div className="vx-detail-grid">
        <section className="vx-glass" style={{ padding: 20 }}>
          {tab === "Resumo" && (
            <div className="vx-info">
              {summary.map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
              {[
                ["Observações", item.notes],
                ["Histórico clínico", item.clinicalHistory],
                ["Diagnóstico", item.diagnosis],
                ["Conduta", item.treatment],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div className="full" key={label}>
                    <small>{label}</small>
                    <strong style={{ fontWeight: 500 }}>{value}</strong>
                  </div>
                ))}
            </div>
          )}
          {tab === "Cadastro completo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {fullSections.map((section) => (
                <div key={section.title}>
                  <div className="vx-lbl" style={{ marginBottom: 8 }}>
                    {section.title}
                  </div>
                  <div className="vx-info">
                    {section.rows.map(([label, value, field]) => (
                      <div key={field.k} className={field.t === "rows" || field.t === "textarea" || field.t === "perms" ? "full" : ""}>
                        <small>{label}</small>
                        <strong style={{ fontWeight: field.t === "textarea" ? 500 : 700 }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeKey && (
            <div className="vx-list">
              {relatedItems(activeKey).length === 0 ? (
                <div className="vx-empty">
                  <FileText />
                  <strong>Nada por aqui ainda</strong>
                  <span>Nenhum registro de {tab.toLowerCase()} vinculado.</span>
                </div>
              ) : (
                relatedItems(activeKey)
                  .slice(0, 60)
                  .map(({ slug: target, item: record }) => (
                    <button key={`${target}-${record.id}`} className="vx-list-item" onClick={() => navigate(`/${target}/${record.id}`)}>
                      <span className="vx-av" style={{ width: 34, height: 34, fontSize: 11, background: colorFor(record.name) }}>
                        {initials(record.name)}
                      </span>
                      <span className="t">
                        <strong>{record.name}</strong>
                        <small>
                          {moduleName(target)} · {fmtDate(itemDate(record))} {record.professional ? `· ${record.professional}` : ""}
                        </small>
                      </span>
                      <StatusPill status={record.status} />
                      <ChevronRight size={16} />
                    </button>
                  ))
              )}
            </div>
          )}
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(animal || tutor || professional) && (
            <section className="vx-glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="vx-lbl">Vínculos</div>
              {animal && slug !== "animais" && (
                <button className="vx-list-item" onClick={() => navigate(`/animais?animal=${encodeURIComponent(animal.name)}`)}>
                  <PawPrint size={18} />
                  <span className="t">
                    <strong>{animal.name}</strong>
                    <small>{animal.subtitle}</small>
                  </span>
                </button>
              )}
              {tutor && slug !== "tutores" && (
                <button className="vx-list-item" onClick={() => navigate(`/tutores/${tutor.id}`)}>
                  <Users size={18} />
                  <span className="t">
                    <strong>{tutor.name}</strong>
                    <small>{tutor.phone || "telefone não informado"}</small>
                  </span>
                </button>
              )}
              {professional && (
                <button className="vx-list-item" onClick={() => navigate(`/profissionais/${professional.id}`)}>
                  <Stethoscope size={18} />
                  <span className="t">
                    <strong>{professional.name}</strong>
                    <small>{professional.subtitle}</small>
                  </span>
                </button>
              )}
            </section>
          )}
          {/* D-08: ações clínicas só em registros ligados a paciente ou profissional */}
          {(slug === "profissionais" || !!animal || slug === "tutores") && (
          <section className="vx-glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="vx-lbl">Ações rápidas</div>
            {slug === "profissionais" ? (
              <>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/consultas?novo=1&pro=${item.id}`)}>
                  <Stethoscope /> Consulta com {item.name.split(" ").slice(0, 2).join(" ")}
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/cirurgias?novo=1&pro=${item.id}`)}>
                  <BedDouble /> Agendar cirurgia
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/usuarios?novo=1&pro=${item.id}&name=${encodeURIComponent(item.name)}`)}>
                  <Users /> Criar acesso ao sistema
                </button>
              </>
            ) : (
              <>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/consultas?novo=1${animalParam}`)}>
                  <Stethoscope /> Nova consulta
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/vacinas?novo=1${animalParam}`)}>
                  <Syringe /> Aplicar vacina
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/exames?novo=1${animalParam}`)}>
                  <TestTube2 /> Solicitar exame
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/prescricoes?novo=1${animalParam}`)}>
                  <FileText /> Nova receita
                </button>
                <button className="vx-btn vx-btn-g" onClick={() => quick(`/agendas`)}>
                  <CalendarDays /> Agendar retorno
                </button>
              </>
            )}
          </section>
          )}
        </aside>
      </div>

      {edit &&
        (def ? (
          <FormDrawer def={def} item={item} onClose={() => setEdit(false)} onSaved={() => showToast("Alterações salvas.")} />
        ) : (
          renderLegacyForm?.(slug, item, () => setEdit(false))
        ))}
      {confirmDelete && (
        keepHistory ? (
          <Confirm
            danger
            title={`${cancelWord} registro?`}
            text={`${item.name} continua no histórico, marcado como ${cancelWord === "Estornar" ? "estornado" : "cancelado"}, com o motivo e quem fez. Nada é apagado.`}
            confirm={cancelWord}
            reason="Motivo"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={(why) => {
              updateItem(slug, item.id, { status: cancelWord === "Estornar" ? "Estornado" : "Cancelado", extra: { ...(item.extra || {}), motivoCancelamento: why, canceladoPor: store.user?.displayName || "", canceladoEm: new Date().toISOString() } })
              setConfirmDelete(false)
              showToast(`Registro ${cancelWord === "Estornar" ? "estornado" : "cancelado"}.`)
            }}
          />
        ) : (
          <Confirm
            danger
            title="Excluir registro?"
            text={`Esta ação remove ${item.name} da unidade ativa e não poderá ser desfeita.`}
            confirm="Excluir definitivamente"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              deleteItem(slug, item.id)
              navigate(`/${slug}`, { replace: true })
            }}
          />
        )
      )}
      {toast}
    </div>
  )
}
