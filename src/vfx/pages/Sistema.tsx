import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { ArrowLeft, Building2, ChevronDown, Download, History, Keyboard, LifeBuoy, Mail, Moon, RotateCcw, Save, Sun, Upload, UserRound } from "lucide-react"
import { modules, useVetFlow, type UserProfile } from "../../store"
import { Confirm, initials, Page, useToast } from "../ui"

export function Perfil() {
  const { profile, updateProfile, activeUnit, data } = useVetFlow()
  const [draft, setDraft] = useState<UserProfile>(profile)
  const [toast, show] = useToast()
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile)
  const set = (key: keyof UserProfile) => (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value })
  const mine = data.consultas.filter((item) => item.professional && profile.name && item.professional.includes(profile.name.split(" ")[0])).length
  const fields: [keyof UserProfile, string, string][] = [
    ["name", "Nome completo", "text"],
    ["displayName", "Nome de exibição", "text"],
    ["email", "E-mail", "email"],
    ["phone", "Celular", "tel"],
    ["crmv", "CRMV", "text"],
    ["specialty", "Especialidade", "text"],
  ]
  return (
    <Page bg="#f1efe9" blobs={[["#ffc9a8", -60, -40, 420, 380], ["#b3c3ff", "75%", 180, 380, 340]]} crumb="Meu perfil" title="Meu perfil" sub="Seus dados aparecem nas receitas, laudos, documentos e no cartão do menu.">
      <div className="vx-two">
        <div className="vx-glass" style={{ padding: 24, textAlign: "center" }}>
          <span className="vx-av" style={{ width: 96, height: 96, fontSize: 32, margin: "0 auto", background: "linear-gradient(135deg,#ffb27a,#f15a24)" }}>{initials(draft.name)}</span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>{draft.displayName}</div>
          <div style={{ fontSize: 13, color: "var(--vx-muted)" }}>{draft.specialty}</div>
          <div style={{ fontSize: 12, color: "var(--vx-muted)", marginTop: 4 }}>{draft.crmv}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
            <div style={{ padding: 10, borderRadius: 14, background: "var(--vx-glass-strong)" }}><div className="vx-num" style={{ fontSize: 20 }}>{mine}</div><div style={{ fontSize: 11, color: "var(--vx-muted)" }}>consultas</div></div>
            <div style={{ padding: 10, borderRadius: 14, background: "var(--vx-glass-strong)" }}><div className="vx-num" style={{ fontSize: 14, marginTop: 4 }}>{activeUnit.shortName}</div><div style={{ fontSize: 11, color: "var(--vx-muted)" }}>unidade ativa</div></div>
          </div>
        </div>
        <form className="vx-glass" style={{ padding: 24 }} onSubmit={(event) => { event.preventDefault(); updateProfile(draft); show("Perfil atualizado.") }}>
          <div className="vx-g">
            {fields.map(([key, label, type]) => (
              <label key={key} className="vx-f vx-c3">
                <span className="vx-fl">{label}</span>
                <input className="vx-in" type={type} value={draft[key]} onChange={set(key)} required={key === "name" || key === "email"} />
              </label>
            ))}
            <label className="vx-f vx-c6">
              <span className="vx-fl">Apresentação</span>
              <textarea className="vx-in" style={{ minHeight: 110 }} value={draft.bio} onChange={set("bio")} />
            </label>
          </div>
          <div className="vx-row" style={{ gap: 8, marginTop: 18, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="vx-btn vx-btn-g" disabled={!dirty} onClick={() => setDraft(profile)}>Descartar</button>
            <button type="submit" className="vx-btn vx-btn-p" disabled={!dirty}><Save /> Salvar perfil</button>
          </div>
        </form>
      </div>
      {toast}
    </Page>
  )
}

const zones = [
  ["America/Manaus", "Manaus (GMT-4)"],
  ["America/Sao_Paulo", "Brasília / São Paulo (GMT-3)"],
  ["America/Cuiaba", "Cuiabá (GMT-4)"],
  ["America/Belem", "Belém (GMT-3)"],
  ["America/Fortaleza", "Fortaleza (GMT-3)"],
  ["America/Rio_Branco", "Rio Branco (GMT-5)"],
  ["America/Noronha", "Fernando de Noronha (GMT-2)"],
]

export function Configuracoes() {
  const { theme, toggleTheme, timeZone, setTimeZone, units, activeUnitId, setActiveUnitId, audit, user } = useVetFlow()
  const isAdmin = user?.role === "Administrador"
  const [restoreFile, setRestoreFile] = useState<Record<string, string> | null>(null)
  const [auditAll, setAuditAll] = useState(false)
  // I-12: cópia de segurança dos dados deste navegador (sem senhas nem sessão).
  const BACKUP_KEYS = (key: string) => key.startsWith("vetflow-") && !/auth|session|terms/.test(key)
  const exportBackup = () => {
    const payload: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i) || ""; if (BACKUP_KEYS(key)) payload[key] = localStorage.getItem(key) || "" }
    try { const staff = JSON.parse(payload["vetflow-staff"] || "[]"); payload["vetflow-staff"] = JSON.stringify(staff.map((u: Record<string, unknown>) => ({ ...u, passwordHash: undefined, salt: undefined, password: undefined }))) } catch { /* ok */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: "VetFlow", versao: 1, geradoEm: new Date().toISOString(), dados: payload }, null, 2)], { type: "application/json" }))
    const a = document.createElement("a"); a.href = url; a.download = `vetflow-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    show("Cópia de segurança baixada (senhas não são incluídas).")
  }
  const readBackup = (file?: File) => {
    if (!file) return
    file.text().then((text) => {
      try { const json = JSON.parse(text); if (json.app !== "VetFlow" || typeof json.dados !== "object") throw new Error("x"); setRestoreFile(json.dados) } catch { show("Arquivo inválido: escolha uma cópia gerada pelo VetFlow.") }
    })
  }
  const exportAudit = () => {
    const rows = [["Quando", "Quem", "Ação", "Módulo", "Registro", "Unidade"], ...audit.map((a) => [new Date(a.em).toLocaleString("pt-BR"), a.quem, a.acao, a.modulo, a.registro, a.unidade])]
    const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = "vetflow-auditoria.csv"; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const navigate = useNavigate()
  const [toast, show] = useToast()
  const [reset, setReset] = useState(false)
  return (
    <Page bg="#eef1f5" blobs={[["#b3c3ff", -60, -40, 420, 380], ["#a8e2b8", "75%", 180, 380, 340]]} crumb="Configurações" title="Configurações" sub="Preferências deste navegador e da sua sessão no VetFlow.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div className="vx-glass" style={{ padding: 22 }}>
          <div className="vx-lbl">Aparência</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>Tema {theme === "light" ? "claro" : "escuro"}</div>
          <p className="vx-hint">Vale para todas as telas, inclusive gavetas de cadastro.</p>
          <div className="vx-seg" style={{ marginTop: 10 }}>
            <button className={theme === "light" ? "on" : ""} onClick={() => theme !== "light" && toggleTheme()}><Sun size={15} /> Claro</button>
            <button className={theme === "dark" ? "on" : ""} onClick={() => theme !== "dark" && toggleTheme()}><Moon size={15} /> Escuro</button>
          </div>
        </div>
        <div className="vx-glass" style={{ padding: 22 }}>
          <div className="vx-lbl">Fuso horário</div>
          <label className="vx-f" style={{ marginTop: 10 }}>
            <span className="vx-fl">Relógio do topo e agenda</span>
            <select className="vx-in" value={timeZone} onChange={(event) => { setTimeZone(event.target.value); show("Fuso horário atualizado.") }}>
              {zones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="vx-glass" style={{ padding: 22 }}>
          <div className="vx-lbl">Unidade padrão</div>
          <label className="vx-f" style={{ marginTop: 10 }}>
            <span className="vx-fl">Trabalhar em</span>
            <select className="vx-in" value={activeUnitId} onChange={(event) => { setActiveUnitId(event.target.value); show("Unidade alterada.") }}>
              {units.filter((unit) => unit.status === "Ativa").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
          <button className="vx-btn vx-btn-g vx-btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("/unidades")}><Building2 /> Gerenciar unidades</button>
        </div>
        <div className="vx-glass" style={{ padding: 22 }}>
          <div className="vx-lbl">Dados de demonstração</div>
          <p className="vx-hint" style={{ marginTop: 8 }}>Apaga todos os cadastros e alterações feitos neste navegador e volta aos dados iniciais.</p>
          <button className="vx-btn vx-btn-d" style={{ marginTop: 10 }} onClick={() => setReset(true)}><RotateCcw /> Restaurar dados de exemplo</button>
        </div>
        <div className="vx-glass" style={{ padding: 22 }}>
          <div className="vx-lbl">Cópia de segurança</div>
          <p className="vx-hint" style={{ marginTop: 8 }}>Baixe um arquivo com os dados deste navegador ou restaure uma cópia anterior. Senhas não entram na cópia.</p>
          <div className="vx-row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="vx-btn vx-btn-g" onClick={exportBackup}><Download /> Baixar cópia</button>
            {isAdmin && (
              <label className="vx-btn vx-btn-g" style={{ cursor: "pointer" }}>
                <Upload /> Restaurar cópia
                <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(event) => { readBackup(event.target.files?.[0]); event.target.value = "" }} />
              </label>
            )}
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="vx-glass" style={{ padding: 22, marginTop: 18 }}>
          <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div className="vx-lbl"><History size={13} /> Registro de auditoria</div>
              <p className="vx-hint" style={{ marginTop: 4 }}>Quem criou, editou ou excluiu cada registro, entradas no sistema e trocas de senha. {audit.length} eventos guardados neste navegador.</p>
            </div>
            <button className="vx-btn vx-btn-g vx-btn-sm" onClick={exportAudit} disabled={!audit.length}><Download /> Exportar CSV</button>
          </div>
          <div className="vx-table" style={{ marginTop: 12 }}>
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: "150px minmax(0,1fr) 90px minmax(0,1fr) minmax(0,1.4fr)" }}><span>Quando</span><span>Quem</span><span>Ação</span><span>Módulo</span><span>Registro</span></div>
            {(auditAll ? [...audit].reverse() : [...audit].reverse().slice(0, 12)).map((a, i) => (
              <div key={`${a.em}-${i}`} className="vx-tr" style={{ gridTemplateColumns: "150px minmax(0,1fr) 90px minmax(0,1fr) minmax(0,1.4fr)" }}>
                <span className="vx-mono">{new Date(a.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{a.quem}</span><span>{a.acao}</span><span>{a.modulo}</span><span>{a.registro}</span>
              </div>
            ))}
            {!audit.length && <div className="vx-empty">Nenhum evento registrado ainda.</div>}
          </div>
          {audit.length > 12 && <button className="vx-btn vx-btn-g vx-btn-sm" style={{ marginTop: 10 }} onClick={() => setAuditAll(!auditAll)}>{auditAll ? "Mostrar menos" : `Mostrar todos (${audit.length})`}</button>}
        </div>
      )}
      {restoreFile && (
        <Confirm
          danger
          title="Restaurar cópia de segurança?"
          text="Os dados atuais deste navegador serão substituídos pelos da cópia. As senhas atuais continuam valendo."
          confirm="Restaurar cópia"
          onCancel={() => setRestoreFile(null)}
          onConfirm={() => {
            try {
              const currentStaff = JSON.parse(localStorage.getItem("vetflow-staff") || "[]") as Record<string, unknown>[]
              Object.entries(restoreFile).forEach(([key, value]) => {
                if (!BACKUP_KEYS(key)) return
                if (key === "vetflow-staff") {
                  const incoming = JSON.parse(value) as Record<string, unknown>[]
                  const merged = incoming.map((u) => { const old = currentStaff.find((c) => c.id === u.id); return old ? { ...u, passwordHash: old.passwordHash, salt: old.salt, mustChange: old.mustChange } : null }).filter(Boolean)
                  localStorage.setItem(key, JSON.stringify(merged.length ? merged : currentStaff))
                } else localStorage.setItem(key, value)
              })
            } catch { /* ok */ }
            window.location.assign("/")
          }}
        />
      )}
      {reset && (
        <Confirm
          title="Restaurar dados de exemplo?"
          text="Todos os registros criados ou alterados neste navegador serão descartados. Você continuará conectado."
          confirm="Restaurar"
          danger
          onCancel={() => setReset(false)}
          onConfirm={() => {
            try {
              const raw = localStorage.getItem("vetflow-state-v4")
              const keep = raw ? JSON.parse(raw) : {}
              localStorage.setItem("vetflow-state-v4", JSON.stringify({ authenticated: true, theme: keep.theme, timeZone: keep.timeZone, profile: keep.profile }))
            } catch {
              /* sem armazenamento */
            }
            window.location.assign("/")
          }}
        />
      )}
      {toast}
    </Page>
  )
}

const faq: [string, string][] = [
  ["Como cadastro algo novo?", "Em qualquer aba, use o botão laranja no topo. A gaveta abre do lado direito, com etapas; avance com Próximo ou toque nas etapas. Campos obrigatórios são verificados antes de salvar."],
  ["Como vejo tudo de um animal ou profissional?", "Clique no nome em qualquer lista para abrir a ficha. Ela tem abas de histórico, consultas, vacinas, exames, cirurgias, internações, documentos e mais. Use as setas do topo para passar para o registro anterior ou o próximo."],
  ["Como troco de unidade?", "Pelo seletor no topo, pelo menu do perfil ou na aba Unidades (botão Entrar na unidade). Cada unidade tem seus próprios dados."],
  ["Os dados ficam salvos?", "Sim, neste navegador. Em Configurações você pode restaurar os dados iniciais."],
  ["Funciona no celular?", "Sim. No celular o menu lateral abre pelo botão no canto superior esquerdo e as gavetas ocupam a tela inteira."],
]
const shortcuts: [string, string][] = [
  ["Ctrl/⌘ + K", "Pesquisar em tudo"],
  ["Esc", "Fechar gaveta, janela ou menu"],
  ["Enter", "Abrir item selecionado"],
  ["← →", "Mover post-it no mural de ocorrências"],
]

export function Ajuda() {
  const [open, setOpen] = useState(0)
  const navigate = useNavigate()
  return (
    <Page bg="#eef6f1" blobs={[["#a8e2b8", -60, -40, 420, 380], ["#ffd39a", "75%", 180, 380, 340]]} crumb="Ajuda e suporte" title="Ajuda e suporte" sub="Respostas rápidas, atalhos e contato com o suporte.">
      <div className="vx-two">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="vx-glass" style={{ padding: 20 }}>
            <div className="vx-lbl"><Keyboard size={14} style={{ verticalAlign: -2 }} /> Atalhos</div>
            {shortcuts.map(([key, label]) => (
              <div key={key} className="vx-row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--vx-line)", fontSize: 13, gap: 10 }}>
                <span>{label}</span>
                <kbd style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--vx-soft)" }}>{key}</kbd>
              </div>
            ))}
          </div>
          <div className="vx-glass" style={{ padding: 20 }}>
            <div className="vx-lbl"><LifeBuoy size={14} style={{ verticalAlign: -2 }} /> Falar com o suporte</div>
            <p className="vx-hint" style={{ marginTop: 6 }}>Segunda a sábado, 8h às 20h.</p>
            <a className="vx-btn vx-btn-p" style={{ marginTop: 8, textDecoration: "none" }} href="mailto:suporte@vetflow.com.br?subject=Ajuda%20VetFlow"><Mail /> suporte@vetflow.com.br</a>
          </div>
        </div>
        <div className="vx-glass" style={{ padding: 8 }}>
          {faq.map(([question, answer], index) => (
            <div key={question} style={{ borderTop: index ? "1px solid var(--vx-line)" : 0 }}>
              <button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "16px 14px", border: 0, background: "transparent", font: "inherit", fontWeight: 800, fontSize: 15, color: "var(--vx-ink)", cursor: "pointer", textAlign: "left" }}>
                {question}
                <ChevronDown size={18} style={{ transform: open === index ? "rotate(180deg)" : "none", transition: "transform .2s", flex: "none" }} />
              </button>
              {open === index && <p style={{ margin: 0, padding: "0 14px 16px", fontSize: 14, lineHeight: 1.6, color: "var(--vx-ink2)" }}>{answer}</p>}
            </div>
          ))}
          <div style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {modules.slice(0, 8).map(([slug, label]) => (
              <button key={slug} className="vx-chip" onClick={() => navigate(`/${slug}`)} style={{ cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

export function NaoEncontrada() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <Page bg="#f1efe9" blobs={[["#ffc9a8", -60, -40, 420, 380]]} crumb="404" title="Página não encontrada" sub={`O endereço ${location.pathname} não corresponde a uma tela do VetFlow.`}>
      <div className="vx-row" style={{ gap: 8 }}>
        <button className="vx-btn vx-btn-g" onClick={() => navigate(-1)}><ArrowLeft /> Voltar</button>
        <button className="vx-btn vx-btn-p" onClick={() => navigate("/")}><UserRound /> Ir para o início</button>
      </div>
    </Page>
  )
}
