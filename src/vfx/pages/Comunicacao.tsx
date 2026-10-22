import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronLeft, Megaphone, Plus, Send } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, fmtDate, initials, itemDate, Page, SearchBox, normalizeText } from "../ui"

const templateText: Record<string, string> = {
  "Confirmação de consulta": "Olá! Sua consulta está confirmada. Responda 1 para confirmar ou 2 para remarcar.",
  "Lembrete de vacina": "Oi! A vacina do seu pet está chegando. Agende pelo link: vetflow.app/agendar",
  "Resultado disponível": "O resultado do exame já está disponível no app do tutor.",
  "Pesquisa de satisfação": "De 0 a 10, quanto você recomendaria a VetFlow? Sua opinião ajuda muito!",
}
const textOf = (item: Item) => item.extra?.mensagem || templateText[item.name] || item.notes || item.name
type Thread = { ownerId: string; owner: string; items: Item[]; last: string; unread: number }

export default function Comunicacao() {
  const { data, addItem, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("comunicacao")
  const [query, setQuery] = useState("")
  const [text, setText] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const threads = useMemo(() => {
    const map = new Map<string, Thread>()
    data.comunicacao.filter((item) => !item.extra?.campanha && item.ownerId).forEach((item) => {
      const thread = map.get(item.ownerId!) || { ownerId: item.ownerId!, owner: item.owner || "Tutor", items: [], last: "", unread: 0 }
      thread.items.push(item)
      if (`${itemDate(item)}${item.createdAt}` > thread.last) thread.last = `${itemDate(item)}${item.createdAt}`
      if (item.status === "Respondida" && !item.extra?.lidaEm) thread.unread++
      map.set(item.ownerId!, thread)
    })
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last))
  }, [data.comunicacao])
  const visibleThreads = threads.filter((thread) => normalizeText(thread.owner).includes(normalizeText(query))).slice(0, 60)
  const [ownerId, setOwnerId] = useState(() => new URLSearchParams(window.location.search).get("tutor") || "")
  const thread = threads.find((candidate) => candidate.ownerId === ownerId) || visibleThreads[0]
  const tutor = data.tutores.find((item) => item.id === thread?.ownerId)
  const pets = data.animais.filter((item) => item.ownerId === thread?.ownerId)
  const messages = (thread?.items || []).slice().sort((a, b) => `${itemDate(a)}${a.createdAt}`.localeCompare(`${itemDate(b)}${b.createdAt}`))
  const campaigns = data.comunicacao.filter((item) => item.extra?.campanha)
  const sent = data.comunicacao.filter((item) => /enviad|lida|respond/i.test(item.status)).length
  const answered = data.comunicacao.filter((item) => /respond/i.test(item.status)).length
  useEffect(() => {
    const list = bottom.current?.parentElement
    if (list) list.scrollTop = list.scrollHeight
  }, [thread?.ownerId, messages.length])
  useEffect(() => {
    thread?.items.filter((item) => item.status === "Respondida" && !item.extra?.lidaEm).forEach((item) => updateItem("comunicacao", item.id, { extra: { ...(item.extra || {}), lidaEm: new Date().toISOString() } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.ownerId])

  const send = (body = text) => {
    if (!body.trim() || !thread) return
    addItem("comunicacao", { name: "Mensagem da clínica", ownerId: thread.ownerId, owner: thread.owner, animalId: pets[0]?.id, animal: pets[0]?.name, subtitle: `${pets[0]?.name || "—"} • ${thread.owner}`, status: "Enviada", category: "WhatsApp", extra: { mensagem: body.trim(), direcao: "out" } })
    setText("")
  }
  const quick: [string, string][] = [
    ["Confirmar horário", `Oi, ${thread?.owner.split(" ")[0] || ""}! Podemos confirmar o horário do ${pets[0]?.name || "pet"}?`],
    ["Enviar Pix", "Segue a chave Pix da clínica: financeiro@vetflow.com.br. Obrigado!"],
    ["Pós-consulta", `Como o ${pets[0]?.name || "pet"} está hoje? Qualquer alteração, nos avise.`],
    ["Resultado pronto", "O resultado do exame ficou pronto e já está no app do tutor."],
  ]

  return (
    <Page
      bg="#ecf6ee"
      blobs={[["#9ee6b0", "30%", 200, 520, 480], ["#ffd39a", -100, -60, 360, 360], ["#8cc9ff", "85%", 300, 340, 340]]}
      crumb="Comunicação"
      title="Conversas"
      sub="Todos os tutores numa caixa só. Lembretes automáticos aparecem tracejados no fio."
      actions={
        <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
          <Plus /> Nova campanha
        </button>
      }
    >
      <div className={`vx-chat ${ownerId ? "has-thread" : ""}`}>
        <div className="vx-glass" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, maxHeight: 680 }}>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar tutor" style={{ minWidth: 0, height: 40, marginBottom: 6 }} />
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {visibleThreads.map((candidate) => {
              const last = candidate.items.slice().sort((a, b) => `${itemDate(b)}${b.createdAt}`.localeCompare(`${itemDate(a)}${a.createdAt}`))[0]
              return (
                <button key={candidate.ownerId} className={`vx-inbox-item ${candidate.ownerId === thread?.ownerId ? "on" : ""}`} onClick={() => setOwnerId(candidate.ownerId)}>
                  <span className="vx-av" style={{ width: 42, height: 42, background: colorFor(candidate.owner) }}>{initials(candidate.owner)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="vx-row" style={{ justifyContent: "space-between", gap: 6 }}><b style={{ fontSize: 14 }}>{candidate.owner}</b><span style={{ fontSize: 11, color: "var(--vx-muted)" }}>{fmtDate(itemDate(last), { day: "2-digit", month: "2-digit" })}</span></span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--vx-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{textOf(last)}</span>
                  </span>
                  {candidate.unread > 0 && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#2b7a4b", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{candidate.unread}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="vx-glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(255,255,255,.42)", minHeight: 620 }}>
          {thread ? (
            <>
              <div className="vx-row" style={{ gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--vx-line)", background: "var(--vx-glass)" }}>
                <button className="vx-icon-btn vx-chat-back" aria-label="Voltar para conversas" onClick={() => setOwnerId("")}><ChevronLeft /></button>
                <span className="vx-av" style={{ width: 40, height: 40, background: colorFor(thread.owner) }}>{initials(thread.owner)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800 }}>{thread.owner}</div><div style={{ fontSize: 12, color: "var(--vx-muted)" }}>{pets.map((pet) => pet.name).join(", ") || "sem pets"} · {tutor?.phone}</div></div>
                {tutor && <button className="vx-chip" onClick={() => navigate(`/tutores/${tutor.id}`)}>Abrir ficha</button>}
              </div>
              <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 470 }}>
                {messages.map((item) => (
                  <div key={item.id} style={{ display: "contents" }}>
                    <div className={`vx-bubble ${item.extra?.direcao === "in" ? "in" : item.extra?.direcao === "out" ? "out" : "auto"}`}>
                      {!item.extra?.direcao && <div style={{ fontSize: 10, fontWeight: 800, color: "var(--vx-violet)", letterSpacing: ".08em", marginBottom: 4 }}>AUTOMÁTICO · {item.name.toUpperCase()}</div>}
                      {textOf(item)}
                      <small>{fmtDate(itemDate(item))} · {item.status}</small>
                    </div>
                    {item.status === "Respondida" && !item.extra?.direcao && <div className="vx-bubble in">Recebido, obrigado!<small>resposta do tutor</small></div>}
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <div style={{ padding: "12px 14px", borderTop: "1px solid var(--vx-line)", background: "var(--vx-glass)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {quick.map(([label, body]) => <button key={label} className="vx-chip" onClick={() => setText(body)}>{label}</button>)}
                </div>
                <form className="vx-row" style={{ gap: 10 }} onSubmit={(event) => { event.preventDefault(); send() }}>
                  <label className="vx-search" style={{ flex: 1, minWidth: 0 }}><input aria-label="Mensagem" value={text} placeholder="Escreva uma mensagem…" onChange={(event) => setText(event.target.value)} /></label>
                  <button className="vx-btn vx-btn-p" type="submit" aria-label="Enviar" style={{ width: 48, padding: 0 }} disabled={!text.trim()}><Send /></button>
                </form>
              </div>
            </>
          ) : (
            <div className="vx-empty">Nenhuma conversa.</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="vx-lbl" style={{ paddingLeft: 4 }}>Campanhas · {campaigns.length}</div>
          {campaigns.slice(0, 5).map((item) => {
            const pct = item.status === "Enviada" ? 100 : item.status === "Pendente" ? 0 : 60
            return (
              <div key={item.id} className="vx-glass" style={{ padding: 14, borderRadius: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 52, height: 52, borderRadius: "50%", background: `conic-gradient(#2b7a4b ${pct}%, rgba(26,34,51,.08) 0)`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--vx-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{pct}%</span></span>
                <button onClick={() => navigate(`/comunicacao/${item.id}`)} style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", padding: 0 }}>
                  <strong style={{ display: "block", fontSize: 14 }}>{item.name}</strong>
                  <small style={{ fontSize: 12, color: "var(--vx-muted)" }}>{item.subtitle}</small>
                </button>
                {item.status === "Pendente" && <button className="vx-chip" onClick={() => { updateItem("comunicacao", item.id, { status: "Enviada" }); forms.toast(`Campanha “${item.name}” disparada.`) }}>Disparar</button>}
              </div>
            )
          })}
          {!campaigns.length && (
            <button className="vx-glass vx-clickable" style={{ padding: 16, textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => forms.open()}>
              <Megaphone size={20} />
              <div style={{ fontWeight: 800, marginTop: 6 }}>Criar a primeira campanha</div>
              <div className="vx-hint">Lembretes, aniversários, check-ups…</div>
            </button>
          )}
          <div className="vx-dark" style={{ padding: 16, marginTop: "auto" }}>
            <div className="vx-lbl" style={{ color: "rgba(255,255,255,.7)" }}>No histórico</div>
            <div className="vx-num" style={{ fontSize: 30, marginTop: 4 }}>{data.comunicacao.length.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>mensagens · {Math.round((sent / Math.max(1, data.comunicacao.length)) * 100)}% entregues · {Math.round((answered / Math.max(1, data.comunicacao.length)) * 100)}% respondidas</div>
          </div>
        </div>
      </div>
      {forms.node}
    </Page>
  )
}
