import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Check, LogOut, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { activeAdmission, bedAssignments, bedLayout } from "../forms"
import { usePageForms } from "../hooks"
import { daysBetween, hash, itemDate, Page, StatusPill, todayISO } from "../ui"

const sev = {
  Crítico: { c: "#b4322a", halo: "rgba(180,50,42,.18)", bg: "#fdf0ee" },
  Atenção: { c: "#c98a1b", halo: "rgba(201,138,27,.2)", bg: "#fff7e6" },
  Estável: { c: "#2b7a4b", halo: "rgba(43,122,75,.16)", bg: "rgba(255,255,255,.88)" },
}
const severity = (item: Item): keyof typeof sev => item.extra?.gravidade || (item.urgency ? "Crítico" : item.status === "Em observação" ? "Atenção" : "Estável")
const roomCols: Record<string, number> = { Canil: 3, UTI: 1, Gatil: 2, Isolamento: 1 }
type Med = { item: string; dose?: string; via?: string; freq?: string; inicio?: string }

export default function Internacoes() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("internacoes", (saved) => setSelectedId(saved.id))
  const { map, queue } = useMemo(() => bedAssignments(data.internacoes, data.animais), [data.internacoes, data.animais])
  const occupiedBeds = [...map.entries()]
  const [selectedId, setSelectedId] = useState(() => occupiedBeds.find(([, item]) => severity(item) === "Crítico")?.[1].id || occupiedBeds[0]?.[1].id || "")
  const selected = data.internacoes.find((item) => item.id === selectedId)
  const selectedBed = occupiedBeds.find(([, item]) => item.id === selectedId)?.[0]
  const freeBeds = bedLayout.flatMap((room) => room.beds.filter((bed) => !map.has(bed)))
  const animal = data.animais.find((item) => item.id === selected?.animalId)
  const meds: Med[] = selected?.extra?.prescricao?.filter((row: Med) => row.item) || (selected ? [{ item: "Fluidoterapia RL", dose: "5 mL/kg/h", via: "IV", freq: "contínuo", inicio: "08:00" }, { item: "Dipirona 25 mg/kg", via: "IV", freq: "8/8 h", inicio: "10:00" }, { item: "Aferir parâmetros", freq: "4/4 h", inicio: "12:00" }] : [])
  const given: string[] = selected?.extra?.administrados || []
  const seed = selected ? hash(selected.id) : 0
  const vitals = selected?.extra?.parametrosAtuais || { fc: 90 + (seed % 60), fr: 20 + (seed % 25), temp: (37.8 + (seed % 14) / 10).toFixed(1).replace(".", ",") }
  const patch = (item: Item, extra: Record<string, unknown>, rest: Partial<Item> = {}) => updateItem("internacoes", item.id, { ...rest, extra: { ...(item.extra || {}), ...extra } })
  const giveNext = () => {
    if (!selected) return
    const next = meds.find((med, index) => !given.includes(`${index}`))
    if (!next) return forms.toast("Todas as medicações do turno já foram registradas.")
    const index = meds.indexOf(next)
    patch(selected, { administrados: [...given, `${index}`], historicoMedicacao: [...(selected.extra?.historicoMedicacao || []), { item: next.item, em: new Date().toISOString() }] })
    forms.toast(`${next.item} registrado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`)
  }
  const discharge = () => {
    if (!selected) return
    updateItem("internacoes", selected.id, { status: "Alta médica", extra: { ...(selected.extra || {}), box: "", alta: new Date().toISOString() } })
    if (selected.animalId) updateItem("animais", selected.animalId, { status: "Ativo" })
    forms.toast(`${selected.animal} recebeu alta. Baia liberada.`)
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
      title="Mapa de leitos"
      sub="A planta da internação vista de cima. A cor da baia é a gravidade; toque numa baia livre para internar ali."
      actions={
        <>
          {(Object.keys(sev) as (keyof typeof sev)[]).map((key) => (
            <span key={key} className="vx-chip"><span className="vx-dot" style={{ background: sev[key].c }} />{key}</span>
          ))}
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Internar
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="vx-int-grid">
        <div>
          <div className="vx-glass vx-plan" style={{ background: "rgba(255,255,255,.42)" }}>
            {bedLayout.map((room, index) => (
              <div key={room.room} className="vx-room-plan" style={{ borderRadius: ["18px 0 0 0", "0 18px 0 0", "0 0 0 18px", "0 0 18px 0"][index] }}>
                <span className="nm">{room.room.toUpperCase()}</span>
                <div className="vx-beds" style={{ gridTemplateColumns: `repeat(${roomCols[room.room]}, minmax(0,1fr))` }}>
                  {room.beds.map((bed) => {
                    const item = map.get(bed)
                    if (!item)
                      return (
                        <button key={bed} className="vx-bed free" onClick={() => forms.open("internacoes", undefined, { box: bed, tipo: room.room === "UTI" ? "UTI" : room.room === "Isolamento" ? "Isolamento" : "Clínica" })} aria-label={`Baia ${bed} livre, internar aqui`}>
                          <b style={{ fontSize: 12 }}>{bed}</b>
                          <span style={{ fontSize: 12 }}>livre · internar</span>
                        </button>
                      )
                    const level = sev[severity(item)]
                    const nextMed = (item.extra?.prescricao || []).find((row: Med) => row.item)?.inicio || `${String(8 + (hash(item.id) % 10)).padStart(2, "0")}:00`
                    return (
                      <button key={bed} className={`vx-bed ${selectedId === item.id ? "on" : ""}`} style={{ background: level.bg }} onClick={() => setSelectedId(item.id)} aria-label={`Baia ${bed}: ${item.animal}`}>
                        <span className="vx-row" style={{ justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 800, color: "#5b6474" }}>{bed}</span>
                          <span className="vx-dot" style={{ background: level.c, width: 10, height: 10, boxShadow: `0 0 0 4px ${level.halo}` }} />
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
            <b style={{ color: "var(--vx-ink)" }}>{data.internacoes.filter(activeAdmission).length}</b> internados ·
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
                {[["FC", vitals.fc], ["FR", vitals.fr], ["°C", vitals.temp]].map(([label, value]) => (
                  <div key={label} style={{ padding: 8, borderRadius: 12, background: "var(--vx-glass-strong)" }}>
                    <div className="vx-num" style={{ fontSize: 20 }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--vx-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="vx-glass" style={{ padding: 18 }}>
              <div className="vx-lbl">Relógio de medicação</div>
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
              <button className="vx-btn vx-btn-p" style={{ width: "100%" }} onClick={giveNext}>
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
              <button className="vx-btn vx-btn-d" style={{ flex: 1 }} onClick={discharge} disabled={!activeAdmission(selected)}>
                <LogOut /> Dar alta
              </button>
            </div>
          </div>
        ) : (
          <div className="vx-glass vx-empty">Toque numa baia ocupada.</div>
        )}
      </div>
      <style>{`@media (max-width: 1100px){ .vx-int-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
