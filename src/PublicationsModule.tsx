import {
  BarChart3,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  ExternalLink,
  Film,
  Hash,
  Heart,
  Home,
  Image as ImageIcon,
  Laugh,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Video,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useVetFlow } from "./store"

type Platform =
  | "Instagram"
  | "Facebook"
  | "YouTube"
  | "X"
  | "TikTok"
  | "WhatsApp"

type SocialPost = {
  id: string
  title: string
  text: string
  type: "Imagem" | "Vídeo"
  media: string
  platforms: Platform[]
  status: "Publicado" | "Agendado" | "Falhou"
  time: string
  likes: number
  comments: number
  shares: number
  views: number
  liked?: boolean
  saved?: boolean
}

type Story = {
  id: string
  name: string
  image: string
  platforms: Platform[]
  time: string
}

const networks: Array<{
  name: Platform
  label: string
  url: string
  asset?: string
}> = [
  {
    name: "Instagram",
    label: "Instagram",
    url: "https://www.instagram.com/",
    asset: "/assets/social/instagram.png",
  },
  {
    name: "Facebook",
    label: "Facebook",
    url: "https://www.facebook.com/",
  },
  {
    name: "YouTube",
    label: "YouTube",
    url: "https://www.youtube.com/",
  },
  { name: "X", label: "X", url: "https://x.com/", asset: "/assets/social/x.png" },
  {
    name: "TikTok",
    label: "TikTok",
    url: "https://www.tiktok.com/",
    asset: "/assets/social/tiktok.png",
  },
  {
    name: "WhatsApp",
    label: "Comunidade",
    url: "https://web.whatsapp.com/",
    asset: "/assets/social/whatsapp.png",
  },
]

const photos = {
  care: "https://images.unsplash.com/photo-1653356162165-ed104b1f90cb?auto=format&fit=crop&w=1200&q=84",
  cat: "https://images.unsplash.com/photo-1594387992816-65f5d74c1de0?auto=format&fit=crop&w=1200&q=84",
  puppy:
    "https://images.unsplash.com/photo-1600350109110-f47637d33325?auto=format&fit=crop&w=1200&q=84",
  dog: "https://images.unsplash.com/photo-1673069783568-b7392105285f?auto=format&fit=crop&w=1200&q=84",
}

const initialPosts: SocialPost[] = [
  {
    id: "post-1",
    title: "Cuidado que transforma",
    text: "Cada consulta é uma oportunidade de cuidar, prevenir e fortalecer o vínculo com quem faz parte da família. Agende o check-up do seu pet.",
    type: "Imagem",
    media: photos.care,
    platforms: ["Instagram", "Facebook", "X"],
    status: "Publicado",
    time: "há 2h",
    likes: 486,
    comments: 38,
    shares: 72,
    views: 8240,
  },
  {
    id: "post-2",
    title: "3 sinais de que seu gato precisa de atenção",
    text: "Mudanças de apetite, isolamento e alterações no comportamento podem indicar que algo não está bem. No vídeo de hoje, nossa equipe explica quando procurar ajuda.",
    type: "Vídeo",
    media: photos.cat,
    platforms: ["YouTube", "Instagram", "TikTok"],
    status: "Publicado",
    time: "há 6h",
    likes: 932,
    comments: 81,
    shares: 144,
    views: 18600,
  },
  {
    id: "post-3",
    title: "Campanha de vacinação",
    text: "Proteção em dia é tranquilidade para toda a família. Neste sábado teremos condições especiais para vacinação.",
    type: "Imagem",
    media: photos.puppy,
    platforms: ["Instagram", "Facebook", "WhatsApp"],
    status: "Agendado",
    time: "amanhã, 09:00",
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  },
]

const initialStories: Story[] = [
  {
    id: "story-1",
    name: "Bastidores",
    image: photos.care,
    platforms: ["Instagram", "WhatsApp"],
    time: "há 3h",
  },
  {
    id: "story-2",
    name: "Dica felina",
    image: photos.cat,
    platforms: ["Instagram", "TikTok"],
    time: "expira em 20h",
  },
  {
    id: "story-3",
    name: "Vacinação",
    image: photos.puppy,
    platforms: ["Instagram", "Facebook", "WhatsApp"],
    time: "há 7h",
  },
  {
    id: "story-4",
    name: "Paciente do dia",
    image: photos.dog,
    platforms: ["TikTok", "Instagram"],
    time: "há 10h",
  },
]

function NetworkMark({
  network,
  small,
}: {
  network: Platform
  small?: boolean
}) {
  const match = networks.find((item) => item.name === network)!
  if (match.asset)
    return <img className={small ? "small" : ""} src={match.asset} alt="" />
  return (
    <i className={`social-letter social-${network.toLowerCase()}`}>
      {network === "Facebook" ? "f" : "▶"}
    </i>
  )
}

function PlatformChip({
  platform,
  onClick,
}: {
  platform: Platform
  onClick?: () => void
}) {
  return (
    <button
      className={`publication-platform-chip platform-${platform.toLowerCase()}`}
      onClick={onClick}
    >
      <NetworkMark network={platform} small />
      {platform === "WhatsApp" ? "Comunidade" : platform}
    </button>
  )
}

export default function PublicationsModule() {
  const { addItem, deleteItem } = useVetFlow()
  const [posts, setPosts] = useState(initialPosts)
  const [stories] = useState(initialStories)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("Todas")
  const [story, setStory] = useState<Story | null>(null)
  const [composer, setComposer] = useState(false)
  const [step, setStep] = useState(1)
  const [confirmation, setConfirmation] = useState(false)
  const [completedNetworks, setCompletedNetworks] = useState<Platform[]>([])
  const [menu, setMenu] = useState<string | null>(null)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [toast, setToast] = useState("")
  const [draft, setDraft] = useState<{
    title: string
    text: string
    type: "Imagem" | "Vídeo"
    media: string
    platforms: Platform[]
    previewPlatform: Platform
    schedule: string
  }>({
    title: "",
    text: "",
    type: "Imagem",
    media: "",
    platforms: ["Instagram"],
    previewPlatform: "Instagram",
    schedule: "",
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(
    () =>
      posts.filter((post) => {
        if (filter === "Todas") return true
        if (filter === "Imagens") return post.type === "Imagem"
        if (filter === "Vídeos") return post.type === "Vídeo"
        if (filter === "Agendadas") return post.status === "Agendado"
        return post.platforms.includes(filter as Platform)
      }),
    [filter, posts],
  )

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2800)
  }

  const toggleLike = (id: string) =>
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post,
      ),
    )

  const submitComment = (id: string) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id ? { ...post, comments: post.comments + 1 } : post,
      ),
    )
    setCommenting(null)
    showToast("Comentário adicionado")
  }

  const share = async (post: SocialPost) => {
    await navigator.clipboard?.writeText(
      `${post.title}\n\n${post.text}`,
    )
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, shares: item.shares + 1 } : item,
      ),
    )
    showToast("Texto copiado para compartilhar")
  }

  const availablePlatforms: Platform[] =
    draft.type === "Imagem"
      ? ["Instagram", "Facebook", "X", "WhatsApp"]
      : ["YouTube", "Instagram", "TikTok", "Facebook", "WhatsApp"]

  const togglePlatform = (platform: Platform) => {
    const selected = draft.platforms.includes(platform)
    const next = selected
      ? draft.platforms.filter((item) => item !== platform)
      : [...draft.platforms, platform]
    setDraft({
      ...draft,
      platforms: next,
      previewPlatform: next[0] || "Instagram",
    })
  }

  const upload = (file?: File) => {
    if (!file) return
    setDraft({ ...draft, media: URL.createObjectURL(file) })
  }

  const publish = (status: "Publicado" | "Agendado" | "Rascunho") => {
    if (!draft.title.trim() || !draft.text.trim() || !draft.platforms.length) {
      showToast("Preencha título, legenda e selecione uma rede")
      return
    }
    const created: SocialPost = {
      id: `post-${Date.now()}`,
      title: draft.title,
      text: draft.text,
      type: draft.type,
      media:
        draft.media ||
        (draft.type === "Vídeo" ? photos.dog : photos.puppy),
      platforms: draft.platforms,
      status: status === "Rascunho" ? "Agendado" : status,
      time:
        status === "Agendado"
          ? draft.schedule || "agendado"
          : "agora",
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    }
    setPosts((current) => [created, ...current])
    addItem("publicacoes", {
      name: created.title,
      subtitle: created.platforms.join(" • "),
      status,
      notes: created.text,
      category: created.type,
    })
    if (status === "Publicado") {
      setConfirmation(true)
      setCompletedNetworks([])
    } else {
      setComposer(false)
      showToast(
        status === "Agendado"
          ? "Publicação agendada com sucesso"
          : "Rascunho salvo",
      )
    }
  }

  const resetComposer = () => {
    setComposer(false)
    setConfirmation(false)
    setStep(1)
    setDraft({
      title: "",
      text: "",
      type: "Imagem",
      media: "",
      platforms: ["Instagram"],
      previewPlatform: "Instagram",
      schedule: "",
    })
  }

  return (
    <div className="publications-page">
      <header className="publications-header">
        <div>
          <span>CONTEÚDO E COMUNIDADE</span>
          <h1>Publicações</h1>
          <p>
            Acompanhe todas as suas publicações em tempo real em um único lugar
          </p>
        </div>
      </header>

      <section className="social-networks-card">
        <div>
          <h2>Suas redes</h2>
          <p>Acesse seus perfis e comunidades conectadas.</p>
        </div>
        <div className="social-network-scroll">
          {networks.map((network) => (
            <button
              className={`social-network-card network-${network.name.toLowerCase()}`}
              key={network.name}
              onClick={() => window.open(network.url, "_blank")}
            >
              <NetworkMark network={network.name} />
              <span>
                <strong>{network.label}</strong>
                <small>Conectado</small>
              </span>
              <ExternalLink size={14} />
            </button>
          ))}
        </div>
      </section>

      <section className="stories-section">
        <div className="stories-title">
          <h2>Stories</h2>
          <span>Conteúdo das últimas 24 horas</span>
        </div>
        <div className="stories-scroll">
          <button className="new-story" onClick={() => setComposer(true)}>
            <i>
              <Plus size={22} />
            </i>
            <strong>Novo story</strong>
            <small>Compartilhar</small>
          </button>
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <div className="story-skeleton" key={index}>
                  <i />
                  <span />
                </div>
              ))
            : stories.map((item) => (
                <button
                  className="story-item"
                  key={item.id}
                  onClick={() => setStory(item)}
                >
                  <i className="story-ring">
                    <img src={item.image} alt={item.name} />
                  </i>
                  <strong>{item.name}</strong>
                  <span className="story-platforms">
                    {item.platforms.slice(0, 3).map((platform) => (
                      <i key={platform}>
                        <NetworkMark network={platform} small />
                      </i>
                    ))}
                  </span>
                  <small>{item.time}</small>
                </button>
              ))}
        </div>
      </section>

      <div className="publication-filters">
        {[
          "Todas",
          "Imagens",
          "Vídeos",
          "Agendadas",
          "Instagram",
          "Facebook",
          "TikTok",
          "X",
        ].map((name) => (
          <button
            className={filter === name ? "active" : ""}
            onClick={() => setFilter(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>

      <main className="publications-feed">
        {loading ? (
          Array.from({ length: 2 }, (_, index) => (
            <div className="post-skeleton" key={index}>
              <div>
                <i />
                <span />
              </div>
              <b />
              <em />
            </div>
          ))
        ) : filtered.length ? (
          filtered.map((post) => (
            <article className="social-post-card" key={post.id}>
              <header>
                <img src="/assets/vetflow-sidebar-cat.png" alt="VetFlow" />
                <span>
                  <strong>VetFlow</strong>
                  <small>@vetflow • {post.time}</small>
                </span>
                <button onClick={() => setMenu(menu === post.id ? null : post.id)}>
                  <MoreHorizontal size={20} />
                </button>
                {menu === post.id && (
                  <div className="post-menu">
                    <button
                      onClick={() => {
                        setDraft({
                          title: post.title,
                          text: post.text,
                          type: post.type,
                          media: post.media,
                          platforms: post.platforms,
                          previewPlatform: post.platforms[0],
                          schedule: "",
                        })
                        setComposer(true)
                        setStep(1)
                        setMenu(null)
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        window.open(
                          networks.find(
                            (network) => network.name === post.platforms[0],
                          )?.url,
                          "_blank",
                        )
                        setMenu(null)
                      }}
                    >
                      Ver na rede
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        setPosts((current) =>
                          current.filter((item) => item.id !== post.id),
                        )
                        deleteItem("publicacoes", post.id)
                        setMenu(null)
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </header>
              <div className="post-body">
                <h2>{post.title}</h2>
                <div className="post-platforms">
                  {post.platforms.map((platform) => (
                    <PlatformChip
                      platform={platform}
                      key={platform}
                      onClick={() =>
                        window.open(
                          networks.find((item) => item.name === platform)?.url,
                          "_blank",
                        )
                      }
                    />
                  ))}
                </div>
                <p>
                  {post.text}
                  <button> ver mais</button>
                </p>
              </div>
              <div className="post-media">
                <img src={post.media} alt={post.title} />
                {post.type === "Vídeo" && (
                  <>
                    <button className="play-button">
                      <Play fill="currentColor" size={24} />
                    </button>
                    <span>01:24</span>
                  </>
                )}
              </div>
              <footer>
                <div className="post-actions">
                  <button
                    className={post.liked ? "liked" : ""}
                    onClick={() => toggleLike(post.id)}
                  >
                    <Heart fill={post.liked ? "currentColor" : "none"} />
                    {post.likes}
                  </button>
                  <button onClick={() => setCommenting(post.id)}>
                    <MessageCircle /> {post.comments}
                  </button>
                  <button onClick={() => share(post)}>
                    <Share2 /> {post.shares}
                  </button>
                  <button
                    className={post.saved ? "saved" : ""}
                    onClick={() =>
                      setPosts((current) =>
                        current.map((item) =>
                          item.id === post.id
                            ? { ...item, saved: !item.saved }
                            : item,
                        ),
                      )
                    }
                  >
                    <Bookmark fill={post.saved ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="post-meta">
                  <span>{post.views.toLocaleString("pt-BR")} visualizações</span>
                  <span className={`post-status ${post.status.toLowerCase()}`}>
                    <i /> {post.status}
                  </span>
                </div>
                {commenting === post.id && (
                  <form
                    className="comment-box"
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitComment(post.id)
                    }}
                  >
                    <input autoFocus placeholder="Escreva um comentário…" />
                    <button>Enviar</button>
                  </form>
                )}
              </footer>
            </article>
          ))
        ) : (
          <section className="publications-empty">
            <Sparkles size={38} />
            <h2>Seu feed está pronto para começar</h2>
            <p>Crie conteúdos e acompanhe todas as redes em um só lugar.</p>
            <button onClick={() => setComposer(true)}>
              <Plus size={17} /> Criar primeira publicação
            </button>
          </section>
        )}
      </main>

      <button className="new-publication-fab" onClick={() => setComposer(true)}>
        <Plus size={19} /> Nova publicação
      </button>

      <nav className="publications-mobile-nav">
        <button><Home /><span>Início</span></button>
        <button className="active"><Send /><span>Publicações</span></button>
        <button className="center" onClick={() => setComposer(true)}><Plus /></button>
        <button><BarChart3 /><span>Métricas</span></button>
        <button><CircleUserRound /><span>Perfil</span></button>
      </nav>

      {story && (
        <div className="story-viewer" onClick={() => setStory(null)}>
          <div className="story-frame" onClick={(event) => event.stopPropagation()}>
            <div className="story-progress"><i /></div>
            <header>
              <img src="/assets/vetflow-sidebar-cat.png" alt="" />
              <span><strong>{story.name}</strong><small>{story.time}</small></span>
              <div>{story.platforms.map((platform) => <NetworkMark network={platform} small key={platform} />)}</div>
              <button onClick={() => setStory(null)}><X /></button>
            </header>
            <img className="story-content" src={story.image} alt={story.name} />
            <footer><MessageCircle /><span>Responder ao story…</span><Share2 /></footer>
          </div>
        </div>
      )}

      {composer && (
        <div className="publication-modal-layer" onMouseDown={resetComposer}>
          <section className="publication-composer" onMouseDown={(event) => event.stopPropagation()}>
            {!confirmation ? (
              <>
                <header>
                  <button disabled={step === 1} onClick={() => setStep(step - 1)}><ChevronLeft /></button>
                  <div><strong>Nova publicação</strong><small>Etapa {step} de 5</small></div>
                  <button onClick={resetComposer}><X /></button>
                </header>
                <div className="composer-progress"><i style={{ width: `${step * 20}%` }} /></div>
                <div className="composer-scroll">
                  {step === 1 && (
                    <div className="composer-step">
                      <span className="step-kicker">CONTEÚDO</span>
                      <h2>O que você quer compartilhar?</h2>
                      <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Dê um título para a publicação" /></label>
                      <label>Legenda<textarea value={draft.text} maxLength={2200} onChange={(event) => setDraft({ ...draft, text: event.target.value })} placeholder="Escreva sua legenda…" /><small>{draft.text.length}/2200</small></label>
                      <div className="composer-tools"><button><Laugh /> Emoji</button><button onClick={() => setDraft({ ...draft, text: `${draft.text} #` })}><Hash /> Hashtag</button><button onClick={() => setDraft({ ...draft, text: `${draft.text} @` })}><UserRound /> Menção</button></div>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="composer-step">
                      <span className="step-kicker">FORMATO</span>
                      <h2>Escolha sua mídia</h2>
                      <div className="content-type-toggle">{(["Imagem","Vídeo"] as const).map((type) => <button className={draft.type === type ? "active" : ""} onClick={() => setDraft({ ...draft, type, platforms: type === "Imagem" ? ["Instagram"] : ["YouTube"], previewPlatform: type === "Imagem" ? "Instagram" : "YouTube" })} key={type}>{type === "Imagem" ? <ImageIcon /> : <Video />}{type}</button>)}</div>
                      <label className="media-upload"><input type="file" accept={draft.type === "Imagem" ? "image/*" : "video/*"} onChange={(event) => upload(event.target.files?.[0])} />{draft.media ? <img src={draft.media} alt="Prévia" /> : <><UploadCloud /><strong>Arraste ou selecione um arquivo</strong><small>Imagem JPG/PNG ou vídeo MP4</small></>}</label>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="composer-step">
                      <span className="step-kicker">DISTRIBUIÇÃO</span>
                      <h2>Onde deseja publicar?</h2>
                      <div className="platform-selector">{availablePlatforms.map((platform) => <button className={draft.platforms.includes(platform) ? `selected platform-${platform.toLowerCase()}` : ""} onClick={() => togglePlatform(platform)} key={platform}><NetworkMark network={platform} /><span><strong>{platform === "WhatsApp" ? "Comunidade" : platform}</strong><small>{platform === "X" ? "Até 280 caracteres" : draft.type === "Vídeo" ? "Vídeo vertical ou horizontal" : "Imagem otimizada automaticamente"}</small></span>{draft.platforms.includes(platform) && <Check />}</button>)}</div>
                    </div>
                  )}
                  {step === 4 && (
                    <div className="composer-step">
                      <span className="step-kicker">PRÉ-VISUALIZAÇÃO</span>
                      <h2>Veja como vai ficar</h2>
                      <div className="preview-tabs">{draft.platforms.map((platform) => <button className={draft.previewPlatform === platform ? "active" : ""} onClick={() => setDraft({ ...draft, previewPlatform: platform })} key={platform}>{platform}</button>)}</div>
                      <div className={`live-preview preview-${draft.previewPlatform.toLowerCase()}`}><header><img src="/assets/vetflow-sidebar-cat.png" alt="" /><span><strong>VetFlow</strong><small>@vetflow • agora</small></span><MoreHorizontal /></header><h3>{draft.title || "Título da publicação"}</h3><p>{draft.text || "Sua legenda aparecerá aqui."}</p><img src={draft.media || photos.puppy} alt="" /><footer><Heart /><MessageCircle /><Share2 /><Bookmark /></footer></div>
                    </div>
                  )}
                  {step === 5 && (
                    <div className="composer-step">
                      <span className="step-kicker">REVISÃO</span>
                      <h2>Pronto para compartilhar?</h2>
                      <div className="review-card"><strong>{draft.title || "Sem título"}</strong><p>{draft.text || "Sem legenda"}</p><div>{draft.platforms.map((platform) => <PlatformChip platform={platform} key={platform} />)}</div></div>
                      <label>Data para agendar<input type="datetime-local" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} /></label>
                    </div>
                  )}
                </div>
                <footer className="composer-footer">
                  <div><button onClick={() => publish("Rascunho")}>Salvar rascunho</button><button onClick={() => publish("Agendado")}><Clock3 /> Agendar</button></div>
                  <button className="composer-next" onClick={() => step < 5 ? setStep(step + 1) : publish("Publicado")}>{step < 5 ? <>Continuar <ChevronRight /></> : <>Publicar <Send /></>}</button>
                </footer>
              </>
            ) : (
              <div className="publication-confirmation">
                <i><Check /></i>
                <span>TUDO PRONTO!</span>
                <h2>Leve sua publicação para cada rede</h2>
                <p>O texto foi preparado. Abra cada plataforma e conclua tocando em “Postar”.</p>
                <div>{draft.platforms.map((platform) => { const done = completedNetworks.includes(platform); return <button className={done ? "done" : ""} key={platform} onClick={async () => { await navigator.clipboard?.writeText(`${draft.title}\n\n${draft.text}`); window.open(networks.find((item) => item.name === platform)?.url, "_blank"); setCompletedNetworks((current) => [...new Set([...current,platform])]) }}><NetworkMark network={platform} /><span><strong>{done ? `${platform} concluído` : `Abrir no ${platform}`}</strong><small>{done ? "Marcado como publicado" : "Texto copiado e mídia pronta"}</small></span>{done ? <Check /> : <ExternalLink />}</button>})}</div>
                <button className="finish-publication" onClick={resetComposer}>Concluir</button>
              </div>
            )}
          </section>
        </div>
      )}
      {toast && <div className="publication-toast"><Check />{toast}</div>}
    </div>
  )
}
