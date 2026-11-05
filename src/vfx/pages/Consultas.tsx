import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Check, ChevronLeft, ChevronRight, Clock3, Plus, Stethoscope, UserRound, Volume2 } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions from "../RowActions"
import { addDays, Confirm, fmtDate, fmtLong, itemDate, matches, Modal, Page, Pager, SearchBox, StatusPill, todayISO, usePaged } from "../ui"

/* Consultas: o dia em ordem de horário. Cada linha mostra a etapa e um único botão para a próxima. */
const ETAPAS = [
  { key: "Chegou", label: "Chegou", statuses: ["Chegou", "Agendado", "Confirmado"], next: "Triagem" },
  { key: "Triagem", label: "Triagem", statuses: ["Triagem"], next: "Chamar" },
  { key: "Em atendimento", label: "Consultório", statuses: ["Em atendimento", "Em andamento"], next: "Finalizar" },
  { key: "Concluído", label: "Finalizado", statuses: ["Concluído"], next: "" },
]
const etapaIdx = (item: Item) => ETAPAS.findIndex((e) => e.statuses.includes(item.status))
const COLS_DIA = "76px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(300px,1.6fr) 176px 128px"
const COLS_HIST = "110px 70px minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,1fr) 140px 128px"

export default function Consultas() {
  const { data, deleteItem, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("consultas")
  const [aba, setAba] = useState<"dia" | "historico">("dia")
  const [query, setQuery] = useState("")
  const [day, setDay] = useState(() => todayISO())
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null)
  const [callItem, setCallItem] = useState<Item | null>(null)

  const doDia = useMemo(
    () => data.consultas.filter((item) => itemDate(item) === day && matches(item, query)).sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [data.consultas, day, query],
  )
  const ativos = doDia.filter((item) => !/falt|cancel/i.test(item.status))
  const ausentes = doDia.filter((item) => /falt|cancel/i.test(item.status))
  const historico = useMemo(
    () => data.consultas.filter((item) => matches(item, query)).sort((a, b) => `${itemDate(b)}${b.time}`.localeCompare(`${itemDate(a)}${a.time}`)),
    [data.consultas, query],
  )
  const paged = usePaged(historico, 15, [query, aba])
  const contar = (i: number) => ativos.filter((item) => etapaIdx(item) === i).length

  const avancar = (item: Item) => {
    const i = Math.max(0, etapaIdx(item))
    const prox = ETAPAS[Math.min(3, i + 1)]
    updateItem("consultas", item.id, { status: prox.key })
    forms.toast(`${item.animal || item.name}: ${prox.label}`)
  }
  const botao = (item: Item) => {
    const i = etapaIdx(item)
    if (i === 3) return null
    const label = i <= 0 ? "Iniciar triagem" : i === 1 ? "Chamar ao consultório" : "Finalizar"
    if (i === 1) {
      return (
        <button
          className="vx-btn vx-btn-p vx-btn-sm cx-call-trigger"
          aria-label={`Chamar ${item.animal || item.name} ao consultório`}
          onClick={() => setCallItem(item)}
        >
          <Volume2 />
          <span>{label}</span>
        </button>
      )
    }
    return <button className="vx-btn vx-btn-p vx-btn-sm" aria-label={`${label}: ${item.animal || item.name}`} onClick={() => avancar(item)}>{label}</button>
  }

  return (
    <Page
      className="consultations-page"
      bg="#f4f6f9"
      crumb="Consultas"
      title="Consultas"
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar" />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("consultas", undefined, { date: day })}>
            <Plus /> Nova consulta
          </button>
        </>
      }
    >
      <div className="pc-tabs" role="tablist">
        <button role="tab" aria-selected={aba === "dia"} className={aba === "dia" ? "on" : ""} onClick={() => setAba("dia")}>
          Consultas do dia <b>{ativos.length}</b>
        </button>
        <button role="tab" aria-selected={aba === "historico"} className={aba === "historico" ? "on" : ""} onClick={() => setAba("historico")}>
          Histórico <b>{historico.length}</b>
        </button>
      </div>

      {aba === "dia" ? (
        <>
          <div className="vx-row cx-daybar">
            <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><ChevronLeft /></button>
            <strong>{fmtLong(day)}</strong>
            <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><ChevronRight /></button>
            {day !== todayISO() && <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setDay(todayISO())}>Hoje</button>}
          </div>

          <div className="cs-count">
            {ETAPAS.map((etapa, i) => (
              <div key={etapa.key}><strong>{contar(i)}</strong><span>{etapa.label}</span></div>
            ))}
          </div>

          <div className="vx-table">
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS_DIA }}>
              <span>Hora</span><span>Paciente</span><span>Tipo</span><span>Veterinário</span><span>Etapa</span><span /><span className="r">Ações</span>
            </div>
            {ativos.map((item) => {
              const i = etapaIdx(item)
              return (
                <div key={item.id} className="vx-tr" style={{ gridTemplateColumns: COLS_DIA }}>
                  <span className="vx-mono" data-label="Hora" style={{ fontSize: 16 }}>{item.time || "—"}</span>
                  <span data-label="Paciente"><strong>{item.animal || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
                  <span data-label="Tipo">{item.name}</span>
                  <span data-label="Veterinário">{item.professional || "—"}</span>
                  <ol className="cs-steps" data-label="Etapa">
                    {ETAPAS.map((etapa, n) => (
                      <li key={etapa.key} className={i === 3 && n === 3 ? "done on" : n < i ? "done" : n === i ? "on" : ""}>
                        <i>{n < i || (i === 3 && n === 3) ? <Check size={12} /> : n + 1}</i>{etapa.label}
                      </li>
                    ))}
                  </ol>
                  <span data-label="Próxima ação">{botao(item)}</span>
                  <span className="r" data-label="Ações">
                    <RowActions
                      name={`consulta de ${item.animal || item.name}`}
                      onView={() => navigate(`/consultas/${item.id}`)}
                      onEdit={() => forms.open("consultas", item)}
                      onDelete={() => setConfirmDelete(item)}
                    />
                  </span>
                </div>
              )
            })}
            {!ativos.length && <div className="vx-empty">Nenhuma consulta neste dia.</div>}
          </div>

          {ausentes.length > 0 && (
            <>
              <h2 className="cx-h2">Faltas e cancelamentos</h2>
              <div className="vx-table">
                {ausentes.map((item) => (
                  <div key={item.id} className="vx-tr" style={{ gridTemplateColumns: "76px minmax(0,1.3fr) minmax(0,1fr) 140px 128px" }}>
                    <span className="vx-mono" data-label="Hora">{item.time || "—"}</span>
                    <span data-label="Paciente"><strong>{item.animal || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
                    <span data-label="Tipo">{item.name}</span>
                    <span data-label="Situação"><StatusPill status={item.status} /></span>
                    <span className="r" data-label="Ações">
                      <RowActions name={`consulta de ${item.animal}`} onView={() => navigate(`/consultas/${item.id}`)} onEdit={() => forms.open("consultas", item)} onDelete={() => setConfirmDelete(item)} />
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="vx-table">
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS_HIST }}>
              <span>Data</span><span>Hora</span><span>Paciente</span><span>Tipo</span><span>Veterinário</span><span>Situação</span><span className="r">Ações</span>
            </div>
            {paged.visible.map((item) => (
              <div key={item.id} className="vx-tr" style={{ gridTemplateColumns: COLS_HIST, cursor: "pointer" }} onClick={() => navigate(`/consultas/${item.id}`)}>
                <span className="vx-mono" data-label="Data">{fmtDate(itemDate(item))}</span>
                <span className="vx-mono" data-label="Hora">{item.time || "—"}</span>
                <span data-label="Paciente"><strong>{item.animal || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
                <span data-label="Tipo">{item.name}</span>
                <span data-label="Veterinário">{item.professional || "—"}</span>
                <span data-label="Situação"><StatusPill status={item.status} /></span>
                <span className="r" data-label="Ações">
                  <RowActions name={`consulta de ${item.animal}`} onView={() => navigate(`/consultas/${item.id}`)} onEdit={() => forms.open("consultas", item)} onDelete={() => setConfirmDelete(item)} />
                </span>
              </div>
            ))}
            {!historico.length && <div className="vx-empty">Nenhuma consulta.</div>}
          </div>
          {paged.pages > 1 && (
            <div className="vx-row" style={{ justifyContent: "center", marginTop: 12 }}>
              <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
            </div>
          )}
        </>
      )}
      {forms.node}
      {callItem && (
        <Modal
          title="Chamar ao consultório"
          text="Confira os dados antes de anunciar o paciente e iniciar o atendimento."
          onClose={() => setCallItem(null)}
          actions={
            <>
              <button className="vx-btn vx-btn-g" type="button" onClick={() => setCallItem(null)}>Agora não</button>
              <button
                className="vx-btn vx-btn-p cx-call-confirm"
                type="button"
                onClick={() => {
                  updateItem("consultas", callItem.id, { status: "Em atendimento" })
                  forms.toast(`${callItem.animal || callItem.name} chamado ao consultório.`)
                  setCallItem(null)
                }}
              >
                <Volume2 />
                Chamar agora
              </button>
            </>
          }
        >
          <div className="cx-call-summary">
            <div className="cx-call-patient">
              <span className="cx-call-icon"><Stethoscope /></span>
              <span>
                <small>Paciente</small>
                <strong>{callItem.animal || "Paciente não informado"}</strong>
                <em>{callItem.name}</em>
              </span>
            </div>
            <div className="cx-call-details">
              <span><Clock3 /><small>Horário</small><strong>{callItem.time || "—"}</strong></span>
              <span><UserRound /><small>Veterinário</small><strong>{callItem.professional || "Não informado"}</strong></span>
            </div>
            {callItem.owner && <p className="cx-call-owner">Responsável: <strong>{callItem.owner}</strong></p>}
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Confirm
          danger
          title="Excluir consulta?"
          text={`A consulta de ${confirmDelete.animal || confirmDelete.name} será removida da unidade ativa. Esta ação não pode ser desfeita.`}
          confirm="Excluir consulta"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteItem("consultas", confirmDelete.id)
            forms.toast("Consulta excluída.")
            setConfirmDelete(null)
          }}
        />
      )}
    </Page>
  )
}
