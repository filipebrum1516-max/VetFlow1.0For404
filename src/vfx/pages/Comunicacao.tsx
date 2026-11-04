import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { MessageCircle, Pencil, Send } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { CadastroDrawer, CadSec, Campo } from "../CadastroDrawer"
import RowActions from "../RowActions"
import { addDays, fmtDate, itemDate, Page, Pager, SearchBox, StatusPill, todayISO, useToast, usePaged } from "../ui"

/*
 * Comunicação = automações do WhatsApp. Cada automação observa algo da clínica (agenda, vacina,
 * exame, consulta, aniversário, cirurgia) e monta a mensagem pronta para cada tutor na fila do dia.
 * Sem a API oficial do WhatsApp Business conectada, cada envio abre o WhatsApp com o texto pronto.
 */
type Auto = { id: string; nome: string; quando: string; texto: string; ativo: boolean }
const PADRAO: Auto[] = [
  { id: "confirmacao", nome: "Confirmação de consulta", quando: "1 dia antes do horário marcado", ativo: true, texto: "Olá, {tutor}! Lembrete da {clinica}: {pet} tem horário marcado em {data} às {hora}. Responda 1 para confirmar ou 2 para remarcar." },
  { id: "vacina", nome: "Lembrete de vacina", quando: "7 dias antes do vencimento e quando atrasar", ativo: true, texto: "Oi, {tutor}! A vacina {item} do(a) {pet} vence em {data}. Quer agendar a aplicação? É só responder esta mensagem." },
  { id: "exame", nome: "Resultado de exame pronto", quando: "quando o exame é concluído", ativo: true, texto: "Olá, {tutor}! O resultado do exame {item} do(a) {pet} está pronto. Fale com a gente para combinar a entrega ou o retorno." },
  { id: "posconsulta", nome: "Acompanhamento pós-consulta", quando: "1 dia depois da consulta", ativo: true, texto: "Oi, {tutor}! Como o(a) {pet} está depois da consulta de ontem? Qualquer dúvida sobre o tratamento, estamos à disposição." },
  { id: "poscirurgia", nome: "Pós-operatório", quando: "1 dia depois da cirurgia", ativo: true, texto: "Olá, {tutor}! Como está a recuperação do(a) {pet} após a cirurgia? Lembre das orientações e do horário dos medicamentos." },
  { id: "aniversario", nome: "Aniversário do pet", quando: "no dia do aniversário", ativo: false, texto: "Parabéns, {pet}! 🎉 A equipe da {clinica} deseja muita saúde. {tutor}, conte com a gente sempre." },
]
const KEY_AUTO = "vetflow-wa-automacoes"
const KEY_CFG = "vetflow-wa-config"
const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sem armazenamento */ }
}
const digits = (value = "") => value.replace(/\D/g, "")
const waLink = (phone: string, text: string) => {
  const d = digits(phone)
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(text)}`
}
type Envio = { key: string; auto: Auto; tutor: string; ownerId?: string; pet: string; animalId?: string; phone: string; texto: string; motivo: string }
const COLS_FILA = "minmax(0,1.1fr) minmax(0,1fr) minmax(0,2.4fr) 120px"
const COLS_HIST = "100px minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,2fr) 120px 128px"

export default function Comunicacao() {
  const { data, addItem, activeUnit } = useVetFlow()
  const navigate = useNavigate()
  const [toast, showToast] = useToast()
  const [autos, setAutosRaw] = useState<Auto[]>(() => {
    const saved = load<Auto[]>(KEY_AUTO, [])
    return PADRAO.map((base) => ({ ...base, ...(saved.find((item) => item.id === base.id) || {}) }))
  })
  const setAutos = (next: Auto[]) => { setAutosRaw(next); save(KEY_AUTO, next) }
  const [cfg, setCfgRaw] = useState(() => load(KEY_CFG, { numero: "" }))
  const [editing, setEditing] = useState<Auto | null>(null)
  const [query, setQuery] = useState("")

  const hoje = todayISO()
  const amanha = addDays(hoje, 1)
  const ontem = addDays(hoje, -1)
  const em7 = addDays(hoje, 7)
  const clinica = activeUnit.name
  const phoneOf = (ownerId?: string, fallback?: string) => data.tutores.find((t) => t.id === ownerId)?.phone || fallback || ""
  const jaEnviado = useMemo(() => new Set(data.comunicacao.map((item) => item.extra?.autoKey).filter(Boolean)), [data.comunicacao])

  const fila = useMemo(() => {
    const out: Envio[] = []
    const fill = (auto: Auto, vars: Record<string, string>) =>
      auto.texto.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "")
    const push = (auto: Auto, it: Item, motivo: string, vars: Record<string, string> = {}) => {
      if (!auto.ativo) return
      const key = `${auto.id}:${it.id}:${hoje}`
      if (jaEnviado.has(key)) return
      const phone = phoneOf(it.ownerId, it.phone)
      if (!digits(phone)) return
      const tutor = (it.owner || "").split(" ")[0] || "tutor(a)"
      const pet = it.animal || it.name
      out.push({ key, auto, tutor: it.owner || "Tutor", ownerId: it.ownerId, pet, animalId: it.animalId, phone, motivo, texto: fill(auto, { tutor, pet, clinica, data: fmtDate(itemDate(it)), hora: it.time || "", item: it.name, ...vars }) })
    }
    const byId = Object.fromEntries(autos.map((a) => [a.id, a]))
    data.agendas.filter((it) => itemDate(it) === amanha && !/cancel|falt/i.test(it.status)).forEach((it) => push(byId.confirmacao, it, `Horário em ${fmtDate(amanha)} ${it.time || ""}`))
    data.vacinas.forEach((it) => {
      const venc = it.dueDate || ""
      if (/atras/i.test(it.status) || (venc >= hoje && venc <= em7)) push(byId.vacina, it, /atras/i.test(it.status) ? "Vacina atrasada" : `Vence em ${fmtDate(venc)}`, { data: fmtDate(venc || itemDate(it)) })
    })
    data.exames.filter((it) => /conclu/i.test(it.status) && itemDate(it) >= addDays(hoje, -2)).forEach((it) => push(byId.exame, it, "Resultado concluído"))
    data.consultas.filter((it) => itemDate(it) === ontem && /realiz|conclu|atendid/i.test(it.status)).forEach((it) => push(byId.posconsulta, it, "Consulta ontem"))
    data.cirurgias.filter((it) => itemDate(it) === ontem && /conclu/i.test(it.status)).forEach((it) => push(byId.poscirurgia, it, "Cirurgia ontem"))
    data.animais.filter((it) => it.birthDate && it.birthDate.slice(5) === hoje.slice(5)).forEach((it) => push(byId.aniversario, { ...it, animal: it.name }, "Aniversário hoje"))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, autos, jaEnviado, hoje])

  const contagem = (id: string) => fila.filter((e) => e.auto.id === id).length

  const enviar = (e: Envio) => {
    window.open(waLink(e.phone, e.texto), "_blank", "noopener")
    addItem("comunicacao", {
      name: e.auto.nome,
      ownerId: e.ownerId,
      owner: e.tutor,
      animalId: e.animalId,
      animal: e.pet,
      phone: e.phone,
      subtitle: `${e.pet} • ${e.tutor}`,
      status: "Enviada",
      date: hoje,
      extra: { mensagem: e.texto, canal: "WhatsApp", autoKey: e.key, automacao: e.auto.id },
    })
    showToast(`Mensagem para ${e.tutor} aberta no WhatsApp e registrada.`)
  }

  const historico = data.comunicacao
    .filter((it) => `${it.name} ${it.owner || ""} ${it.animal || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => `${itemDate(b)}${b.createdAt}`.localeCompare(`${itemDate(a)}${a.createdAt}`))
  const paged = usePaged(historico, 12, [query])
  const ativas = autos.filter((a) => a.ativo).length

  return (
    <Page
      bg="#f4f6f9"
      crumb="Comunicação"
      title="Comunicação pelo WhatsApp"
      sub="Automações que preparam as mensagens para os tutores. Todo dia a fila mostra quem precisa receber o quê."
    >
      <div className="wa-config">
        <MessageCircle />
        <div>
          <strong>WhatsApp da clínica</strong>
        </div>
        <label className="vx-f" style={{ minWidth: 220 }}>
          <span className="vx-fl">Número que envia</span>
          <input className="vx-in" placeholder="(69) 90000-0000" value={cfg.numero} onChange={(event) => { const next = { numero: event.target.value }; setCfgRaw(next); save(KEY_CFG, next) }} />
        </label>
      </div>

      <div className="vx-kpis3">
        <div><small>Automações ligadas</small><strong>{ativas} de {autos.length}</strong><span>rodando todos os dias</span></div>
        <div><small>Para enviar hoje</small><strong>{fila.length}</strong><span>mensagens prontas na fila</span></div>
        <div><small>Enviadas no histórico</small><strong>{data.comunicacao.filter((it) => /enviad|lida|respond/i.test(it.status)).length.toLocaleString("pt-BR")}</strong><span>registradas no sistema</span></div>
      </div>

      <h2 className="cx-h2">Automações</h2>
      <div className="wa-autos">
        {autos.map((auto) => (
          <article key={auto.id} className={`wa-auto ${auto.ativo ? "" : "off"}`}>
            <header>
              <div>
                <strong>{auto.nome}</strong>
                <span>Quando: {auto.quando}</span>
              </div>
              <label className="wa-switch" title={auto.ativo ? "Desligar" : "Ligar"}>
                <input type="checkbox" checked={auto.ativo} onChange={() => setAutos(autos.map((a) => (a.id === auto.id ? { ...a, ativo: !a.ativo } : a)))} />
                <i />
                <span>{auto.ativo ? "Ligada" : "Desligada"}</span>
              </label>
            </header>
            <p>{auto.texto}</p>
            <footer>
              <span>{auto.ativo ? `${contagem(auto.id)} na fila de hoje` : "Não gera mensagens"}</span>
              <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => setEditing(auto)}><Pencil /> Editar mensagem</button>
            </footer>
          </article>
        ))}
      </div>

      <h2 className="cx-h2">Fila de hoje · {fmtDate(hoje)}</h2>
      <div className="vx-table">
        <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS_FILA }}>
          <span>Tutor / pet</span><span>Automação</span><span>Mensagem</span><span className="r">Enviar</span>
        </div>
        {fila.slice(0, 40).map((e) => (
          <div key={e.key} className="vx-tr" style={{ gridTemplateColumns: COLS_FILA }}>
            <span><strong>{e.tutor}</strong><small className="vx-muted" style={{ display: "block" }}>{e.pet} · {e.phone}</small></span>
            <span>{e.auto.nome}<small className="vx-muted" style={{ display: "block" }}>{e.motivo}</small></span>
            <span className="vx-muted" style={{ whiteSpace: "normal" }}>{e.texto}</span>
            <span className="r"><button className="vx-btn vx-btn-p vx-btn-sm" onClick={() => enviar(e)}><Send /> WhatsApp</button></span>
          </div>
        ))}
        {!fila.length && <div className="vx-empty">Nenhuma mensagem para enviar hoje. As automações ligadas preenchem esta fila sozinhas.</div>}
        {fila.length > 40 && <div className="vx-empty">Mostrando 40 de {fila.length}. Envie estas para ver as próximas.</div>}
      </div>

      <div className="vx-row cx-allhead">
        <h2 className="cx-h2">Histórico de mensagens</h2>
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar tutor, pet ou mensagem" />
      </div>
      <div className="vx-table">
        <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS_HIST }}>
          <span>Data</span><span>Tutor</span><span>Assunto</span><span>Mensagem</span><span>Situação</span><span className="r">Ações</span>
        </div>
        {paged.visible.map((it) => (
          <div key={it.id} className="vx-tr" style={{ gridTemplateColumns: COLS_HIST, cursor: "pointer" }} onClick={() => navigate(`/comunicacao/${it.id}`)}>
            <span className="vx-mono">{fmtDate(itemDate(it))}</span>
            <span><strong>{it.owner || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{it.animal || ""}</small></span>
            <span>{it.name}</span>
            <span className="vx-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.extra?.mensagem || it.notes || "—"}</span>
            <span><StatusPill status={it.status} /></span>
            <span className="r">
              <RowActions
                name={it.name}
                onView={() => navigate(`/comunicacao/${it.id}`)}
                onEdit={() => navigate(`/comunicacao/${it.id}?editar=1`)}
                onDelete={() => navigate(`/comunicacao/${it.id}?excluir=1`)}
              />
            </span>
          </div>
        ))}
        {!historico.length && <div className="vx-empty">Nenhuma mensagem encontrada.</div>}
      </div>
      {paged.pages > 1 && (
        <div className="vx-row" style={{ justifyContent: "center", marginTop: 12 }}>
          <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
        </div>
      )}

      {editing && (
        <CadastroDrawer
          title={editing.nome}
          sub={`Enviada ${editing.quando}.`}
          submitLabel="Salvar automação"
          onClose={() => setEditing(null)}
          onSubmit={(form) => {
            const fd = new FormData(form)
            const texto = String(fd.get("texto") || "").trim()
            if (texto.length < 10) return
            setAutos(autos.map((a) => (a.id === editing.id ? { ...a, texto, ativo: fd.get("ativo") === "on" } : a)))
            setEditing(null)
            showToast("Automação salva.")
          }}
        >
          <CadSec n={1} title="Mensagem" desc="Use as palavras entre chaves para preencher sozinho">
            <Campo label="Texto da mensagem" req span={6} hint="{tutor} primeiro nome · {pet} nome do animal · {data} · {hora} · {item} vacina/exame · {clinica}">
              <textarea className="vx-in" name="texto" rows={6} defaultValue={editing.texto} required minLength={10} />
            </Campo>
          </CadSec>
          <CadSec n={2} title="Situação">
            <label className="vx-f vx-c6" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="ativo" defaultChecked={editing.ativo} /> Automação ligada
            </label>
          </CadSec>
        </CadastroDrawer>
      )}
      {toast}
    </Page>
  )
}
