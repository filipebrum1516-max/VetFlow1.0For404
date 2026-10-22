import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Heart,
  Mail,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  PawPrint,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Smile,
  Star,
  Syringe,
  Tag,
  TrendingUp,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { initialTutors } from "./TutorsModule"
import { useVetFlow, type Item } from "./store"

type PetLink = {
  id: string
  name: string
  species: string
  breed: string
  age: string
  weight: string
  photo: string
  vaccine: "Em dia" | "Atenção" | "Atrasada"
}

type RelationshipClient = {
  id: string
  name: string
  phone: string
  email: string
  photo: string
  pets: PetLink[]
  unread: number
  tag: string
  origin: string
  preview: string
  time: string
  emergency?: boolean
  assigned: string
  nps: number
  stars: number
}

type ChatMessage = {
  id: string
  side: "in" | "out" | "internal"
  type: "text" | "image" | "audio" | "file" | "card"
  text: string
  time: string
  image?: string
  cardType?: string
}

const ownerPhotos = [
  "https://images.unsplash.com/photo-1694875464499-334d2dc113a1?auto=format&fit=crop&w=160&h=160&q=82",
  "https://images.unsplash.com/photo-1721907043535-3624243c6d74?auto=format&fit=crop&w=160&h=160&q=82",
  "https://images.unsplash.com/photo-1644675272883-0c4d582528d8?auto=format&fit=crop&w=160&h=160&q=82",
]
const petPhotos = [
  "https://images.unsplash.com/photo-1770836037793-95bdbf190f71?auto=format&fit=crop&w=220&h=220&q=82",
  "https://images.unsplash.com/photo-1629990941644-45c40aac3d68?auto=format&fit=crop&w=220&h=220&q=82",
]

const defaultMessages: ChatMessage[] = [
  {
    id: "m1",
    side: "in",
    type: "text",
    text: "Bom dia! O Thor não quis comer hoje e está mais quieto. Isso pode ser urgente?",
    time: "08:42",
  },
  {
    id: "m2",
    side: "in",
    type: "image",
    text: "Ele ficou assim durante a manhã.",
    image:
      "https://images.unsplash.com/photo-1770836037793-95bdbf190f71?auto=format&fit=crop&w=760&q=82",
    time: "08:43",
  },
  {
    id: "m3",
    side: "out",
    type: "text",
    text: "Olá, Gabriel. Obrigada por avisar. Como ele está bebendo água? Houve vômito ou diarreia?",
    time: "08:47",
  },
  {
    id: "m4",
    side: "out",
    type: "card",
    cardType: "Agendamento sugerido",
    text: "Hoje às 10:30 com Dra. Ana Martins",
    time: "08:49",
  },
  {
    id: "m5",
    side: "in",
    type: "audio",
    text: "Mensagem de áudio • 0:24",
    time: "08:52",
  },
]

const subTabs = [
  "Conversas",
  "Clientes",
  "Feed da clínica",
  "Comunidades",
  "Avisos e lembretes",
  "Marketing",
  "Satisfação",
]

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function metric(value: string, label: string, detail: string) {
  return { value, label, detail }
}

export default function CommunicationModule() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const [tab, setTab] = useState("Conversas")
  const [search, setSearch] = useState("")
  const [conversationFilter, setConversationFilter] = useState("Todas")
  const [selectedId, setSelectedId] = useState("")
  const [rightTab, setRightTab] = useState("Resumo")
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "info">("list")
  const [message, setMessage] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [marketingTab, setMarketingTab] = useState("Visão geral")
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [surveyRating, setSurveyRating] = useState(0)
  const [surveySent, setSurveySent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 550)
    return () => window.clearTimeout(timer)
  }, [])

  const clients = useMemo(() => {
    const petsByOwner = new Map<string, Item[]>()
    data.animais.forEach((animal) => {
      if (!animal.ownerId) return
      petsByOwner.set(animal.ownerId, [
        ...(petsByOwner.get(animal.ownerId) || []),
        animal,
      ])
    })
    const base: RelationshipClient[] = initialTutors.map((tutor, index) => ({
      id: tutor.id,
      name: tutor.name,
      phone: tutor.phone,
      email: `${tutor.name.toLowerCase().replaceAll(" ", ".")}@email.com`,
      photo: ownerPhotos[index % ownerPhotos.length],
      pets: tutor.pets.map((pet, petIndex) => ({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: `${2 + ((index + petIndex) % 7)} anos`,
        weight: pet.weight,
        photo: pet.photo,
        vaccine: petIndex % 4 === 2 ? "Atrasada" : "Em dia",
      })),
      unread: index === 0 ? 4 : index === 2 ? 2 : 0,
      tag:
        index === 0
          ? "Emergência"
          : ["Novo cliente", "Retorno", "Orçamento", "Retorno"][index - 1],
      origin: ["Google Ads", "WhatsApp", "Instagram", "Indicação", "Google Meu Negócio"][index],
      preview:
        index === 0
          ? "O Thor não quis comer hoje..."
          : "Obrigada pelo atendimento!",
      time: index === 0 ? "há 8 min" : `${index + 1}h`,
      emergency: index === 0,
      assigned: index % 2 ? "Recepção" : "Dra. Ana",
      nps: index === 2 ? 4 : 9,
      stars: index === 2 ? 2 : index === 4 ? 4 : 5,
    }))
    const seen = new Set(base.map((client) => client.name.toLowerCase()))
    const stored: RelationshipClient[] = data.tutores
      .filter((tutor) => !seen.has(tutor.name.toLowerCase()))
      .slice(0, 18)
      .map((tutor, index) => ({
        id: tutor.id,
        name: tutor.name,
        phone: tutor.phone || "Não informado",
        email: tutor.email || "Não informado",
        photo: ownerPhotos[index % ownerPhotos.length],
        pets: (petsByOwner.get(tutor.id) || []).map((pet, petIndex) => ({
          id: pet.id,
          name: pet.name,
          species: pet.species || "Pet",
          breed: pet.breed || "Sem raça definida",
          age: `${1 + (petIndex % 8)} anos`,
          weight: pet.weight || "Não informado",
          photo: petPhotos[petIndex % petPhotos.length],
          vaccine: petIndex % 5 === 1 ? "Atenção" : "Em dia",
        })),
        unread: index % 5 === 0 ? 1 : 0,
        tag: index % 3 === 0 ? "Retorno" : "Novo cliente",
        origin: index % 2 ? "Google Ads" : "WhatsApp",
        preview: "Gostaria de agendar um horário.",
        time: `${index + 2}h`,
        assigned: index % 2 ? "Recepção" : "Dr. Rafael",
        nps: 8,
        stars: 5,
      }))
    return [...base, ...stored]
  }, [data.animais, data.tutores])

  useEffect(() => {
    if (!selectedId && clients[0]) setSelectedId(clients[0].id)
  }, [clients, selectedId])

  const selected =
    clients.find((client) => client.id === selectedId) || clients[0]
  const selectedMessages = messages[selected?.id] || defaultMessages
  const filteredClients = clients
    .filter((client) => {
      if (conversationFilter === "Não lidas") return client.unread > 0
      if (conversationFilter === "Emergência") return client.emergency
      if (conversationFilter === "Aguardando resposta")
        return client.preview.includes("agendar")
      if (conversationFilter === "Minhas")
        return client.assigned.includes("Ana") || client.assigned.includes("Rafael")
      if (conversationFilter === "Sem atribuição") return !client.assigned
      return true
    })
    .filter((client) => {
      const value = search.toLowerCase()
      return (
        !value ||
        client.name.toLowerCase().includes(value) ||
        client.phone.includes(value) ||
        client.preview.toLowerCase().includes(value) ||
        client.pets.some((pet) => pet.name.toLowerCase().includes(value))
      )
    })
    .sort((a, b) => Number(Boolean(b.emergency)) - Number(Boolean(a.emergency)))

  const openConversation = (client: RelationshipClient) => {
    setSelectedId(client.id)
    setTab("Conversas")
    setMobilePane("chat")
  }

  const sendMessage = () => {
    if (!message.trim() || !selected) return
    setMessages((current) => ({
      ...current,
      [selected.id]: [
        ...(current[selected.id] || defaultMessages),
        {
          id: `msg-${Date.now()}`,
          side: internalNote ? "internal" : "out",
          type: "text",
          text: message.trim(),
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    }))
    setMessage("")
  }

  const showToast = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(""), 2800)
  }

  return (
    <div className="communication-page">
      <header className="communication-header">
        <div>
          <span>RELACIONAMENTO VETFLOW</span>
          <h1>Comunicação</h1>
          <p>Converse, acompanhe e conquiste seus clientes em um único lugar</p>
        </div>
        <label>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, pet, telefone ou conversa…"
          />
        </label>
        <button aria-label="Notificações">
          <Bell size={19} />
          <i />
        </button>
      </header>
      <nav className="communication-tabs">
        {subTabs.map((name) => (
          <button
            className={tab === name ? "active" : ""}
            onClick={() => {
              setTab(name)
              setMobilePane("list")
            }}
            key={name}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Conversas" && selected && (
        <section
          className={`communication-workspace mobile-pane-${mobilePane}`}
        >
          <aside className="conversation-list-column">
            <div className="conversation-filters">
              {[
                "Todas",
                "Não lidas",
                "Emergência",
                "Aguardando resposta",
                "Minhas",
                "Sem atribuição",
              ].map((name) => (
                <button
                  className={conversationFilter === name ? "active" : ""}
                  onClick={() => setConversationFilter(name)}
                  key={name}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="conversation-list">
              {loading
                ? Array.from({ length: 6 }, (_, index) => (
                    <div className="conversation-skeleton" key={index}>
                      <i />
                      <span />
                    </div>
                  ))
                : filteredClients.map((client) => (
                    <button
                      className={`${selected.id === client.id ? "active" : ""} ${
                        client.emergency ? "emergency" : ""
                      }`}
                      onClick={() => openConversation(client)}
                      key={client.id}
                    >
                      <img src={client.photo} alt="" />
                      <span>
                        <strong>{client.name}</strong>
                        <small>
                          <PawPrint size={11} />
                          {client.pets.map((pet) => pet.name).join(", ") ||
                            "Sem pet"}
                        </small>
                        <p>{client.preview}</p>
                        <em className={`origin-${client.origin.toLowerCase().replaceAll(" ", "-")}`}>
                          {client.origin}
                        </em>
                      </span>
                      <span className="conversation-meta">
                        <small>{client.time}</small>
                        {client.unread > 0 && <b>{client.unread}</b>}
                        <i>{initials(client.assigned || "?")}</i>
                      </span>
                      <span className={`conversation-tag tag-${client.tag.toLowerCase().replaceAll(" ", "-")}`}>
                        {client.tag}
                      </span>
                      {client.emergency && (
                        <span className="response-timer">
                          <Clock3 size={11} /> sem resposta há 8 min
                        </span>
                      )}
                    </button>
                  ))}
            </div>
          </aside>

          <main className="chat-column">
            <header className="chat-header">
              <button
                className="mobile-back"
                onClick={() => setMobilePane("list")}
              >
                <ArrowLeft size={19} />
              </button>
              <img src={selected.photo} alt="" />
              <span>
                <strong>{selected.name}</strong>
                <small>
                  <i /> online •{" "}
                  <select>
                    {selected.pets.map((pet) => (
                      <option key={pet.id}>{pet.name}</option>
                    ))}
                  </select>
                </small>
              </span>
              <div>
                <button title="Ligar">
                  <Phone size={17} />
                </button>
                <button title="Vídeo">
                  <Video size={17} />
                </button>
                <button
                  title="Agendar"
                  onClick={() => navigate("/agendas?locate=1")}
                >
                  <CalendarDays size={17} />
                </button>
                <button title="Mais">
                  <MoreHorizontal size={18} />
                </button>
                <button
                  className="mobile-info"
                  onClick={() => setMobilePane("info")}
                >
                  <CircleUserIcon />
                </button>
              </div>
            </header>
            <div className="chat-warning">
              <AlertCircle size={14} />
              Orientação por mensagem não substitui consulta presencial.
            </div>
            <div className="messages-scroll">
              <span className="chat-date">Hoje</span>
              {selectedMessages.map((item) => (
                <div className={`message-row ${item.side}`} key={item.id}>
                  {item.type === "card" ? (
                    <section className="special-message-card">
                      <header>
                        <CalendarDays size={17} />
                        <strong>{item.cardType}</strong>
                      </header>
                      <p>{item.text}</p>
                      <div>
                        <button
                          onClick={() => showToast("Agendamento confirmado")}
                        >
                          Confirmar
                        </button>
                        <button onClick={() => navigate("/agendas")}>
                          Remarcar
                        </button>
                      </div>
                    </section>
                  ) : (
                    <div className="message-bubble">
                      {item.image && <img src={item.image} alt="" />}
                      {item.type === "audio" && (
                        <div className="audio-wave">
                          <Play size={15} />
                          {Array.from({ length: 19 }, (_, index) => (
                            <i
                              style={{ height: `${8 + (index % 5) * 3}px` }}
                              key={index}
                            />
                          ))}
                        </div>
                      )}
                      {item.type === "file" && (
                        <span className="file-message">
                          <FileText /> Receita-Thor.pdf <Download />
                        </span>
                      )}
                      <p>{item.text}</p>
                      <small>
                        {item.time}
                        {item.side === "out" && " ✓✓"}
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="quick-chat-actions">
              <button
                onClick={() => {
                  setMessages((current) => ({
                    ...current,
                    [selected.id]: [
                      ...(current[selected.id] || defaultMessages),
                      {
                        id: `survey-${Date.now()}`,
                        side: "out",
                        type: "card",
                        cardType: "Pesquisa de satisfação enviada",
                        text: "Conte como foi o atendimento do Thor.",
                        time: "agora",
                      },
                    ],
                  }))
                  showToast("Pesquisa enviada")
                }}
              >
                <Star size={14} /> Enviar pesquisa
              </button>
              <button onClick={() => navigate("/agendas?locate=1")}>
                <CalendarDays size={14} /> Criar agendamento
              </button>
              <button
                className={internalNote ? "active" : ""}
                onClick={() => setInternalNote(!internalNote)}
              >
                <Tag size={14} /> Nota interna
              </button>
            </div>
            <footer className={internalNote ? "internal" : ""}>
              {internalNote && (
                <span>Nota interna • invisível para o cliente</span>
              )}
              <div>
                <button>
                  <Paperclip size={18} />
                </button>
                <button>
                  <Camera size={18} />
                </button>
                <button>
                  <Mic size={18} />
                </button>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={
                    internalNote
                      ? "Escreva uma nota para a equipe…"
                      : "Digite uma mensagem ou / para respostas rápidas"
                  }
                />
                <button>
                  <Smile size={18} />
                </button>
                <button className="send-message" onClick={sendMessage}>
                  <Send size={17} />
                </button>
              </div>
              <small>
                Fora do horário: “Recebemos sua mensagem e retornaremos assim
                que a clínica abrir.” <button>Editar</button>
              </small>
            </footer>
          </main>

          <aside className="client-panel-column">
            <header>
              <button
                className="mobile-back"
                onClick={() => setMobilePane("chat")}
              >
                <ArrowLeft size={19} />
              </button>
              <strong>Informações do cliente</strong>
              <button>
                <MoreHorizontal size={18} />
              </button>
            </header>
            <div className="client-panel-tabs">
              {["Resumo", "Mídias", "Histórico", "Satisfação", "Notas"].map(
                (name) => (
                  <button
                    className={rightTab === name ? "active" : ""}
                    onClick={() => setRightTab(name)}
                    key={name}
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
            <div className="client-panel-scroll">
              {rightTab === "Resumo" && (
                <ClientSummary client={selected} />
              )}
              {rightTab === "Mídias" && <ClientMedia client={selected} />}
              {rightTab === "Histórico" && (
                <ClientHistory client={selected} />
              )}
              {rightTab === "Satisfação" && (
                <ClientSatisfaction
                  client={selected}
                  sendSurvey={() => setSurveyOpen(true)}
                  contact={() => setMobilePane("chat")}
                />
              )}
              {rightTab === "Notas" && <ClientNotes />}
            </div>
          </aside>
        </section>
      )}

      {tab === "Clientes" && (
        <ClientsTab clients={clients} open={openConversation} />
      )}
      {tab === "Feed da clínica" && <ClinicFeed />}
      {tab === "Comunidades" && <CommunitiesTab />}
      {tab === "Avisos e lembretes" && <RemindersTab />}
      {tab === "Marketing" && (
        <MarketingTab
          active={marketingTab}
          setActive={setMarketingTab}
          openClients={() => setTab("Clientes")}
        />
      )}
      {tab === "Satisfação" && (
        <SatisfactionTab
          clients={clients}
          open={openConversation}
          preview={() => setSurveyOpen(true)}
        />
      )}

      {surveyOpen && selected && (
        <div className="survey-preview-layer">
          <section className="client-survey-mobile">
            <button onClick={() => setSurveyOpen(false)}>
              <X size={20} />
            </button>
            {!surveySent ? (
              <>
                <img src="/assets/vetflow-sidebar-cat.png" alt="VetFlow" />
                <span>SUA OPINIÃO IMPORTA</span>
                <h2>
                  Como foi o atendimento da Dra. Ana com o{" "}
                  {selected.pets[0]?.name || "seu pet"}?
                </h2>
                <div>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      className={surveyRating >= value ? "active" : ""}
                      onClick={() => setSurveyRating(value)}
                      key={value}
                    >
                      <Star fill="currentColor" />
                    </button>
                  ))}
                </div>
                <textarea placeholder="Conte um pouco mais (opcional)" />
                <button
                  className="submit-survey"
                  disabled={!surveyRating}
                  onClick={() => setSurveySent(true)}
                >
                  Enviar avaliação
                </button>
              </>
            ) : (
              <div className="survey-thanks">
                <i>
                  <Check />
                </i>
                <h2>Obrigado pela sua avaliação!</h2>
                <p>Ela nos ajuda a cuidar cada vez melhor.</p>
                {surveyRating >= 4 && (
                  <button
                    onClick={() =>
                      window.open("https://g.page/r/CQ/review", "_blank")
                    }
                  >
                    Avaliar no Google
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="communication-toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  )
}

function CircleUserIcon() {
  return <UserRound size={18} />
}

function ClientSummary({ client }: { client: RelationshipClient }) {
  return (
    <div className="client-summary-content">
      <section className="client-basic-card">
        <img src={client.photo} alt="" />
        <div>
          <strong>{client.name}</strong>
          <small>
            <Phone size={12} /> {client.phone}
          </small>
          <small>
            <Mail size={12} /> {client.email}
          </small>
          <span>Cliente desde out. 2024</span>
        </div>
      </section>
      {client.pets.map((pet) => (
        <section className="communication-pet-card" key={pet.id}>
          <img src={pet.photo} alt="" />
          <div>
            <strong>{pet.name}</strong>
            <small>
              {pet.species} • {pet.breed}
            </small>
          </div>
          <span className={`vaccine-${pet.vaccine.toLowerCase().replace(" ", "-")}`}>
            {pet.vaccine}
          </span>
          <dl>
            <div>
              <dt>Idade</dt>
              <dd>{pet.age}</dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{pet.weight}</dd>
            </div>
            <div>
              <dt>Última consulta</dt>
              <dd>07/05/2025</dd>
            </div>
            <div>
              <dt>Próxima vacina</dt>
              <dd>18/11/2025</dd>
            </div>
          </dl>
        </section>
      ))}
      <section className="client-origin-card">
        <header>
          <TrendingUp size={17} />
          <strong>Origem do cliente</strong>
        </header>
        <h4>{client.origin}</h4>
        <p>
          Campanha Vacina Antirrábica • “vacina antirrábica perto de mim” •
          12/09
        </p>
        <span>Custo de aquisição: <b>R$ 18,40</b></span>
      </section>
      <div className="client-value-grid">
        <div>
          <strong>R$ 2.840</strong>
          <small>Valor total gasto</small>
        </div>
        <div>
          <strong>12</strong>
          <small>Consultas</small>
        </div>
        <div>
          <strong>07/05</strong>
          <small>Última visita</small>
        </div>
      </div>
    </div>
  )
}

function ClientMedia({ client }: { client: RelationshipClient }) {
  return (
    <div className="client-media-content">
      <div className="media-filters">
        {["Todos", "Fotos", "Vídeos", "Áudios", "PDFs"].map((name) => (
          <button key={name}>{name}</button>
        ))}
      </div>
      <div className="media-gallery">
        {client.pets.slice(0, 2).map((pet) => (
          <div key={pet.id}>
            <img src={pet.photo} alt="" />
            <button>Anexar ao prontuário</button>
          </div>
        ))}
        <div className="audio-media">
          <Mic />
          <span>Áudio • 0:24</span>
        </div>
        <div className="pdf-media">
          <FileText />
          <span>Exame-Thor.pdf</span>
        </div>
      </div>
    </div>
  )
}

function ClientHistory({ client }: { client: RelationshipClient }) {
  return (
    <div className="communication-timeline">
      {[
        ["07/05/2025", "Consulta clínica", `Atendimento de ${client.pets[0]?.name}`],
        ["18/03/2025", "Vacina aplicada", "V10 • Dra. Ana Martins"],
        ["02/02/2025", "Pesquisa respondida", "Nota 5 • Muito satisfeito"],
        ["28/01/2025", "Campanha recebida", "Prevenção contra carrapatos"],
        ["10/12/2024", "Ligação registrada", "Retorno pós-operatório"],
      ].map(([date, title, detail]) => (
        <div key={date + title}>
          <i />
          <span>
            <small>{date}</small>
            <strong>{title}</strong>
            <p>{detail}</p>
          </span>
        </div>
      ))}
    </div>
  )
}

function ClientSatisfaction({
  client,
  sendSurvey,
  contact,
}: {
  client: RelationshipClient
  sendSurvey: () => void
  contact: () => void
}) {
  const unhappy = client.stars <= 3
  return (
    <div className="client-satisfaction">
      <section>
        <strong>{client.nps}</strong>
        <small>NPS do cliente</small>
        <span>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              fill={index < client.stars ? "currentColor" : "none"}
              key={index}
            />
          ))}
        </span>
      </section>
      {unhappy ? (
        <div className="unhappy-alert">
          <AlertCircle />
          <span>
            <strong>Cliente insatisfeito</strong>
            <small>Necessita contato e acompanhamento.</small>
          </span>
          <button onClick={contact}>Entrar em contato</button>
          <textarea placeholder="Registre a solução adotada…" />
        </div>
      ) : (
        <button
          className="google-review-button"
          onClick={() => window.open("https://google.com", "_blank")}
        >
          Pedir avaliação no Google
        </button>
      )}
      <h3>Pesquisas enviadas</h3>
      {[
        ["07/05/2025", "Dra. Ana Martins", "5", "Respondida"],
        ["18/03/2025", "Dr. Rafael Souza", "—", "Pendente"],
      ].map(([date, doctor, rating, status]) => (
        <div className="survey-row" key={date}>
          <span>
            <strong>{doctor}</strong>
            <small>{date} • Nota {rating}</small>
          </span>
          <b className={status.toLowerCase()}>{status}</b>
          {status !== "Respondida" && <button>Reenviar</button>}
        </div>
      ))}
      <button className="send-survey-button" onClick={sendSurvey}>
        <Star size={16} /> Enviar pesquisa agora
      </button>
    </div>
  )
}

function ClientNotes() {
  return (
    <div className="client-notes">
      <textarea placeholder="Adicione uma nota interna e mencione @colegas…" />
      <button>Salvar nota</button>
      {[
        ["Dra. Ana", "Tutor prefere contato por WhatsApp.", "Hoje, 09:10"],
        ["Recepção", "@Rafael retornar sobre orçamento.", "Ontem, 16:42"],
      ].map(([author, text, time]) => (
        <div key={time}>
          <i>{initials(author)}</i>
          <span>
            <strong>{author}</strong>
            <p>{text}</p>
            <small>{time}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

function ClientsTab({
  clients,
  open,
}: {
  clients: RelationshipClient[]
  open: (client: RelationshipClient) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <section className="communication-card clients-tab">
      <header>
        <div>
          <h2>Clientes</h2>
          <p>Tutores, pets, origem e satisfação em uma única base.</p>
        </div>
        <div className="client-table-filters">
          {["Origem", "Espécie", "Vacina atrasada", "Nota", "Última visita"].map(
            (filter) => (
              <button key={filter}>{filter}</button>
            ),
          )}
        </div>
      </header>
      {selected.length > 0 && (
        <div className="bulk-message">
          {selected.length} selecionado(s)
          <button>Enviar aviso em massa</button>
        </div>
      )}
      <div className="communication-client-table">
        <div>
          <span />
          <strong>Cliente</strong>
          <strong>Pets</strong>
          <strong>Origem</strong>
          <strong>Satisfação</strong>
          <strong>Última visita</strong>
        </div>
        {clients.map((client) => (
          <button onClick={() => open(client)} key={client.id}>
            <input
              type="checkbox"
              checked={selected.includes(client.id)}
              onClick={(event) => event.stopPropagation()}
              onChange={() =>
                setSelected((current) =>
                  current.includes(client.id)
                    ? current.filter((id) => id !== client.id)
                    : [...current, client.id],
                )
              }
            />
            <span className="client-table-person">
              <img src={client.photo} alt="" />
              <span>
                <strong>{client.name}</strong>
                <small>{client.phone}</small>
              </span>
            </span>
            <span>{client.pets.map((pet) => pet.name).join(", ")}</span>
            <span>{client.origin}</span>
            <span className="client-stars">
              {client.stars} <Star fill="currentColor" />
            </span>
            <span>07/05/2025</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ClinicFeed() {
  return (
    <div className="clinic-feed-tab">
      <div className="clinic-stories">
        {["Bastidores", "Vacinação", "Dica da Dra.", "Adoção"].map(
          (name, index) => (
            <button key={name}>
              <i>
                <img src={petPhotos[index % 2]} alt="" />
              </i>
              <strong>{name}</strong>
              <small>Instagram • WhatsApp</small>
            </button>
          ),
        )}
      </div>
      <button className="new-clinic-post">
        <Plus /> Nova publicação
      </button>
      {[petPhotos[0], petPhotos[1]].map((photo, index) => (
        <article className="clinic-post" key={photo}>
          <header>
            <img src="/assets/vetflow-sidebar-cat.png" alt="" />
            <span>
              <strong>VetFlow</strong>
              <small>@vetflow • há {index + 2}h</small>
            </span>
            <MoreHorizontal />
          </header>
          <h2>
            {index ? "Cuidados essenciais com gatos" : "Prevenção é cuidado"}
          </h2>
          <p>
            Informação de qualidade para uma rotina mais saudável com seu pet.
          </p>
          <img src={photo} alt="" />
          <footer>
            <button>
              <Heart /> 284
            </button>
            <button>
              <MessageCircle /> 32
            </button>
            <button>
              <Send /> Compartilhar
            </button>
          </footer>
        </article>
      ))}
    </div>
  )
}

function CommunitiesTab() {
  return (
    <div className="communities-tab">
      <section className="communication-card">
        <header>
          <h2>Comunidades</h2>
          <p>Grupos de apoio e conteúdo para cada fase do pet.</p>
        </header>
        <div className="community-grid">
          {["Filhotes", "Gatos", "Pets idosos", "Adoção", "Pets desaparecidos"].map(
            (name, index) => (
              <div key={name}>
                <i>{index % 2 ? <PawPrint /> : <Users />}</i>
                <strong>{name}</strong>
                <small>{128 + index * 47} participantes</small>
                <button
                  onClick={() =>
                    window.open("https://chat.whatsapp.com/", "_blank")
                  }
                >
                  Entrar no WhatsApp
                </button>
              </div>
            ),
          )}
        </div>
      </section>
      <section className="communication-card adoption-wall">
        <header>
          <h2>Mural de adoção e pets desaparecidos</h2>
        </header>
        <div>
          {petPhotos.map((photo, index) => (
            <article key={photo}>
              <img src={photo} alt="" />
              <span className={index ? "missing" : ""}>
                {index ? "Desaparecido" : "Para adoção"}
              </span>
              <h3>{index ? "Mingau" : "Tobias"}</h3>
              <p>{index ? "Visto pela última vez no Centro." : "Macho, 8 meses, vacinado."}</p>
              <button>
                <Send /> Compartilhar
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function RemindersTab() {
  const reminders = [
    ["Vacina", "182 pets com dose próxima", "Em execução"],
    ["Vermífugo", "94 lembretes programados", "Agendado"],
    ["Antipulgas", "Segmento: cães de 1–5 anos", "Rascunho"],
    ["Retorno", "38 clientes sem retorno marcado", "Em execução"],
    ["Aniversário do pet", "Mensagem automática com cupom", "Ativa"],
  ]
  return (
    <div className="reminders-tab">
      <section className="communication-card">
        <header>
          <h2>Avisos e lembretes automáticos</h2>
          <button>
            <Plus /> Novo lembrete
          </button>
        </header>
        {reminders.map(([name, detail, status], index) => (
          <div className="reminder-row" key={name}>
            <i>{index % 2 ? <Clock3 /> : <Syringe />}</i>
            <span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </span>
            <b>{status}</b>
            <button>
              <MoreHorizontal />
            </button>
          </div>
        ))}
      </section>
      <section className="communication-card campaign-preview">
        <h2>Campanha segmentada</h2>
        <label>
          Público
          <select>
            <option>Tutores de gatos com vacina atrasada</option>
          </select>
        </label>
        <textarea defaultValue="Olá, {{nome}}! A vacina de {{pet}} está pendente. Podemos ajudar a manter a proteção em dia?" />
        <div>
          <label>
            Envio
            <input type="datetime-local" />
          </label>
          <button>Agendar campanha</button>
        </div>
        <footer>
          <span>Entregues 92%</span>
          <span>Lidas 78%</span>
          <span>Respostas 21%</span>
        </footer>
      </section>
    </div>
  )
}

function MarketingTab({
  active,
  setActive,
  openClients,
}: {
  active: string
  setActive: (tab: string) => void
  openClients: () => void
}) {
  const tabs = [
    "Visão geral",
    "Campanhas",
    "Palavras-chave",
    "Google Meu Negócio",
  ]
  return (
    <div className="marketing-tab">
      <nav>
        {tabs.map((name) => (
          <button
            className={active === name ? "active" : ""}
            onClick={() => setActive(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </nav>
      {active === "Visão geral" && (
        <>
          <div className="marketing-metrics">
            {[
              metric("R$ 2.840", "Investimento", "+8%"),
              metric("184 mil", "Impressões", "+21%"),
              metric("6.420", "Cliques", "CPC R$ 0,44"),
              metric("312", "Conversas", "4,8% conv."),
              metric("96", "Agendamentos", "R$ 29,58 cada"),
              metric("4,7×", "Retorno (ROI)", "+0,6"),
            ].map((item) => (
              <div key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
          <section className="communication-card marketing-chart">
            <header>
              <h2>Desempenho das campanhas</h2>
              <div>
                <button>7 dias</button>
                <button className="active">30 dias</button>
                <button>90 dias</button>
              </div>
            </header>
            <div className="line-chart">
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <path d="M0 150 C70 130 80 145 140 108 S230 125 285 72 S380 95 430 49 S520 70 600 20" />
              </svg>
            </div>
          </section>
          <div className="budget-alert">
            <AlertCircle /> O orçamento da campanha “Emergência 24h” termina em
            aproximadamente 3 dias. <button>Ajustar orçamento</button>
          </div>
        </>
      )}
      {active === "Campanhas" && (
        <section className="communication-card campaigns-list">
          {[
            ["Vacina Antirrábica", "Ativa", "R$ 80/dia", "42 clientes"],
            ["Emergência veterinária 24h", "Limitada por orçamento", "R$ 120/dia", "31 clientes"],
            ["Castração de gatos", "Pausada", "R$ 55/dia", "18 clientes"],
          ].map(([name, status, budget, result]) => (
            <div key={name}>
              <i className={status.toLowerCase().replaceAll(" ", "-")} />
              <span>
                <strong>{name}</strong>
                <small>{status} • {budget}</small>
              </span>
              <b>{result}</b>
              <button>{status === "Pausada" ? "Retomar" : "Pausar"}</button>
              <button onClick={openClients}>Ver clientes</button>
            </div>
          ))}
        </section>
      )}
      {active === "Palavras-chave" && (
        <section className="communication-card keyword-research">
          <header>
            <Search />
            <input placeholder="Pesquise uma palavra-chave…" />
            <select>
              <option>São Paulo</option>
              <option>Manaus</option>
              <option>Porto Velho</option>
            </select>
          </header>
          {[
            ["veterinário perto de mim", "12.100", "Alta", "R$ 2,40"],
            ["emergência veterinária 24h", "8.100", "Alta", "R$ 3,80"],
            ["castração de gato", "5.400", "Média", "R$ 1,90"],
          ].map(([word, volume, competition, bid]) => (
            <div key={word}>
              <input type="checkbox" />
              <strong>{word}</strong>
              <span>{volume}/mês</span>
              <span>{competition}</span>
              <b>{bid}</b>
            </div>
          ))}
          <button>Criar campanha com essas palavras</button>
          <aside>
            <TrendingUp /> Buscas por <b>vermífugo</b> subiram 30% na sua cidade.
          </aside>
        </section>
      )}
      {active === "Google Meu Negócio" && (
        <div className="google-business">
          <div className="marketing-metrics">
            {[
              ["18,4 mil", "Visualizações"],
              ["642", "Ligações"],
              ["918", "Pedidos de rota"],
              ["1.204", "Cliques no site"],
            ].map(([value, label]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <section className="communication-card google-reviews">
            <header>
              <h2>Avaliações recentes</h2>
              <button>Publicar novidade</button>
            </header>
            {[
              ["Marina Costa", 5, "Atendimento excelente e muito cuidadoso."],
              ["Carlos Lima", 2, "O tempo de espera foi maior que o esperado."],
            ].map(([name, rating, comment]) => (
              <div className={Number(rating) < 3 ? "negative" : ""} key={String(name)}>
                <span>
                  <strong>{name}</strong>
                  <small>{"★".repeat(Number(rating))}</small>
                </span>
                <p>{comment}</p>
                <button>Responder</button>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}

function SatisfactionTab({
  clients,
  open,
  preview,
}: {
  clients: RelationshipClient[]
  open: (client: RelationshipClient) => void
  preview: () => void
}) {
  const low = clients.filter((client) => client.stars <= 3)
  return (
    <div className="satisfaction-tab">
      <div className="satisfaction-metrics">
        {[
          ["72", "NPS", "+6 no mês"],
          ["4,7", "Nota média", "de 5"],
          ["68%", "Taxa de resposta", "+4%"],
          ["1h 24m", "Tempo de resposta", "-18 min"],
          [String(low.length), "Insatisfeitos em aberto", "requer ação"],
        ].map(([value, label, detail]) => (
          <div key={label}>
            <strong>{value}</strong>
            <small>{label}</small>
            <span>{detail}</span>
          </div>
        ))}
      </div>
      <div className="satisfaction-columns">
        <section className="communication-card">
          <header>
            <h2>Evolução da nota</h2>
          </header>
          <div className="score-bars">
            {[4.2, 4.4, 4.3, 4.6, 4.5, 4.7, 4.8].map((score, index) => (
              <div key={index}>
                <i style={{ height: `${score * 18}%` }} />
                <small>{index + 1}/10</small>
              </div>
            ))}
          </div>
        </section>
        <section className="communication-card vet-ranking">
          <h2>Ranking por veterinário</h2>
          {[
            ["Dra. Ana Martins", "4,9", "84 respostas"],
            ["Dr. Rafael Souza", "4,8", "71 respostas"],
            ["Dr. João Lima", "4,6", "58 respostas"],
          ].map(([name, score, detail], index) => (
            <div key={name}>
              <b>{index + 1}</b>
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
              <em>{score} ★</em>
            </div>
          ))}
        </section>
      </div>
      <section className="communication-card recent-comments">
        <header>
          <h2>Comentários recentes</h2>
          <select>
            <option>Todas as notas</option>
            <option>1–3 estrelas</option>
            <option>4–5 estrelas</option>
          </select>
        </header>
        {clients.slice(0, 6).map((client) => (
          <button onClick={() => open(client)} key={client.id}>
            <img src={client.photo} alt="" />
            <span>
              <strong>{client.name}</strong>
              <small>
                {client.stars} ★ • {client.pets[0]?.name}
              </small>
              <p>
                {client.stars <= 3
                  ? "Preciso de ajuda para resolver uma situação do atendimento."
                  : "Equipe muito atenciosa. Fomos muito bem recebidos!"}
              </p>
            </span>
            <ChevronRight />
          </button>
        ))}
      </section>
      <section className="communication-card survey-config">
        <header>
          <h2>Configuração da pesquisa</h2>
          <button onClick={preview}>Visualizar pesquisa</button>
        </header>
        <div>
          <label>
            Quando enviar
            <select>
              <option>24h após a consulta</option>
              <option>Ao finalizar a consulta</option>
            </select>
          </label>
          <label>
            Perguntas
            <select>
              <option>Estrelas + NPS + comentário</option>
            </select>
          </label>
        </div>
        <textarea defaultValue="Olá, {{nome}}! Como foi o atendimento de {{pet}}? Sua opinião é muito importante para nós." />
      </section>
    </div>
  )
}
