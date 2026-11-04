import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, fmtLong, initials, itemDate, matches, Page, SearchBox, Seg, todayISO } from "../ui"

const onDuty = (status: string) => /ativo|plant/i.test(status) && !/inativo/i.test(status)

export default function Profissionais() {
  const { data, staff } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("profissionais")
  const [filter, setFilter] = useState("Todos")
  const [query, setQuery] = useState("")
  const agendaDays = useMemo(() => [...new Set(data.agendas.map(itemDate))].sort(), [data.agendas])
  const [day, setDay] = useState(() => {
    const today = todayISO()
    return agendaDays.includes(today) ? today : agendaDays.find((value) => value >= today) || agendaDays[agendaDays.length - 1] || today
  })
  const isVet = (item: Item) => /crmv/i.test(item.registration || item.subtitle) || /^dra?\./i.test(item.name)
  /* equipe completa: profissionais cadastrados + todos os usuários do sistema (vendedor, caixa, estoque, entregador...) */
  const team = useMemo(() => {
    const norm = (t: string) => t.toLowerCase().replace(/^(dra?\.)\s*/, "").trim()
    const known = new Set(data.profissionais.map((p) => norm(p.name)))
    const extra = staff.filter((u) => !known.has(norm(u.displayName)) && !known.has(norm(u.name))).map((u) => ({
      id: `staff-${u.id}`, name: u.displayName, subtitle: `${u.role} • ${u.email}`, status: u.active ? "Ativo" : "Inativo", category: u.role,
      registration: u.crmv || (u.code ? `Cód. ${u.code}` : "—"), phone: `@${u.username}`, unitId: "", createdAt: "", extra: { staffId: u.id, papel: u.role },
    }) as unknown as Item)
    return [...data.profissionais, ...extra]
  }, [data.profissionais, staff])
  const pros = team.filter(
    (item) => matches(item, query) && (filter === "Todos" || (filter === "Veterinários" ? isVet(item) : !isVet(item))),
  )
  const dayAgenda = data.agendas.filter((item) => itemDate(item) === day)
  const countFor = (item: Item) => dayAgenda.filter((agenda) => agenda.professionalId === item.id).length
  const hours = Array.from({ length: 13 }, (_, index) => 7 + index)
  const coverage = hours.map((hour) => {
    const slot = dayAgenda.filter((item) => Number((item.time || "0").split(":")[0]) === hour)
    return { hour, count: slot.length, pros: new Set(slot.map((item) => item.professionalId)).size }
  })
  const max = Math.max(1, ...coverage.map((slot) => slot.count))
  const vets = team.filter(isVet).length

  return (
    <Page
      bg="#eef2f8"
      blobs={[["#9ec5ff", -140, 120, 520, 520], ["#ffc7a0", "80%", 200, 460, 380], ["#b8e8dc", "42%", 600, 380, 300]]}
      crumb="Profissionais"
      title="Profissionais"
      sub="Toda a equipe: veterinários, vendedores, caixa, estoque e entregadores, com especialidade, situação e agenda do dia."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar profissional" />
          <Seg options={[["Todos", `Todos ${team.length}`], ["Veterinários", `Veterinários ${vets}`], ["Equipe", `Equipe ${team.length - vets}`]]} value={filter} onChange={setFilter} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Novo profissional
          </button>
        </>
      }
    >
      <div className="vx-rail">
        <div className="vx-badges">
          {pros.map((item, index) => {
            const color = item.extra?.cor || colorFor(item.name)
            const active = onDuty(item.status)
            const rotation = [-2.5, 1.8, -1, 2.6, -1.6, 1.2][index % 6]
            return (
              <button
                key={item.id}
                className="vx-badge"
                style={{ transform: `rotate(${rotation}deg)` }}
                onClick={() => navigate(item.extra?.staffId ? `/usuarios?u=${item.extra.staffId}` : `/profissionais/${item.id}`)}
                aria-label={`Abrir ficha de ${item.name}`}
              >
                <span className="cord" style={{ height: 22 + (index % 3) * 12, background: color }} />
                <span className="clip" />
                <span className="vx-glass card" style={{ opacity: active ? 1 : 0.7 }}>
                  <span className="band" style={{ display: "flex", background: `linear-gradient(135deg, ${color}aa, ${color})` }}>
                    <i />
                  </span>
                  <span className="who">
                    <span className="vx-av" style={{ background: color }}>
                      {initials(item.name)}
                    </span>
                    <strong style={{ fontSize: 16, marginTop: 6, textAlign: "center" }}>{item.name}</strong>
                    <span style={{ fontSize: 12, color: "var(--vx-muted)", textAlign: "center" }}>{item.category || "Equipe"}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--vx-ink2)", letterSpacing: ".06em" }}>{item.registration || item.subtitle.split(" • ")[1] || "—"}</span>
                    <span className="vx-chip" style={{ marginTop: 8, background: active ? "#d5f3ec" : "rgba(26,34,51,.07)", color: active ? "#0b5b53" : "#3a4356", border: 0 }}>
                      <span className="vx-dot" style={{ background: "currentColor" }} />
                      {item.status}
                    </span>
                    <span className="meta">
                      <span>Agenda do dia</span>
                      <b>{countFor(item)} atend.</b>
                    </span>
                    <span className="meta" style={{ borderTop: 0, marginTop: 0, paddingTop: 2 }}>
                      <span>Contato</span>
                      <b>{item.phone || "—"}</b>
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
          {!pros.length && <div className="vx-glass vx-empty">Nenhum profissional encontrado.</div>}
        </div>
      </div>

      <section className="vx-glass" style={{ padding: "18px 22px", marginTop: 26 }}>
        <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Cobertura do dia · {fmtLong(day)}</strong>
          <div className="vx-row" style={{ gap: 8 }}>
            <button className="vx-icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}>
              <ChevronLeft />
            </button>
            <button className="vx-chip" onClick={() => setDay(todayISO())}>Hoje</button>
            <button className="vx-icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}>
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="vx-cover">
          {coverage.map((slot) => (
            <button
              key={slot.hour}
              title={`${slot.hour}h · ${slot.count} atendimentos · ${slot.pros} profissionais`}
              onClick={() => navigate("/agendas")}
              style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 3, height: "100%", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
            >
              <span style={{ height: `${(slot.pros / Math.max(1, data.profissionais.length)) * 100}%`, minHeight: slot.pros ? 4 : 0, background: "#5ec4b6", borderRadius: "6px 6px 2px 2px" }} />
              <span style={{ height: `${(slot.count / max) * 70}%`, minHeight: slot.count ? 4 : 2, background: "#2457c5", borderRadius: "2px 2px 6px 6px", opacity: slot.count ? 1 : 0.2 }} />
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(13, minmax(0, 1fr))", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--vx-muted)", textAlign: "center", marginTop: 6 }}>
          {hours.map((hour) => (
            <span key={hour}>{hour}h</span>
          ))}
        </div>
        <div className="vx-row" style={{ gap: 14, fontSize: 12, color: "var(--vx-muted)", marginTop: 8 }}>
          <span className="vx-row" style={{ gap: 6 }}><span className="vx-dot" style={{ background: "#2457c5" }} />Atendimentos</span>
          <span className="vx-row" style={{ gap: 6 }}><span className="vx-dot" style={{ background: "#5ec4b6" }} />Profissionais escalados</span>
        </div>
      </section>
      {forms.node}
    </Page>
  )
}
