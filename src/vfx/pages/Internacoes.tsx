import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Activity, BedDouble, Check, LogOut, Plus, Trash2, X } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { activeAdmission, baiasExtras, bedAssignments, getBedLayout, salvarBaiasExtras, type BaiaExtra } from "../forms"
import { usePageForms } from "../hooks"
import { daysBetween, itemDate, Modal, Page, StatusPill, todayISO } from "../ui"

const sev = {
  Crítico: { c: "#b4322a", halo: "rgba(180,50,42,.18)", bg: "#fdf0ee" },
  Atenção: { c: "#c98a1b", halo: "rgba(201,138,27,.2)", bg: "#fff7e6" },
  Estável: { c: "#2b7a4b", halo: "rgba(43,122,75,.16)", bg: "rgba(255,255,255,.88)" },
}
const severity = (item: Item): keyof typeof sev => item.extra?.gravidade || (item.urgency ? "Crítico" : item.status === "Em observação" ? "Atenção" : "Estável")
const roomCols: Record<string, number> = { Canil: 3, UTI: 1, Gatil: 2, Isolamento: 1 }
type Med = { item: string; dose?: string; via?: string; freq?: string; inicio?: string }

export default function Internacoes() {
  const { data, updateItem, profile } = useVetFlow()
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [vForm, setVForm] = useState({ fc: "", fr: "", temp: "" })
  const [altaOpen, setAltaOpen] = useState(false)
  const [alta, setAlta] = useState({ motivo: "Melhora clínica", orientacoes: "", receita: false, retorno: "" })
  const [vErr, setVErr] = useState("")
  const navigate = useNavigate()
  const forms = usePageForms("internacoes", (saved) => setSelectedId(saved.id))
  /* baias criadas pela clínica */
  const [layoutVer, setLayoutVer] = useState(0)
  const layout = useMemo(() => getBedLayout(), [layoutVer])
  const extras = useMemo(() => baiasExtras(), [layoutVer])
  const [baiaOpen, setBaiaOpen] = useState(false)
  const [baia, setBaia] = useState({ room: "Canil", novaAla: "", bed: "", porte: "Médio", obs: "" })
  const [baiaErr, setBaiaErr] = useState("")
  const prefixo = (room: string) => (room.trim()[0] || "B").toUpperCase()
  const sugerirCodigo = (room: string) => {
    const r = layout.find((x) => x.room.toLowerCase() === room.trim().toLowerCase())
    const all = layout.flatMap((x) => x.beds)
    const p = r?.beds[0]?.split("-")[0] || prefixo(room)
    for (let i = (r?.beds.length || 0) + 1; i < 999; i++) {
      const code = `${p}-${String(i).padStart(2, "0")}`
      if (!all.includes(code)) return code
    }
    return `${p}-${Date.now() % 1000}`
  }
  const abrirNovaBaia = () => {
    setBaia({ room: "Canil", novaAla: "", bed: sugerirCodigo("Canil"), porte: "Médio", obs: "" })
    setBaiaErr("")
    setBaiaOpen(true)
  }
  const salvarBaia = () => {
    const room = (baia.room === "__nova" ? baia.novaAla : baia.room).trim()
    const bed = baia.bed.trim().toUpperCase()
    if (!room) return setBaiaErr("Dê um nome para a nova ala (ex.: Maternidade).")
    if (!bed) return setBaiaErr("Informe o código da baia (ex.: C-07).")
    if (layout.some((r) => r.beds.includes(bed))) return setBaiaErr(`Já existe uma baia ${bed}. Escolha outro código.`)
    const nova: BaiaExtra = { room, bed, porte: baia.porte, obs: baia.obs.trim() || undefined }
    salvarBaiasExtras([...extras, nova])
    setLayoutVer((v) => v + 1)
    setBaiaOpen(false)
    forms.toast(`Baia ${bed} criada na ala ${room}.`)
  }
  const removerBaia = (bed: string) => {
    if (map.has(bed)) return forms.toast(`A baia ${bed} está ocupada. Dê alta ou mova o paciente antes de remover.`)
    salvarBaiasExtras(extras.filter((b) => b.bed !== bed))
    setLayoutVer((v) => v + 1)
    forms.toast(`Baia ${bed} removida.`)
  }
  const { map, queue } = useMemo(() => bedAssignments(data.internacoes, data.animais), [data.internacoes, data.animais, layoutVer])
  const occupiedBeds = [...map.entries()]
  const [selectedId, setSelectedId] = useState(() => occupiedBeds.find(([, item]) => severity(item) === "Crítico")?.[1].id || occupiedBeds[0]?.[1].id || "")
  const selected = data.internacoes.find((item) => item.id === selectedId)
  const selectedBed = occupiedBeds.find(([, item]) => item.id === selectedId)?.[0]
  const freeBeds = layout.flatMap((room) => room.beds.filter((bed) => !map.has(bed)))
  const animal = data.animais.find((item) => item.id === selected?.animalId)
  /* só mostra o que foi prescrito de verdade (nada inventado) */
  const meds: Med[] = selected?.extra?.prescricao?.filter((row: Med) => row.item) || []
  const given: string[] = selected?.extra?.administrados || []
  /* B-02: sinais vitais só aparecem depois de alguém registrar */
  const vitals: { fc?: string; fr?: string; temp?: string; em?: string; por?: string } | null = selected?.extra?.parametrosAtuais || null
  const saveVitals = () => {
    if (!selected) return
    const n = (v: string) => Number(v.replace(",", "."))
    const fc = n(vForm.fc), fr = n(vForm.fr), t = n(vForm.temp)
    if ([vForm.fc, vForm.fr, vForm.temp].some((v) => v && Number.isNaN(n(v)))) return setVErr("Use apenas números (ex.: 38,5).")
    if (!vForm.fc && !vForm.fr && !vForm.temp) return setVErr("Preencha pelo menos um sinal vital.")
    if (vForm.temp && (t < 30 || t > 45)) return setVErr("Temperatura fora do possível. Confira o valor em °C.")
    const sp = data.animais.find((a) => a.id === selected.animalId)?.species || ""
    const range = /gat/i.test(sp) ? { fc: [140, 220], fr: [20, 40] } : { fc: [60, 160], fr: [10, 30] }
    const alerts = [vForm.temp && (t < 35 || t > 43) && `temperatura ${vForm.temp} °C`, vForm.fc && (fc < range.fc[0] || fc > range.fc[1]) && `FC ${fc} bpm`, vForm.fr && (fr < range.fr[0] || fr > range.fr[1]) && `FR ${fr} mpm`].filter(Boolean)
    if (alerts.length && !window.confirm(`Atenção: ${alerts.join(", ")} fora da faixa usual da espécie. Confirmar o registro?`)) return
    const rec = { fc: vForm.fc, fr: vForm.fr, temp: vForm.temp, em: new Date().toISOString(), por: profile.displayName }
    patch(selected, { parametrosAtuais: rec, historicoParametros: [...(selected.extra?.historicoParametros || []), rec] })
    setVitalsOpen(false); setVErr("")
    forms.toast(`Sinais vitais de ${selected.animal} registrados.`)
  }
  const patch = (item: Item, extra: Record<string, unknown>, rest: Partial<Item> = {}) => updateItem("internacoes", item.id, { ...rest, extra: { ...(item.extra || {}), ...extra } })
  const giveNext = () => {
    if (!selected) return
    const next = meds.find((med, index) => !given.includes(`${index}`))
    if (!next) return forms.toast("Todas as medicações do turno já foram registradas.")
    const index = meds.indexOf(next)
    patch(selected, { administrados: [...given, `${index}`], historicoMedicacao: [...(selected.extra?.historicoMedicacao || []), { item: next.item, em: new Date().toISOString() }] })
    forms.toast(`${next.item} registrado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`)
  }
  /* M-28: alta com confirmação e resumo */
  const discharge = () => {
    if (!selected) return
    if (!alta.orientacoes.trim()) return forms.toast("Escreva as orientações de alta para o tutor.")
    updateItem("internacoes", selected.id, { status: "Alta médica", extra: { ...(selected.extra || {}), box: "", alta: new Date().toISOString(), resumoAlta: { ...alta, por: profile.displayName } } })
    if (selected.animalId) updateItem("animais", selected.animalId, { status: "Ativo" })
    setAltaOpen(false)
    forms.toast(`${selected.animal} recebeu alta (${alta.motivo.toLowerCase()}). Baia ${selectedBed || ""} liberada.`)
    if (alta.receita) window.setTimeout(() => forms.open("prescricoes", undefined, { animalId: selected.animalId, orientacoes: alta.orientacoes }), 250)
  }
  /* M-29: desfazer a internação cancela/arquiva o contrato criado junto */
  const cancelAdmission = () => {
    if (!selected) return
    const motivo = window.prompt(`Cancelar a internação de ${selected.animal}? Informe o motivo:`)
    if (!motivo) return
    updateItem("internacoes", selected.id, { status: "Cancelada", extra: { ...(selected.extra || {}), box: "", cancelamento: { motivo, em: new Date().toISOString(), por: profile.displayName } } })
    data.documentos.filter((d) => d.extra?.internacaoId === selected.id || (d.name === "Contrato de internação" && d.animalId === selected.animalId && d.status === "Pendente")).forEach((d) => updateItem("documentos", d.id, { status: "Arquivado", extra: { ...(d.extra || {}), arquivadoMotivo: "Internação cancelada" } }))
    if (selected.animalId) updateItem("animais", selected.animalId, { status: "Ativo" })
    forms.toast(`Internação de ${selected.animal} cancelada. Contrato arquivado.`)
  }
  const moveTo = (bed: string) => {
    if (!selected || !bed) return
    patch(selected, { box: bed })
    forms.toast(`${selected.animal} movido para ${bed}.`)
  }

  return (
    <Page
      bg="#ecf3fa"
      blobs={[["#a7d7ff", 120, 220, 620, 520], ["#ffd1b0", "85%", -60, 360, 360], ["#b8e8dc", "62%", "75%", 300, 300]]}
      crumb="Internações"
      title="Internações"
      sub="Baias por ala com a gravidade de cada paciente (Estável, Atenção, Crítico). Toque numa baia livre para internar ali."
      actions={
        <>
          {(Object.keys(sev) as (keyof typeof sev)[]).map((key) => (
            <span key={key} className="vx-chip"><span className="vx-dot" style={{ background: sev[key].c }} />{key}</span>
          ))}
          <button className="vx-btn vx-btn-g" onClick={abrirNovaBaia}>
            <BedDouble /> Nova baia
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Internar
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="vx-int-grid">
        <div>
          <div className="vx-glass vx-plan" style={{ background: "rgba(255,255,255,.42)" }}>
            {layout.map((room, index) => (
              <div key={room.room} className="vx-room-plan" style={{ borderRadius: ["18px 0 0 0", "0 18px 0 0", "0 0 0 18px", "0 0 18px 0"][index] }}>
                <span className="nm">{room.room.toUpperCase()}</span>
                <div className="vx-beds" style={{ gridTemplateColumns: `repeat(${roomCols[room.room] || 2}, minmax(0,1fr))` }}>
                  {room.beds.map((bed) => {
                    const item = map.get(bed)
                    if (!item)
                      return (
                        <button key={bed} className="vx-bed free" onClick={() => forms.open("internacoes", undefined, { box: bed, tipo: room.room === "UTI" ? "UTI" : room.room === "Isolamento" ? "Isolamento" : "Clínica" })} aria-label={`Baia ${bed} livre, internar aqui`}>
                          <b style={{ fontSize: 12 }}>{bed}</b>
                          <span style={{ fontSize: 12 }}>livre · internar</span>
                          {extras.some((b) => b.bed === bed) && <span className="vx-bed-new">nova</span>}
                        </button>
                      )
                    const level = sev[severity(item)]
                    const nextMed = (item.extra?.prescricao || []).find((row: Med) => row.item)?.inicio || "—"
                    return (
                      <button key={bed} className={`vx-bed ${selectedId === item.id ? "on" : ""}`} style={{ background: level.bg }} onClick={() => setSelectedId(item.id)} aria-label={`Baia ${bed}: ${item.animal}`}>
                        <span className="vx-row" style={{ justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 800, color: "#5b6474" }}>{bed}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 800, color: level.c }}><span className="vx-dot" style={{ background: level.c, width: 9, height: 9, boxShadow: `0 0 0 3px ${level.halo}` }} />{severity(item)}</span>
                        </span>
                        <strong style={{ fontSize: 15 }}>{item.animal}</strong>
                        <span style={{ fontSize: 11, color: "#5b6474" }}>{item.name}</span>
                        <span className="vx-row" style={{ justifyContent: "space-between", marginTop: "auto", fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: "#3a4356" }}>dia {Math.max(1, daysBetween(itemDate(item), todayISO()) + 1)}</span>
                          <span style={{ color: "#2457c5" }}>⏱ {nextMed}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {queue.length > 0 && (
            <section className="vx-glass" style={{ padding: 16, marginTop: 16 }}>
              <div className="vx-row" style={{ justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                <span className="vx-lbl">Fila de espera por baia · {queue.length}</span>
                <span className="vx-hint">{freeBeds.length} baias livres</span>
              </div>
              <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
                {queue.slice(0, 24).map((item) => (
                  <span key={item.id} className="vx-chip" style={{ paddingRight: 4 }}>
                    <button onClick={() => navigate(`/internacoes/${item.id}`)} style={{ border: 0, background: "transparent", font: "inherit", color: "inherit", cursor: "pointer", fontWeight: 700 }}>{item.animal} · {item.name}</button>
                    <button className="vx-chip" style={{ minHeight: 22 }} disabled={!freeBeds.length} onClick={() => { updateItem("internacoes", item.id, { extra: { ...(item.extra || {}), box: freeBeds[0] } }); forms.toast(`${item.animal} alocado em ${freeBeds[0]}.`) }}>
                      Alocar
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}
          <div className="vx-row" style={{ gap: 10, marginTop: 14, fontSize: 13, color: "var(--vx-muted)" }}>
            <b style={{ color: "var(--vx-ink)" }}>{map.size}</b> internados nas baias ·
            <b style={{ color: "var(--vx-ink)" }}>{queue.length}</b> na fila ·
            <b style={{ color: "var(--vx-ink)" }}>{data.internacoes.filter((item) => /alta/i.test(item.status)).length}</b> altas no histórico
          </div>
        </div>

        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="vx-glass" style={{ padding: 18 }}>
              <div className="vx-row" style={{ justifyContent: "space-between" }}>
                <span className="vx-lbl">{selectedBed ? `Baia ${selectedBed}` : "Sem baia"}</span>
                <span className="vx-chip" style={{ background: sev[severity(selected)].bg, color: sev[severity(selected)].c, border: 0 }}>{severity(selected)}</span>
              </div>
              <button onClick={() => navigate(`/internacoes/${selected.id}`)} style={{ border: 0, background: "transparent", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{selected.animal}</div>
                <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>{animal?.subtitle} · {selected.name}</div>
              </button>
              <div style={{ marginTop: 6 }}><StatusPill status={selected.status} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 12, textAlign: "center" }}>
                {[["FC (bpm)", vitals?.fc], ["FR (mpm)", vitals?.fr], ["Temp. (°C)", vitals?.temp]].map(([label, value]) => (
                  <div key={label} style={{ padding: 8, borderRadius: 12, background: "var(--vx-glass-strong)" }}>
                    <div className={value ? "vx-num" : ""} style={{ fontSize: value ? 20 : 12, fontWeight: value ? undefined : 700, color: value ? undefined : "var(--vx-muted)", minHeight: 26, display: "grid", placeItems: "center" }}>{value || "Sem registro"}</div>
                    <div style={{ fontSize: 11, color: "var(--vx-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--vx-muted)" }}>{vitals?.em ? `Último registro ${new Date(vitals.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${vitals.por ? ` · ${vitals.por}` : ""}` : "Nenhuma medição registrada ainda."}</span>
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => { setVForm({ fc: "", fr: "", temp: "" }); setVErr(""); setVitalsOpen(true) }}><Activity /> Registrar sinais vitais</button>
              </div>
            </div>
            <div className="vx-glass" style={{ padding: 18 }}>
              <div className="vx-lbl">Relógio de medicação</div>
              {!meds.length && <p style={{ fontSize: 13, color: "var(--vx-muted)", margin: "10px 0" }}>Nenhuma medicação prescrita. Use “Editar” para adicionar a prescrição da internação.</p>}
              <div style={{ marginTop: 12 }}>
                {meds.map((med, index) => {
                  const done = given.includes(`${index}`)
                  return (
                    <div key={index} className="vx-row" style={{ gap: 12, alignItems: "stretch" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2.5px solid ${done ? "#2b7a4b" : "#2457c5"}`, background: done ? "#2b7a4b" : "transparent", flex: "none" }} />
                        <span style={{ flex: 1, width: 2, background: "var(--vx-line)" }} />
                      </div>
                      <div style={{ paddingBottom: 12, flex: 1 }}>
                        <div className="vx-row" style={{ justifyContent: "space-between", gap: 8 }}>
                          <b style={{ fontSize: 13 }}>{med.item} {med.dose ? `· ${med.dose}` : ""}</b>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 800, color: done ? "#2b7a4b" : "#2457c5" }}>{med.inicio || "—"}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--vx-muted)" }}>{done ? "registrado" : `${med.via || ""} ${med.freq || ""}`}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="vx-btn vx-btn-p" style={{ width: "100%" }} onClick={giveNext} disabled={!meds.length}>
                <Check /> Registrar próxima medicação
              </button>
            </div>
            <label className="vx-glass vx-f" style={{ padding: 14 }}>
              <span className="vx-fl">Mover para outra baia</span>
              <select className="vx-in" value="" onChange={(event) => moveTo(event.target.value)}>
                <option value="">Escolha uma baia livre</option>
                {freeBeds.map((bed) => <option key={bed}>{bed}</option>)}
              </select>
            </label>
            <div className="vx-row" style={{ gap: 8 }}>
              <button className="vx-btn vx-btn-g" style={{ flex: 1 }} onClick={() => forms.open("internacoes", selected)}>Editar</button>
              <button className="vx-btn vx-btn-d" style={{ flex: 1 }} onClick={() => { setAlta({ motivo: "Melhora clínica", orientacoes: "", receita: false, retorno: "" }); setAltaOpen(true) }} disabled={!activeAdmission(selected)}>
                <LogOut /> Dar alta
              </button>
            </div>
            {activeAdmission(selected) && <button className="vx-btn vx-btn-g vx-btn-sm" onClick={cancelAdmission}><X /> Cancelar internação</button>}
          </div>
        ) : (
          <div className="vx-glass vx-empty">Toque numa baia ocupada.</div>
        )}
      </div>
      <style>{`@media (max-width: 1100px){ .vx-int-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {vitalsOpen && selected && (
        <div className="vx-modal-layer" role="dialog" aria-modal="true" aria-label="Registrar sinais vitais" onMouseDown={() => setVitalsOpen(false)}>
          <div className="vx-modal" onMouseDown={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 18 }}>Sinais vitais · {selected.animal}</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 14 }}>
              {([["fc", "FC (bpm)"], ["fr", "FR (mpm)"], ["temp", "Temperatura (°C)"]] as const).map(([k, l]) => (
                <label key={k} className="vx-f"><span className="vx-fl">{l}</span><input className="vx-in" inputMode="decimal" value={vForm[k]} onChange={(e) => setVForm({ ...vForm, [k]: e.target.value.replace(/[^\d,.]/g, "") })} autoFocus={k === "fc"} /></label>
              ))}
            </div>
            {vErr && <div className="vx-note" role="alert" style={{ marginTop: 10, color: "#b4322a" }}>{vErr}</div>}
            <div className="vx-row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button className="vx-btn vx-btn-g" onClick={() => setVitalsOpen(false)}>Cancelar</button><button className="vx-btn vx-btn-p" onClick={saveVitals}>Salvar sinais vitais</button></div>
          </div>
        </div>
      )}
      {altaOpen && selected && (
        <div className="vx-modal-layer" role="dialog" aria-modal="true" aria-label="Dar alta" onMouseDown={() => setAltaOpen(false)}>
          <div className="vx-modal" style={{ width: "min(520px, 100%)" }} onMouseDown={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 18 }}>Dar alta a {selected.animal}?</strong>
            <p style={{ fontSize: 13, color: "var(--vx-muted)", margin: "6px 0 12px" }}>Internado desde {itemDate(selected).split("-").reverse().join("/")} · {selectedBed ? `baia ${selectedBed}` : "sem baia"}. A baia será liberada.</p>
            <label className="vx-f"><span className="vx-fl">Motivo da alta</span><select className="vx-in" value={alta.motivo} onChange={(e) => setAlta({ ...alta, motivo: e.target.value })}>{["Melhora clínica", "Alta a pedido do tutor", "Transferência para outra clínica", "Óbito"].map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="vx-f" style={{ marginTop: 10 }}><span className="vx-fl">Orientações ao tutor *</span><textarea className="vx-in" style={{ minHeight: 90 }} value={alta.orientacoes} placeholder="Medicação em casa, alimentação, repouso, sinais de alerta…" onChange={(e) => setAlta({ ...alta, orientacoes: e.target.value })} /></label>
            <label className="vx-f" style={{ marginTop: 10 }}><span className="vx-fl">Retorno</span><input className="vx-in" type="date" value={alta.retorno} min={todayISO()} onChange={(e) => setAlta({ ...alta, retorno: e.target.value })} /></label>
            <label className="vx-row" style={{ gap: 8, marginTop: 10, fontSize: 13 }}><input type="checkbox" checked={alta.receita} onChange={(e) => setAlta({ ...alta, receita: e.target.checked })} /> Emitir receita de alta em seguida</label>
            <div className="vx-row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button className="vx-btn vx-btn-g" onClick={() => setAltaOpen(false)}>Voltar</button><button className="vx-btn vx-btn-d" onClick={discharge}><LogOut /> Confirmar alta</button></div>
          </div>
        </div>
      )}
      {baiaOpen && (
        <Modal
          title="Nova baia"
          text="A baia aparece no mapa na hora e já pode receber um paciente. Pacientes da fila de espera ocupam a baia nova automaticamente."
          onClose={() => setBaiaOpen(false)}
          actions={
            <>
              <button className="vx-btn vx-btn-g" onClick={() => setBaiaOpen(false)}>Cancelar</button>
              <button className="vx-btn vx-btn-p" onClick={salvarBaia}><Check /> Criar baia</button>
            </>
          }
        >
          <div className="vx-baia-form">
            <label>
              <span>Ala</span>
              <select className="vx-in" value={baia.room} onChange={(e) => setBaia({ ...baia, room: e.target.value, bed: e.target.value === "__nova" ? (baia.novaAla ? sugerirCodigo(baia.novaAla) : "") : sugerirCodigo(e.target.value) })}>
                {layout.map((r) => <option key={r.room} value={r.room}>{r.room} · {r.beds.length} baias</option>)}
                <option value="__nova">+ Nova ala…</option>
              </select>
            </label>
            {baia.room === "__nova" && (
              <label>
                <span>Nome da nova ala</span>
                <input className="vx-in" autoFocus value={baia.novaAla} placeholder="Ex.: Maternidade, Exóticos" onChange={(e) => setBaia({ ...baia, novaAla: e.target.value, bed: sugerirCodigo(e.target.value) })} />
              </label>
            )}
            <label>
              <span>Código da baia</span>
              <input className="vx-in" value={baia.bed} placeholder="Ex.: C-07" onChange={(e) => setBaia({ ...baia, bed: e.target.value.toUpperCase() })} />
            </label>
            <label>
              <span>Porte</span>
              <select className="vx-in" value={baia.porte} onChange={(e) => setBaia({ ...baia, porte: e.target.value })}>
                {["Pequeno", "Médio", "Grande", "Gigante", "Gaiola / exóticos"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="full">
              <span>Observação</span>
              <input className="vx-in" value={baia.obs} placeholder="Ex.: com oxigênio, perto do posto de enfermagem" onChange={(e) => setBaia({ ...baia, obs: e.target.value })} />
            </label>
            {baiaErr && <p className="vx-baia-err" role="alert">{baiaErr}</p>}
          </div>
          {extras.length > 0 && (
            <div className="vx-baia-list">
              <span className="vx-lbl">Baias criadas pela clínica</span>
              {extras.map((b) => (
                <div key={b.bed}>
                  <b>{b.bed}</b>
                  <span>{b.room}{b.porte ? ` · ${b.porte}` : ""}{b.obs ? ` · ${b.obs}` : ""}</span>
                  <em>{map.has(b.bed) ? "ocupada" : "livre"}</em>
                  <button type="button" className="vx-icon-btn" aria-label={`Remover baia ${b.bed}`} title={map.has(b.bed) ? "Ocupada: não pode remover" : "Remover baia"} disabled={map.has(b.bed)} onClick={() => removerBaia(b.bed)}><Trash2 /></button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      {forms.node}
    </Page>
  )
}
