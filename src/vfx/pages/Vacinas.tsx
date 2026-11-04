import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { MessageCircle, Plus, Printer, Search } from "lucide-react"
import { normalize, useVetFlow } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, daysBetween, fmtDate, initials, itemDate, Page, Seg, todayISO, useQueryParam } from "../ui"

export default function Vacinas() {
  const { data, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("vacinas", (saved) => saved.animalId && setAnimalId(saved.animalId))
  const initialFilter = useQueryParam("filtro")
  const [radar, setRadar] = useState<"Atrasada" | "A vencer">(initialFilter === "A vencer" ? "A vencer" : "Atrasada")
  const [query, setQuery] = useState("")
  const paramAnimal = useQueryParam("animal")
  const [animalId, setAnimalId] = useState(() => {
    const byParam = data.animais.find((item) => item.id === paramAnimal || normalize(item.name) === normalize(paramAnimal))
    if (byParam) return byParam.id
    const recent = [...data.vacinas].sort((a, b) => itemDate(b).localeCompare(itemDate(a)))[0]
    return recent?.animalId || data.animais[0]?.id || ""
  })
  const animal = data.animais.find((item) => item.id === animalId)
  const tutor = data.tutores.find((item) => item.id === animal?.ownerId)
  const doses = useMemo(
    () => data.vacinas.filter((item) => item.animalId === animalId).sort((a, b) => itemDate(a).localeCompare(itemDate(b))),
    [animalId, data.vacinas],
  )
  const upcoming = doses
    .filter((item) => item.status !== "Aplicada" || (item.dueDate && item.dueDate >= todayISO()))
    .map((item) => ({ item, when: item.status === "Aplicada" ? item.dueDate! : itemDate(item) }))
    .sort((a, b) => a.when.localeCompare(b.when))[0]
  const searchResults = query.trim()
    ? data.animais.filter((item) => normalize(`${item.name} ${item.owner}`).includes(normalize(query))).slice(0, 6)
    : []
  const late = data.vacinas.filter((item) => item.status === "Atrasada")
  const soon = data.vacinas.filter((item) => item.status === "A vencer")
  const radarList = (radar === "Atrasada" ? late : soon).slice(0, 7)

  const remind = () => {
    const owners = new Map<string, string>()
    late.forEach((item) => item.ownerId && !owners.has(item.ownerId) && owners.set(item.ownerId, item.animalId || ""))
    let sent = 0
    owners.forEach((petId) => {
      if (sent >= 40) return
      addItem("comunicacao", { name: "Lembrete de vacina", animalId: petId, status: "Enviada", category: "WhatsApp", extra: { mensagem: "Olá! A vacina do seu pet está atrasada. Responda para agendar." } })
      sent++
    })
    forms.toast(`${sent} lembretes registrados em Comunicação (envio simulado: nenhuma mensagem real sai desta versão).`)
  }

  return (
    <Page
      bg="#eef6f0"
      blobs={[["#9fe3c6", 160, 200, 560, 520], ["#ffd39a", "80%", -60, 380, 380], ["#ffb8b0", "65%", 600, 300, 300]]}
      crumb="Vacinas"
      title="Vacinas"
      sub="Vacinas aplicadas e próximas doses de cada paciente."
      actions={
        <>
          <div style={{ position: "relative" }}>
            <label className="vx-search">
              <Search />
              <input aria-label="Abrir carteirinha de" placeholder="Abrir carteirinha de…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            {searchResults.length > 0 && (
              <div className="vx-pick-list" style={{ position: "absolute", left: 0, right: 0, zIndex: 5 }}>
                {searchResults.map((item) => (
                  <button key={item.id} onClick={() => { setAnimalId(item.id); setQuery("") }}>
                    <span className="vx-av" style={{ width: 28, height: 28, fontSize: 10, background: colorFor(item.name) }}>{initials(item.name)}</span>
                    <span><strong>{item.name}</strong><small>{item.subtitle} · {item.owner}</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="vx-btn vx-btn-g" onClick={() => window.print()}>
            <Printer /> Imprimir
          </button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("vacinas", undefined, paramAnimal ? { animalId } : undefined)}>
            <Plus /> Registrar aplicação
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 24, alignItems: "start" }} className="vx-vac-grid">
        <div className="vx-booklet">
          <div className="spine" />
          <div className="pg">
            <div className="vx-lbl" style={{ color: "var(--vx-teal)" }}>Carteira nº {animal ? String(data.animais.indexOf(animal) + 1).padStart(4, "0") : "—"} · {animal ? "ativa" : "—"}</div>
            {animal ? (
              <>
                <div className="vx-row" style={{ gap: 16 }}>
                  <span className="vx-av" style={{ width: 84, height: 84, fontSize: 28, borderRadius: 26, background: colorFor(animal.id) }}>{initials(animal.name)}</span>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em" }}>{animal.name}</div>
                    <div style={{ fontSize: 14, color: "var(--vx-muted)" }}>{animal.subtitle} · {animal.sex || "sexo não informado"}</div>
                    <button className="vx-chip" style={{ marginTop: 6 }} onClick={() => tutor && navigate(`/tutores/${tutor.id}`)}>Tutor: {animal.owner}</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(15,118,110,.07)" }}><div className="vx-lbl" style={{ fontSize: 10 }}>Doses registradas</div><b>{doses.length}</b></div>
                  <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(15,118,110,.07)" }}><div className="vx-lbl" style={{ fontSize: 10 }}>Situação</div><b>{doses.some((item) => item.status === "Atrasada") ? "Com atraso" : "Em dia"}</b></div>
                </div>
                <div style={{ marginTop: "auto", padding: 18, borderRadius: 20, background: "#0f766e", color: "#fff" }}>
                  <div className="vx-lbl" style={{ color: "rgba(255,255,255,.8)" }}>Próxima dose</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{upcoming ? upcoming.item.name : "Nenhuma programada"}</div>
                  <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 10, gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{upcoming ? fmtDate(upcoming.when) : "—"}</span>
                    {upcoming && (
                      <span className="vx-chip" style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: 0 }}>
                        {daysBetween(todayISO(), upcoming.when) >= 0 ? `em ${daysBetween(todayISO(), upcoming.when)} dias` : `${-daysBetween(todayISO(), upcoming.when)} dias atrás`}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="vx-empty">Escolha um paciente na busca.</div>
            )}
          </div>
          <div className="pg">
            <div className="vx-row" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: 17 }}>Doses</strong>
              <span style={{ fontSize: 12, color: "var(--vx-muted)" }}>toque para abrir</span>
            </div>
            <div className="vx-doses">
              {doses.map((item, index) => (
                <button key={item.id} className={`vx-dose ${item.status !== "Aplicada" ? "pend" : ""}`} onClick={() => navigate(`/vacinas/${item.id}`)}>
                  <strong style={{ fontSize: 12, textAlign: "center" }}>{item.name.replace("Vacina ", "")}</strong>
                  {item.status === "Aplicada" ? (
                    <span className="vx-stamp" style={{ color: colorFor(item.name), transform: `rotate(${[-8, 6, -4, 9, -10][index % 5]}deg)` }}>
                      <small>APLICADA</small>
                      <b>{fmtDate(itemDate(item), { day: "2-digit", month: "2-digit", year: "2-digit" })}</b>
                    </span>
                  ) : item.status === "Atrasada" ? (
                    <span className="vx-late">ATRASADA</span>
                  ) : (
                    <span style={{ width: 74, height: 74, borderRadius: "50%", border: "2px dashed rgba(26,34,51,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--vx-muted)" }}>
                      {fmtDate(item.dueDate || itemDate(item), { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--vx-muted)", textAlign: "center" }}>{item.professional || "—"}</span>
                </button>
              ))}
              <button className="vx-dose pend" onClick={() => forms.open("vacinas", undefined, { animalId })} style={{ justifyContent: "center", color: "var(--vx-accent)" }}>
                <Plus /> <strong>Nova dose</strong>
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="vx-glass" style={{ padding: 18 }}>
            <div className="vx-lbl">Radar de reforços</div>
            <div className="vx-row" style={{ gap: 18, marginTop: 10 }}>
              <button onClick={() => setRadar("Atrasada")} style={{ border: 0, background: "transparent", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
                <div className="vx-num" style={{ fontSize: 32, color: "var(--vx-red)" }}>{late.length}</div>
                <div style={{ fontSize: 12, color: "var(--vx-muted)" }}>atrasadas</div>
              </button>
              <button onClick={() => setRadar("A vencer")} style={{ border: 0, background: "transparent", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
                <div className="vx-num" style={{ fontSize: 32, color: "var(--vx-amber)" }}>{soon.length}</div>
                <div style={{ fontSize: 12, color: "var(--vx-muted)" }}>a vencer</div>
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <Seg options={["Atrasada", "A vencer"]} value={radar} onChange={setRadar} />
            </div>
          </div>
          {radarList.map((item) => (
            <button key={item.id} className="vx-glass vx-clickable" style={{ padding: "12px 14px", borderRadius: 18, display: "flex", alignItems: "center", gap: 12, font: "inherit", color: "inherit", textAlign: "left" }} onClick={() => item.animalId && setAnimalId(item.animalId)}>
              <span style={{ width: 10, height: 40, borderRadius: 4, background: radar === "Atrasada" ? "#b4322a" : "#c98a1b" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 14 }}>{item.animal}</strong>
                <small style={{ fontSize: 12, color: "var(--vx-muted)" }}>{item.name}</small>
              </span>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{fmtDate(item.dueDate || itemDate(item), { day: "2-digit", month: "2-digit" })}</span>
            </button>
          ))}
          <button className="vx-btn vx-btn-g" onClick={remind} disabled={!late.length}>
            <MessageCircle /> Lembrar tutores por WhatsApp
          </button>
        </div>
      </div>
      <style>{`@media (max-width: 1100px){ .vx-vac-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
