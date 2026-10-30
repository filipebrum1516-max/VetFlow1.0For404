import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, Calendar, Camera, CameraOff, Check, ClipboardList, Clock, Copy, FileText, MessageCircle, Mic, MicOff, MonitorUp, PawPrint, PhoneOff, Pill, Play, Plus, Search, Send, ShieldCheck, Stethoscope, Trash2, User, Video, Wifi } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, fmtDate, initials, itemDate, normalizeText, Page, StatusPill, todayISO } from "../ui"
import "../tele.css"

const key = (item: Item) => `${itemDate(item)} ${item.time || "00:00"}`
type Filtro = "Hoje" | "Próximos" | "Concluídos" | "Todos"
type Soap = { s: string; o: string; a: string; p: string }
type Rx = { med: string; dose: string; freq: string; dias: string }
type Msg = { de: "vet" | "tutor"; texto: string; hora: string }
const BLANK_SOAP: Soap = { s: "", o: "", a: "", p: "" }
const SOAP_LABELS: [keyof Soap, string, string][] = [
  ["s", "Queixa (S)", "O que o tutor relata: início, frequência, apetite, comportamento…"],
  ["o", "Achados pela câmera (O)", "Postura, respiração, mucosas visíveis, lesões, marcha…"],
  ["a", "Avaliação (A)", "Hipóteses e gravidade"],
  ["p", "Plano e orientação (P)", "Conduta, medicação, retorno ou encaminhamento presencial"],
]
const hhmm = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
const dayLabel = (iso: string) => {
  const t = todayISO()
  if (iso === t) return "Hoje"
  if (iso === addDays(t, 1)) return "Amanhã"
  if (iso === addDays(t, -1)) return "Ontem"
  return fmtDate(iso, { weekday: "long", day: "2-digit", month: "long" })
}

export default function Teleatendimentos() {
  const { data, updateItem, addItem, profile } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("teleatendimentos", (saved) => setRoomId(saved.id))
  const all = data.teleatendimentos
  const sorted = useMemo(() => [...all].sort((a, b) => key(a).localeCompare(key(b))), [all])
  const today = todayISO()

  /* ---------------- lista ---------------- */
  const [roomId, setRoomId] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("Próximos")
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(24)
  const live = sorted.filter((item) => item.status === "Em andamento")
  const list = useMemo(() => {
    const nq = normalizeText(q.trim())
    let l = sorted.filter((item) => !nq || normalizeText(`${item.owner} ${item.animal} ${item.name} ${item.professional}`).includes(nq))
    if (filtro === "Hoje") l = l.filter((item) => itemDate(item) === today)
    if (filtro === "Próximos") l = l.filter((item) => item.status === "Em andamento" || (itemDate(item) >= today && !/conclu|faltou|cancel/i.test(item.status)))
    if (filtro === "Concluídos") l = l.filter((item) => /conclu/i.test(item.status)).reverse()
    if (filtro === "Todos") l = [...l].reverse()
    return l
  }, [sorted, filtro, q, today])
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const item of list.slice(0, limit)) m.set(itemDate(item), [...(m.get(itemDate(item)) || []), item])
    return [...m.entries()]
  }, [list, limit])
  const counts = {
    hoje: sorted.filter((i) => itemDate(i) === today).length,
    prox: sorted.filter((i) => i.status === "Em andamento" || (itemDate(i) >= today && !/conclu|faltou|cancel/i.test(i.status))).length,
    conc: sorted.filter((i) => /conclu/i.test(i.status)).length,
  }
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => ({ d, n: sorted.filter((i) => itemDate(i) === d).length }))

  /* ---------------- sala ---------------- */
  const current = all.find((item) => item.id === roomId) || null
  const animal = data.animais.find((item) => item.id === current?.animalId)
  const tutor = data.tutores.find((item) => item.id === (current?.ownerId || animal?.ownerId))
  const historico = useMemo(() => (current?.animalId ? data.prontuarios.filter((p) => p.animalId === current.animalId).slice(0, 4) : []), [data.prontuarios, current?.animalId])
  const vacinas = useMemo(() => (current?.animalId ? data.vacinas.filter((v) => v.animalId === current.animalId).slice(0, 4) : []), [data.vacinas, current?.animalId])
  const waiting = sorted.filter((item) => item.id !== current?.id && itemDate(item) === today && /agendado/i.test(item.status)).slice(0, 5)
  const [tab, setTab] = useState<"soap" | "paciente" | "receita" | "chat">("soap")
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(false)
  const [soap, setSoap] = useState<Soap>(BLANK_SOAP)
  const [rx, setRx] = useState<Rx[]>([])
  const [rxDraft, setRxDraft] = useState<Rx>({ med: "", dose: "", freq: "12/12h", dias: "7" })
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msg, setMsg] = useState("")
  const [consent, setConsent] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [ended, setEnded] = useState<Item | null>(null)
  const selfVideo = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  useEffect(() => {
    const ex = current?.extra || {}
    setSoap({ ...BLANK_SOAP, ...(ex.soap || {}), s: ex.soap?.s || ex.anotacoes || "" })
    setRx(ex.receita || [])
    setMsgs(ex.chat || (current ? [{ de: "tutor", texto: `Olá! ${current.animal} está aqui comigo.`, hora: current.time || hhmm() }] : []))
    setConsent(!!ex.consentimento)
    setTab("soap")
  }, [current?.id])
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t) }, [])
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), [])
  useEffect(() => { if (!roomId) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false) } }, [roomId])

  const toggleCam = async () => {
    if (cam) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false); return }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.current = media; setCam(true)
      window.setTimeout(() => { if (selfVideo.current) selfVideo.current.srcObject = media }, 50)
    } catch { forms.toast("Não foi possível acessar a câmera. Verifique a permissão do navegador.") }
  }
  const shareScreen = async () => {
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true })
      forms.toast("Compartilhando a tela com o tutor.")
      media.getVideoTracks()[0].addEventListener("ended", () => forms.toast("Compartilhamento encerrado."))
    } catch { forms.toast("Compartilhamento de tela cancelado.") }
  }
  const extraNow = (patch: Record<string, unknown> = {}) => ({ ...(current?.extra || {}), soap, receita: rx, chat: msgs, consentimento: consent, anotacoes: soapText(), ...patch })
  const soapText = () => SOAP_LABELS.filter(([k]) => soap[k].trim()).map(([k, l]) => `${l}: ${soap[k].trim()}`).join("\n")
  const open = (item: Item) => { setRoomId(item.id); setEnded(null); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const start = (item: Item | null = current) => {
    if (!item) return
    if (item.id !== roomId) open(item)
    updateItem("teleatendimentos", item.id, { status: "Em andamento", extra: { ...(item.extra || {}), inicio: new Date().toISOString() } })
    forms.toast(`Chamada com ${item.owner} iniciada.`)
  }
  const end = () => {
    if (!current) return
    const fim = new Date().toISOString()
    updateItem("teleatendimentos", current.id, { status: "Concluído", notes: soapText() || current.notes, extra: extraNow({ fim }) })
    stream.current?.getTracks().forEach((t) => t.stop()); setCam(false)
    setEnded({ ...current, status: "Concluído", extra: extraNow({ fim }) })
  }
  const saveDraft = () => { if (current) { updateItem("teleatendimentos", current.id, { extra: extraNow() }); forms.toast("Anotações salvas.") } }
  const saveRecord = () => {
    if (!current) return
    updateItem("teleatendimentos", current.id, { extra: extraNow({ prontuarioEm: new Date().toISOString() }) })
    addItem("prontuarios", { name: `Teleatendimento • ${current.name}`, animalId: current.animalId, animal: current.animal, owner: current.owner, professionalId: current.professionalId, professional: current.professional, category: "Evolução clínica", status: "Concluído", clinicalHistory: soap.s || current.notes, diagnosis: soap.a, treatment: [soap.p, ...rx.map((r) => `${r.med} ${r.dose} ${r.freq} por ${r.dias} dias`)].filter(Boolean).join("\n"), notes: soap.o, time: current.time })
    if (rx.length) addItem("prescricoes", { name: `Receita • ${current.animal}`, animalId: current.animalId, animal: current.animal, owner: current.owner, professional: current.professional, professionalId: current.professionalId, status: "Emitida", notes: rx.map((r) => `${r.med} — ${r.dose}, ${r.freq}, ${r.dias} dias`).join("\n") })
    forms.toast(rx.length ? "Prontuário e receita salvos." : "Anotações salvas no prontuário do paciente.")
  }
  const addRx = () => {
    if (!rxDraft.med.trim()) return forms.toast("Informe o medicamento.")
    setRx((r) => [...r, rxDraft]); setRxDraft({ med: "", dose: "", freq: "12/12h", dias: "7" })
  }
  const sendMsg = () => {
    const t = msg.trim(); if (!t) return
    setMsgs((m) => [...m, { de: "vet", texto: t, hora: hhmm() }]); setMsg("")
  }
  const capture = () => { setSoap((s) => ({ ...s, o: `${s.o}${s.o ? "\n" : ""}Foto capturada às ${hhmm()}.` })); forms.toast("Foto anexada aos achados.") }
  const elapsed = current?.extra?.inicio && current.status === "Em andamento" ? Math.floor((now - new Date(current.extra.inicio).getTime()) / 1000) : 0
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
  const link = current ? `vetflow.app/sala/${current.id.split("-").pop()}` : ""
  const resumo = ended ? `Olá, ${ended.owner}! Resumo do teleatendimento de ${ended.animal} (${fmtDate(itemDate(ended))}):\n${soap.a ? `Avaliação: ${soap.a}\n` : ""}${soap.p ? `Orientação: ${soap.p}\n` : ""}${rx.length ? `Receita: ${rx.map((r) => `${r.med} ${r.dose} ${r.freq} por ${r.dias} dias`).join("; ")}\n` : ""}Qualquer dúvida, estamos à disposição. ${profile?.displayName || "Equipe VetFlow"}` : ""
  const whatsapp = (tutor?.phone || "").replace(/\D/g, "")

  /* ================= SALA ================= */
  if (current) {
    const isLive = current.status === "Em andamento"
    const done = /conclu/i.test(current.status)
    return (
      <Page bg="#e8f1fb" blobs={[["#8cc9ff", -100, -80, 520, 460], ["#c9b8ff", "80%", "70%", 420, 420]]} crumb="Teleatendimentos" title={isLive ? "Na chamada" : done ? "Teleatendimento concluído" : "Sala de teleatendimento"}
        actions={<>
          <button className="vx-btn vx-btn-g" onClick={() => setRoomId("")}><ArrowLeft /> Todos os teleatendimentos</button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}><Plus /> Agendar</button>
        </>}>
        <div className="tl-room">
          <div className="tl-stage">
            <div className="vx-video tl-video">
              <div className="tl-center">
                <span className="vx-tele-face">{initials(current.owner)}</span>
                <div style={{ fontSize: 14 }}>{isLive ? `${current.owner} está na chamada` : done ? "Chamada encerrada" : `Aguardando iniciar · ${dayLabel(itemDate(current))} ${current.time || ""}`}</div>
                {!isLive && !done && <button className="vx-btn vx-btn-p" onClick={() => start()} disabled={!consent} title={consent ? "" : "Confirme o consentimento do tutor"}><Play /> Iniciar chamada</button>}
                {!isLive && !done && !consent && <label className="tl-consent dark"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Tutor autorizou o atendimento remoto e o registro dos dados (LGPD)</label>}
              </div>
              <div className="vx-dark tl-chip-l">
                <span className="vx-dot" style={{ background: isLive ? "#ff5a4e" : "#9aa6b8", width: 10, height: 10 }} />
                <span className="mono">{clock}</span>
                <span className="tl-hide-sm" style={{ opacity: 0.8 }}>· {current.owner} com {current.animal}</span>
                {isLive && <span className="tl-net"><Wifi size={14} /> boa</span>}
              </div>
              <button className="vx-dark tl-chip-r" onClick={() => { void navigator.clipboard?.writeText(`https://${link}`); forms.toast("Link da sala copiado. Envie ao tutor.") }}><Copy size={14} /> <span className="tl-hide-sm">{link}</span><span className="tl-show-sm">Link</span></button>
              <div className="tl-self">
                {cam ? <video ref={selfVideo} autoPlay muted playsInline /> : <span className="vx-tele-self-off"><CameraOff size={18} /><small>Câmera desligada</small><button type="button" onClick={toggleCam}>Ligar câmera</button></span>}
              </div>
              <div className="vx-dark tl-ctrl">
                <button className={`vx-ctrl ${mic ? "" : "off"}`} aria-pressed={!mic} onClick={() => setMic(!mic)}>{mic ? <Mic /> : <MicOff />}<small>{mic ? "Microfone" : "Mudo"}</small></button>
                <button className={`vx-ctrl ${cam ? "" : "off"}`} aria-pressed={cam} onClick={toggleCam}>{cam ? <Camera /> : <CameraOff />}<small>Câmera</small></button>
                <button className="vx-ctrl" onClick={shareScreen}><MonitorUp /><small>Tela</small></button>
                <button className="vx-ctrl" onClick={capture}><Video /><small>Foto</small></button>
                <button className="vx-ctrl" onClick={() => setTab("chat")}><MessageCircle /><small>Chat</small></button>
                <button className="vx-ctrl end" onClick={end} disabled={!isLive}><PhoneOff /><small>Encerrar</small></button>
              </div>
            </div>

            {ended && (
              <div className="vx-glass tl-summary">
                <div className="tl-sum-h"><span className="tl-ok"><Check /></span><div><b>Chamada encerrada</b><small>{ended.owner} · {ended.animal} · {ended.extra?.inicio ? `${Math.max(1, Math.round((new Date(ended.extra.fim).getTime() - new Date(ended.extra.inicio).getTime()) / 60000))} min` : ""}</small></div></div>
                <pre className="tl-resumo">{resumo}</pre>
                <div className="tl-actions">
                  <button className="vx-btn vx-btn-p" onClick={saveRecord}><FileText /> Salvar no prontuário{rx.length ? " + receita" : ""}</button>
                  <a className="vx-btn vx-btn-g" href={`https://wa.me/${whatsapp.length >= 10 ? "55" + whatsapp : ""}?text=${encodeURIComponent(resumo)}`} target="_blank" rel="noreferrer"><Send /> Enviar resumo no WhatsApp</a>
                  <button className="vx-btn vx-btn-g" onClick={() => navigate("/agendas")}><Calendar /> Agendar presencial</button>
                  {waiting[0] && <button className="vx-btn vx-btn-g" onClick={() => open(waiting[0])}>Próximo: {waiting[0].owner}</button>}
                </div>
              </div>
            )}

            {waiting.length > 0 && (
              <div className="tl-wait">
                <span className="vx-lbl">Sala de espera · hoje</span>
                <div className="tl-wait-row">
                  {waiting.map((w) => (
                    <button key={w.id} className="vx-glass tl-wait-card" onClick={() => open(w)}>
                      <span className="vx-av" style={{ background: colorFor(w.owner || "") }}>{initials(w.owner)}</span>
                      <span><b>{w.owner}</b><small>{w.animal} · {w.time}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="tl-side">
            <div className="vx-glass tl-patient">
              <span className="vx-av" style={{ background: colorFor(current.animal || "") }}>{initials(current.animal)}</span>
              <span className="tl-pt-main"><strong>{current.animal}</strong><small>{[animal?.species, animal?.breed, animal?.sex, animal?.weight].filter(Boolean).join(" · ") || animal?.subtitle}</small><small>Tutor: {current.owner}{tutor?.phone ? ` · ${tutor.phone}` : ""}</small></span>
              <StatusPill status={current.status} />
            </div>
            <div className="vx-glass tl-panel">
              <div className="tl-tabs" role="tablist">
                {([["soap", "Anotações", ClipboardList], ["paciente", "Paciente", PawPrint], ["receita", `Receita${rx.length ? ` ${rx.length}` : ""}`, Pill], ["chat", "Chat", MessageCircle]] as const).map(([k, l, Icon]) => (
                  <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon size={15} /> {l}</button>
                ))}
              </div>

              {tab === "soap" && (
                <div className="tl-body">
                  {current.notes && !/^Queixa/.test(current.notes) && <div className="vx-note"><b>Motivo do agendamento:</b> {current.notes}</div>}
                  {SOAP_LABELS.map(([k, l, ph]) => (
                    <label key={k} className="tl-f"><span>{l}</span><textarea className="vx-in" rows={k === "s" || k === "p" ? 3 : 2} placeholder={ph} value={soap[k]} onChange={(e) => setSoap({ ...soap, [k]: e.target.value })} /></label>
                  ))}
                  <label className="tl-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <ShieldCheck size={14} /> Consentimento do tutor para atendimento remoto (LGPD)</label>
                  <div className="tl-actions">
                    <button className="vx-btn vx-btn-g" onClick={saveDraft}>Salvar rascunho</button>
                    <button className="vx-btn vx-btn-p" onClick={saveRecord}><FileText /> Salvar no prontuário</button>
                  </div>
                </div>
              )}

              {tab === "paciente" && (
                <div className="tl-body">
                  <div className="tl-kv">
                    <span>Espécie</span><b>{animal?.species || "—"}</b>
                    <span>Raça</span><b>{animal?.breed || "—"}</b>
                    <span>Sexo</span><b>{animal?.sex || "—"}</b>
                    <span>Peso</span><b>{animal?.weight || "—"}</b>
                    <span>Nascimento</span><b>{animal?.birthDate ? fmtDate(animal.birthDate) : "—"}</b>
                    <span>Veterinário</span><b>{current.professional || "—"}</b>
                  </div>
                  <span className="vx-lbl">Últimos registros</span>
                  {historico.length ? historico.map((h) => <button key={h.id} className="tl-line" onClick={() => navigate(`/prontuarios/${h.id}`)}><Stethoscope size={14} /><span><b>{h.name}</b><small>{fmtDate(itemDate(h))} · {h.professional}</small></span></button>) : <p className="tl-muted">Sem registros anteriores.</p>}
                  <span className="vx-lbl">Vacinas</span>
                  {vacinas.length ? vacinas.map((v) => <div key={v.id} className="tl-line"><Check size={14} /><span><b>{v.name}</b><small>{fmtDate(itemDate(v))} · {v.status}</small></span></div>) : <p className="tl-muted">Nenhuma vacina registrada.</p>}
                  {animal && <button className="vx-btn vx-btn-g" onClick={() => navigate(`/animais/${animal.id}`)}><User /> Abrir ficha completa</button>}
                </div>
              )}

              {tab === "receita" && (
                <div className="tl-body">
                  <div className="tl-rx-form">
                    <input className="vx-in" placeholder="Medicamento" value={rxDraft.med} list="tl-meds" onChange={(e) => setRxDraft({ ...rxDraft, med: e.target.value })} />
                    <datalist id="tl-meds">{data.medicamentos.slice(0, 40).map((m) => <option key={m.id} value={m.name} />)}</datalist>
                    <input className="vx-in" placeholder="Dose (ex.: 1 comp.)" value={rxDraft.dose} onChange={(e) => setRxDraft({ ...rxDraft, dose: e.target.value })} />
                    <select className="vx-in" value={rxDraft.freq} onChange={(e) => setRxDraft({ ...rxDraft, freq: e.target.value })}>{["24/24h", "12/12h", "8/8h", "6/6h", "dose única"].map((f) => <option key={f}>{f}</option>)}</select>
                    <input className="vx-in" inputMode="numeric" placeholder="Dias" value={rxDraft.dias} onChange={(e) => setRxDraft({ ...rxDraft, dias: e.target.value.replace(/\D/g, "") })} />
                    <button className="vx-btn vx-btn-p" onClick={addRx}><Plus /> Adicionar</button>
                  </div>
                  {rx.length ? rx.map((r, i) => (
                    <div key={i} className="tl-line"><Pill size={14} /><span><b>{r.med}</b><small>{r.dose || "—"} · {r.freq} · {r.dias} dias</small></span><button className="tl-x" aria-label="Remover" onClick={() => setRx(rx.filter((_, k) => k !== i))}><Trash2 size={14} /></button></div>
                  )) : <p className="tl-muted">Nenhum item na receita. Ao salvar no prontuário, a receita também é emitida.</p>}
                </div>
              )}

              {tab === "chat" && (
                <div className="tl-body tl-chat">
                  <div className="tl-msgs">
                    {msgs.map((m, i) => <div key={i} className={`tl-msg ${m.de}`}><span>{m.texto}</span><small>{m.hora}</small></div>)}
                  </div>
                  <div className="tl-send">
                    <input className="vx-in" placeholder="Mensagem para o tutor" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMsg() }} />
                    <button className="vx-btn vx-btn-p" aria-label="Enviar" onClick={sendMsg}><Send /></button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
        {forms.node}
      </Page>
    )
  }

  /* ================= LISTA EM CARDS ================= */
  return (
    <Page bg="#e8f1fb" blobs={[["#8cc9ff", -100, -80, 520, 460], ["#c9b8ff", "80%", "70%", 420, 420], ["#b8e8dc", "40%", "85%", 360, 300]]}
      crumb="Teleatendimentos" title="Teleatendimentos"
      sub="Todos os atendimentos por vídeo, organizados por dia. Escolha um card para abrir a sala e iniciar a chamada."
      actions={<>
        <label className="tl-search"><Search size={16} /><input placeholder="Tutor, animal ou veterinário" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="vx-btn vx-btn-p" onClick={() => forms.open()}><Plus /> Agendar</button>
      </>}>
      <div className="tl-top">
        <div className="tl-filters" role="tablist">
          {([["Próximos", counts.prox], ["Hoje", counts.hoje], ["Concluídos", counts.conc], ["Todos", sorted.length]] as const).map(([f, n]) => (
            <button key={f} role="tab" aria-selected={filtro === f} className={filtro === f ? "on" : ""} onClick={() => { setFiltro(f); setLimit(24) }}>{f} <b>{n}</b></button>
          ))}
        </div>
        <div className="tl-week">
          {week.map(({ d, n }) => (
            <span key={d} className={`tl-day ${d === today ? "today" : ""}`}><small>{fmtDate(d, { weekday: "short" }).replace(".", "")}</small><b>{d.slice(8)}</b><i style={{ opacity: n ? 1 : 0.25 }}>{n}</i></span>
          ))}
        </div>
      </div>

      {live.length > 0 && filtro !== "Concluídos" && (
        <div className="tl-live-strip">
          {live.map((item) => (
            <button key={item.id} className="tl-live" onClick={() => open(item)}>
              <span className="tl-rec" /> <b>Ao vivo</b> · {item.owner} com {item.animal} · {item.professional} <span className="tl-go">Voltar à sala →</span>
            </button>
          ))}
        </div>
      )}

      {groups.map(([d, items]) => (
        <section key={d} className="tl-group">
          <h3><span>{dayLabel(d)}</span><small>{fmtDate(d)} · {items.length} {items.length === 1 ? "atendimento" : "atendimentos"}</small></h3>
          <div className="tl-grid">
            {items.map((item, i) => {
              const isLive = item.status === "Em andamento"
              const done = /conclu|faltou|cancel/i.test(item.status)
              const an = data.animais.find((a) => a.id === item.animalId)
              return (
                <article key={item.id} className={`tl-card ${isLive ? "live" : ""} ${done ? "done" : ""}`} style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
                  <header>
                    <span className="tl-time"><Clock size={14} /> {item.time || "--:--"}</span>
                    {isLive ? <span className="tl-badge live"><span className="tl-rec" /> Ao vivo</span> : <StatusPill status={item.status} />}
                  </header>
                  <div className="tl-kind"><Video size={15} /> {item.name}</div>
                  <div className="tl-who">
                    <span className="vx-av" style={{ background: colorFor(item.owner || "") }}>{initials(item.owner)}</span>
                    <span><b>{item.owner}</b><small>Tutor</small></span>
                  </div>
                  <div className="tl-pet">
                    <span className="tl-pet-ic" style={{ background: colorFor(item.animal || "") }}><PawPrint size={15} /></span>
                    <span><b>{item.animal}</b><small>{[an?.species, an?.breed].filter(Boolean).join(" · ") || "Paciente"}</small></span>
                  </div>
                  {item.notes && <p className="tl-motivo">{item.notes}</p>}
                  <footer>
                    <span className="tl-vet"><Stethoscope size={14} /> {item.professional || "—"}</span>
                    <span className="tl-btns">
                      <button className="vx-btn vx-btn-g" onClick={() => open(item)}>{done ? "Ver" : "Abrir sala"}</button>
                      {!done && <button className="vx-btn vx-btn-p" onClick={() => open(item)}><Play /> {isLive ? "Entrar" : "Iniciar"}</button>}
                    </span>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>
      ))}
      {!groups.length && <div className="vx-glass vx-empty">Nenhum teleatendimento neste filtro. <button className="vx-btn vx-btn-p" onClick={() => forms.open()}><Plus /> Agendar</button></div>}
      {list.length > limit && <div style={{ textAlign: "center", marginTop: 16 }}><button className="vx-btn vx-btn-g" onClick={() => setLimit(limit + 24)}>Mostrar mais ({list.length - limit})</button></div>}
      {forms.node}
    </Page>
  )
}
