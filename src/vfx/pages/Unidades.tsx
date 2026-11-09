import { clinicMetrics } from "../../metrics"
import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { Building2, Edit3, LogIn, MapPinned, Plus, Power, Stethoscope, Users } from "lucide-react"
import { useVetFlow, type Item, type Unit } from "../../store"
import { usePageForms } from "../hooks"
import { brl, colorFor, hash, Seg } from "../ui"
import { CadastroLista, Duo, Ident, ModoSwitch, Status, useModo } from "../CadastroLista"

const unitItem = (unit: Unit): Item => ({ id: unit.id, name: unit.name, subtitle: unit.city, status: unit.status, createdAt: "", extra: { name: unit.name, cnpj: unit.cnpj, phone: unit.phone, email: unit.email, street: unit.street, number: unit.number, neighborhood: unit.neighborhood, city: unit.city, state: unit.state, cep: unit.cep, responsible: unit.responsible, status: unit.status, ...(unit.extra || {}) } })

function UnidadesMapa({ modo }: { modo: ReactNode }) {
  const { units, activeUnitId, setActiveUnitId, updateUnit, allData } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("unidades", (saved) => setSelectedId(saved.id))
  const [selectedId, setSelectedId] = useState(activeUnitId)
  const [view, setView] = useState<"mapa" | "comparar">("mapa")
  const selected = units.find((unit) => unit.id === selectedId) || units[0]
  const statsOf = (unit: Unit) => {
    const data = allData[unit.id]
    if (!data) return { team: 0, beds: 0, consults: 0, revenue: 0, patients: 0 }
    const m = clinicMetrics(data)
    return {
      team: m.team,
      beds: m.hospitalized,
      consults: data.consultas.filter((item) => !/cancel/i.test(item.status)).length,
      revenue: m.revenue(30),
      patients: m.patients,
    }
  }
  // pinos sempre na faixa livre do mapa (entre a lista e o cartão da unidade)
  const pinPos = (unit: Unit, index: number) => {
    const total = Math.max(units.length, 1)
    const frac = (index + 0.5) / total
    const top = 36 + ((index * 23 + (hash(unit.id) % 9)) % 34)
    return { left: `calc(360px + (100% - 760px) * ${frac.toFixed(3)})`, top: `${top}%` }
  }
  const network = units.reduce((total, unit) => {
    const stats = statsOf(unit)
    return { revenue: total.revenue + stats.revenue, patients: total.patients + stats.patients, consults: total.consults + stats.consults }
  }, { revenue: 0, patients: 0, consults: 0 })
  const stats = selected ? statsOf(selected) : undefined

  return (
    <div className="vx vx-map">
      <div className="vx-map-canvas">
      <svg className="bg" viewBox="0 0 1280 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-20 700 C 200 640, 320 760, 520 700 S 860 560, 1000 620 S 1220 720, 1300 660 L1300 900 L-20 900Z" fill="#a9d2ea" opacity=".9" />
        <path d="M-20 700 C 200 640, 320 760, 520 700 S 860 560, 1000 620 S 1220 720, 1300 660" fill="none" stroke="#8ec2e0" strokeWidth="6" />
        <ellipse cx="760" cy="300" rx="120" ry="70" fill="#cfe5c2" opacity=".85" />
        <ellipse cx="1120" cy="180" rx="90" ry="60" fill="#cfe5c2" opacity=".85" />
        <ellipse cx="300" cy="460" rx="80" ry="50" fill="#cfe5c2" opacity=".85" />
        <g stroke="currentColor" style={{ color: "var(--vx-glass-strong)" }} strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M0 420 L1280 360" /><path d="M640 0 L560 860" /><path d="M0 200 C 400 260, 800 140, 1280 230" /><path d="M980 0 L1060 640" /><path d="M180 0 L320 680" />
        </g>
        <g stroke="currentColor" style={{ color: "var(--vx-glass)" }} strokeWidth="4" fill="none">
          <path d="M0 540 L1280 480" /><path d="M420 0 L460 700" /><path d="M820 0 L780 620" /><path d="M0 300 L1280 300" /><path d="M1180 0 L1180 640" /><path d="M0 110 L1280 90" />
        </g>
      </svg>
      {view === "mapa" &&
        units.map((unit, index) => {
          const color = unit.extra?.cor || colorFor(unit.id)
          const pos = pinPos(unit, index)
          return (
            <button key={unit.id} className="vx-pin" style={pos} onClick={() => setSelectedId(unit.id)} aria-label={`Pino ${unit.name}`}>
              <span className="halo" style={{ background: color }} />
              <span className="drop" style={{ background: color, outline: unit.id === selected?.id ? "3px solid #1a2233" : "none" }} />
              <span className="ltr">{unit.extra?.sigla || unit.shortName[0]}</span>
            </button>
          )
        })}
      </div>

      <div className="vx-glass vx-map-top" style={{ position: "absolute", left: 24, top: 22, right: 24, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, borderRadius: 22, zIndex: 5, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="vx-crumb"><b>Vetflow</b> / Unidades</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>A rede no mapa</div>
        </div>
        {modo}
        <Seg options={[["mapa", "Mapa"], ["comparar", "Comparar"]]} value={view} onChange={setView} />
        <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
          <Plus /> Nova unidade
        </button>
      </div>

      {view === "mapa" ? (
        <>
          <div className="vx-map-list" style={{ position: "absolute", left: 24, top: 130, width: 300, display: "flex", flexDirection: "column", gap: 10, zIndex: 5, maxHeight: "calc(100% - 160px)", overflowY: "auto" }}>
            {units.map((unit) => {
              const color = unit.extra?.cor || colorFor(unit.id)
              return (
                <button key={unit.id} className="vx-glass" onClick={() => setSelectedId(unit.id)} style={{ padding: "12px 14px", borderRadius: 20, display: "flex", gap: 12, alignItems: "center", outline: unit.id === selected?.id ? "3px solid #e94f17" : "none", outlineOffset: 2, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", opacity: unit.status === "Ativa" ? 1 : 0.6 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 14, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{unit.extra?.sigla || unit.shortName[0]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14 }}>{unit.shortName}</strong>
                    <small style={{ fontSize: 12, color: "var(--vx-muted)" }}>{unit.city}/{unit.state} · {unit.status}{unit.id === activeUnitId ? " · ativa" : ""}</small>
                  </span>
                  <span style={{ textAlign: "right" }}><span className="vx-num" style={{ fontSize: 17, display: "block" }}>{statsOf(unit).consults}</span><small style={{ fontSize: 10, color: "var(--vx-muted)" }}>consultas</small></span>
                </button>
              )
            })}
          </div>
          {selected && stats && (
            <div className="vx-glass vx-map-card" style={{ position: "absolute", right: 24, top: 130, width: 340, padding: 20, borderRadius: 26, zIndex: 6 }}>
              <div className="vx-row" style={{ justifyContent: "space-between" }}>
                <span className="vx-chip" style={{ background: selected.id === activeUnitId ? "#ffe7d2" : undefined, color: selected.id === activeUnitId ? "#b9500a" : undefined }}>{selected.id === activeUnitId ? "Unidade ativa" : selected.status}</span>
                <span style={{ fontSize: 12, color: "var(--vx-muted)" }}>{selected.phone}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{selected.shortName}</div>
              <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>{selected.street}, {selected.number} · {selected.city}/{selected.state}</div>
              <div style={{ fontSize: 12, color: "var(--vx-muted)", marginTop: 4 }}>Responsável: {selected.responsible || "—"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 14 }}>
                {[["equipe", stats.team], ["internados", stats.beds], ["pacientes", stats.patients]].map(([label, value]) => (
                  <div key={label} style={{ padding: 10, borderRadius: 14, background: "var(--vx-glass-strong)" }}><div className="vx-num" style={{ fontSize: 19 }}>{value}</div><div style={{ fontSize: 11, color: "var(--vx-muted)" }}>{label}</div></div>
                ))}
              </div>
              <div className="vx-row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button className="vx-btn vx-btn-p vx-btn-sm" disabled={selected.status !== "Ativa" || selected.id === activeUnitId} onClick={() => { setActiveUnitId(selected.id); forms.toast(`Agora você está em ${selected.name}.`); navigate("/") }}><LogIn /> Entrar na unidade</button>
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => forms.open("unidades", unitItem(selected))}><Edit3 /> Editar</button>
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.street}, ${selected.number}, ${selected.city} ${selected.state}`)}`, "_blank", "noopener")}><MapPinned /> Rota</button>
                <button className="vx-btn vx-btn-g vx-btn-sm" disabled={selected.id === activeUnitId && selected.status === "Ativa" && units.filter((unit) => unit.status === "Ativa").length < 2} onClick={() => { updateUnit(selected.id, { status: selected.status === "Ativa" ? "Inativa" : "Ativa" }); forms.toast(selected.status === "Ativa" ? "Unidade inativada." : "Unidade reativada.") }}><Power /> {selected.status === "Ativa" ? "Inativar" : "Reativar"}</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="vx-glass vx-map-compare" style={{ position: "absolute", left: 24, right: 24, top: 130, padding: 20, borderRadius: 26, zIndex: 5, overflowX: "auto" }}>
          <div className="vx-rows" style={{ minWidth: 640 }}>
            <div className="r" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)" }}><span>Unidade</span><span>Status</span><span>Equipe</span><span>Pacientes</span><span>Consultas</span><span>Receita</span></div>
            {units.map((unit) => {
              const row = statsOf(unit)
              return (
                <button key={unit.id} className="r" onClick={() => { setSelectedId(unit.id); setView("mapa") }} style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", border: 0, background: "transparent", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", width: "100%" }}>
                  <b>{unit.name}</b><span>{unit.status}</span><span>{row.team}</span><span>{row.patients}</span><span>{row.consults}</span><span>{brl(row.revenue)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="vx-glass vx-map-total" style={{ position: "absolute", right: 24, bottom: 24, padding: "14px 18px", borderRadius: 18, display: "flex", gap: 22, zIndex: 5, flexWrap: "wrap" }}>
        <div><div className="vx-lbl" style={{ fontSize: 10 }}>Rede · receita total</div><div className="vx-num" style={{ fontSize: 20 }}>{brl(network.revenue)}</div></div>
        <div><div className="vx-lbl" style={{ fontSize: 10 }}>Pacientes</div><div className="vx-num" style={{ fontSize: 20 }}>{network.patients.toLocaleString("pt-BR")}</div></div>
        <div><div className="vx-lbl" style={{ fontSize: 10 }}>Unidades</div><div className="vx-num" style={{ fontSize: 20 }}>{units.length}</div></div>
      </div>
      {forms.node}
    </div>
  )
}

/* ================= Unidades · lista + ficha (padrão dos cadastros) ================= */
export default function Unidades() {
  const [modo, setModo] = useModo("unidades")
  const switcher = <ModoSwitch value={modo} onChange={setModo} options={[["lista", "Lista"], ["mapa", "Mapa"]]} />
  return modo === "mapa" ? <UnidadesMapa modo={switcher} /> : <UnidadesLista modo={switcher} />
}

function UnidadesLista({ modo }: { modo: ReactNode }) {
  const { units, activeUnitId, setActiveUnitId, updateUnit, allData, staff } = useVetFlow()
  const forms = usePageForms("unidades")
  const [query, setQuery] = useState("")
  const [sit, setSit] = useState("Todas")
  const statsOf = (unit: Unit) => {
    const data = allData[unit.id]
    if (!data) return { team: 0, beds: 0, consults: 0, revenue: 0, patients: 0 }
    const m = clinicMetrics(data)
    return { team: m.team, beds: m.hospitalized, consults: data.consultas.filter((item) => !/cancel/i.test(item.status)).length, revenue: m.revenue(30), patients: m.patients }
  }
  const norm = (t: string) => t.toLowerCase()
  const base = units.filter((u) => !query.trim() || norm(`${u.name} ${u.city} ${u.cnpj} ${u.responsible}`).includes(norm(query.trim())))
  const naSit = (u: Unit, k: string) => k === "Todas" || (k === "Ativas" ? u.status === "Ativa" : u.status !== "Ativa")
  const rows = base.filter((u) => naSit(u, sit))
  const total = units.reduce((n, u) => { const s = statsOf(u); return { revenue: n.revenue + s.revenue, patients: n.patients + s.patients, team: n.team + s.team } }, { revenue: 0, patients: 0, team: 0 })
  const ativas = units.filter((u) => u.status === "Ativa").length
  return (
    <CadastroLista
      crumb="Unidades"
      title="Unidades"
      sub="Cada endereço da clínica com documento, horário, equipe e números do mês."
      headerActions={modo}
      kpis={[
        { label: "Unidades", value: units.length, detail: `${ativas} ativas`, icon: <Building2 />, tone: "orange", aba: "Ativas" },
        { label: "Equipe", value: total.team, detail: `${staff.length} logins no sistema`, icon: <Users />, tone: "aqua" },
        { label: "Receita 30 dias", value: brl(total.revenue), detail: "somando as unidades", icon: <Stethoscope />, tone: "green" },
        { label: "Pacientes", value: total.patients.toLocaleString("pt-BR"), detail: "na rede", icon: <MapPinned />, tone: "gray" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar unidade, cidade ou CNPJ..."
      abas={["Todas", "Ativas", "Inativas"].map((key) => ({ key, label: key, count: base.filter((u) => naSit(u, key)).length }))}
      aba={sit}
      onAba={setSit}
      novo={{ label: "Nova unidade", onClick: () => forms.open() }}
      rows={rows}
      rowKey={(u) => u.id}
      noun="unidades"
      vazio="Nenhuma unidade encontrada"
      colunas={[
        { label: "Unidade", w: "minmax(240px,1.5fr)", cell: (u) => <Ident title={u.shortName || u.name} sub={`${u.street || ""}${u.number ? `, ${u.number}` : ""} · ${u.city}/${u.state}`} initials={u.extra?.sigla || (u.shortName || u.name).slice(0, 2).toUpperCase()} color={u.extra?.cor || colorFor(u.id)} tag={u.id === activeUnitId ? "Você está aqui" : undefined} /> },
        { label: "Receita 30 d", w: "130px", cell: (u) => { const s = statsOf(u); return <Duo title={brl(s.revenue)} sub={`${s.consults} consultas`} /> } },
        { label: "Responsável", w: "minmax(140px,1fr)", ficha: false, cell: (u) => <Duo title={u.responsible || "—"} sub={u.phone} /> },
        { label: "Situação", w: "120px", cell: (u) => <Status status={u.status} /> },
      ]}
      ficha={(u) => {
        const s = statsOf(u)
        const ativa = u.status === "Ativa"
        const unica = ativa && units.filter((x) => x.status === "Ativa").length < 2
        return (
          <aside className="cd-side" aria-label={`Ficha de ${u.name}`}>
            <section className="cd-pane">
              <div className="cd-hero">
                <i className="cd-big" style={{ background: u.extra?.cor || colorFor(u.id) }}>{u.extra?.sigla || (u.shortName || u.name).slice(0, 2).toUpperCase()}</i>
                <div className="cd-hero-t">
                  <strong>{u.name}</strong>
                  <span>{u.city}/{u.state}{u.id === activeUnitId ? " · você está nesta unidade" : ""}</span>
                  <span className={`lv-pill ${ativa ? "" : "gray"}`}><i />{u.status}</span>
                </div>
              </div>
              <div className="cd-acts">
                <button type="button" className="main" disabled={!ativa || u.id === activeUnitId} onClick={() => { setActiveUnitId(u.id); forms.toast(`Agora você está em ${u.shortName}.`) }}><LogIn />Entrar nesta unidade</button>
                <button type="button" onClick={() => forms.open("unidades", unitItem(u))}><Edit3 />Editar</button>
                <button type="button" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${u.street}, ${u.number}, ${u.city} ${u.state}`)}`, "_blank", "noopener")}><MapPinned />Ver no mapa</button>
                <button type="button" className={ativa ? "danger" : ""} disabled={unica} title={unica ? "É a única unidade ativa" : undefined} onClick={() => { updateUnit(u.id, { status: ativa ? "Inativa" : "Ativa" }); forms.toast(`${u.shortName} ${ativa ? "desativada. O histórico continua guardado." : "reativada."}`) }}><Power />{ativa ? "Desativar" : "Reativar"}</button>
              </div>
              <div className="cd-dl">
                {([
                  ["CNPJ", u.cnpj], ["Telefone", u.phone], ["E-mail", u.email],
                  ["Endereço", `${u.street || ""}${u.number ? `, ${u.number}` : ""}${u.neighborhood ? ` · ${u.neighborhood}` : ""}`], ["CEP", u.cep], ["Responsável técnico", u.responsible],
                  ["Equipe", String(s.team)], ["Internados agora", String(s.beds)], ["Pacientes", s.patients.toLocaleString("pt-BR")], ["Receita 30 dias", brl(s.revenue)],
                ] as [string, string][]).filter(([, v]) => v && v.trim()).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
              </div>
              <p className="cd-empty">Unidades não são excluídas: desativar tira a unidade da troca de unidade e mantém todo o histórico.</p>
            </section>
          </aside>
        )
      }}
    >
      {forms.node}
    </CadastroLista>
  )
}
