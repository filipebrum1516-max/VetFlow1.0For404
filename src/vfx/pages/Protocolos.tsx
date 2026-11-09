import { Fragment, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { BadgeCheck, Edit3, Play } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, fmtDate, matches, Modal, SearchBox, todayISO } from "../ui"
import { CadastroLista, Duo, Ident, Status, initialsOf } from "../CadastroLista"
import { FichaCadastro } from "../Ficha"

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
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("id") || "")
  const selected = data.protocolos.find((item) => item.id === selectedId) || list[0]
  const uses: { animal: string; animalId: string; em: string; por: string; cirurgiaId?: string; origem?: string }[] = selected?.extra?.aplicacoes || []
  const pets = petQuery.trim() ? data.animais.filter((item) => normalize(`${item.name} ${item.owner}`).includes(normalize(petQuery))).slice(0, 6) : data.animais.slice(0, 6)

  const apply = (pet: Item) => {
    if (!selected) return
    updateItem("protocolos", selected.id, { extra: { ...(selected.extra || {}), aplicacoes: [{ animal: pet.name, animalId: pet.id, em: todayISO(), por: "Dr. Rafael" }, ...uses] } })
    if (selected.extra?.criaPrescricao !== false)
      addItem("prescricoes", { name: `Protocolo · ${selected.name}`, animalId: pet.id, status: "Ativa", category: "Simples", extra: { tipo: "Simples", itens: (selected.extra?.doses || []).map((dose: { farmaco: string; dose: string; via: string }) => ({ med: dose.farmaco, dose: dose.dose, via: dose.via })) } })
    setApplying(false)
    forms.toast(`${selected.name} aplicado em ${pet.name}. Prescrição criada.`)
  }

  const [sit, setSit] = useState("Todos")
  const usosDe = (item: Item) => (item.extra?.aplicacoes || []).length as number
  const sitDe = (item: Item, k: string) => k === "Todos" || (k === "Em uso" ? usosDe(item) > 0 : k === "Em revisão" ? /revis/i.test(item.status) : k === "Arquivados" ? /arquiv|inativ/i.test(item.status) : /aprov|ativ/i.test(item.status) && !/inativ/i.test(item.status))
  const rows = list.filter((item) => sitDe(item, sit))
  const fluxoDe = (sel: Item) => (
    <div className="cd-fluxo">
              <div className="vx-flow">
                <div className="vx-flow-node" style={{ background: "#1a2233", color: "#fff", borderRadius: 22, fontWeight: 800 }}>Início · {sel.extra?.criterios ? "critérios atendidos" : "paciente elegível"}</div>
                {stepsFor(sel).map((step, index) => (
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
    </div>
  )
  return (
    <CadastroLista
      crumb="Protocolos"
      title="Protocolos"
      sub="Protocolos clínicos em etapas. Escolha um na lista para ver as etapas, quem está usando e aplicar a um paciente."
      kpis={[
        { label: "Protocolos", value: data.protocolos.length, detail: "no caderno da clínica", icon: <BadgeCheck />, tone: "orange" },
        { label: "Aprovados", value: data.protocolos.filter((p) => sitDe(p, "Aprovados")).length, detail: "liberados para a equipe", icon: <BadgeCheck />, tone: "green", aba: "Aprovados" },
        { label: "Em uso", value: data.protocolos.filter((p) => usosDe(p) > 0).length, detail: `${data.protocolos.reduce((n, p) => n + usosDe(p), 0)} aplicações`, icon: <Play />, tone: "aqua", aba: "Em uso" },
        { label: "Em revisão", value: data.protocolos.filter((p) => /revis/i.test(p.status)).length, detail: "aguardando aprovação", icon: <Edit3 />, tone: "gray", aba: "Em revisão" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar protocolo..."
      abas={["Todos", "Aprovados", "Em uso", "Em revisão", "Arquivados"].map((key) => ({ key, label: key, count: list.filter((i) => sitDe(i, key)).length }))}
      aba={sit}
      onAba={setSit}
      novo={{ label: "Novo protocolo", onClick: () => forms.open() }}
      exportar={{ nome: "protocolos", linha: (item) => ({ Protocolo: item.name, Etapas: stepsFor(item).length, Aplicacoes: usosDe(item), Situacao: item.status, Atualizado: fmtDate(item.date) }) }}
      rows={rows}
      rowKey={(item) => item.id}
      noun="protocolos"
      vazio="Nenhum protocolo encontrado"
      colunas={[
        { label: "Protocolo", w: "minmax(240px,1.5fr)", cell: (item) => <Ident title={item.name} sub={`${stepsFor(item).length} etapas · ${item.extra?.versao || "v1"}`} initials={initialsOf(item.name)} color={item.extra?.cor || colorFor(item.name)} /> },
        { label: "Em uso", w: "120px", cell: (item) => <Duo title={`${usosDe(item)}`} sub="pacientes" /> },
        { label: "Atualizado", w: "120px", ficha: false, cell: (item) => <Duo title={fmtDate(item.date)} sub={item.extra?.aprovador || item.professional || ""} /> },
        { label: "Situação", w: "130px", cell: (item) => <Status status={item.status} /> },
      ]}
      ficha={(item) => {
        const st = stepsFor(item)
        const us: typeof uses = item.extra?.aplicacoes || []
        const cir = data.cirurgias.filter((c) => c.extra?.protocoloId === item.id || c.extra?.protocoloPosId === item.id)
        return (
          <FichaCadastro
            slug="protocolos"
            item={item}
            sub={`${st.length} etapas · ${item.extra?.versao || "v1"} · responsável ${item.extra?.aprovador || item.professional || "—"}`}
            acoes={[
              { label: "Aplicar a um paciente", icon: <Play />, main: true, onClick: () => { setSelectedId(item.id); setApplying(true) } },
              ...(/aprov/i.test(item.status) ? [] : [{ label: "Aprovar", icon: <BadgeCheck />, onClick: () => { updateItem("protocolos", item.id, { status: "Aprovado" }); forms.toast("Protocolo aprovado e publicado para a equipe.") } }]),
            ]}
            abasExtras={[
              { label: "Etapas", content: fluxoDe(item) },
              { label: "Em uso", content: (
                <div>
                  {us.slice(0, 8).map((use, index) => (
                    <button key={index} type="button" className="cd-li" onClick={() => navigate(use.cirurgiaId ? "/cirurgias?aba=todas" : `/animais?animal=${encodeURIComponent(use.animal)}`)}>
                      <time>{fmtDate(use.em)}</time><span><b>{use.animal}</b>{use.origem ? ` · ${use.origem}` : ""} · por {use.por}</span>
                    </button>
                  ))}
                  {cir.slice(0, 4).map((c) => (
                    <button key={c.id} type="button" className="cd-li" onClick={() => navigate(`/cirurgias/${c.id}`)}>
                      <time>{fmtDate(c.date)}</time><span><b>{c.animal} · {c.name}</b> · {c.status}</span>
                    </button>
                  ))}
                  {!us.length && !cir.length && <p className="cd-empty">Nenhum paciente usando agora.</p>}
                </div>
              ) },
            ]}
            onEdit={() => forms.open("protocolos", item, item.extra?.etapas ? undefined : { etapas: st })}
            onToast={forms.toast}
          />
        )
      }}
    >
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
      {forms.node}
    </CadastroLista>
  )
}
