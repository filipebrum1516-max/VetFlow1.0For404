import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { CalendarClock, ChevronLeft, ChevronRight, Edit3, Heart, MessageCircle, Plus, Send, Trash2 } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { colorFor, Confirm, fmtDate, hash, itemDate, Page, Seg, StatusPill } from "../ui"

const formats = ["Todos", "Post", "Carrossel", "Stories", "Reels"]
const channels = ["Instagram", "Facebook", "Perfil do Google"]
const art = (item: Item) => {
  const seed = hash(item.id)
  const base = item.extra?.cor || colorFor(item.name)
  return `linear-gradient(${120 + (seed % 120)}deg, ${base}, ${["#ffb37a", "#ffd76a", "#a8e2b8", "#b3c3ff"][seed % 4]})`
}
const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`
const petPhotos = [U("photo-1653356162165-ed104b1f90cb"), U("photo-1594387992816-65f5d74c1de0"), U("photo-1600350109110-f47637d33325"), U("photo-1673069783568-b7392105285f"), U("photo-1628259679263-d1d5e245b778"), U("photo-1538291558837-4f8275234328")]
const cattlePhotos = [U("photo-1570042225831-d98fa7577f1e"), U("photo-1546445317-29f4545e9d53")]
const horsePhotos = [U("photo-1553284965-83fd3e82fa5a"), U("photo-1598974357801-cbca100e65d3")]
const photoOf = (item: Item) => {
  if (item.extra?.foto) return item.extra.foto as string
  const text = `${item.name} ${item.extra?.legenda || ""}`
  const pool = /aftosa|rebanho|gado|bovin|vaca|boi|leite|bezerr/i.test(text) ? cattlePhotos : /cavalo|equin|casco|haras|ferrage/i.test(text) ? horsePhotos : petPhotos
  return pool[hash(item.id) % pool.length]
}
function Photo({ item }: { item: Item }) {
  return <img className="vx-pub-photo" src={photoOf(item)} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none" }} />
}
const captionOf = (item: Item) =>
  item.extra?.legenda || item.notes || `${item.name}: dicas da nossa equipe para cuidar melhor do seu pet. Agende pelo link na bio.`

export default function Publicacoes() {
  const { data, updateItem, deleteItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("publicacoes", (saved) => setSelectedId(saved.id))
  const [format, setFormat] = useState("Todos")
  const [status, setStatus] = useState("Todos")
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState("")
  const [confirm, setConfirm] = useState(false)
  const list = useMemo(
    () =>
      [...data.publicacoes]
        .filter((item) => (format === "Todos" || (item.extra?.formato || item.category || "Post") === format) && (status === "Todos" || item.status === status))
        .sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [data.publicacoes, format, status],
  )
  const perPage = 7
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const visible = list.slice(page * perPage, page * perPage + perPage)
  const selected = list.find((item) => item.id === selectedId) || visible[0]
  const [caption, setCaption] = useState("")
  const [selChannels, setSelChannels] = useState<string[]>(["Instagram"])
  const [when, setWhen] = useState("")
  useEffect(() => {
    if (!selected) return
    setCaption(captionOf(selected))
    setSelChannels(selected.extra?.canais || ["Instagram"])
    setWhen(`${itemDate(selected)}T${selected.time || selected.extra?.time || "18:30"}`)
  }, [selected?.id])
  useEffect(() => {
    setPage(0)
  }, [format, status])

  const counts = {
    Publicada: data.publicacoes.filter((item) => item.status === "Publicada").length,
    Agendada: data.publicacoes.filter((item) => item.status === "Agendada").length,
    Rascunho: data.publicacoes.filter((item) => item.status === "Rascunho").length,
  }
  const reach = (item: Item) => 300 + (hash(item.id) % 2400)
  const likes = (item: Item) => 20 + (hash(item.id) % 340)

  const save = (nextStatus?: string) => {
    if (!selected) return
    const [date, time] = when.split("T")
    updateItem("publicacoes", selected.id, {
      status: nextStatus || selected.status,
      notes: caption,
      date: date || selected.date,
      time: time || selected.time,
      extra: { ...(selected.extra || {}), legenda: caption, canais: selChannels, date, time },
    })
    forms.toast(nextStatus === "Publicada" ? `Publicado em ${selChannels.join(", ")}.` : nextStatus === "Agendada" ? `Agendado para ${fmtDate(date)} às ${time}.` : "Rascunho salvo.")
  }
  const toggleChannel = (channel: string) =>
    setSelChannels((value) => (value.includes(channel) ? value.filter((item) => item !== channel) : [...value, channel]))

  return (
    <Page
      bg="#fbeef2"
      blobs={[["#ffb3c8", -80, -60, 460, 420], ["#ffd39a", "70%", 120, 420, 380], ["#c9b8ff", "40%", "75%", 380, 340]]}
      crumb="Publicações"
      title="Varal da semana"
      sub="Cada post é uma polaroid pendurada. Escolha uma para ver no celular, ajustar a legenda e agendar."
      actions={
        <>
          <Seg options={formats} value={format} onChange={setFormat} />
          <Seg options={["Todos", "Publicada", "Agendada", "Rascunho"]} value={status} onChange={setStatus} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Novo post
          </button>
        </>
      }
    >
      <div className="vx-glass vx-varal" style={{ padding: "18px 18px 26px", position: "relative", overflow: "hidden" }}>
        <div className="vx-row" style={{ justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
          <span className="vx-lbl">
            {list.length} posts · {counts.Publicada} publicados · {counts.Agendada} agendados · {counts.Rascunho} rascunhos
          </span>
          <div className="vx-row" style={{ gap: 6 }}>
            <button className="vx-icon-btn" aria-label="Posts anteriores" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></button>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 48, textAlign: "center" }}>{page + 1}/{pages}</span>
            <button className="vx-icon-btn" aria-label="Próximos posts" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight /></button>
          </div>
        </div>
        <svg viewBox="0 0 1000 40" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, top: 54, width: "100%", height: 40 }} aria-hidden="true">
          <path d="M0 6 Q 500 46 1000 6" fill="none" stroke="#8a6a52" strokeWidth="2" />
        </svg>
        <div className="vx-varal-row">
          {visible.map((item, index) => {
            const rot = ((hash(item.id) % 9) - 4) * 1.2
            const drop = Math.round(Math.sin(((index + 0.5) / visible.length) * Math.PI) * 22)
            return (
              <button
                key={item.id}
                className={`vx-polaroid ${item.id === selected?.id ? "on" : ""}`}
                style={{ position: "relative", transform: `rotate(${rot}deg)`, marginTop: 16 + drop, flex: "none" }}
                onClick={() => setSelectedId(item.id)}
                aria-label={`Post ${item.name}`}
              >
                <span style={{ position: "absolute", top: -12, left: "50%", marginLeft: -5, width: 10, height: 22, borderRadius: 3, background: "#c9a27a" }} />
                <span style={{ display: "block", height: 120, background: art(item), position: "relative", overflow: "hidden", opacity: item.status === "Rascunho" ? 0.55 : 1 }}>
                  <Photo item={item} />
                  <span style={{ position: "absolute", left: 8, bottom: 8, right: 8, color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.1, textShadow: "0 2px 6px rgba(0,0,0,.25)" }}>{item.extra?.textoImagem || item.name}</span>
                </span>
                <span style={{ display: "block", fontFamily: "Caveat, cursive", fontSize: 19, marginTop: 6, lineHeight: 1 }}>{fmtDate(itemDate(item), { day: "2-digit", month: "short" })}</span>
                <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: item.status === "Publicada" ? "#0f766e" : item.status === "Agendada" ? "#2457c5" : "#8a8f99" }}>
                  {(item.extra?.formato || item.category || "Post").toUpperCase()} · {item.status.toUpperCase()}
                </span>
              </button>
            )
          })}
          {!visible.length && <div className="vx-empty" style={{ width: "100%" }}>Nenhum post neste filtro.</div>}
        </div>
      </div>

      {selected && (
        <div className="vx-pub-grid" style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 28, marginTop: 22, alignItems: "start" }}>
          <div className="vx-phone" style={{ margin: "0 auto" }}>
            <div className="scr">
              <div className="vx-row" style={{ gap: 8, padding: "16px 14px 10px" }}>
                <span className="vx-av" style={{ width: 30, height: 30, fontSize: 11, background: "#e94f17" }}>VF</span>
                <span style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, display: "block" }}>vetflow.clinica</strong>
                  <small style={{ fontSize: 10, color: "#6b7280" }}>{selected.extra?.local || "Patrocinado"}</small>
                </span>
              </div>
              <div style={{ height: 270, background: art(selected), display: "flex", alignItems: "flex-end", padding: 16, color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,.45)", position: "relative", overflow: "hidden" }}>
                <Photo item={selected} />
                <span style={{ position: "relative" }}>{selected.extra?.textoImagem || selected.name}</span>
              </div>
              <div className="vx-row" style={{ gap: 12, padding: "10px 14px 4px" }}>
                <Heart size={20} /> <MessageCircle size={20} /> <Send size={20} />
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700 }}>{selected.status === "Publicada" ? `${likes(selected)} curtidas` : "prévia"}</span>
              </div>
              <div style={{ padding: "4px 14px", fontSize: 12, lineHeight: 1.4, overflow: "hidden", flex: 1 }}>
                <b>vetflow.clinica</b> {caption}
                {selected.extra?.hashtags && <div style={{ color: "#2457c5", marginTop: 4 }}>{selected.extra.hashtags}</div>}
              </div>
              <div style={{ margin: 12, padding: "10px 0", borderRadius: 10, background: "#e94f17", color: "#fff", textAlign: "center", fontSize: 12, fontWeight: 800 }}>{selected.extra?.cta || "Agendar"}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="vx-glass" style={{ padding: 20 }}>
              <div className="vx-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <StatusPill status={selected.status} />
              </div>
              <label className="vx-f" style={{ marginTop: 14 }}>
                <span className="vx-fl">Legenda</span>
                <textarea className="vx-in" style={{ minHeight: 120 }} value={caption} onChange={(event) => setCaption(event.target.value)} />
                <span className="vx-hint">{caption.length}/2200 caracteres</span>
              </label>
              <div className="vx-f" style={{ marginTop: 12 }}>
                <span className="vx-fl">Canais</span>
                <div className="vx-pills">
                  {channels.map((channel) => (
                    <button key={channel} type="button" className={`vx-pill ${selChannels.includes(channel) ? "on" : ""}`} aria-pressed={selChannels.includes(channel)} onClick={() => toggleChannel(channel)}>
                      {channel}
                    </button>
                  ))}
                </div>
              </div>
              <label className="vx-f" style={{ marginTop: 12, maxWidth: 260 }}>
                <span className="vx-fl">Data e hora</span>
                <input className="vx-in" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
              </label>
              <div className="vx-row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button className="vx-btn vx-btn-p" disabled={!selChannels.length} onClick={() => save("Publicada")}><Send /> Publicar agora</button>
                <button className="vx-btn vx-btn-g" disabled={!selChannels.length} onClick={() => save("Agendada")}><CalendarClock /> Agendar</button>
                <button className="vx-btn vx-btn-g" onClick={() => save("Rascunho")}>Salvar rascunho</button>
                <button className="vx-btn vx-btn-g" onClick={() => forms.open("publicacoes", selected)}><Edit3 /> Editar tudo</button>
                <button className="vx-btn vx-btn-g" onClick={() => navigate(`/publicacoes/${selected.id}`)}>Ficha</button>
                <button className="vx-btn vx-btn-d" onClick={() => setConfirm(true)}><Trash2 /> Excluir</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14 }}>
              <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Alcance</div><div className="vx-num" style={{ fontSize: 24 }}>{selected.status === "Publicada" ? reach(selected).toLocaleString("pt-BR") : "—"}</div><div className="vx-hint">pessoas</div></div>
              <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Curtidas</div><div className="vx-num" style={{ fontSize: 24 }}>{selected.status === "Publicada" ? likes(selected) : "—"}</div><div className="vx-hint">engajamento</div></div>
              <div className="vx-glass" style={{ padding: 16 }}><div className="vx-lbl">Agendamentos</div><div className="vx-num" style={{ fontSize: 24 }}>{selected.status === "Publicada" ? hash(selected.id) % 14 : "—"}</div><div className="vx-hint">pelo link do post</div></div>
            </div>
          </div>
        </div>
      )}
      {confirm && selected && (
        <Confirm
          title="Excluir post?"
          text={`"${selected.name}" sai do varal e não poderá ser recuperado.`}
          confirm="Excluir"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            deleteItem("publicacoes", selected.id)
            setConfirm(false)
            setSelectedId("")
            forms.toast("Post excluído.")
          }}
        />
      )}
      <style>{`.vx-varal-row{ display:flex; gap:18px; overflow-x:auto; padding:18px 6px 8px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch } .vx-varal-row > *{ scroll-snap-align:center } @media (max-width: 980px){ .vx-pub-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
