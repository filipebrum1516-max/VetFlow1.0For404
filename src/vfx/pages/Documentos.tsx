import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Archive, CheckCircle2, Edit3, FileSignature, Plus, Printer, Send } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { fmtDate, itemDate, matches, Page, Pager, SearchBox, StatusPill, usePaged, GovSign } from "../ui"

const drawers = ["Clínicos", "Administrativos", "Fiscais e notas", "RH e equipe"] as const
const tabColors = ["#f6c96b", "#9fc7f5", "#b9e3a8", "#f5b2c2", "#d2bdf5", "#ffcf9e", "#a8e2dc", "#e4d39c", "#c6cbd6"]
const drawerOf = (item: Item) => item.extra?.gaveta || (/contrato|declara/i.test(item.name) ? "Administrativos" : /nota|fiscal|recibo/i.test(item.name) ? "Fiscais e notas" : /rh|admiss|f[eé]rias/i.test(item.name) ? "RH e equipe" : "Clínicos")
const templates: Record<string, string> = {
  "Termo de consentimento": "Eu, {tutor.nome}, CPF {tutor.cpf}, responsável pelo animal {animal.nome}, espécie {animal.especie}, raça {animal.raca}, declaro ter sido informado(a) sobre o procedimento indicado e seus riscos, e autorizo sua realização pelo(a) {vet.nome}, CRMV {vet.crmv}.",
  "Laudo laboratorial": "Paciente {animal.nome} ({animal.especie}, {animal.raca}), tutor {tutor.nome}. Amostra coletada em {data}. Resultados dentro dos valores de referência, exceto os itens destacados. Responsável técnico: {vet.nome}, CRMV {vet.crmv}.",
  "Autorização cirúrgica": "Eu, {tutor.nome}, CPF {tutor.cpf}, autorizo a equipe da {unidade} a realizar procedimento cirúrgico e anestésico no animal {animal.nome}, ciente dos riscos inerentes. Cirurgião responsável: {vet.nome}, CRMV {vet.crmv}.",
  "Contrato de internação": "Contrato de prestação de serviços de internação do paciente {animal.nome}, firmado entre {unidade} e {tutor.nome}, CPF {tutor.cpf}. Diária, materiais e medicamentos serão cobrados conforme tabela vigente. Médico veterinário responsável: {vet.nome}.",
}

export default function Documentos() {
  const { data, activeUnit, updateItem, user } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("documentos", (saved) => {
    setDrawer(drawerOf(saved))
    setSelectedId(saved.id)
  })
  const [drawer, setDrawer] = useState<string>("Clínicos")
  const [type, setType] = useState("Todos")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const inDrawer = useMemo(() => data.documentos.filter((item) => drawerOf(item) === drawer), [data.documentos, drawer])
  const types = useMemo(() => [...new Set(inDrawer.map((item) => item.name))].slice(0, 6), [inDrawer])
  const list = useMemo(
    () => inDrawer.filter((item) => (type === "Todos" || item.name === type) && matches(item, query)).sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [inDrawer, type, query],
  )
  const paged = usePaged(list, 8, [drawer, type, query])
  const selected = list.find((item) => item.id === selectedId) || paged.visible[0]
  const pending = data.documentos.filter((item) => item.status === "Pendente").length

  const fill = (item: Item) => {
    const animal = data.animais.find((candidate) => candidate.id === item.animalId)
    const tutor = data.tutores.find((candidate) => candidate.id === (item.ownerId || animal?.ownerId))
    const vet = data.profissionais.find((candidate) => candidate.id === item.professionalId)
    const text: string = item.extra?.conteudo || templates[item.name] || "Documento emitido por {unidade} em {data} referente ao paciente {animal.nome}, tutor {tutor.nome}. Responsável: {vet.nome}."
    return text
      .replaceAll("{tutor.nome}", tutor?.name || item.owner || "—")
      .replaceAll("{tutor.cpf}", tutor?.cpf || "___.___.___-__")
      .replaceAll("{animal.nome}", animal?.name || item.animal || "—")
      .replaceAll("{animal.especie}", animal?.species || "—")
      .replaceAll("{animal.raca}", animal?.breed || "—")
      .replaceAll("{vet.nome}", vet?.name || item.professional || "—")
      .replaceAll("{vet.crmv}", vet?.registration || "—")
      .replaceAll("{procedimento}", item.extra?.evento || "procedimento indicado")
      .replaceAll("{unidade}", activeUnit.name)
      .replaceAll("{data}", fmtDate(itemDate(item)))
  }
  const sign = () => {
    if (!selected) return
    updateItem("documentos", selected.id, { status: "Assinado", extra: { ...(selected.extra || {}), assinadoEm: new Date().toISOString(), assinadoPor: user?.displayName || "" } })
    forms.toast(`${selected.name} marcado como assinado (registro interno).`)
  }
  const archive = () => {
    if (!selected) return
    updateItem("documentos", selected.id, { status: "Arquivado" })
    forms.toast("Documento arquivado.")
  }
  const resend = () => {
    if (!selected) return
    updateItem("documentos", selected.id, { extra: { ...(selected.extra || {}), reenviadoEm: new Date().toISOString() } })
    forms.toast(`Link de assinatura reenviado para ${selected.owner || "o tutor"}.`)
  }

  return (
    <Page
      bg="#f4ede4"
      blobs={[["#f6c96b", -60, -40, 420, 380], ["#9fc7f5", "75%", 160, 400, 360], ["#d2bdf5", "35%", "78%", 360, 320]]}
      crumb="Documentos"
      title="Documentos"
      sub="Termos, contratos, laudos e atestados por tipo. Escolha um documento para ler, imprimir ou marcar como assinado."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar paciente, tutor, tipo" />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("documentos", undefined, { gaveta: drawer })}>
            <Plus /> Novo documento
          </button>
        </>
      }
    >
      <div className="vx-docs-grid" style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 24, alignItems: "start" }}>
        <div>
          <div className="vx-glass" style={{ padding: "14px 14px 18px", borderRadius: 24 }}>
            <div className="vx-row" style={{ justifyContent: "space-between" }}>
              <span className="vx-lbl">Gavetas</span>
              <span className="vx-chip" style={{ minHeight: 24 }}>{pending} aguardando assinatura</span>
            </div>
            <div className="vx-cabinet">
              {drawers.map((name) => {
                const count = data.documentos.filter((item) => drawerOf(item) === name).length
                return (
                  <button key={name} className="vx-cabinet-drawer" onClick={() => { setDrawer(name); setType("Todos"); setSelectedId("") }} aria-pressed={drawer === name} style={{ outline: drawer === name ? "3px solid #e94f17" : "none", outlineOffset: 2, flexDirection: "column", gap: 8, height: "auto", padding: "12px 10px" }}>
                    <span className="lbl">{name} · {count}</span>
                    <span className="vx-handle" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="vx-folder-tabs" role="tablist" aria-label="Tipos de documento">
            {["Todos", ...types].map((name, index) => (
              <button key={name} role="tab" aria-selected={type === name} className={`vx-folder-tab ${type === name ? "on" : ""}`} onClick={() => setType(name)}>
                <span style={{ display: "block", padding: "10px 14px 22px", borderRadius: "14px 14px 0 0", background: tabColors[index % tabColors.length], fontSize: 12, fontWeight: 800, color: "#2a2410", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 -6px 14px -10px rgba(0,0,0,.35)" }}>
                  {name}
                </span>
              </button>
            ))}
          </div>
          <div className="vx-docs-inner" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)", gap: 18, marginTop: -12, position: "relative" }}>
            <div className="vx-glass" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {paged.visible.map((item) => (
                <button key={item.id} className="vx-up" onClick={() => setSelectedId(item.id)} style={{ outline: item.id === selected?.id ? "2px solid #e94f17" : "none" }}>
                  <FileSignature size={18} style={{ flex: "none", color: "var(--vx-muted)" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</strong>
                    <small>{item.animal || "—"} · {fmtDate(itemDate(item))}</small>
                  </span>
                  <StatusPill status={item.status} />
                </button>
              ))}
              {!paged.visible.length && (
                <div className="vx-empty">
                  Gaveta vazia.
                  <button className="vx-btn vx-btn-p vx-btn-sm" onClick={() => forms.open("documentos", undefined, { gaveta: drawer })}>Criar documento aqui</button>
                </div>
              )}
              {paged.pages > 1 && <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} label={`${list.length} documentos`} />}
            </div>

            {selected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <article className="vx-doc" id="vx-doc-print">
                  <div className="vx-row" style={{ justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "#8a6a52" }}>{activeUnit.name.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{fmtDate(itemDate(selected))}</span>
                  </div>
                  <h3 style={{ margin: "6px 0 0", fontFamily: "Fraunces, serif", fontSize: 24 }}>{selected.name}</h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{fill(selected)}</p>
                  {selected.extra?.riscos && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}><b>Riscos específicos:</b> {selected.extra.riscos}</p>}
                  <div className="vx-sign-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
                    {[selected.owner || "Tutor", selected.professional || "Veterinário"].map((who, index) => (
                      <div key={who} style={{ fontSize: 12, position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <GovSign compact name={who} signed={selected.status !== "Pendente"} by={selected.extra?.assinadoPor} when={selected.extra?.assinadoEm || itemDate(selected)} />
                        <span style={{ display: "block", borderTop: "1px solid #1a2233", marginTop: 8, paddingTop: 6 }} />
                        {who}
                        <div style={{ color: "#6b7280", fontSize: 11 }}>{index ? "Médico(a) veterinário(a)" : "Tutor responsável"}</div>
                      </div>
                    ))}
                  </div>
                </article>
                <div className="vx-row vx-actions-doc" style={{ gap: 8, flexWrap: "wrap" }}>
                  {selected.status === "Pendente" && <button className="vx-btn vx-btn-p" onClick={sign}><CheckCircle2 /> Marcar assinado</button>}
                  {selected.status === "Pendente" && <button className="vx-btn vx-btn-g" onClick={resend}><Send /> Reenviar link</button>}
                  {selected.status !== "Arquivado" && <button className="vx-btn vx-btn-g" onClick={archive}><Archive /> Arquivar</button>}
                  <button className="vx-btn vx-btn-g" onClick={() => window.print()}><Printer /> Imprimir</button>
                  <button className="vx-btn vx-btn-g" onClick={() => forms.open("documentos", selected)}><Edit3 /> Editar</button>
                  {selected.animalId && <button className="vx-btn vx-btn-g" onClick={() => navigate(`/animais?animal=${encodeURIComponent(selected.animal || "")}`)}>Ver paciente</button>}
                  <button className="vx-btn vx-btn-g" onClick={() => navigate(`/documentos/${selected.id}`)}>Ficha</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`.vx-folder-tabs{ display:flex; padding-left:10px; overflow-x:auto; padding-top:16px; scrollbar-width:none } .vx-folder-tab{ min-width:110px; max-width:190px } .vx-cabinet{ display:flex; flex-direction:column } @media (max-width: 1180px){ .vx-docs-inner{ grid-template-columns: 1fr !important; } } @media (max-width: 980px){ .vx-docs-grid{ grid-template-columns: 1fr !important; } .vx-cabinet{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 10px } } @media (max-width: 520px){ .vx-sign-row{ grid-template-columns:1fr !important; gap:40px !important } .vx-doc{ padding:20px 18px !important } } @media print { body * { visibility:hidden } #vx-doc-print, #vx-doc-print * { visibility:visible } #vx-doc-print{ position:absolute; left:0; top:0; width:100%; box-shadow:none } }`}</style>
      {forms.node}
    </Page>
  )
}
