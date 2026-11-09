/*
 * Ficha lateral dos cadastros (mesmo modelo de Usuários e acessos):
 * foto/iniciais, situação, ações, abas Dados · Uso · Alterações, e a janela de
 * excluir que oferece "Desativar" quando o cadastro já foi usado em outro lugar.
 */
import { useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router"
import { ChevronRight, Edit3, ExternalLink, Power, Trash2, X } from "lucide-react"
import { accessLevel, modules, useVetFlow, type Item, type ModuleSlug } from "../store"
import { display } from "./Detail"
import { formFor, statusOptions } from "./forms"
import { colorFor, fmtDate, initials, itemDate } from "./ui"

export type FichaAcao = { label: string; icon?: ReactNode; onClick: () => void; main?: boolean }
type Campo = [string, ReactNode]

const nomeModulo = (slug: string) => modules.find(([k]) => k === slug)?.[1] || slug
const INATIVO = /inativ|deslig|suspens|encerr|arquiv|bloque|afastad|falecid/i
export function statusInativo(slug: string) {
  const opts = statusOptions[slug as ModuleSlug] || []
  return opts.find((o) => /inativ/i.test(o)) || opts.find((o) => INATIVO.test(o)) || (slug === "unidades" ? "Inativa" : "Inativo")
}
const statusAtivo = (slug: string) => (statusOptions[slug as ModuleSlug] || []).find((o) => /^ativ/i.test(o)) || (slug === "unidades" ? "Ativa" : "Ativo")
const tomDe = (status: string) => (INATIVO.test(status) ? "gray" : /esgot|venc|atras|inadimp|urg/i.test(status) ? "red" : /acab|aten|pend|anális|revis|trat|abaixo/i.test(status) ? "orange" : "")

/** Onde o cadastro aparece no resto do sistema (vínculo por id ou pelo nome exato). */
export function useUsos(slug: string, item?: Item) {
  const { data } = useVetFlow()
  return useMemo(() => {
    if (!item) return [] as { slug: ModuleSlug; items: Item[] }[]
    const nome = item.name && item.name.length > 3 ? `"${item.name}"` : ""
    const out: { slug: ModuleSlug; items: Item[] }[] = []
    for (const key of Object.keys(data) as ModuleSlug[]) {
      const list = data[key]
      if (!Array.isArray(list)) continue
      const found = list.filter((r) => {
        if (r.id === item.id || (key === slug && r.name === item.name)) return false
        if (r.animalId === item.id || r.ownerId === item.id || r.professionalId === item.id) return true
        // pacientes, tutores e equipe têm nomes repetidos: só vale o vínculo pelo id (e o nome do tutor junto do animal)
        if (slug === "animais") return r.animal === item.name && !!item.owner && r.owner === item.owner && !r.animalId
        if (slug === "tutores" || slug === "profissionais") return r.owner === item.name || r.professional === item.name
        if (!nome) return false
        if (r.animal === item.name || r.owner === item.name || r.professional === item.name || r.service === item.name) return true
        return !!r.extra && JSON.stringify(r.extra).includes(nome)
      })
      if (found.length) out.push({ slug: key, items: found.sort((a, b) => itemDate(b).localeCompare(itemDate(a))) })
    }
    return out
  }, [data, item, slug])
}

export function FichaCadastro({
  slug,
  item,
  foto,
  sub,
  acoes = [],
  campos,
  abasExtras = [],
  onEdit,
  onToast,
  abrir,
  semExcluir,
}: {
  slug: ModuleSlug
  item: Item
  foto?: string
  sub?: ReactNode
  acoes?: FichaAcao[]
  /** Campos da aba Dados (sem isso usa o cadastro completo do formulário). */
  campos?: Campo[]
  abasExtras?: { label: string; content: ReactNode }[]
  onEdit?: () => void
  onToast?: (msg: string) => void
  /** Troca o destino de "Ficha completa". */
  abrir?: () => void
  semExcluir?: boolean
}) {
  const { data, audit, updateItem, user } = useVetFlow()
  const navigate = useNavigate()
  const [aba, setAba] = useState("Dados")
  const [excluir, setExcluir] = useState(false)
  const usos = useUsos(slug, item)
  const nUsos = usos.reduce((n, u) => n + u.items.length, 0)
  const nivel = accessLevel(user?.role, slug, user?.perms)
  const podeEditar = nivel === "Editar" || nivel === "Total"

  const lookup = (kind: "animal" | "pro", value: string) =>
    kind === "animal" ? data.animais.find((c) => c.id === value)?.name || value : data.profissionais.find((c) => c.id === value)?.name || value
  const dados: Campo[] = useMemo(() => {
    if (campos) return campos.filter(([, v]) => v !== undefined && v !== null && v !== "")
    const def = formFor(slug)
    const base: Campo[] = [
      ...(item.phone ? ([["Telefone", item.phone]] as Campo[]) : []),
      ...(item.email ? ([["E-mail", item.email]] as Campo[]) : []),
      ...(item.category ? ([["Categoria", item.category]] as Campo[]) : []),
      ...(item.registration ? ([["Registro", item.registration]] as Campo[]) : []),
      ...(item.address ? ([["Endereço", item.address]] as Campo[]) : []),
    ]
    const extra: Campo[] = def
      ? def.sections.flatMap((s) => s.fields.filter((f) => !["info", "calc", "perms", "rows", "file"].includes(f.t) && item.extra && item.extra[f.k] !== undefined && item.extra[f.k] !== "" && !(Array.isArray(item.extra[f.k]) && !(item.extra[f.k] as unknown[]).length)).map((f) => [f.label || f.k, display(item.extra?.[f.k], f, lookup)] as Campo))
      : []
    const seen = new Set<string>()
    return [...base, ...extra, ["Cadastrado em", fmtDate(item.createdAt || item.date)]].filter(([k]) => (seen.has(k) ? false : (seen.add(k), true)))
  }, [campos, slug, item, data])

  const alteracoes = useMemo(
    () =>
      audit
        .filter((a) => a.modulo === slug && a.registro === item.name)
        .slice(-30)
        .reverse(),
    [audit, slug, item.name],
  )
  const inativo = INATIVO.test(item.status)
  const tom = tomDe(item.status)

  const abas = ["Dados", ...abasExtras.map((a) => a.label), `Uso${nUsos ? ` · ${nUsos}` : ""}`, "Alterações"]
  const atual = abas.find((a) => a === aba || (aba.startsWith("Uso") && a.startsWith("Uso"))) || "Dados"

  return (
    <aside className="cd-side" aria-label={`Ficha de ${item.name}`}>
      <section className="cd-pane">
        <div className="cd-hero">
          {foto ? <img className="cd-big" src={foto} alt="" /> : <i className="cd-big" style={{ background: colorFor(item.id) }}>{initials(item.name)}</i>}
          <div className="cd-hero-t">
            <strong>{item.name}</strong>
            <span>{sub ?? item.subtitle}</span>
            <span className={`lv-pill ${tom}`}><i />{item.status || "—"}</span>
          </div>
        </div>
        <div className="cd-acts">
          {acoes.map((a) => (
            <button key={a.label} type="button" className={a.main ? "main" : ""} onClick={a.onClick}>{a.icon}{a.label}</button>
          ))}
          {onEdit && podeEditar && <button type="button" className={acoes.some((a) => a.main) ? "" : "main"} onClick={onEdit}><Edit3 />Editar</button>}
          <button type="button" onClick={() => (abrir ? abrir() : navigate(`/${slug}/${item.id}`))}><ExternalLink />Ficha completa</button>
          {podeEditar && !semExcluir && (inativo ? (
            <button type="button" onClick={() => { updateItem(slug, item.id, { status: statusAtivo(slug) }); onToast?.(`${item.name} reativado.`) }}><Power />Reativar</button>
          ) : (
            <button type="button" className="danger" onClick={() => setExcluir(true)}><Trash2 />{nUsos ? "Desativar" : "Excluir"}</button>
          ))}
        </div>
        <nav className="lv-tabs cd-tabs" role="tablist" aria-label="Seções da ficha">
          {abas.map((a) => (
            <button key={a} type="button" role="tab" aria-selected={atual === a} className={`lv-tab ${atual === a ? "on" : ""}`} onClick={() => setAba(a)}>{a}</button>
          ))}
        </nav>
        {atual === "Dados" && (
          <div className="cd-dl">
            {dados.map(([k, v]) => (
              <div key={k}><small>{k}</small><b>{v}</b></div>
            ))}
            {item.notes && <div className="full"><small>Observações</small><b className="wrap">{item.notes}</b></div>}
          </div>
        )}
        {abasExtras.map((a) => atual === a.label && <div key={a.label} className="cd-extra">{a.content}</div>)}
        {atual.startsWith("Uso") && (
          usos.length ? (
            usos.map((u) => (
              <div key={u.slug}>
                <div className="cd-grp"><span>{nomeModulo(u.slug)} · {u.items.length}</span></div>
                {u.items.slice(0, 6).map((r) => (
                  <button key={r.id} type="button" className="cd-li" onClick={() => navigate(`/${u.slug}/${r.id}`)}>
                    <time>{fmtDate(itemDate(r))}</time>
                    <span><b>{r.name}</b>{r.professional ? ` · ${r.professional}` : r.owner ? ` · ${r.owner}` : ""}</span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            ))
          ) : (
            <p className="cd-empty">Ainda não aparece em nenhum outro registro. Pode ser excluído sem perder histórico.</p>
          )
        )}
        {atual === "Alterações" && (
          <div>
            {alteracoes.map((a, i) => (
              <div key={i} className="cd-li static">
                <time>{fmtDate(a.em.slice(0, 10))} {a.em.slice(11, 16)}</time>
                <span><b>{a.quem}</b> · {a.acao} este cadastro</span>
              </div>
            ))}
            <div className="cd-li static"><time>{fmtDate(item.createdAt || item.date)}</time><span><b>Cadastro criado</b></span></div>
            {!alteracoes.length && <p className="cd-empty">Nenhuma alteração registrada desde o cadastro.</p>}
          </div>
        )}
      </section>
      {excluir && <ExcluirDialog slug={slug} item={item} usos={nUsos} onClose={() => setExcluir(false)} onDone={(msg) => { setExcluir(false); onToast?.(msg) }} />}
    </aside>
  )
}

/** Excluir só apaga o que nunca foi usado; o resto é desativado e o histórico continua. */
export function ExcluirDialog({ slug, item, usos, onClose, onDone }: { slug: ModuleSlug; item: Item; usos: number; onClose: () => void; onDone: (msg: string) => void }) {
  const { deleteItem, updateItem, user } = useVetFlow()
  const [modo, setModo] = useState<"desativar" | "excluir">(usos ? "desativar" : "excluir")
  const inativo = statusInativo(slug)
  const confirmar = () => {
    if (modo === "excluir") {
      deleteItem(slug, item.id)
      onDone(`${item.name} foi excluído.`)
    } else {
      updateItem(slug, item.id, { status: inativo, extra: { ...(item.extra || {}), desativadoPor: user?.displayName || "", desativadoEm: new Date().toISOString() } })
      onDone(`${item.name} desativado. O histórico continua guardado.`)
    }
  }
  return createPortal(
    <div className="vx-modal-layer cd-modal" role="dialog" aria-modal="true" aria-label={`Excluir ${item.name}`} onMouseDown={onClose}>
      <div className="cd-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cd-dialog-h">
          <strong>Excluir {item.name}?</strong>
          <button type="button" className="cl-x" aria-label="Fechar" onClick={onClose}><X /></button>
        </div>
        <p>{usos ? `${item.name} aparece em ${usos} ${usos === 1 ? "registro" : "registros"} do sistema. Esses registros não podem perder a referência.` : "Este cadastro ainda não foi usado em nenhum outro registro."}</p>
        <label className={`cd-opt ${modo === "desativar" ? "on" : ""}`}>
          <input type="radio" name="cd-modo" checked={modo === "desativar"} onChange={() => setModo("desativar")} />
          <span><b>Desativar{usos ? " (recomendado)" : ""}</b><small>Some das buscas e listas de escolha, fica como “{inativo}”. O histórico continua e dá para reativar.</small></span>
        </label>
        <label className={`cd-opt ${modo === "excluir" ? "on" : ""} ${usos ? "off" : ""}`}>
          <input type="radio" name="cd-modo" checked={modo === "excluir"} disabled={!!usos} onChange={() => setModo("excluir")} />
          <span><b>Excluir de vez</b><small>{usos ? "Indisponível: o cadastro já foi usado. Desative em vez de excluir." : "Apaga o cadastro. Não dá para desfazer."}</small></span>
        </label>
        <div className="cd-dialog-f">
          <button type="button" className="vx-btn vx-btn-g" onClick={onClose}>Cancelar</button>
          <button type="button" className={`vx-btn ${modo === "excluir" ? "vx-btn-d" : "vx-btn-p"}`} autoFocus onClick={confirmar}>{modo === "excluir" ? "Excluir de vez" : "Desativar"}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Botão de lixeira das linhas: abre a mesma janela de excluir/desativar da ficha. */
export function useExcluir(onToast?: (msg: string) => void) {
  const [alvo, setAlvo] = useState<{ slug: ModuleSlug; item: Item } | null>(null)
  const node = alvo ? <ExcluirAlvo alvo={alvo} onClose={() => setAlvo(null)} onToast={onToast} /> : null
  return { pedir: (slug: ModuleSlug, item: Item) => setAlvo({ slug, item }), node }
}
function ExcluirAlvo({ alvo, onClose, onToast }: { alvo: { slug: ModuleSlug; item: Item }; onClose: () => void; onToast?: (msg: string) => void }) {
  const usos = useUsos(alvo.slug, alvo.item)
  return <ExcluirDialog slug={alvo.slug} item={alvo.item} usos={usos.reduce((n, u) => n + u.items.length, 0)} onClose={onClose} onDone={(msg) => { onClose(); onToast?.(msg) }} />
}
