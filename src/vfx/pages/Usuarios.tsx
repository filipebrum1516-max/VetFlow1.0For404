import { localDateTime, localISO } from "../../date"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronLeft, ChevronRight, Edit3, Lock, Plus, RotateCcw, Save, ShieldCheck, Unlock } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { permLevels, permModules, rolePerms } from "../FormDrawer"
import { usePageForms } from "../hooks"
import { fmtDate, hash, initials, itemDate, matches, Page, SearchBox, Seg, StatusPill } from "../ui"

const roleColor: Record<string, string> = { Administrador: "#6b4fbb", Vendedor: "#2b7a4b", Caixa: "#1d5fbf", Estoque: "#c27b0e", "Veterinário": "#b42318", Entregador: "#0f766e" }
const levelStyle: Record<string, { background: string; color: string }> = {
  Fechado: { background: "rgba(120,130,150,.14)", color: "#6b7280" },
  Ver: { background: "#e2ecff", color: "#2457c5" },
  Editar: { background: "#ffe7d2", color: "#b9500a" },
  Total: { background: "#d9f3e3", color: "#0f766e" },
}
const roleOf = (item: Item) => {
  if (item.extra?.papel) return item.extra.papel as string
  const text = `${item.category || ""} ${item.subtitle || ""} ${item.name}`
  if (/admin|gestor|diretor/i.test(text)) return "Administrador"
  if (/dr\.?\s|dra\.?\s|veterin|cl[ií]nic|cirurg|anest|derma/i.test(text)) return "Veterinário"
  if (/enferm|auxiliar|t[eé]cnic/i.test(text)) return "Enfermagem / auxiliar"
  if (/financ/i.test(text)) return "Financeiro"
  return "Recepção"
}

export default function Usuarios() {
  const { profile, staff, saveStaff } = useVetFlow()
  /* o chaveiro mostra exatamente a mesma equipe de "Equipe e acessos" */
  const keys = useMemo(() => staff.map((u) => ({
    id: u.id, name: u.displayName, subtitle: u.role, email: u.email, category: u.role, createdAt: "", unitId: "",
    status: u.active ? "Ativo" : "Bloqueado", date: localISO(),
    extra: { papel: u.role, permissoes: u.perms, log: u.log },
  }) as unknown as Item), [staff])
  const navigate = useNavigate()
  const forms = usePageForms("usuarios")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos")
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState("")
  const list = useMemo(() => keys.filter((item) => matches(item, query) && (status === "Todos" || item.status === status)), [keys, query, status])
  const perRing = 7
  const pages = Math.max(1, Math.ceil(list.length / perRing))
  const ring = list.slice(page * perRing, page * perRing + perRing)
  const selected = list.find((item) => item.id === selectedId) || ring[0]
  const [perms, setPerms] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!selected) return
    setPerms(selected.extra?.permissoes || rolePerms(roleOf(selected)))
    setDirty(false)
  }, [selected?.id])
  useEffect(() => {
    setPage(0)
  }, [query, status])

  const cycle = (module: string) => {
    const current = perms[module] || "Fechado"
    const next = permLevels[(permLevels.indexOf(current as (typeof permLevels)[number]) + 1) % permLevels.length]
    setPerms({ ...perms, [module]: next })
    setDirty(true)
  }
  const savePerms = () => {
    if (!selected) return
    const log = [...(selected.extra?.log || []), { quando: new Date().toISOString(), quem: profile.displayName, acao: "Permissões alteradas" }]
    const u = staff.find((x) => x.id === selected.id); if (u) saveStaff({ ...u, perms, log })
    setDirty(false)
    forms.toast(`Permissões de ${selected.name} salvas.`)
  }
  const setUserStatus = (next: string, action: string) => {
    if (!selected) return
    const log = [...(selected.extra?.log || []), { quando: new Date().toISOString(), quem: profile.displayName, acao: action }]
    const u = staff.find((x) => x.id === selected.id); if (u) saveStaff({ ...u, active: next !== "Bloqueado", log })
    forms.toast(`${selected.name}: ${action.toLowerCase()}.`)
  }
  const log: { quando: string; quem: string; acao: string }[] = selected
    ? [
        ...(selected.extra?.log || []).slice().reverse(),
        { quando: `${itemDate(selected)}T09:${String(hash(selected.id) % 60).padStart(2, "0")}:00`, quem: selected.name, acao: "Último acesso" },
        { quando: selected.createdAt || `${itemDate(selected)}T08:00:00`, quem: "Sistema", acao: "Chave criada" },
      ]
    : []
  const counts = { Ativo: keys.filter((item) => item.status === "Ativo").length, pend: 0, bloq: keys.filter((item) => item.status === "Bloqueado").length }

  return (
    <Page
      bg="#f3efe6"
      blobs={[["#ffd98a", -60, -40, 420, 380], ["#a8e2dc", "70%", 200, 400, 360], ["#d2bdf5", "30%", "80%", 360, 320]]}
      crumb="Permissões detalhadas"
      title="Permissões detalhadas"
      sub="Escolha uma pessoa para ver e ajustar o que ela pode acessar em cada área."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar pessoa ou e-mail" />
          <Seg options={["Todos", "Ativo", "Bloqueado"]} value={status} onChange={setStatus} />
          <button className="vx-btn vx-btn-p" onClick={() => navigate("/usuarios")}>
            <Plus /> Novo usuário
          </button>
        </>
      }
    >
      <div className="vx-keys-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,440px) minmax(0,1fr)", gap: 24, alignItems: "start" }}>
        <div className="vx-glass" style={{ padding: 18, borderRadius: 28 }}>
          <div className="vx-row" style={{ justifyContent: "space-between", gap: 8 }}>
            <span className="vx-lbl">{counts.Ativo} ativas · {counts.bloq} bloqueadas</span>
            <span className="vx-row" style={{ gap: 6 }}>
              <button className="vx-icon-btn" aria-label="Chaves anteriores" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></button>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{page + 1}/{pages}</span>
              <button className="vx-icon-btn" aria-label="Próximas chaves" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight /></button>
            </span>
          </div>
          <div className="vx-ring" style={{ height: 430 }}>
            <svg viewBox="0 0 400 120" preserveAspectRatio="none" style={{ position: "absolute", left: "4%", right: "4%", top: 20, width: "92%", height: 120 }} aria-hidden="true">
              <ellipse cx="200" cy="56" rx="192" ry="46" fill="none" stroke="#b7c0cc" strokeWidth="9" />
              <ellipse cx="200" cy="52" rx="192" ry="46" fill="none" stroke="#e3e8ee" strokeWidth="4" />
            </svg>
            {ring.map((item, index) => {
              const t = ring.length === 1 ? 0.5 : index / (ring.length - 1)
              const x = 10 + t * 80
              const y = 20 + 56 + Math.sin(Math.PI * t) * 44
              const swing = (t - 0.5) * 14
              const role = roleOf(item)
              const color = roleColor[role] || "#5b6474"
              const shaft = 70 + (index % 2) * 46 + (hash(item.id) % 14)
              return (
                <button
                  key={item.id}
                  className={`vx-key ${item.id === selected?.id ? "on" : ""}`}
                  style={{ left: `${x}%`, top: y, width: 70, marginLeft: -35, transform: `rotate(${swing}deg)`, opacity: item.status === "Bloqueado" ? 0.45 : 1, zIndex: item.id === selected?.id ? 3 : 1 }}
                  onClick={() => setSelectedId(item.id)}
                  aria-label={`Chave de ${item.name}`}
                >
                  <span style={{ width: 6, height: 16, borderRadius: 3, background: "#b7c0cc" }} />
                  <span className="head" style={{ background: color, width: 54, height: 54, fontSize: 15, marginTop: -2 }}>{initials(item.name)}</span>
                  <span className="shaft" style={{ width: 14, height: shaft, background: `linear-gradient(90deg, ${color}, ${color}bb)`, clipPath: "polygon(0 0,100% 0,100% 62%,55% 68%,100% 76%,100% 86%,50% 100%,0 90%)" }} />
                  <span className="tag" style={{ maxWidth: 84, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name.replace(/^(Dr\.?|Dra\.?)\s+/i, "").split(" ")[0]}</span>
                </button>
              )
            })}
            {!ring.length && <div className="vx-empty" style={{ position: "absolute", left: 0, right: 0, top: 200 }}>Nenhuma chave neste filtro.</div>}
          </div>
          <div className="vx-row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {Object.entries(roleColor).map(([role, color]) => (
              <span key={role} className="vx-chip" style={{ minHeight: 24, fontSize: 11 }}><i className="vx-dot" style={{ background: color }} />{role}</span>
            ))}
          </div>
        </div>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div className="vx-glass" style={{ padding: 20 }}>
              <div className="vx-row" style={{ gap: 14, flexWrap: "wrap" }}>
                <span className="vx-av" style={{ width: 56, height: 56, fontSize: 18, background: roleColor[roleOf(selected)] }}>{initials(selected.name)}</span>
                <span style={{ flex: 1, minWidth: 160 }}>
                  <strong style={{ fontSize: 20, display: "block" }}>{selected.name}</strong>
                  <small style={{ color: "var(--vx-muted)", fontSize: 13 }}>{roleOf(selected)} · {(selected as Item & { email?: string }).email}</small>
                </span>
                <StatusPill status={selected.status} />
              </div>
              <div className="vx-row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => navigate(`/usuarios?u=${selected.id}`)}><Edit3 /> Editar usuário</button>
                {selected.status === "Bloqueado" ? (
                  <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setUserStatus("Ativo", "Acesso desbloqueado")}><Unlock /> Desbloquear</button>
                ) : (
                  <button className="vx-btn vx-btn-d vx-btn-sm" onClick={() => setUserStatus("Bloqueado", "Acesso bloqueado")}><Lock /> Bloquear</button>
                )}
                {selected.status === "Convite pendente" && <button className="vx-btn vx-btn-p vx-btn-sm" onClick={() => setUserStatus("Convite pendente", "Convite reenviado")}>Reenviar convite</button>}
                {selected.status === "Convite pendente" && <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setUserStatus("Ativo", "Convite aceito manualmente")}>Ativar</button>}
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => navigate(`/usuarios?u=${selected.id}`)}><RotateCcw /> Redefinir senha</button>
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => navigate(`/usuarios?u=${selected.id}`)}>Ficha</button>
              </div>
            </div>

            <div className="vx-glass" style={{ padding: 20 }}>
              <div className="vx-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span className="vx-lbl"><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Portas que esta chave abre</span>
                <span className="vx-row" style={{ gap: 6 }}>
                  <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => { setPerms(rolePerms(roleOf(selected))); setDirty(true) }}>Padrão do papel</button>
                  <button className="vx-btn vx-btn-p vx-btn-sm" disabled={!dirty} onClick={savePerms}><Save /> Salvar</button>
                </span>
              </div>
              <div className="vx-hint" style={{ marginTop: 4 }}>Toque em cada porta para alternar: Fechado → Ver → Editar → Total.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 8, marginTop: 12 }}>
                {permModules.map((module) => {
                  const level = perms[module] || "Fechado"
                  return (
                    <button key={module} className="vx-perm" onClick={() => cycle(module)} style={{ ...levelStyle[level], display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px", textAlign: "left" }} aria-label={`${module}: ${level}`}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{module}</span>
                      <span style={{ fontSize: 11, opacity: 0.85 }}>{level}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="vx-glass" style={{ padding: 20 }}>
              <span className="vx-lbl">Registro de uso</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {log.slice(0, 6).map((entry, index) => (
                  <div key={index} className="vx-row" style={{ gap: 10, fontSize: 13, padding: "6px 0", borderTop: index ? "1px solid var(--vx-line)" : 0 }}>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--vx-muted)", width: 82, flex: "none" }}>{fmtDate(entry.quando.slice(0, 10), { day: "2-digit", month: "2-digit" })} {entry.quando.slice(11, 16)}</span>
                    <span style={{ flex: 1 }}>{entry.acao}</span>
                    <span style={{ fontSize: 12, color: "var(--vx-muted)" }}>{entry.quem}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 1100px){ .vx-keys-grid{ grid-template-columns: 1fr !important; } } @media (max-width: 480px){ .vx-ring .vx-key .head{ width: 44px !important; height: 44px !important; font-size: 13px !important } .vx-ring .vx-key .tag{ font-size: 10px; padding: 3px 6px } }`}</style>
      {forms.node}
    </Page>
  )
}
