/*
 * Usuários e acessos — lista de funcionários + ficha ao lado (permissões por área, dados, histórico)
 * e gaveta de novo/editar. Cada funcionário tem CRUD completo: criar, ver, editar, bloquear,
 * redefinir senha, copiar permissões, desativar ou excluir (só quem nunca registrou nada).
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router"
import { Copy, Edit3, KeyRound, Lock, ShieldCheck, Trash2, Unlock, UserCheck, UserPlus, Users, X } from "lucide-react"
import { ACCESS_AREAS, ACCESS_LEVELS, defaultPerms, ROLE_ACCESS, useVetFlow, type Role, type StaffUser } from "../../store"
import { CadastroLista, Duo, Ident, Status, baixarCsv } from "../CadastroLista"
import { fmtDate, initials, normalizeText, useToast } from "../ui"

const ROLES: Role[] = ["Administrador", "Veterinário", "Vendedor", "Caixa", "Estoque", "Entregador"]
export const ROLE_COLOR: Record<Role, string> = { Administrador: "#6b4fbb", Vendedor: "#2b7a4b", Caixa: "#1d5fbf", Estoque: "#a8620a", "Veterinário": "#b42318", Entregador: "#0f766e" }
const ROLE_DESC: Record<Role, string> = {
  Administrador: "Tudo, inclusive usuários e financeiro.",
  "Veterinário": "Agenda, prontuário, receitas, exames e vacinas.",
  Vendedor: "Balcão, orçamentos e clientes.",
  Caixa: "Recebimentos, sangria e fechamento.",
  Estoque: "Notas, inventário e reposição.",
  Entregador: "Só as entregas do dia.",
}
const NIVEL_LABEL: Record<string, string> = { Fechado: "Sem acesso", Ver: "Ver", Editar: "Editar", Total: "Total" }
const HORARIOS = ["Livre", "Seg a sex, 7h às 19h", "Seg a sáb, 7h às 19h", "Somente plantão"]
const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
const maskTel = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2") }
function cpfOk(cpf: string) {
  const d = cpf.replace(/\D/g, "")
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
const BLANK: StaffUser = { id: "", name: "", displayName: "", username: "", email: "", cpf: "", passwordHash: "", salt: "", mustChange: true, role: "Vendedor", code: "", active: true }
const permsOf = (u: StaffUser) => ({ ...defaultPerms(u.role), ...Object.fromEntries(Object.entries(u.perms || {}).filter(([k, v]) => ACCESS_AREAS.some((a) => a.area === k) && (ACCESS_LEVELS as readonly string[]).includes(v))) })

export default function Equipe() {
  const { staff, saveStaff, removeStaff, user, resetPassword, audit, units } = useVetFlow()
  const [toast, show] = useToast()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [aba, setAba] = useState("Todos")
  const [form, setForm] = useState<{ draft: StaffUser; novo: boolean } | null>(null)
  const [temp, setTemp] = useState<{ name: string; user: string; pass: string } | null>(null)
  const [apagar, setApagar] = useState<StaffUser | null>(null)
  const [copiar, setCopiar] = useState<StaffUser | null>(null)
  const [selId, setSelId] = useState(() => params.get("u") || "")

  const ultimoAcesso = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of audit) if (a.acao === "login") m.set(a.registro, a.em)
    return m
  }, [audit])
  const registrosDe = (u: StaffUser) => audit.filter((a) => a.quem === u.displayName && !["login", "logout", "termos"].includes(a.acao)).length
  const situacao = (u: StaffUser) => (!u.active ? "Bloqueado" : u.invitePending && !ultimoAcesso.has(u.username) ? "Convite pendente" : "Ativo")

  const novo = (prefill?: Partial<StaffUser>) => {
    const nextCode = String(Math.max(0, ...staff.map((u) => Number(u.code) || 0)) + 1).padStart(3, "0")
    setForm({ novo: true, draft: { ...BLANK, id: `u-${Date.now()}`, code: nextCode, createdAt: new Date().toISOString(), invitePending: true, unidades: units.map((u) => u.id), horario: "Livre", ...prefill } })
  }
  useEffect(() => {
    if (params.get("novo") === "1") {
      const name = params.get("name") || ""
      novo({ name: name.replace(/^(Dra?\.)\s*/i, ""), displayName: name, role: /^dra?\./i.test(name) ? "Veterinário" : "Vendedor" })
      const next = new URLSearchParams(params); next.delete("novo"); next.delete("name"); next.delete("pro"); setParams(next, { replace: true })
    }
    const u = params.get("u"); if (u) setSelId(u)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const q = normalizeText(query.trim())
  const dig = query.replace(/\D/g, "")
  const base = staff.filter((u) => !q || normalizeText(`${u.name} ${u.displayName} ${u.email} ${u.username} ${u.role} ${u.crmv || ""}`).includes(q) || (dig.length >= 3 && u.cpf.replace(/\D/g, "").includes(dig)))
  const naAba = (u: StaffUser, k: string) => k === "Todos" || (k === "Bloqueados" ? !u.active : u.role === k)
  const rows = base.filter((u) => naAba(u, aba)).sort((a, b) => Number(b.active) - Number(a.active) || ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name, "pt-BR"))
  const hoje = new Date().toISOString().slice(0, 10)
  const entraramHoje = new Set(audit.filter((a) => a.acao === "login" && a.em.slice(0, 10) === hoje).map((a) => a.registro)).size

  const salvar = (draft: StaffUser, isNew: boolean): string[] => {
    const e: string[] = []
    if (draft.name.trim().length < 3) e.push("Informe o nome completo.")
    if (!/^[a-z0-9._-]{3,}$/i.test(draft.username)) e.push("Usuário de login: mínimo 3 letras ou números, sem espaços.")
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.push("E-mail inválido.")
    if (draft.cpf && !cpfOk(draft.cpf)) e.push("CPF inválido — confira os dígitos.")
    if (draft.role === "Veterinário" && !(draft.crmv || "").trim()) e.push("Veterinário precisa do CRMV.")
    const dup = staff.find((u) => u.id !== draft.id && (u.username.toLowerCase() === draft.username.toLowerCase() || u.email.toLowerCase() === draft.email.toLowerCase() || (draft.cpf && u.cpf.replace(/\D/g, "") === draft.cpf.replace(/\D/g, ""))))
    if (dup) e.push(`Usuário, e-mail ou CPF já usado por ${dup.displayName}.`)
    if (user?.id === draft.id && (!draft.active || draft.role !== "Administrador") && user.role === "Administrador") e.push("Você não pode tirar o seu próprio acesso de administrador.")
    if (e.length) return e
    const out: StaffUser = { ...draft, displayName: draft.displayName.trim() || draft.name.trim(), log: [...(draft.log || []), { quando: new Date().toISOString(), quem: user?.displayName || "Sistema", acao: isNew ? "Acesso criado" : "Dados editados" }] }
    saveStaff(out)
    setSelId(out.id)
    setForm(null)
    if (isNew) window.setTimeout(() => setTemp({ name: out.displayName, user: out.username, pass: resetPassword(out.id) }), 0)
    else show(`${out.displayName} salvo.`)
    return []
  }
  const registrar = (u: StaffUser, acao: string, patch: Partial<StaffUser> = {}) => saveStaff({ ...u, ...patch, log: [...(u.log || []), { quando: new Date().toISOString(), quem: user?.displayName || "Sistema", acao }] })
  const bloquear = (u: StaffUser) => {
    if (u.id === user?.id) return show("Você não pode bloquear o seu próprio acesso.")
    registrar(u, u.active ? "Acesso bloqueado" : "Acesso desbloqueado", { active: !u.active })
    show(u.active ? `${u.displayName} foi bloqueado e não consegue mais entrar.` : `${u.displayName} pode entrar de novo.`)
  }
  const redefinir = (u: StaffUser) => setTemp({ name: u.displayName, user: u.username, pass: resetPassword(u.id) })

  return (
    <CadastroLista
      crumb="Sistema / Usuários e acessos"
      title="Usuários e acessos"
      sub="Cada funcionário tem login próprio, perfil e permissões por área. Tudo o que ele faz fica no histórico."
      headerActions={
        <button className="vx-btn vx-btn-g" onClick={() => baixarCsv("usuarios", staff.map((u) => ({ Nome: u.name, Login: u.username, Email: u.email, Perfil: u.role, CRMV: u.crmv || "", Codigo: u.code || "", Situacao: situacao(u), UltimoAcesso: ultimoAcesso.get(u.username) || "" })))}>
          Exportar
        </button>
      }
      kpis={[
        { label: "Ativos", value: staff.filter((u) => u.active).length, detail: "com acesso liberado", icon: <UserCheck />, tone: "green" },
        { label: "Convites pendentes", value: staff.filter((u) => situacao(u) === "Convite pendente").length, detail: "ainda não entraram", icon: <UserPlus />, tone: "orange" },
        { label: "Bloqueados", value: staff.filter((u) => !u.active).length, detail: "sem entrar no sistema", icon: <Lock />, tone: "red", aba: "Bloqueados" },
        { label: "Entraram hoje", value: entraramHoje, detail: "nesta clínica", icon: <Users />, tone: "blue" },
      ]}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar por nome, e-mail, CPF ou CRMV..."
      abas={[{ key: "Todos", label: "Todos", count: base.length }, ...ROLES.map((r) => ({ key: r, label: r === "Veterinário" ? "Veterinários" : r, count: base.filter((u) => u.role === r).length })), { key: "Bloqueados", label: "Bloqueados", count: base.filter((u) => !u.active).length, tone: "red" as const }]}
      aba={aba}
      onAba={setAba}
      novo={{ label: "Novo funcionário", onClick: () => novo() }}
      rows={rows}
      rowKey={(u) => u.id}
      noun="funcionários"
      vazio="Ninguém encontrado"
      colunas={[
        { label: "Funcionário", w: "minmax(220px,1.6fr)", cell: (u) => <Ident title={u.displayName} sub={u.email} initials={initials(u.name)} color={ROLE_COLOR[u.role]} tag={u.id === user?.id ? "Você" : undefined} /> },
        { label: "Perfil", w: "minmax(120px,.9fr)", cell: (u) => <Duo title={u.role} sub={u.crmv || (u.code ? `cód. ${u.code}` : "")} /> },
        { label: "Último acesso", w: "130px", ficha: false, cell: (u) => { const em = ultimoAcesso.get(u.username); return <Duo title={em ? fmtDate(em.slice(0, 10)) : "nunca"} sub={em ? em.slice(11, 16) : ""} /> } },
        { label: "Situação", w: "140px", cell: (u) => <Status status={situacao(u)} toneOverride={!u.active ? "red" : situacao(u) === "Ativo" ? "green" : "orange"} /> },
      ]}
      atual={selId}
      onAtual={setSelId}
      ficha={(u) => (
        <FichaUsuario
          key={u.id}
          u={u}
          eu={u.id === user?.id}
          situacao={situacao(u)}
          ultimo={ultimoAcesso.get(u.username)}
          registros={registrosDe(u)}
          historico={audit.filter((a) => a.quem === u.displayName || a.registro === u.username || a.registro.endsWith(`· ${u.username}`)).slice(-40).reverse()}
          unidades={units.map((x) => [x.id, x.shortName || x.name] as [string, string])}
          onEditar={() => setForm({ novo: false, draft: { ...u } })}
          onSenha={() => redefinir(u)}
          onBloquear={() => bloquear(u)}
          onCopiar={() => setCopiar(u)}
          onExcluir={() => setApagar(u)}
          onSalvarPerms={(perms) => {
            const def = defaultPerms(u.role)
            const igual = ACCESS_AREAS.every((a) => perms[a.area] === def[a.area])
            if (u.id === user?.id && perms["Usuários e sistema"] === "Fechado") return show("Você não pode fechar a área de usuários para você mesmo.")
            registrar(u, igual ? "Permissões voltaram ao padrão do perfil" : "Permissões alteradas", { perms: igual ? undefined : perms })
            show(`Permissões de ${u.displayName} salvas.`)
          }}
        />
      )}
    >
      {form && <GavetaUsuario draft={form.draft} novo={form.novo} unidades={units.map((x) => [x.id, x.shortName || x.name] as [string, string])} onClose={() => setForm(null)} onSave={salvar} />}
      {temp && (
        <Janela titulo={`Senha provisória de ${temp.name}`} onClose={() => setTemp(null)}>
          <p>Entregue pessoalmente ou pelo WhatsApp. Ela aparece só agora e precisa ser trocada no primeiro acesso.</p>
          <div className="eq-temp"><span>Usuário</span><b className="mono">{temp.user}</b><span>Senha provisória</span><b className="mono">{temp.pass}</b></div>
          <div className="cd-dialog-f">
            <button className="vx-btn vx-btn-g" onClick={() => { void navigator.clipboard?.writeText(`Usuário: ${temp.user}\nSenha provisória: ${temp.pass}`); show("Dados de acesso copiados.") }}><Copy /> Copiar</button>
            <button className="vx-btn vx-btn-p" autoFocus onClick={() => setTemp(null)}>Entendi</button>
          </div>
        </Janela>
      )}
      {apagar && (
        <ExcluirUsuario
          u={apagar}
          registros={registrosDe(apagar)}
          eu={apagar.id === user?.id}
          onClose={() => setApagar(null)}
          onDesativar={() => { registrar(apagar, "Acesso desativado", { active: false }); setApagar(null); show(`Acesso de ${apagar.displayName} desativado. O histórico continua guardado.`) }}
          onExcluir={() => { removeStaff(apagar.id); setApagar(null); setSelId(""); show(`${apagar.displayName} foi excluído.`) }}
        />
      )}
      {copiar && (
        <Janela titulo={`Copiar permissões de ${copiar.displayName}`} onClose={() => setCopiar(null)}>
          <p>Escolha quem vai receber as mesmas permissões por área. O perfil de cada um continua o mesmo.</p>
          <div className="eq-pick">
            {staff.filter((x) => x.id !== copiar.id).map((x) => (
              <button key={x.id} type="button" onClick={() => { registrar(x, `Permissões copiadas de ${copiar.displayName}`, { perms: permsOf(copiar) }); setCopiar(null); show(`${x.displayName} recebeu as permissões de ${copiar.displayName}.`) }}>
                <i style={{ background: ROLE_COLOR[x.role] }}>{initials(x.name)}</i><span><b>{x.displayName}</b><small>{x.role}</small></span>
              </button>
            ))}
          </div>
        </Janela>
      )}
      {toast}
    </CadastroLista>
  )
}

/* ---------- ficha do funcionário ---------- */
function FichaUsuario({ u, eu, situacao, ultimo, registros, historico, unidades, onEditar, onSenha, onBloquear, onCopiar, onExcluir, onSalvarPerms }: {
  u: StaffUser; eu: boolean; situacao: string; ultimo?: string; registros: number
  historico: { em: string; quem: string; acao: string; modulo: string; registro: string }[]
  unidades: [string, string][]
  onEditar: () => void; onSenha: () => void; onBloquear: () => void; onCopiar: () => void; onExcluir: () => void
  onSalvarPerms: (perms: Record<string, string>) => void
}) {
  const [aba, setAba] = useState("Permissões")
  const [perms, setPerms] = useState<Record<string, string>>(() => permsOf(u))
  useEffect(() => setPerms(permsOf(u)), [u])
  const def = defaultPerms(u.role)
  const mudadas = ACCESS_AREAS.filter((a) => perms[a.area] !== def[a.area]).length
  const salvo = permsOf(u)
  const sujo = ACCESS_AREAS.some((a) => perms[a.area] !== salvo[a.area])
  const grupos = [...new Set(ACCESS_AREAS.map((a) => a.grupo))]
  const tom = !u.active ? "red" : situacao === "Ativo" ? "" : "orange"
  const nomesUnid = (u.unidades?.length ? u.unidades : unidades.map(([id]) => id)).map((id) => unidades.find(([x]) => x === id)?.[1] || id)
  const acessoTotal = ROLE_ACCESS[u.role].includes("*")
  const log = [
    ...historico.map((a) => ({ t: a.em, a: a.acao === "login" ? "Entrou no sistema" : a.acao === "logout" ? "Saiu" : a.acao === "senha" ? "Senha" : `${a.acao[0].toUpperCase()}${a.acao.slice(1)}`, d: a.acao === "login" || a.acao === "logout" ? "" : `${a.modulo} · ${a.registro}` })),
    ...(u.log || []).slice().reverse().map((l) => ({ t: l.quando, a: l.acao, d: `por ${l.quem}` })),
  ].sort((a, b) => b.t.localeCompare(a.t)).slice(0, 30)

  return (
    <aside className="cd-side" aria-label={`Ficha de ${u.displayName}`}>
      <section className="cd-pane">
        <div className="cd-hero">
          <i className="cd-big" style={{ background: ROLE_COLOR[u.role] }}>{initials(u.name)}</i>
          <div className="cd-hero-t">
            <strong>{u.displayName}</strong>
            <span>{u.role}{u.crmv ? ` · ${u.crmv}` : u.code ? ` · cód. ${u.code}` : ""}{eu ? " · você" : ""}</span>
            <span className={`lv-pill ${tom}`}><i />{situacao}</span>
          </div>
        </div>
        <div className="cd-acts">
          <button type="button" className="main" onClick={onEditar}><Edit3 />Editar dados</button>
          <button type="button" onClick={onSenha}><KeyRound />Redefinir senha</button>
          {!eu && <button type="button" onClick={onBloquear}>{u.active ? <Lock /> : <Unlock />}{u.active ? "Bloquear" : "Desbloquear"}</button>}
          <button type="button" onClick={onCopiar}><Copy />Copiar permissões</button>
          {!eu && <button type="button" className="danger" onClick={onExcluir}><Trash2 />Excluir</button>}
        </div>
        <nav className="lv-tabs cd-tabs" role="tablist" aria-label="Seções da ficha">
          {["Permissões", "Dados", "Histórico"].map((t) => (
            <button key={t} type="button" role="tab" aria-selected={aba === t} className={`lv-tab ${aba === t ? "on" : ""}`} onClick={() => setAba(t)}>{t}</button>
          ))}
        </nav>
        {aba === "Permissões" && (
          <div>
            <div className="up-head">
              <span>Padrão de <b>{u.role}</b>{mudadas ? ` · ${mudadas} ${mudadas === 1 ? "área alterada" : "áreas alteradas"}` : " · sem alterações"}</span>
              <button type="button" className="vx-btn vx-btn-g vx-btn-sm" disabled={!mudadas} onClick={() => setPerms(def)}>Voltar ao padrão</button>
            </div>
            {grupos.map((g) => (
              <div key={g}>
                <div className="cd-grp"><span>{g}</span></div>
                {ACCESS_AREAS.filter((a) => a.grupo === g).map((a) => (
                  <div key={a.area} className="up-row">
                    <span>{a.area}</span>
                    <div className="up-seg" role="radiogroup" aria-label={a.area}>
                      {ACCESS_LEVELS.map((lv, k) => (
                        <button key={lv} type="button" role="radio" aria-checked={perms[a.area] === lv} className={perms[a.area] === lv ? `on${k}` : ""} onClick={() => setPerms({ ...perms, [a.area]: lv })}>{NIVEL_LABEL[lv]}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="up-foot">
              <small>{acessoTotal ? "Administrador abre tudo por padrão." : "“Sem acesso” tira a aba do menu. “Ver” deixa consultar sem cadastrar, editar ou excluir."}</small>
              <button type="button" className="vx-btn vx-btn-p" disabled={!sujo} onClick={() => onSalvarPerms(perms)}><ShieldCheck /> Salvar permissões</button>
            </div>
          </div>
        )}
        {aba === "Dados" && (
          <div className="cd-dl">
            {([
              ["Nome completo", u.name], ["Usuário de login", `@${u.username}`], ["E-mail", u.email], ["Celular", u.phone], ["CPF", u.cpf], ["Nascimento", u.birth ? fmtDate(u.birth) : ""],
              ["Registro", u.crmv || (u.code ? `cód. ${u.code}` : "")], ["Especialidade", u.especialidade], ["Comissão", u.comissao ? `${u.comissao}%` : ""],
              ["Unidades", nomesUnid.join(", ")], ["Horário de acesso", u.horario || "Livre"], ["Verificação em 2 etapas", u.twofa ? "Ligada" : "Desligada"],
              ["Senha", u.mustChange ? "provisória (troca no próximo acesso)" : "definida pelo usuário"], ["Último acesso", ultimo ? `${fmtDate(ultimo.slice(0, 10))} ${ultimo.slice(11, 16)}` : "nunca entrou"],
              ["Registros feitos", String(registros)], ["Acesso criado", u.createdAt ? fmtDate(u.createdAt.slice(0, 10)) : "cadastro inicial"],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
          </div>
        )}
        {aba === "Histórico" && (
          <div>
            {log.map((l, i) => (
              <div key={i} className="cd-li static"><time>{fmtDate(l.t.slice(0, 10))} {l.t.slice(11, 16)}</time><span><b>{l.a}</b>{l.d ? ` · ${l.d}` : ""}</span></div>
            ))}
            {!log.length && <p className="cd-empty">Nada registrado ainda para este funcionário.</p>}
          </div>
        )}
      </section>
    </aside>
  )
}

/* ---------- gaveta novo / editar ---------- */
function GavetaUsuario({ draft: inicial, novo, unidades, onClose, onSave }: { draft: StaffUser; novo: boolean; unidades: [string, string][]; onClose: () => void; onSave: (u: StaffUser, isNew: boolean) => string[] }) {
  const [d, setD] = useState<StaffUser>(inicial)
  const [erros, setErros] = useState<string[]>([])
  const set = (patch: Partial<StaffUser>) => setD((cur) => ({ ...cur, ...patch }))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  const cpfRuim = d.cpf.replace(/\D/g, "").length === 11 && !cpfOk(d.cpf)
  const unid = d.unidades?.length ? d.unidades : unidades.map(([id]) => id)
  const salvar = () => setErros(onSave({ ...d, unidades: unid }, novo))
  const perms = defaultPerms(d.role)
  const resumo = (lv: string) => ACCESS_AREAS.filter((a) => perms[a.area] === lv).map((a) => a.area)
  return createPortal(
    <div className="vx-drawer-layer eq-layer" onMouseDown={onClose}>
      <aside className="eq-drawer" role="dialog" aria-modal="true" aria-label={novo ? "Novo funcionário" : `Editar ${d.displayName}`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="eq-dh">
          <div>
            <small>Usuários e acessos</small>
            <h2>{novo ? "Novo funcionário" : `Editar ${inicial.displayName}`}</h2>
            <p>Campos com <b>*</b> são obrigatórios.</p>
          </div>
          <button type="button" className="cl-x" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <div className="eq-db">
          <h3>1 · Dados pessoais</h3>
          <div className="eq-g">
            <label className="s6"><span>Nome completo *</span><input value={d.name} autoFocus onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="s3"><span>Nome na tela</span><input value={d.displayName} placeholder="Ex.: Dra. Ana" onChange={(e) => set({ displayName: e.target.value })} /><small>Aparece na agenda e nos documentos.</small></label>
            <label className="s3"><span>Nascimento</span><input type="date" value={d.birth || ""} onChange={(e) => set({ birth: e.target.value })} /></label>
            <label className="s3"><span>CPF</span><input inputMode="numeric" className={cpfRuim ? "bad" : ""} value={d.cpf} onChange={(e) => set({ cpf: maskCpf(e.target.value) })} />{cpfRuim && <small className="bad">CPF inválido — confira os dígitos.</small>}</label>
            <label className="s3"><span>Celular (WhatsApp)</span><input inputMode="tel" value={d.phone || ""} onChange={(e) => set({ phone: maskTel(e.target.value) })} /></label>
            <label className="s6"><span>E-mail *</span><input type="email" value={d.email} onChange={(e) => set({ email: e.target.value.trim() })} /></label>
          </div>
          <h3>2 · Login e perfil</h3>
          <div className="eq-g">
            <label className="s3"><span>Usuário de login *</span><input className="mono" value={d.username} onChange={(e) => set({ username: e.target.value.trim().toLowerCase() })} /></label>
            <label className="s3"><span>Código interno</span><input className="mono" value={d.code || ""} onChange={(e) => set({ code: e.target.value.replace(/\D/g, "").slice(0, 4) })} /><small>Usado no caixa e nas vendas.</small></label>
          </div>
          <div className="eq-roles2" role="radiogroup" aria-label="Perfil">
            {ROLES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={d.role === r} className={d.role === r ? "on" : ""} style={{ ["--c" as string]: ROLE_COLOR[r] }} onClick={() => set({ role: r })}>
                <b>{r}</b><small>{ROLE_DESC[r]}</small>
              </button>
            ))}
          </div>
          <div className="eq-g">
            <div className="s3 eq-checks"><span>Unidades</span>
              {unidades.map(([id, nome]) => (
                <label key={id}><input type="checkbox" checked={unid.includes(id)} onChange={(e) => set({ unidades: e.target.checked ? [...unid, id] : unid.filter((x) => x !== id) })} />{nome}</label>
              ))}
            </div>
            <label className="s3"><span>Horário de acesso</span><select value={d.horario || "Livre"} onChange={(e) => set({ horario: e.target.value })}>{HORARIOS.map((h) => <option key={h}>{h}</option>)}</select>
              <label className="eq-inline"><input type="checkbox" checked={!!d.twofa} onChange={(e) => set({ twofa: e.target.checked })} />Verificação em 2 etapas</label>
            </label>
          </div>
          <h3>3 · Profissional</h3>
          <div className="eq-g">
            <label className="s3"><span>CRMV {d.role === "Veterinário" ? "*" : ""}</span><input value={d.crmv || ""} placeholder="CRMV-RO 0.000" onChange={(e) => set({ crmv: e.target.value })} /></label>
            <label className="s3"><span>Especialidade</span><input value={d.especialidade || ""} onChange={(e) => set({ especialidade: e.target.value })} /></label>
            <label className="s3"><span>Comissão sobre serviços (%)</span><input inputMode="decimal" value={d.comissao || ""} onChange={(e) => set({ comissao: e.target.value.replace(/[^\d,]/g, "").slice(0, 5) })} /></label>
            <label className="s3 eq-inline-wrap"><span>Situação</span><label className="eq-inline"><input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} />Acesso liberado</label></label>
          </div>
          <h3>4 · Permissões</h3>
          <div className="eq-resumo">
            <span>Começa com o padrão de <b>{d.role}</b>:</span>
            {resumo("Total").length > 0 && <em className="t3">Total · {resumo("Total").join(", ")}</em>}
            {resumo("Editar").length > 0 && <em className="t2">Editar · {resumo("Editar").join(", ")}</em>}
            {resumo("Ver").length > 0 && <em className="t1">Ver · {resumo("Ver").join(", ")}</em>}
            {resumo("Fechado").length > 0 && <em className="t0">Sem acesso · {resumo("Fechado").join(", ")}</em>}
            <small>Depois de salvar, ajuste área por área na ficha.</small>
          </div>
          {novo && <p className="eq-note">Ao salvar, o sistema gera uma senha provisória para entregar à pessoa. Ela cria a própria senha no primeiro acesso.</p>}
        </div>
        <footer className="eq-df">
          {erros.length > 0 ? <div className="eq-err">{erros.map((e) => <span key={e}>{e}</span>)}</div> : <span />}
          <span className="eq-df-b">
            <button type="button" className="vx-btn vx-btn-g" onClick={onClose}>Cancelar</button>
            <button type="button" className="vx-btn vx-btn-p" onClick={salvar}>{novo ? "Salvar e gerar senha" : "Salvar alterações"}</button>
          </span>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}

function ExcluirUsuario({ u, registros, eu, onClose, onDesativar, onExcluir }: { u: StaffUser; registros: number; eu: boolean; onClose: () => void; onDesativar: () => void; onExcluir: () => void }) {
  const [modo, setModo] = useState<"desativar" | "excluir">(registros ? "desativar" : "excluir")
  return (
    <Janela titulo={`Excluir ${u.displayName}?`} onClose={onClose}>
      <p>{eu ? "Você não pode excluir o seu próprio acesso." : registros ? `${u.name.split(" ")[0]} tem ${registros} ${registros === 1 ? "registro" : "registros"} no sistema. Esses registros não podem perder o autor.` : "Este funcionário ainda não registrou nada no sistema."}</p>
      <label className={`cd-opt ${modo === "desativar" ? "on" : ""}`}>
        <input type="radio" name="eq-modo" checked={modo === "desativar"} onChange={() => setModo("desativar")} />
        <span><b>Desativar o acesso{registros ? " (recomendado)" : ""}</b><small>Não entra mais, some das listas de escolha e o histórico fica guardado. Dá para reativar.</small></span>
      </label>
      <label className={`cd-opt ${modo === "excluir" ? "on" : ""} ${registros ? "off" : ""}`}>
        <input type="radio" name="eq-modo" checked={modo === "excluir"} disabled={!!registros} onChange={() => setModo("excluir")} />
        <span><b>Excluir de vez</b><small>{registros ? "Indisponível: já existem registros feitos por esta pessoa." : "Apaga o login e os dados pessoais (LGPD)."}</small></span>
      </label>
      <div className="cd-dialog-f">
        <button type="button" className="vx-btn vx-btn-g" onClick={onClose}>Cancelar</button>
        <button type="button" disabled={eu} className={`vx-btn ${modo === "excluir" ? "vx-btn-d" : "vx-btn-p"}`} onClick={modo === "excluir" ? onExcluir : onDesativar}>{modo === "excluir" ? "Excluir de vez" : "Desativar acesso"}</button>
      </div>
    </Janela>
  )
}

function Janela({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div className="vx-modal-layer cd-modal" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={onClose}>
      <div className="cd-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cd-dialog-h"><strong>{titulo}</strong><button type="button" className="cl-x" aria-label="Fechar" onClick={onClose}><X /></button></div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
