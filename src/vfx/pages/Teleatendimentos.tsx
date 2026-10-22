import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Camera, CameraOff, Copy, Mic, MicOff, MonitorUp, PhoneOff, Play, Plus, Video } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, fmtDate, initials, itemDate, Page, StatusPill, todayISO } from "../ui"

const key = (item: Item) => `${itemDate(item)} ${item.time || "00:00"}`

export default function Teleatendimentos() {
  const { data, updateItem, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("teleatendimentos", (saved) => setCurrentId(saved.id))
  const sorted = useMemo(() => [...data.teleatendimentos].sort((a, b) => key(a).localeCompare(key(b))), [data.teleatendimentos])
  const live = sorted.filter((item) => item.status === "Em andamento").slice(-1)[0]
  const queue = sorted.filter((item) => item.status === "Agendado" && itemDate(item) >= todayISO())
  const fallbackQueue = queue.length ? queue : sorted.filter((item) => item.status === "Agendado").slice(-6)
  const [currentId, setCurrentId] = useState("")
  const current = data.teleatendimentos.find((item) => item.id === currentId) || live || fallbackQueue[0] || sorted[sorted.length - 1]
  const waiting = fallbackQueue.filter((item) => item.id !== current?.id).slice(0, 4)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(false)
  const [notes, setNotes] = useState("")
  const [now, setNow] = useState(Date.now())
  const selfVideo = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const animal = data.animais.find((item) => item.id === current?.animalId)
  useEffect(() => {
    setNotes(current?.extra?.anotacoes || "")
  }, [current?.id])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), [])

  const toggleCam = async () => {
    if (cam) {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      setCam(false)
      return
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.current = media
      setCam(true)
      window.setTimeout(() => {
        if (selfVideo.current) selfVideo.current.srcObject = media
      }, 50)
    } catch {
      forms.toast("Não foi possível acessar a câmera. Verifique a permissão do navegador.")
    }
  }
  const shareScreen = async () => {
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true })
      forms.toast("Compartilhando a tela com o tutor.")
      media.getVideoTracks()[0].addEventListener("ended", () => forms.toast("Compartilhamento encerrado."))
    } catch {
      forms.toast("Compartilhamento de tela cancelado.")
    }
  }
  const start = () => {
    if (!current) return
    updateItem("teleatendimentos", current.id, { status: "Em andamento", extra: { ...(current.extra || {}), inicio: new Date().toISOString() } })
    forms.toast(`Chamada com ${current.owner} iniciada.`)
  }
  const end = () => {
    if (!current) return
    updateItem("teleatendimentos", current.id, { status: "Concluído", notes: notes || current.notes, extra: { ...(current.extra || {}), anotacoes: notes, fim: new Date().toISOString() } })
    stream.current?.getTracks().forEach((track) => track.stop())
    setCam(false)
    forms.toast("Chamada encerrada e salva.")
    if (waiting[0]) setCurrentId(waiting[0].id)
  }
  const capture = () => {
    const stamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    setNotes((value) => `${value}${value ? "\n" : ""}Foto capturada às ${stamp}.`)
    forms.toast("Foto anexada às anotações.")
  }
  const saveRecord = () => {
    if (!current) return
    updateItem("teleatendimentos", current.id, { notes, extra: { ...(current.extra || {}), anotacoes: notes } })
    addItem("prontuarios", { name: `Teleatendimento • ${current.name}`, animalId: current.animalId, professionalId: current.professionalId, professional: current.professional, category: "Evolução clínica", status: "Concluído", clinicalHistory: notes || current.notes, time: current.time })
    forms.toast("Anotações salvas no prontuário do paciente.")
  }
  const elapsed = current?.extra?.inicio && current.status === "Em andamento" ? Math.floor((now - new Date(current.extra.inicio).getTime()) / 1000) : 0
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
  const link = current ? `vetflow.app/sala/${current.id.split("-").pop()}` : ""

  return (
    <Page
      bg="#e8f1fb"
      blobs={[["#8cc9ff", -100, -80, 520, 460], ["#c9b8ff", "80%", "70%", 420, 420]]}
      crumb="Teleatendimentos"
      title="Na chamada"
      actions={
        <>
          <span className="vx-lbl">Sala de espera</span>
          {waiting.map((item) => (
            <button key={item.id} onClick={() => setCurrentId(item.id)} style={{ border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", font: "inherit", color: "inherit" }} aria-label={`Abrir chamada de ${item.owner}`}>
              <span className="vx-av" style={{ width: 46, height: 46, background: colorFor(item.owner || ""), border: "3px solid #fff" }}>{initials(item.owner)}</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{item.time || fmtDate(itemDate(item), { day: "2-digit", month: "2-digit" })}</span>
            </button>
          ))}
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Agendar
          </button>
        </>
      }
    >
      {current ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }} className="vx-tele-grid">
          <div className="vx-video">
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "rgba(255,255,255,.85)" }}>
              <span className="vx-tele-face">{initials(current.owner)}</span>
              <div style={{ fontSize: 14 }}>{current.status === "Em andamento" ? `${current.owner} está na chamada` : `Aguardando iniciar · ${fmtDate(itemDate(current))} ${current.time || ""}`}</div>
              {current.status !== "Em andamento" && !/conclu/i.test(current.status) && (
                <button className="vx-btn vx-btn-p" onClick={start}><Play /> Iniciar chamada</button>
              )}
            </div>
            <div className="vx-dark" style={{ position: "absolute", left: 20, top: 20, padding: "10px 14px", borderRadius: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span className="vx-dot" style={{ background: current.status === "Em andamento" ? "#ff5a4e" : "#9aa6b8", width: 10, height: 10 }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14 }}>{clock}</span>
              <span style={{ fontSize: 13, opacity: 0.8 }}>· {current.owner} com {current.animal}</span>
            </div>
            <button className="vx-dark vx-roomlink" style={{ position: "absolute", right: 20, top: 20, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }} onClick={() => { void navigator.clipboard?.writeText(`https://${link}`); forms.toast("Link da sala copiado.") }}>
              <Copy size={14} /> {link}
            </button>
            <div className="vx-selfview" style={{ position: "absolute", right: 20, bottom: 110, width: 190, height: 130, borderRadius: 20, background: "linear-gradient(160deg,#6b7fa5,#2a3550)", border: "2px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {cam ? <video ref={selfVideo} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} /> : <span className="vx-tele-self-off"><CameraOff size={18} /><small>Câmera desligada</small><button type="button" onClick={toggleCam}>Ligar câmera</button></span>}
            </div>
            <div className="vx-dark vx-ctrlbar" style={{ position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)", padding: 10, borderRadius: 999, display: "flex", gap: 10, background: "rgba(255,255,255,.14)" }}>
              <button className={`vx-ctrl ${mic ? "" : "off"}`} aria-label={mic ? "Desligar microfone" : "Ligar microfone"} aria-pressed={!mic} onClick={() => setMic(!mic)}>{mic ? <Mic /> : <MicOff />}<small>{mic ? "Microfone" : "Mudo"}</small></button>
              <button className={`vx-ctrl ${cam ? "" : "off"}`} aria-label={cam ? "Desligar câmera" : "Ligar câmera"} aria-pressed={cam} onClick={toggleCam}>{cam ? <Camera /> : <CameraOff />}<small>{cam ? "Desligar câmera" : "Ligar câmera"}</small></button>
              <button className="vx-ctrl" aria-label="Compartilhar tela" onClick={shareScreen}><MonitorUp /><small>Tela</small></button>
              <button className="vx-ctrl" aria-label="Capturar foto" onClick={capture}><Video /><small>Foto</small></button>
              <button className="vx-ctrl end" aria-label="Encerrar chamada" onClick={end}><PhoneOff /><small>Encerrar</small></button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="vx-glass" style={{ padding: 18, display: "flex", gap: 12, alignItems: "center", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }} onClick={() => navigate(`/teleatendimentos/${current.id}`)}>
              <span className="vx-av" style={{ width: 52, height: 52, borderRadius: 16, background: colorFor(current.animal || "") }}>{initials(current.animal)}</span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: 17 }}>{current.animal}</strong>
                <small style={{ fontSize: 12, color: "var(--vx-muted)" }}>{animal?.subtitle} · {current.name}</small>
              </span>
              <StatusPill status={current.status} />
            </button>
            <div className="vx-glass" style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="vx-row" style={{ justifyContent: "space-between" }}><span className="vx-lbl">Anotações ao vivo</span>{current.status === "Em andamento" && <span className="vx-chip" style={{ minHeight: 24, background: "#e2ecff", color: "#2457c5", border: 0 }}>gravando notas</span>}</div>
              <textarea className="vx-in" aria-label="Anotações da chamada" style={{ minHeight: 200, flex: 1 }} value={notes} placeholder="Queixa, achados pela câmera, orientação…" onChange={(event) => setNotes(event.target.value)} />
              {current.notes && <div className="vx-note"><b>Motivo:</b> {current.notes}</div>}
              <div className="vx-tele-toggles">
                <button type="button" className={`vx-tele-tg ${cam ? "on" : ""}`} aria-pressed={cam} onClick={toggleCam}>
                  {cam ? <Camera size={16} /> : <CameraOff size={16} />} {cam ? "Câmera ligada" : "Câmera desligada"}
                  <i />
                </button>
                <button type="button" className={`vx-tele-tg ${mic ? "on" : ""}`} aria-pressed={mic} onClick={() => setMic(!mic)}>
                  {mic ? <Mic size={16} /> : <MicOff size={16} />} {mic ? "Microfone ligado" : "Microfone mudo"}
                  <i />
                </button>
              </div>
              <button className="vx-btn vx-btn-g" onClick={() => navigate(`/agendas`)}>Agendar presencial</button>
              <button className="vx-btn vx-btn-p" onClick={saveRecord}>Salvar no prontuário</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="vx-glass vx-empty">Nenhum teleatendimento. <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>Agendar o primeiro</button></div>
      )}
      <style>{`@media (max-width: 1100px){ .vx-tele-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
