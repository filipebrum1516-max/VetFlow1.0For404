import { Fragment, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { BadgeCheck, Edit3, Play, Plus } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, fmtDate, matches, Modal, Page, SearchBox, StatusPill, todayISO } from "../ui"

type Step = { tipo: string; titulo: string; detalhe?: string; tempo?: string }
const templates: [RegExp, Step[]][] = [
  [/vacinal/i, [{ tipo: "Ação", titulo: "Avaliar idade, histórico e saúde do filhote" }, { tipo: "Decisão", titulo: "Apto para vacinar?", detalhe: "Sim: aplicar V10 / Não: tratar e reagendar" }, { tipo: "Medicação", titulo: "V10 · 1ª dose (6–8 semanas)", tempo: "dia 0" }, { tipo: "Aguardar", titulo: "Reforços a cada 21 dias (3 doses)", tempo: "21 d" }, { tipo: "Medicação", titulo: "Antirrábica a partir de 12 semanas" }, { tipo: "Fim", titulo: "Reforço anual programado" }]],
  [/dor/i, [{ tipo: "Ação", titulo: "Aplicar escala de dor (Glasgow / Feline Grimace)" }, { tipo: "Decisão", titulo: "Dor ≥ 4/10?", detalhe: "Sim: analgesia multimodal / Não: reavaliar em 4 h" }, { tipo: "Medicação", titulo: "Opioide + AINE conforme função renal" }, { tipo: "Monitorar", titulo: "Reavaliar escala a cada 4 h", tempo: "4/4 h" }, { tipo: "Fim", titulo: "Desmame da analgesia" }]],
  [/sepse/i, [{ tipo: "Ação", titulo: "Acesso venoso, lactato, hemograma e glicemia", tempo: "0–15 min" }, { tipo: "Decisão", titulo: "Hipotensão ou lactato > 4?", detalhe: "Sim: bolus de cristaloide / Não: fluido de manutenção" }, { tipo: "Medicação", titulo: "Antibiótico de amplo espectro na 1ª hora", tempo: "≤ 1 h" }, { tipo: "Exame", titulo: "Cultura e foco infeccioso (imagem)" }, { tipo: "Monitorar", titulo: "PA, diurese e lactato seriados", tempo: "2/2 h" }, { tipo: "Fim", titulo: "Reavaliação em 6 h" }]],
  [/cirurg|profil/i, [{ tipo: "Ação", titulo: "Checklist pré-operatório e termo assinado" }, { tipo: "Medicação", titulo: "Cefazolina 22 mg/kg IV 30–60 min antes da incisão", tempo: "-30 min" }, { tipo: "Decisão", titulo: "Cirurgia > 90 min?", detalhe: "Sim: repetir dose / Não: seguir" }, { tipo: "Monitorar", titulo: "Ferida cirúrgica em 24 h e 72 h" }, { tipo: "Fim", titulo: "Suspender em até 24 h" }]],
]
const stepsFor = (item: Item): Step[] => (item.extra?.etapas?.filter((step: Step) => step.titulo)?.length ? item.extra.etapas.filter((step: Step) => step.titulo) : templates.find(([pattern]) => pattern.test(item.name))?.[1] || templates[1][1])

export default function Protocolos() {
  const { data, updateItem, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("protocolos", (saved) => setSelectedId(saved.id))
  const [query, setQuery] = useState("")
  const [applying, setApplying] = useState(false)
  const [petQuery, setPetQuery] = useState("")
  const list = useMemo(() => data.protocolos.filter((item) => matches(item, query)), [data.protocolos, query])
  const [selectedId, setSelectedId] = useState("")
  const selected = list.find((item) => item.id === selectedId) || list[0]
  const steps = selected ? stepsFor(selected) : []
  const uses: { animal: string; animalId: string; em: string; por: string }[] = selected?.extra?.aplicacoes || []
  const pets = petQuery.trim() ? data.animais.filter((item) => normalize(`${item.name} ${item.owner}`).includes(normalize(petQuery))).slice(0, 6) : data.animais.slice(0, 6)

  const apply = (pet: Item) => {
    if (!selected) return
    updateItem("protocolos", selected.id, { extra: { ...(selected.extra || {}), aplicacoes: [{ animal: pet.name, animalId: pet.id, em: todayISO(), por: "Dr. Rafael" }, ...uses] } })
    if (selected.extra?.criaPrescricao !== false)
      addItem("prescricoes", { name: `Protocolo · ${selected.name}`, animalId: pet.id, status: "Ativa", category: "Simples", extra: { tipo: "Simples", itens: (selected.extra?.doses || []).map((dose: { farmaco: string; dose: string; via: string }) => ({ med: dose.farmaco, dose: dose.dose, via: dose.via })) } })
    setApplying(false)
    forms.toast(`${selected.name} aplicado em ${pet.name}. Prescrição criada.`)
  }

  return (
    <Page
      bg="#f2effb"
      blobs={[["#d6c8ff", "30%", 220, 560, 500], ["#ffc9a8", -100, -40, 360, 360], ["#a7e3d8", "88%", "70%", 320, 320]]}
      crumb="Protocolos"
      title="Protocolos"
      sub="Protocolos clínicos em etapas. Para aplicar a um paciente, abra o protocolo e siga as etapas durante a consulta ou internação."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar protocolo" />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Novo protocolo
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0,1fr) 260px", gap: 22, alignItems: "start" }} className="vx-proto-grid">
        <div className="vx-proto-list" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 640, overflowY: "auto", paddingRight: 4 }}>
          {list.map((item) => {
            const on = item.id === selected?.id
            return (
              <button key={item.id} className="vx-book-tab" style={{ flex: "none", minHeight: 58, background: on ? "var(--vx-card)" : "var(--vx-glass)", boxShadow: on ? "0 14px 26px -14px rgba(60,40,120,.45)" : "none", marginLeft: on ? 0 : 14 }} onClick={() => setSelectedId(item.id)}>
                <span style={{ width: 10, background: item.extra?.cor || colorFor(item.name) }} />
                <span style={{ padding: "10px 14px", flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 14, lineHeight: 1.25, whiteSpace: "normal" }}>{item.name}</strong>
                  <small style={{ fontSize: 11, color: "var(--vx-muted)" }}>{stepsFor(item).length} etapas · {item.status}</small>
                </span>
              </button>
            )
          })}
          {!list.length && <div className="vx-glass vx-empty">Nenhum protocolo.</div>}
        </div>

        <div className="vx-glass" style={{ borderRadius: 28, background: "rgba(255,255,255,.4)", backgroundImage: "radial-gradient(rgba(26,34,51,.12) 1px, transparent 1.2px)", backgroundSize: "20px 20px", minHeight: 560 }}>
          {selected && (
            <>
              <div className="vx-lbl" style={{ padding: "16px 20px 0" }}>{selected.name} · {selected.extra?.versao || "v1"}</div>
              <div className="vx-flow">
                <div className="vx-flow-node" style={{ background: "#1a2233", color: "#fff", borderRadius: 22, fontWeight: 800 }}>Início · {selected.extra?.criterios ? "critérios atendidos" : "paciente elegível"}</div>
                {steps.map((step, index) => (
                  <Fragment key={index}>
                    <div className="vx-flow-line" />
                    {step.tipo === "Decisão" ? (
                      <>
                        <div className="vx-flow-dec"><span>{step.titulo}</span></div>
                        <div className="vx-flow-branch">
                          {(step.detalhe || "Sim: seguir / Não: reavaliar").split("/").map((branch, branchIndex) => (
                            <div key={branchIndex} className="vx-flow-node" style={{ background: branchIndex === 0 ? "#eaf6ef" : "#fdf0ee", borderColor: branchIndex === 0 ? "rgba(43,122,75,.35)" : "rgba(180,50,42,.35)", color: "#1a2233" }}>
                              <b style={{ color: branchIndex === 0 ? "#2b7a4b" : "#b4322a" }}>{branch.trim()}</b>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="vx-flow-node" style={step.tipo === "Fim" ? { border: "2px dashed #6d4bc2", background: "transparent", color: "var(--vx-violet)", fontWeight: 800, borderRadius: 22 } : undefined}>
                        <div className="vx-row" style={{ justifyContent: "space-between", gap: 10 }}>
                          <b style={{ fontSize: 14 }}>{index + 1} · {step.titulo}</b>
                          {step.tempo && <span className="vx-chip" style={{ minHeight: 22, fontSize: 11 }}>{step.tempo}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--vx-muted)", marginTop: 2 }}>{step.tipo}{step.detalhe ? ` · ${step.detalhe}` : ""}</div>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </>
          )}
        </div>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="vx-glass" style={{ padding: 18 }}>
              <div className="vx-lbl">Em uso</div>
              {uses.length ? uses.slice(0, 4).map((use, index) => (
                <button key={index} className="vx-up" onClick={() => navigate(`/animais?animal=${encodeURIComponent(use.animal)}`)}>
                  <span style={{ flex: 1 }}><strong style={{ fontSize: 14 }}>{use.animal}</strong><small>aplicado {fmtDate(use.em)}</small></span>
                </button>
              )) : <div className="vx-hint" style={{ marginTop: 8 }}>Nenhum paciente usando agora.</div>}
            </div>
            <div className="vx-glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="vx-lbl">Revisão</div>
              <StatusPill status={selected.status} />
              <div style={{ fontSize: 13 }}>Responsável: <b>{selected.extra?.aprovador || selected.professional || "—"}</b></div>
              <div style={{ fontSize: 13 }}>Atualizado em {fmtDate(selected.date)}</div>
              {selected.status !== "Aprovado" && (
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => { updateItem("protocolos", selected.id, { status: "Aprovado" }); forms.toast("Protocolo aprovado e publicado para a equipe.") }}>
                  <BadgeCheck /> Aprovar
                </button>
              )}
            </div>
            <button className="vx-btn vx-btn-p" onClick={() => setApplying(true)}>
              <Play /> Aplicar a um paciente
            </button>
            <p className="vx-hint" style={{ margin: 0 }}>Como aplicar: clique no botão acima, escolha o paciente e confirme. O protocolo passa a constar no histórico do animal e gera a prescrição com as medicações das etapas.</p>
            <div className="vx-row" style={{ gap: 8 }}>
              <button className="vx-btn vx-btn-g" style={{ flex: 1 }} onClick={() => forms.open("protocolos", selected, selected.extra?.etapas ? undefined : { etapas: steps })}><Edit3 /> Editar</button>
              <button className="vx-btn vx-btn-g" style={{ flex: 1 }} onClick={() => navigate(`/protocolos/${selected.id}`)}>Ficha</button>
            </div>
          </div>
        )}
      </div>
      {applying && selected && (
        <Modal title={`Aplicar ${selected.name}`} text="Escolha o paciente. O protocolo entra em uso e gera a prescrição." onClose={() => setApplying(false)} actions={<button className="vx-btn vx-btn-g" onClick={() => setApplying(false)}>Cancelar</button>}>
          <SearchBox value={petQuery} onChange={setPetQuery} placeholder="Buscar paciente" style={{ minWidth: 0 }} />
          <div className="vx-pick-list">
            {pets.map((pet) => (
              <button key={pet.id} onClick={() => apply(pet)}>
                <span><strong>{pet.name}</strong><small>{pet.subtitle} · {pet.owner}</small></span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      <style>{`@media (max-width: 1150px){ .vx-proto-grid{ grid-template-columns: 1fr !important; } .vx-proto-list{ flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; max-height: none !important; padding-bottom: 6px; scroll-snap-type: x mandatory } .vx-proto-list .vx-book-tab{ min-width: 220px; max-width: 240px; margin-left: 0 !important; scroll-snap-align: start; flex: none } } @media (max-width: 640px){ .vx-flow{ padding: 20px 10px !important } .vx-flow-node{ min-width: 0 !important; width: 100% } }`}</style>
      {forms.node}
    </Page>
  )
}
