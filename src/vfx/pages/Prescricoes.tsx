import { localDateTime, localISO } from "../../date"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Edit3, Plus, Printer, Send } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { fmtDate, itemDate, matches, Page, Pager, SearchBox, Seg, StatusPill, usePaged, GovSign } from "../ui"

const paper: Record<string, string> = { Simples: "#fffdf8", "Controle especial": "#fff6d6", Manipulação: "#eaf0fb" }
const bar: Record<string, string> = { Simples: "#e3dccf", "Controle especial": "#f2d57a", Manipulação: "#9db8ee" }
const typeOf = (item: Item) => item.extra?.tipo || (/(tramadol|gabapent|fenobarb|metadona)/i.test(item.name) ? "Controle especial" : "Simples")

export default function Prescricoes() {
  const { data, units, activeUnit, addItem, updateItem, user } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("prescricoes", (saved) => setSelectedId(saved.id))
  const [type, setType] = useState("Todas")
  const [query, setQuery] = useState("")
  const list = useMemo(
    () => data.prescricoes.filter((item) => matches(item, query) && (type === "Todas" || typeOf(item) === type)).sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [data.prescricoes, query, type],
  )
  const paged = usePaged(list, 8, [query, type])
  const [selectedId, setSelectedId] = useState("")
  const selected = list.find((item) => item.id === selectedId) || paged.visible[0]
  const animal = data.animais.find((item) => item.id === selected?.animalId)
  const professional = data.profissionais.find((item) => item.id === selected?.professionalId)
  const unit = units.find((candidate) => candidate.id === selected?.unitId) || activeUnit
  const rows: { med: string; dose?: string; via?: string; freq?: string; dur?: string; qtd?: string }[] =
    selected?.extra?.itens?.filter((row: { med: string }) => row.med) || (selected ? [{ med: selected.name, freq: "conforme orientação", dur: "7 dias" }] : [])

  const sendToTutor = () => {
    if (!selected) return
    addItem("comunicacao", { name: "Receita enviada", animalId: selected.animalId, status: "Enviada", category: "WhatsApp", extra: { mensagem: `Receita de ${selected.animal}: ${rows.map((row) => row.med).join(", ")}` } })
    forms.toast(`Envio simulado: registrado em Comunicação para ${selected.owner}. Nenhuma mensagem real é enviada nesta versão.`)
  }
  const markSigned = () => {
    if (!selected) return
    updateItem("prescricoes", selected.id, { extra: { ...(selected.extra || {}), assinadoPor: user?.displayName || selected.professional, assinadoEm: new Date().toISOString() } })
    forms.toast("Receita marcada como assinada (registro interno).")
  }
  const renew = () => {
    if (!selected) return
    updateItem("prescricoes", selected.id, { status: "Ativa", date: localISO() })
    forms.toast("Receita renovada por mais 30 dias.")
  }

  return (
    <Page
      bg="#f3eee6"
      blobs={[["#e9dcc6", "30%", 160, 520, 520], ["#ffc9a8", -100, -60, 380, 380], ["#b3c9f5", "85%", "70%", 380, 340]]}
      crumb="Prescrições"
      title="Prescrições"
      sub="Receitas emitidas por paciente e tipo (simples, controle especial, manipulação)."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar paciente ou medicamento" />
          <Seg options={["Todas", "Simples", "Controle especial", "Manipulação"]} value={type} onChange={setType} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("prescricoes", undefined, type !== "Todas" ? { tipo: type } : undefined)}>
            <Plus /> Emitir receita
          </button>
        </>
      }
    >
      <div className="vx-rx-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="vx-lbl" style={{ paddingLeft: 4 }}>Canhotos · {list.length}</div>
          {paged.visible.map((item) => (
            <button key={item.id} className={`vx-stub ${selected?.id === item.id ? "on" : ""}`} onClick={() => setSelectedId(item.id)}>
              <span className="bar" style={{ background: bar[typeOf(item)] }} />
              <span className="t">
                <strong style={{ fontSize: 14 }}>{item.animal}</strong>
                <small>{item.name}</small>
              </span>
              <span className="d">
                {fmtDate(itemDate(item), { day: "2-digit", month: "2-digit" })}
                <span style={{ fontSize: 10, color: "var(--vx-muted)", fontWeight: 600 }}>{typeOf(item) === "Simples" ? "simples" : typeOf(item) === "Manipulação" ? "manip." : "controle"}</span>
              </span>
            </button>
          ))}
          {!list.length && <div className="vx-glass vx-empty">Nenhuma receita encontrada.</div>}
          <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
        </div>

        {selected ? (
          <div className="vx-pad">
            <div className="paper vx-typed">
              <div className="vx-row" style={{ justifyContent: "space-between", padding: "14px 0 12px", borderBottom: "2px solid #1a2233", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Clínica VetFlow</div>
                  <div style={{ fontSize: 11, color: "#5b6474" }}>{unit.name} · {unit.street}, {unit.number} · {unit.city}/{unit.state}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#5b6474" }}>
                  {typeOf(selected).toUpperCase()}<br />Receita nº <b style={{ color: "#1a2233" }}>{selected.id.split("-").pop()}</b><br />{fmtDate(itemDate(selected))}
                </div>
              </div>
              <div className="vx-row" style={{ gap: 20, fontSize: 13, padding: "12px 0", color: "#3a4356", flexWrap: "wrap" }}>
                <span>Paciente: <b style={{ color: "#1a2233" }}>{selected.animal}</b> · {animal?.subtitle}</span>
                <span>Tutor: <b style={{ color: "#1a2233" }}>{selected.owner}</b></span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: "#1a2233", marginTop: 8, paddingBottom: 6, borderBottom: "1px solid #d5d9df" }}>PRESCRIÇÃO · USO VETERINÁRIO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10, fontSize: 15 }}>
                {rows.map((row, index) => (
                  <div key={index}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}><b>{index + 1}. {row.med}</b><span style={{ flex: 1, borderBottom: "1px dotted #9aa3b2" }} /><span style={{ fontSize: 13 }}>{row.qtd || "1 un."}</span></div>
                    <div style={{ fontSize: 13, color: "#3a4356", marginTop: 4, paddingLeft: 18 }}>
                      {[row.dose, row.via, row.freq && `a cada ${row.freq.replace(/^a cada /, "")}`, row.dur && `por ${row.dur}`].filter(Boolean).join(" · ") || "Conforme orientação do veterinário"}
                    </div>
                  </div>
                ))}
                {selected.extra?.orientacoes && <div style={{ fontSize: 13, color: "#3a4356" }}>{selected.extra.orientacoes}</div>}
              </div>
              <div className="vx-row" style={{ marginTop: "auto", justifyContent: "flex-end", alignItems: "flex-end", paddingTop: 30, gap: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <GovSign name={selected.professional || "Médico veterinário"} signed={!!selected.extra?.assinadoPor} by={selected.extra?.assinadoPor} when={selected.extra?.assinadoEm} />
                  <div style={{ width: 260, maxWidth: "100%", margin: "8px auto 0", borderTop: "1.5px solid #1a2233", paddingTop: 4, fontSize: 11, color: "#5b6474" }}>
                    {selected.professional} · {professional?.registration || `CRMV-${unit.state || "RO"}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="vx-glass vx-empty">Selecione um canhoto.</div>
        )}

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="vx-glass" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="vx-lbl">Na folha</div>
              <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 14 }}><span>Itens</span><b>{rows.length}</b></div>
              <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 14 }}><span>Situação</span><StatusPill status={selected.status} /></div>
              <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 14 }}><span>Validade</span><b>{selected.extra?.validade || "30 dias"}</b></div>
            </div>
            <button className="vx-btn vx-btn-g" onClick={() => navigate(`/prescricoes/${selected.id}`)}>Abrir ficha</button>
            <button className="vx-btn vx-btn-g" onClick={() => forms.open("prescricoes", selected)}>
              <Edit3 /> Editar receita
            </button>
            <button className="vx-btn vx-btn-g" onClick={renew}>Renovar</button>
            <button className="vx-btn vx-btn-g" onClick={() => window.print()}>
              <Printer /> Imprimir
            </button>
            {!selected.extra?.assinadoPor && <button className="vx-btn vx-btn-g" onClick={markSigned}>Marcar como assinada</button>}
            <button className="vx-btn vx-btn-p" onClick={sendToTutor} title="Simulado: registra o envio em Comunicação">
              <Send /> Enviar ao tutor (simulado)
            </button>
          </div>
        )}
      </div>
      {forms.node}
    </Page>
  )
}
