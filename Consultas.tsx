import { useMemo, useState, type DragEvent } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, Activity, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Plus, Siren, Stethoscope, TriangleAlert, Undo2, UserRound, Volume2 } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions from "../RowActions"
import { addDays, Confirm, fmtDate, fmtLong, itemDate, matches, Modal, noPeriodo, Page, PERIODOS, SearchBox, StatusPill, todayISO } from "../ui"
import { Duo, Ident, initialsOf, ListaFicha, Status } from "../CadastroLista"
import { FichaCadastro } from "../Ficha"

/*
 * Consultas do dia em 4 colunas de vidro. A consulta nasce em "Chegou" já com a senha
 * e anda uma coluna por vez: Chegou → Triagem → Consultório → Finalizado.
 */
type Etapa = { key: string; label: string; hint: string; statuses: string[]; tone: string; acao: string }
const ETAPAS: Etapa[] = [
  { key: "Chegou", label: "Chegou", hint: "Recepção, aguardando triagem", statuses: ["Chegou", "Agendado", "Confirmado", "Aguardando"], tone: "orange", acao: "Chamar para triagem" },
  { key: "Triagem", label: "Triagem", hint: "Peso, temperatura e queixa", statuses: ["Triagem"], tone: "yellow", acao: "Chamar ao consultório" },
  { key: "Em atendimento", label: "Consultório", hint: "Em atendimento com o veterinário", statuses: ["Em atendimento", "Em andamento", "Aguardando pagamento"], tone: "teal", acao: "Finalizar consulta" },
  { key: "Concluído", label: "Finalizado", hint: "Consulta encerrada", statuses: ["Concluído"], tone: "blue", acao: "" },
]
const ULTIMA = ETAPAS.length - 1
const etapaIdx = (item: Item) => ETAPAS.findIndex((e) => e.statuses.includes(item.status))
const ausente = (item: Item) => /falt|cancel/i.test(item.status)
const prioridade = (item: Item) => (item.urgency || item.extra?.prioridade === "Urgente" ? "Urgente" : item.extra?.prioridade === "Preferencial" ? "Preferencial" : "Normal")

export default function Consultas() {
  const { data, deleteItem, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("consultas")
  const [aba, setAba] = useState<"dia" | "historico">("dia")
  const [query, setQuery] = useState("")
  const [day, setDay] = useState(() => todayISO())
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null)
  const [callItem, setCallItem] = useState<Item | null>(null)
  const [dragOver, setDragOver] = useState(-1)
  const [periodo, setPeriodo] = useState("todos")
  const [sitHist, setSitHist] = useState("Todas")
  const [histId, setHistId] = useState("")

  /* Senha: ordem de cadastro no dia (A = normal, P = preferencial, U = urgente). Não muda com a busca. */
  const senhas = useMemo(() => {
    const map = new Map<string, string>()
    data.consultas
      .filter((item) => itemDate(item) === day)
      .sort((a, b) => `${a.createdAt}${a.id}`.localeCompare(`${b.createdAt}${b.id}`))
      .forEach((item, n) => {
        const definida = typeof item.extra?.senha === "string" ? item.extra.senha : ""
        const p = prioridade(item)
        map.set(item.id, definida || `${p === "Urgente" ? "U" : p === "Preferencial" ? "P" : "A"}${String(n + 1).padStart(3, "0")}`)
      })
    return map
  }, [data.consultas, day])
  const senha = (item: Item) => senhas.get(item.id) || "—"

  const doDia = useMemo(
    () => data.consultas.filter((item) => itemDate(item) === day && matches(item, query)).sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [data.consultas, day, query],
  )
  const ativos = doDia.filter((item) => !ausente(item))
  const ausentes = doDia.filter(ausente)
  const colunas = ETAPAS.map((_, i) => {
    const itens = ativos.filter((item) => Math.max(0, etapaIdx(item)) === i)
    /* na fila, urgente e preferencial passam na frente; finalizados ficam em ordem de horário */
    if (i < ULTIMA) {
      const peso = (item: Item) => (prioridade(item) === "Urgente" ? 0 : prioridade(item) === "Preferencial" ? 1 : 2)
      itens.sort((a, b) => peso(a) - peso(b) || (a.time || "").localeCompare(b.time || ""))
    }
    return itens
  })

  const historico = useMemo(
    () =>
      data.consultas
        .filter((item) => matches(item, query) && noPeriodo(itemDate(item), periodo))
        .filter((item) => sitHist === "Todas" || (sitHist === "Finalizadas" ? /conclu/i.test(item.status) : sitHist === "Faltas e cancelamentos" ? ausente(item) : !/conclu/i.test(item.status) && !ausente(item)))
        .sort((a, b) => `${itemDate(b)}${b.time}`.localeCompare(`${itemDate(a)}${a.time}`)),
    [data.consultas, query, periodo, sitHist],
  )

  const mover = (item: Item, destino: number) => {
    const etapa = ETAPAS[Math.max(0, Math.min(ULTIMA, destino))]
    updateItem("consultas", item.id, { status: etapa.key })
    forms.toast(`${senha(item)} · ${item.animal || item.name} → ${etapa.label}`)
  }
  /* clicar no cartão (ou no botão) chama a consulta para a próxima etapa, com confirmação */
  const chamar = (item: Item) => {
    if (Math.max(0, etapaIdx(item)) >= ULTIMA) return navigate(`/consultas/${item.id}`)
    setCallItem(item)
  }
  const voltar = (item: Item) => mover(item, Math.max(0, etapaIdx(item)) - 1)

  const onDrop = (event: DragEvent, destino: number) => {
    event.preventDefault()
    setDragOver(-1)
    const item = data.consultas.find((c) => c.id === event.dataTransfer.getData("text/plain"))
    if (item && Math.max(0, etapaIdx(item)) !== destino) mover(item, destino)
  }

  const Cartao = ({ item, i }: { item: Item; i: number }) => {
    const p = prioridade(item)
    const etapa = ETAPAS[i]
    return (
      <article
        className={`cq-card cq-${etapa.tone} cq-g-${p === "Urgente" ? "u" : p === "Preferencial" ? "p" : "n"}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id)
          event.dataTransfer.effectAllowed = "move"
        }}
        aria-label={`Senha ${senha(item)}, ${item.animal || item.name}`}
      >
        <button
          type="button"
          className="cq-card-main"
          title={i < ULTIMA ? `Clique para ${etapa.acao.toLowerCase()}` : "Ver consulta"}
          onClick={() => chamar(item)}
        >
          <span className="cq-card-top">
            <span className="cq-senha">
              <small>Senha</small>
              <b>{senha(item)}</b>
            </span>
            <span className={`cq-prio cq-prio-${p === "Urgente" ? "u" : p === "Preferencial" ? "p" : "n"}`}>
              {p === "Urgente" ? <Siren /> : p === "Preferencial" ? <TriangleAlert /> : <CircleCheck />}
              {p}
            </span>
          </span>
          <strong className="cq-pet">{item.animal || "Paciente não informado"}</strong>
          <span className="cq-owner">{item.owner || "Tutor não informado"}</span>
          <span className="cq-meta">
            <span>{item.name}</span>
            <span className="cq-time">
              <Clock3 />
              {item.time || "—"}
            </span>
          </span>
          <span className="cq-vet">
            <UserRound />
            {item.professional || "Sem veterinário"}
            {typeof item.extra?.sala === "string" && i === 2 ? ` · ${item.extra.sala}` : ""}
          </span>
        </button>
        <div className="cq-card-foot">
          {i > 0 && (
            <button type="button" className="cq-back" title="Voltar uma etapa" aria-label={`Voltar ${item.animal || item.name} para ${ETAPAS[i - 1].label}`} onClick={() => voltar(item)}>
              <Undo2 />
            </button>
          )}
          {i < ULTIMA ? (
            <button type="button" className="cq-next" onClick={() => chamar(item)}>
              {i < 2 ? <Volume2 /> : i === ULTIMA - 1 ? <Check /> : <ArrowRight />}
              <span>{etapa.acao}</span>
            </button>
          ) : (
            <span className="cq-done">
              <Check /> Concluída
            </span>
          )}
          <RowActions name={`consulta de ${item.animal || item.name}`} onView={() => navigate(`/consultas/${item.id}`)} onEdit={() => forms.open("consultas", item)} onDelete={() => setConfirmDelete(item)} />
        </div>
      </article>
    )
  }

  return (
    <Page
      className="consultations-page cq-page"
      bg="#eef1f6"
      blobs={[["#ffd2b0", -140, 220, 520, 420], ["#c9dcff", "72%", 120, 520, 440], ["#c8f0e2", "38%", 520, 420, 360]]}
      crumb="Consultas"
      title="Consultas"
      actions={
        <>
          {aba === "dia" && <SearchBox value={query} onChange={setQuery} placeholder="Buscar" />}
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("consultas", undefined, { date: day, status: "Chegou" })}>
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

          <div className="cq-legend" aria-label="Prioridade das consultas do dia">
            {(["Urgente", "Preferencial", "Normal"] as const).map((nivel) => (
              <span key={nivel} className={`cq-prio cq-prio-${nivel === "Urgente" ? "u" : nivel === "Preferencial" ? "p" : "n"}`}>
                {nivel === "Urgente" ? <Siren /> : nivel === "Preferencial" ? <TriangleAlert /> : <CircleCheck />}
                {nivel} <b>{ativos.filter((item) => prioridade(item) === nivel && Math.max(0, etapaIdx(item)) < ULTIMA).length}</b>
              </span>
            ))}
            <small>Clique na consulta para chamá-la para a próxima etapa · arraste entre colunas se preferir</small>
          </div>

          <div className="cq-board">
            {ETAPAS.map((etapa, i) => (
              <section
                key={etapa.key}
                className={`cq-col cq-${etapa.tone} ${dragOver === i ? "is-over" : ""}`}
                aria-label={`${etapa.label}: ${colunas[i].length}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (dragOver !== i) setDragOver(i)
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(-1)
                }}
                onDrop={(event) => onDrop(event, i)}
              >
                <header className="cq-col-head">
                  <span className="cq-step">{i + 1}</span>
                  <span className="cq-col-title">
                    <strong>{etapa.label}</strong>
                    <small>{etapa.hint}</small>
                  </span>
                  <span className="cq-count">{colunas[i].length}</span>
                </header>
                <div className="cq-col-body">
                  {colunas[i].map((item) => (
                    <Cartao key={item.id} item={item} i={i} />
                  ))}
                  {!colunas[i].length && <div className="cq-empty">{i === 0 ? "Nenhuma senha aguardando" : "Ninguém nesta etapa"}</div>}
                </div>
              </section>
            ))}
          </div>

          {ausentes.length > 0 && (
            <section className="cq-absent">
              <span className="vx-lbl">Faltas e cancelamentos · {ausentes.length}</span>
              <div>
                {ausentes.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigate(`/consultas/${item.id}`)}>
                    <b>{senha(item)}</b> {item.animal || item.name} · {item.time || "—"} <StatusPill status={item.status} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <ListaFicha
          query={query}
          onQuery={setQuery}
          placeholder="Buscar paciente, tutor, tipo ou veterinário"
          filtros={[
            { label: "Período", icon: <CalendarDays />, value: periodo, onChange: setPeriodo, options: PERIODOS },
            { label: "Situação", icon: <Activity />, value: sitHist, onChange: setSitHist, options: [["Todas", "Todas as situações"], "Em andamento", "Finalizadas", "Faltas e cancelamentos"] },
          ]}
          rows={historico}
          rowKey={(item) => item.id}
          atual={histId}
          onAtual={setHistId}
          noun="consultas"
          vazio="Nenhuma consulta neste período"
          exportar={{ nome: "consultas", linha: (item) => ({ Data: fmtDate(itemDate(item)), Hora: item.time || "", Paciente: item.animal || "", Tutor: item.owner || "", Tipo: item.name, Veterinario: item.professional || "", Situacao: item.status }) }}
          colunas={[
            { label: "Paciente", w: "minmax(210px,1.2fr)", cell: (item) => <Ident title={item.animal || "—"} sub={item.owner || ""} initials={initialsOf(item.animal || "")} /> },
            { label: "Tipo", w: "minmax(160px,1fr)", cell: (item) => <Duo title={item.name} sub={item.professional || ""} /> },
            { label: "Data", w: "120px", cell: (item) => <Duo title={fmtDate(itemDate(item))} sub={item.time || ""} /> },
            { label: "Veterinário", w: "minmax(150px,.8fr)", ficha: false, cell: (item) => <Duo title={item.professional || "—"} /> },
            { label: "Situação", w: "150px", cell: (item) => <Status status={item.status} /> },
          ]}
          ficha={(item) => (
            <FichaCadastro
              slug="consultas"
              item={item}
              semUso
              titulo={item.animal || item.name}
              sub={`${item.name} · ${fmtDate(itemDate(item))}${item.time ? ` às ${item.time}` : ""}`}
              icone={<Stethoscope />}
              campos={[
                ["Paciente", item.animal],
                ["Tutor", item.owner],
                ["Tipo de consulta", item.name],
                ["Data", `${fmtDate(itemDate(item))}${item.time ? ` às ${item.time}` : ""}`],
                ["Veterinário", item.professional],
                ["Senha", senhas.get(item.id)],
                ["Prioridade", prioridade(item)],
                ["Situação", item.status],
                ["Observações", item.notes],
              ]}
              onEdit={() => forms.open("consultas", item)}
              abrir={() => navigate(`/consultas/${item.id}`)}
              onExcluir={() => setConfirmDelete(item)}
              excluirLabel="Excluir consulta"
              onToast={forms.toast}
            />
          )}
        />
      )}
      {forms.node}
      {callItem && (() => {
        const atual = Math.max(0, etapaIdx(callItem))
        const proxima = ETAPAS[Math.min(ULTIMA, atual + 1)]
        const p = prioridade(callItem)
        return (
        <Modal
          title={ETAPAS[atual].acao}
          text={`A consulta sai de ${ETAPAS[atual].label} e vai para ${proxima.label}. Confira os dados antes de confirmar.`}
          onClose={() => setCallItem(null)}
          actions={
            <>
              <button className="vx-btn vx-btn-g" type="button" onClick={() => setCallItem(null)}>Agora não</button>
              <button
                className="vx-btn vx-btn-p cx-call-confirm"
                type="button"
                onClick={() => {
                  mover(callItem, atual + 1)
                  setCallItem(null)
                }}
              >
                {atual < 2 ? <Volume2 /> : <Check />}
                {atual < 2 ? "Chamar agora" : atual === ULTIMA - 1 ? "Finalizar" : "Enviar agora"}
              </button>
            </>
          }
        >
          <div className="cx-call-summary">
            <div className="cx-call-patient">
              <span className="cx-call-icon"><Stethoscope /></span>
              <span>
                <small>Senha {senha(callItem)} · <span className={`cq-prio cq-prio-${p === "Urgente" ? "u" : p === "Preferencial" ? "p" : "n"}`}>{p}</span></small>
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
        )
      })()}
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
