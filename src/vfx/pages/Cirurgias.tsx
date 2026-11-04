import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions from "../RowActions"
import { addDays, fmtDate, fmtLong, hash, itemDate, matches, Page, Pager, SearchBox, StatusPill, todayISO, usePaged } from "../ui"

/* Cirurgias: o dia em ordem de horário, com etapas claras e checklist de cirurgia segura em português. */
const ETAPAS = ["Pré-operatório", "Anestesia", "Cirurgia", "Recuperação"]
const CHECK = [
  ["signin", "Antes da anestesia", "Identificação, jejum, termo assinado"],
  ["timeout", "Antes de iniciar", "Equipe confirma paciente, procedimento e lado"],
  ["signout", "Antes de sair da sala", "Contagem de materiais e orientações"],
] as const
const COLS = "110px 70px minmax(0,1.3fr) minmax(0,1.3fr) 90px minmax(0,1fr) 140px 128px"
const timeOf = (item: Item) => item.time || `${String(8 + (hash(item.id) % 9)).padStart(2, "0")}:00`
const roomOf = (item: Item) => item.extra?.sala || (hash(item.id) % 2 ? "Sala 2" : "Sala 1")
const etapaOf = (item: Item) =>
  Number(item.extra?.fase ?? (/conclu/i.test(item.status) ? 3 : /andamento/i.test(item.status) ? 2 : /pré/i.test(item.status) ? 0 : -1))

export default function Cirurgias() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("cirurgias")
  const [query, setQuery] = useState("")
  const [day, setDay] = useState(() => todayISO())
  const [, setNow] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setNow((value) => value + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const doDia = data.cirurgias
    .filter((item) => itemDate(item) === day && !/cancel/i.test(item.status))
    .sort((a, b) => timeOf(a).localeCompare(timeOf(b)))
  const contar = (re: RegExp) => doDia.filter((item) => re.test(item.status)).length
  const patch = (item: Item, extra: Record<string, unknown>, status?: string) =>
    updateItem("cirurgias", item.id, { ...(status ? { status } : {}), extra: { ...(item.extra || {}), ...extra } })
  const avancar = (item: Item) => {
    const atual = etapaOf(item)
    const prox = Math.min(3, atual + 1)
    const inicio = item.extra?.inicio || (prox >= 1 ? new Date().toISOString() : undefined)
    if (prox === 3) {
      patch(item, { fase: 3, inicio, fim: new Date().toISOString() }, "Concluída")
      forms.toast(`${item.name} de ${item.animal} concluída. Paciente em recuperação.`)
    } else {
      patch(item, { fase: prox, inicio }, prox === 0 ? "Pré-operatório" : "Em andamento")
      forms.toast(`${item.animal}: etapa “${ETAPAS[prox]}”.`)
    }
  }
  const tempo = (item: Item) => {
    if (!item.extra?.inicio) return ""
    const fim = item.extra.fim ? new Date(item.extra.fim).getTime() : Date.now()
    const min = Math.max(0, Math.round((fim - new Date(item.extra.inicio).getTime()) / 60000))
    return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`
  }

  const todas = useMemo(
    () => data.cirurgias.filter((item) => matches(item, query)).sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [data.cirurgias, query],
  )
  const paged = usePaged(todas, 12, [query])

  return (
    <Page
      bg="#f4f6f9"
      crumb="Cirurgias"
      title="Cirurgias"
      sub="Cirurgias do dia em ordem de horário. Avance as etapas e marque o checklist de cirurgia segura."
      actions={
        <button className="vx-btn vx-btn-p" onClick={() => forms.open("cirurgias", undefined, { date: day })}>
          <Plus /> Agendar cirurgia
        </button>
      }
    >
      <div className="vx-row cx-daybar">
        <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><ChevronLeft /></button>
        <strong>{fmtLong(day)}</strong>
        <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><ChevronRight /></button>
        {day !== todayISO() && <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setDay(todayISO())}>Voltar para hoje</button>}
      </div>

      <div className="vx-kpis3">
        <div><small>Agendadas no dia</small><strong>{contar(/agend|pré/i)}</strong><span>aguardando início</span></div>
        <div><small>Em andamento</small><strong>{contar(/andamento/i)}</strong><span>no centro cirúrgico agora</span></div>
        <div><small>Concluídas</small><strong>{contar(/conclu/i)}</strong><span>de {doDia.length} no dia</span></div>
      </div>

      <h2 className="cx-h2">Cirurgias do dia</h2>
      {!doDia.length && (
        <div className="vx-empty cx-empty">
          Nenhuma cirurgia neste dia.
          <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => forms.open("cirurgias", undefined, { date: day })}><Plus /> Agendar cirurgia</button>
        </div>
      )}
      <div className="cx-list">
        {doDia.map((item) => {
          const etapa = etapaOf(item)
          const checklist = item.extra?.checklist || {}
          const concluida = /conclu/i.test(item.status)
          return (
            <article key={item.id} className={`cx-card ${/andamento/i.test(item.status) ? "live" : ""}`}>
              <div className="cx-head">
                <div className="cx-time">
                  <strong>{timeOf(item)}</strong>
                  <span>{roomOf(item)}</span>
                </div>
                <button className="cx-who" onClick={() => navigate(`/cirurgias/${item.id}`)}>
                  <strong>{item.animal || "Paciente"}</strong>
                  <span>{item.name} · {item.owner || "tutor não informado"}</span>
                  <span>Cirurgião: {item.professional || "—"}{item.extra?.anestesista ? ` · Anestesista: ${item.extra.anestesista}` : ""}</span>
                </button>
                <div className="cx-state">
                  <StatusPill status={item.status} />
                  {tempo(item) && <span className="cx-tempo">{concluida ? "Duração" : "Em sala há"} {tempo(item)}</span>}
                </div>
                <RowActions
                  name={`${item.name} de ${item.animal}`}
                  onView={() => navigate(`/cirurgias/${item.id}`)}
                  onEdit={() => forms.open("cirurgias", item)}
                  onDelete={() => navigate(`/cirurgias/${item.id}?excluir=1`)}
                />
              </div>

              <ol className="cx-steps" aria-label="Etapas">
                {ETAPAS.map((label, index) => (
                  <li key={label} className={index < etapa || (concluida && index <= etapa) ? "done" : index === etapa ? "on" : ""}>
                    <i>{index < etapa || (concluida && index <= etapa) ? <Check size={14} /> : index + 1}</i>
                    {label}
                  </li>
                ))}
              </ol>

              <div className="cx-foot">
                <div className="cx-check">
                  <span className="cx-lbl">Cirurgia segura</span>
                  {CHECK.map(([key, label, hint]) => (
                    <label key={key} title={hint}>
                      <input type="checkbox" checked={!!checklist[key]} onChange={() => patch(item, { checklist: { ...checklist, [key]: !checklist[key] } })} />
                      {label}
                    </label>
                  ))}
                </div>
                {!concluida && (
                  <button className="vx-btn vx-btn-p" onClick={() => avancar(item)}>
                    {etapa < 0 ? "Iniciar pré-operatório" : etapa === 2 ? "Finalizar cirurgia" : `Avançar para ${ETAPAS[etapa + 1]}`}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="vx-row cx-allhead">
        <h2 className="cx-h2">Todas as cirurgias</h2>
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar paciente, tutor ou cirurgia" />
      </div>
      <div className="vx-table">
        <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS }}>
          <span>Data</span><span>Hora</span><span>Paciente / tutor</span><span>Cirurgia</span><span>Sala</span><span>Cirurgião</span><span>Situação</span><span className="r">Ações</span>
        </div>
        {paged.visible.map((item) => (
          <div key={item.id} className="vx-tr" style={{ gridTemplateColumns: COLS, cursor: "pointer" }} onClick={() => navigate(`/cirurgias/${item.id}`)}>
            <span className="vx-mono">{fmtDate(itemDate(item))}</span>
            <span className="vx-mono">{timeOf(item)}</span>
            <span><strong>{item.animal || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
            <span>{item.name}</span>
            <span>{roomOf(item)}</span>
            <span>{item.professional || "—"}</span>
            <span><StatusPill status={item.status} /></span>
            <span className="r">
              <RowActions
                name={`${item.name} de ${item.animal}`}
                onView={() => navigate(`/cirurgias/${item.id}`)}
                onEdit={() => forms.open("cirurgias", item)}
                onDelete={() => navigate(`/cirurgias/${item.id}?excluir=1`)}
              />
            </span>
          </div>
        ))}
        {!todas.length && <div className="vx-empty">Nenhuma cirurgia encontrada.</div>}
      </div>
      {paged.pages > 1 && (
        <div className="vx-row" style={{ justifyContent: "center", marginTop: 12 }}>
          <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
        </div>
      )}
      {forms.node}
    </Page>
  )
}
