import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Eye, EyeOff, KeyRound, Plus, Save, ShieldCheck, UserX } from "lucide-react"
import { modules, ROLE_ACCESS, useVetFlow, type Role, type StaffUser } from "../../store"
import { initials, normalizeText, Page, SearchBox, useToast } from "../ui"
import "../equipe.css"

const ROLES: Role[] = ["Administrador", "Vendedor", "Caixa", "Estoque", "Veterinário", "Entregador"]
export const ROLE_COLOR: Record<Role, string> = { Administrador: "#6b4fbb", Vendedor: "#2b7a4b", Caixa: "#1d5fbf", Estoque: "#c27b0e", "Veterinário": "#b42318", Entregador: "#0f766e" }
const ROLE_DESC: Record<Role, string> = {
  Administrador: "Tudo: todas as abas, equipe, financeiro e as duas clínicas.",
  Vendedor: "Venda, orçamentos, minhas vendas, clientes e consulta de estoque.",
  Caixa: "Caixa, recebimentos, sangria, fechamento, entregas e clientes.",
  Estoque: "Almoxarifado, entrada de nota, inventário, reposição e transferências.",
  "Veterinário": "Agenda, consultas, prontuários, vacinas, exames e prescrições.",
  Entregador: "Só as entregas: rota, endereço em destaque e confirmação.",
}
const AREAS: [string, string][] = [["dashboard", "Dashboard"], ["vendas", "Vendas"], ["caixa", "Caixa"], ["entregas", "Entregas"], ["estoque", "Estoque"], ["tutores", "Clientes / tutores"], ["agendas", "Agenda"], ["prontuarios", "Prontuários"], ["financeiro", "Financeiro"], ["usuarios", "Equipe e acessos"]]
const label = (slug: string) => AREAS.find(([s]) => s === slug)?.[1] || modules.find(([s]) => s === slug)?.[1] || slug
const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
const BLANK: StaffUser = { id: "", name: "", displayName: "", username: "", email: "", cpf: "", password: "", role: "Vendedor", code: "", active: true }

export default function Equipe() {
  const { staff, saveStaff, user } = useVetFlow()
  const navigate = useNavigate()
  const [toast, show] = useToast()
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "">("")
  const [selId, setSelId] = useState(staff[1]?.id || staff[0]?.id || "")
  const [draft, setDraft] = useState<StaffUser | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [params] = useSearchParams()
  const qUser = params.get("u") || ""
  useEffect(() => { if (qUser) { setSelId(qUser); setRoleFilter(""); setDraft(null) } }, [qUser])

  const list = useMemo(() => {
    const q = normalizeText(query.trim())
    const d = query.replace(/\D/g, "")
    return staff.filter((u) => (!roleFilter || u.role === roleFilter) && (!q || normalizeText(`${u.name} ${u.displayName} ${u.email} ${u.username} ${u.role}`).includes(q) || (d.length >= 3 && u.cpf.replace(/\D/g, "").includes(d))))
  }, [staff, query, roleFilter])
  const counts = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, staff.filter((u) => u.role === r).length])) as Record<Role, number>, [staff])
  const selected = list.find((u) => u.id === selId) || (selId === "" && draft ? null : list[0]) || null
  const form = draft || selected

  const pick = (u: StaffUser) => { setSelId(u.id); setDraft(null); setErrors([]); setShowPass(false) }
  const edit = (patch: Partial<StaffUser>) => setDraft({ ...(form || BLANK), ...patch })
  const novo = () => {
    const nextCode = String(Math.max(0, ...staff.map((u) => Number(u.code) || 0)) + 1).padStart(3, "0")
    setSelId(""); setDraft({ ...BLANK, id: `u-${Date.now()}`, code: nextCode, password: Math.random().toString(36).slice(2, 10) }); setErrors([]); setShowPass(true)
  }
  const save = () => {
    if (!draft) return
    const e: string[] = []
    if (draft.name.trim().length < 3) e.push("Informe o nome completo.")
    if (!/^[a-z0-9._-]{3,}$/i.test(draft.username)) e.push("Usuário: mínimo 3 letras ou números, sem espaços.")
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.push("E-mail inválido.")
    if (draft.cpf && draft.cpf.replace(/\D/g, "").length !== 11) e.push("CPF deve ter 11 dígitos.")
    if (draft.password.length < 6) e.push("A senha precisa de pelo menos 6 caracteres.")
    const dup = staff.find((u) => u.id !== draft.id && (u.username.toLowerCase() === draft.username.toLowerCase() || u.email.toLowerCase() === draft.email.toLowerCase() || (draft.cpf && u.cpf.replace(/\D/g, "") === draft.cpf.replace(/\D/g, ""))))
    if (dup) e.push(`Usuário, e-mail ou CPF já usado por ${dup.displayName}.`)
    if (user?.id === draft.id && (!draft.active || draft.role !== "Administrador") && user.role === "Administrador") e.push("Você não pode remover o seu próprio acesso de administrador.")
    setErrors(e)
    if (e.length) return
    const out = { ...draft, displayName: draft.displayName.trim() || draft.name.trim() }
    saveStaff(out)
    setSelId(out.id); setDraft(null); setShowPass(false)
    show(`${out.displayName} salvo. ${out.active ? "Já pode entrar com usuário, e-mail ou CPF." : "Acesso desativado."}`)
  }
  const toggleActive = () => { if (form) setDraft({ ...form, active: !form.active }) }
  const resetPass = () => { if (form) { setDraft({ ...form, password: Math.random().toString(36).slice(2, 10) }); setShowPass(true) } }
  const access = form ? ROLE_ACCESS[form.role] : []
  const can = (slug: string) => access.includes("*") || access.includes(slug)

  return (
    <Page
      bg="#f3eefb"
      blobs={[["#d6c8ff", -120, 80, 520, 420], ["#ffc9a3", "78%", -40, 380, 340]]}
      crumb="Equipe e acessos"
      title="Equipe e acessos"
      sub="Um usuário para cada pessoa. Cada um entra com usuário, e-mail ou CPF e senha, e vê só as abas do seu perfil."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar por nome, e-mail ou CPF" />
          <button className="vx-btn vx-btn-g" onClick={() => navigate("/usuarios-permissoes")}><ShieldCheck /> Permissões detalhadas</button>
          <button className="vx-btn vx-btn-p" onClick={novo}><Plus /> Novo usuário</button>
        </>
      }
    >
      <div className="eq">
        <div className="eq-roles">
          <button className={!roleFilter ? "on" : ""} onClick={() => { setRoleFilter(""); setDraft(null) }}>Todos <b>{staff.length}</b></button>
          {ROLES.map((r) => <button key={r} className={roleFilter === r ? "on" : ""} style={{ ["--c" as string]: ROLE_COLOR[r] }} onClick={() => { const next = roleFilter === r ? "" : r; setRoleFilter(next); setDraft(null); setErrors([]); const first = staff.find((u) => !next || u.role === next); if (first) setSelId(first.id) }}><i />{r} <b>{counts[r]}</b></button>)}
        </div>

        <div className="eq-cards">
          {list.map((u, i) => (
            <button key={u.id} className={`eq-card ${form?.id === u.id ? "sel" : ""} ${u.active ? "" : "off"}`} style={{ ["--c" as string]: ROLE_COLOR[u.role], animationDelay: `${i * 40}ms` }} onClick={() => pick(u)}>
              <span className="bar" />
              <span className="av">{initials(u.name)}</span>
              <span className="tag">{u.role}</span>
              <b>{u.displayName}</b>
              <small>{u.email}</small>
              <span className="ab">{ROLE_DESC[u.role]}</span>
              <span className="ft"><span className="mono">@{u.username}</span>{u.code ? <span className="mono">cód. {u.code}</span> : null}{!u.active && <span className="tag off">Inativo</span>}</span>
            </button>
          ))}
          {!list.length && <div className="vx-glass vx-empty">Ninguém encontrado.</div>}
        </div>

        {form && (
          <div className="eq-edit vx-glass">
            <div className="eq-h">
              <span className="av" style={{ background: ROLE_COLOR[form.role] }}>{initials(form.name || "?")}</span>
              <div><b>{draft && !selected ? "Novo usuário" : `Editar · ${form.displayName || form.name}`}</b><small>{ROLE_DESC[form.role]}</small></div>
              {!form.active && <span className="tag off">Inativo</span>}
            </div>
            <div className="eq-grid">
              <div className="eq-fields">
                <label className="span2"><span>Nome completo *</span><input value={form.name} onChange={(e) => edit({ name: e.target.value })} /></label>
                <label><span>Nome de exibição</span><input value={form.displayName} placeholder="Ex.: Dra. Ana" onChange={(e) => edit({ displayName: e.target.value })} /></label>
                <label><span>Perfil *</span><select value={form.role} onChange={(e) => edit({ role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
                <label><span>Usuário (login) *</span><input className="mono" value={form.username} onChange={(e) => edit({ username: e.target.value.trim().toLowerCase() })} /></label>
                <label><span>E-mail *</span><input type="email" value={form.email} onChange={(e) => edit({ email: e.target.value.trim() })} /></label>
                <label><span>CPF</span><input className="mono" inputMode="numeric" value={form.cpf} onChange={(e) => edit({ cpf: maskCpf(e.target.value) })} /></label>
                <label><span>Senha *</span>
                  <span className="eq-pass"><input className="mono" type={showPass ? "text" : "password"} value={form.password} onChange={(e) => edit({ password: e.target.value })} /><button type="button" aria-label={showPass ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button></span>
                </label>
                <label><span>Código (vendedor)</span><input className="mono" value={form.code || ""} onChange={(e) => edit({ code: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
                {(form.role === "Veterinário" || form.crmv) && <label><span>CRMV</span><input value={form.crmv || ""} placeholder="CRMV-UF 0.000" onChange={(e) => edit({ crmv: e.target.value })} /></label>}
              </div>
              <div className="eq-perm">
                <span className="eq-k">O que este perfil acessa</span>
                <table>
                  <tbody>
                    {AREAS.map(([slug]) => <tr key={slug}><td>{label(slug)}</td><td>{can(slug) ? <span className="ck">✓</span> : <span className="ck n" />}</td></tr>)}
                  </tbody>
                </table>
                <small>{access.includes("*") ? "Acesso total ao sistema." : `${access.length} áreas liberadas.`} Ajustes finos em Permissões detalhadas.</small>
              </div>
            </div>
            {errors.length > 0 && <div className="eq-err">{errors.map((e) => <span key={e}>• {e}</span>)}</div>}
            <div className="eq-actions">
              {selected && <button className="vx-btn vx-btn-g" onClick={resetPass}><KeyRound /> Gerar nova senha</button>}
              {selected && <button className="vx-btn vx-btn-g" onClick={toggleActive}><UserX /> {form.active ? "Desativar" : "Reativar"}</button>}
              <span style={{ flex: 1 }} />
              {draft && <button className="vx-btn vx-btn-g" onClick={() => { setDraft(null); setErrors([]); if (!selected) setSelId(staff[0]?.id || "") }}>Cancelar</button>}
              <button className="vx-btn vx-btn-p" disabled={!draft} onClick={save}><Save /> Salvar</button>
            </div>
            <p className="eq-lgpd">LGPD: use só os dados necessários. Ao desligar um colaborador, desative o acesso no mesmo dia. <a href="/privacidade" target="_blank" rel="noreferrer">Política de privacidade</a></p>
          </div>
        )}
      </div>
      {toast}
    </Page>
  )
}
