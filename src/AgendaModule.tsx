import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Gift,
  HelpCircle,
  MessageCircle,
  Package,
  PawPrint,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router"
import { useVetFlow, type Item } from "./store"
import { initialTutors } from "./TutorsModule"

type ClientPet = {
  id: string
  name: string
  species: string
  breed: string
}

type Client = {
  id: string
  code: string
  name: string
  phone: string
  pets: ClientPet[]
}

type Product = {
  id: string
  name: string
  price: number
  quantity: number
}

const moduleTutors: Client[] = initialTutors.map((tutor) => ({
  id: tutor.id,
  code: tutor.id.toUpperCase().slice(-6),
  name: tutor.name,
  phone: tutor.phone,
  pets: tutor.pets.map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
  })),
}))

const services = [
  ["Banho e tosa", 60],
  ["Consulta clínica", 30],
  ["Vacinação", 20],
  ["Retorno", 20],
  ["Ultrassonografia", 45],
] as const

const statuses = [
  "Agendado",
  "Confirmado",
  "Aguardando",
  "Em atendimento",
  "Concluído",
  "Cancelado",
  "Faltou",
]

const catalog = [
  ["consulta", "Consulta clínica", 190],
  ["vacina", "Vacina V10", 145],
  ["banho", "Banho terapêutico", 95],
  ["medicamento", "Antipulgas", 78],
  ["exame", "Hemograma completo", 120],
] as const

const emptyAppointment = {
  service: "Banho e tosa",
  duration: "60",
  date: "2026-10-17",
  professional: "",
  time: "08:00",
  notes: "",
  status: "Agendado",
  recurrence: false,
  repeatEvery: "1",
  repeatUnit: "semana",
  weekdays: ["Sáb"],
  ends: "Nunca",
  endDate: "",
  occurrences: "12",
  tipo: "Consulta",
  sala: "Consultório 1",
  convenio: "Particular",
  valor: "",
  prioridade: "Normal",
  encaixe: false,
  lembrete: "WhatsApp",
  lembreteAntes: "24 horas antes",
  pagamento: "Na recepção",
  confirmado: false,
}

const pad = (value: number) => String(value).padStart(2, "0")
const iso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12)
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const petPhoto = (species: string) =>
  species.toLowerCase().includes("fel")
    ? "https://images.unsplash.com/photo-1628259679263-d1d5e245b778?auto=format&fit=crop&w=180&h=180&q=82"
    : "https://images.unsplash.com/photo-1538291558837-4f8275234328?auto=format&fit=crop&w=180&h=180&q=82"

export default function AgendaModule() {
  const { data, addItem, updateItem, deleteItem } = useVetFlow()
  const navigate = useNavigate()
  const [view, setView] = useState("Dia")
  const [cursor, setCursor] = useState(new Date(2026, 9, 17, 12))
  const [professionalFilter, setProfessionalFilter] = useState("Todos")
  const [drawer, setDrawer] = useState<"search" | "form" | null>(
    () =>
      new URLSearchParams(window.location.search).get("locate") === "1"
        ? "search"
        : null,
  )
  const [editing, setEditing] = useState<Item | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedPet, setSelectedPet] = useState<ClientPet | null>(null)
  const [extraPets, setExtraPets] = useState<ClientPet[]>([])
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return { client: params.get("client") || "", phone: "", pet: params.get("pet") || "" }
  })
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  const [draft, setDraft] = useState({ ...emptyAppointment })
  const [errors, setErrors] = useState<string[]>([])
  const [quickPet, setQuickPet] = useState(false)
  const [quickPetForm, setQuickPetForm] = useState({
    name: "",
    species: "Canina",
    breed: "",
    sex: "",
    birth: "",
  })
  const [petSelector, setPetSelector] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [catalogDraft, setCatalogDraft] = useState<Product[]>([])
  const [toast, setToast] = useState("")
  const [conflict, setConflict] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(["Sáb"])
  const professionals = useMemo(
    () => data.profissionais.map((item) => item.name).slice(0, 4),
    [data.profissionais],
  )

  const clients = useMemo(() => {
    const byOwner = new Map<string, Item[]>()
    data.animais.forEach((animal) => {
      if (!animal.ownerId) return
      const current = byOwner.get(animal.ownerId) || []
      current.push(animal)
      byOwner.set(animal.ownerId, current)
    })
    const stored = data.tutores.map((tutor, index): Client => ({
      id: tutor.id,
      code: tutor.id.toUpperCase().slice(-6),
      name: tutor.name,
      phone: tutor.phone || "Não informado",
      pets: (byOwner.get(tutor.id) || []).map((animal) => ({
        id: animal.id,
        name: animal.name,
        species: animal.species || "Canina",
        breed: animal.breed || "Sem raça definida",
      })),
    }))
    return stored
  }, [data.animais, data.tutores])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilters(filters), 300)
    return () => window.clearTimeout(timer)
  }, [filters])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (catalogOpen) setCatalogOpen(false)
      else if (quickPet) setQuickPet(false)
      else if (drawer) requestClose()
    }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  })

  const filteredClients = useMemo(() => {
    const client = debouncedFilters.client.toLowerCase()
    const phone = debouncedFilters.phone.replace(/\D/g, "")
    const animal = debouncedFilters.pet.toLowerCase()
    return clients.filter(
      (candidate) =>
        (!client ||
          candidate.name.toLowerCase().includes(client) ||
          candidate.code.toLowerCase().includes(client)) &&
        (!phone || candidate.phone.replace(/\D/g, "").includes(phone)) &&
        (!animal ||
          candidate.pets.some(
            (pet) =>
              pet.name.toLowerCase().includes(animal) ||
              pet.id.toLowerCase().includes(animal),
          )),
    )
  }, [clients, debouncedFilters])

  const appointments = data.agendas
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let hour = 6; hour <= 22; hour++)
      for (const minute of [0, 10, 20, 30, 40, 50])
        if (hour < 22 || minute === 0) slots.push(`${pad(hour)}:${pad(minute)}`)
    return slots
  }, [])
  const halfHourSlots = useMemo(() => {
    const slots: string[] = []
    for (let hour = 6; hour <= 22; hour++)
      for (const minute of [0, 30])
        if (hour < 22 || minute === 0) slots.push(`${pad(hour)}:${pad(minute)}`)
    return slots
  }, [])

  const minutesFromTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number)
    return hour * 60 + minute
  }
  const occupied = (time: string) => {
    const candidateStart = minutesFromTime(time)
    const candidateEnd = candidateStart + Number(draft.duration || 30)
    return appointments.some((item) => {
      if (
        item.id === editing?.id ||
        item.date !== draft.date ||
        item.professional !== draft.professional ||
        item.status === "Cancelado" ||
        !item.time
      )
        return false
      const itemStart = minutesFromTime(item.time)
      const itemEnd = itemStart + Number(item.duration || 30)
      return candidateStart < itemEnd && candidateEnd > itemStart
    })
  }
  const availableSlots = timeSlots.filter((time) => !occupied(time))

  const openNew = (date = iso(cursor), time = "08:00", professional = professionals[0]) => {
    setEditing(null)
    setSelectedClient(null)
    setSelectedPet(null)
    setExtraPets([])
    setDraft({ ...emptyAppointment, date, time, professional: professional || professionals[0] || "" })
    setSelectedProducts([])
    setErrors([])
    setConflict("")
    setDrawer("search")
  }

  const openEdit = (item: Item) => {
    const client =
      clients.find((candidate) => candidate.id === item.ownerId) ||
      clients.find((candidate) => candidate.name === item.owner) ||
      moduleTutors[0]
    const animal =
      client.pets.find((candidate) => candidate.id === item.animalId) ||
      client.pets.find((candidate) => candidate.name === item.animal) ||
      client.pets[0]
    setEditing(item)
    setSelectedClient(client)
    setSelectedPet(animal)
    setDraft({
      ...emptyAppointment,
      service: item.service || item.name,
      duration: String(item.duration || 30),
      date: item.date || iso(cursor),
      professional: item.professional || professionals[0],
      time: item.time || "08:00",
      notes: item.notes || "",
      status: item.status,
      recurrence: Boolean(item.recurrenceId),
      ...(item.extra || {}),
    })
    setSelectedProducts(
      item.products
        ? JSON.parse(item.products)
        : [],
    )
    setDrawer("form")
  }

  const choosePet = (client: Client, pet: ClientPet) => {
    setSelectedClient(client)
    setSelectedPet(pet)
    setDrawer("form")
    setErrors([])
  }

  useEffect(() => {
    const pendingClient = window.sessionStorage.getItem(
      "vetflow-agenda-client",
    )
    if (!pendingClient) return
    const client = clients.find((candidate) => candidate.id === pendingClient)
    if (!client) return
    window.sessionStorage.removeItem("vetflow-agenda-client")
    setSelectedClient(client)
    setFilters((current) => ({ ...current, client: client.name }))
    if (client.pets[0]) choosePet(client, client.pets[0])
    else setDrawer("search")
  }, [clients])

  const addQuickPet = (event: FormEvent) => {
    event.preventDefault()
    if (!quickPetForm.name.trim() || !selectedClient) return
    const stored = addItem("animais", {
      name: quickPetForm.name,
      owner: selectedClient.name,
      ownerId: selectedClient.id,
      species: quickPetForm.species,
      breed: quickPetForm.breed || "Sem raça definida",
      sex: quickPetForm.sex,
      birthDate: quickPetForm.birth,
      subtitle: `${quickPetForm.species} • ${quickPetForm.breed || "Sem raça definida"}`,
      status: "Ativo",
    })
    const created: ClientPet = {
      id: stored.id,
      name: stored.name,
      species: stored.species || "Canina",
      breed: stored.breed || "Sem raça definida",
    }
    const updated = {
      ...selectedClient,
      pets: [...selectedClient.pets, created],
    }
    setSelectedClient(updated)
    setSelectedPet(created)
    setQuickPet(false)
    setDrawer("form")
  }

  const selectService = (service: string) => {
    const match = services.find(([name]) => name === service)
    setDraft((current) => ({
      ...current,
      service,
      duration: String(match?.[1] || 30),
    }))
  }

  const save = () => {
    const required = [
      ["client", selectedClient],
      ["animal", selectedPet],
      ["service", draft.service],
      ["date", draft.date],
      ["professional", draft.professional],
      ["time", draft.time],
    ]
      .filter(([, value]) => !value)
      .map(([field]) => String(field))
    setErrors(required)
    if (required.length) return
    if (!draft.encaixe && occupied(draft.time)) {
      setConflict("Este horário já está ocupado")
      return
    }
    const base = {
      name: draft.service,
      subtitle: `${selectedPet!.name} • ${selectedClient!.name}`,
      animal: selectedPet!.name,
      animalId: selectedPet!.id,
      owner: selectedClient!.name,
      ownerId: selectedClient!.id,
      phone: selectedClient!.phone,
      professional: draft.professional,
      professionalId: data.profissionais.find(
        (item) => item.name === draft.professional,
      )?.id,
      service: draft.service,
      date: draft.date,
      time: draft.time,
      duration: Number(draft.duration),
      notes: draft.notes,
      status: draft.status,
      products: JSON.stringify(selectedProducts),
      amountValue: Number(String(draft.valor || "").replace(/\./g, "").replace(",", ".")) || undefined,
      category: draft.tipo,
      urgency: draft.prioridade === "Urgente",
      extra: { ...(editing?.extra || {}), tipo: draft.tipo, sala: draft.sala, convenio: draft.convenio, valor: draft.valor, prioridade: draft.prioridade, encaixe: draft.encaixe, lembrete: draft.lembrete, lembreteAntes: draft.lembreteAntes, pagamento: draft.pagamento, confirmado: draft.confirmado },
    }
    if (editing) updateItem("agendas", editing.id, base)
    else {
      const count = draft.recurrence
        ? draft.ends === "Após N ocorrências"
          ? Math.max(1, Number(draft.occurrences))
          : 12
        : 1
      const recurrenceId = draft.recurrence ? `rec-${Date.now()}` : undefined
      for (let index = 0; index < count; index++) {
        const date = new Date(`${draft.date}T12:00:00`)
        const offset =
          draft.repeatUnit === "dia"
            ? index * Number(draft.repeatEvery)
            : draft.repeatUnit === "mês"
              ? index * 30 * Number(draft.repeatEvery)
              : index * 7 * Number(draft.repeatEvery)
        addItem("agendas", {
          ...base,
          date: iso(addDays(date, offset)),
          recurrenceId,
        })
      }
      extraPets.forEach((pet) =>
        addItem("agendas", {
          ...base,
          animal: pet.name,
          animalId: pet.id,
          subtitle: `${pet.name} • ${selectedClient!.name}`,
          time: availableSlots.find((time) => time > draft.time) || draft.time,
        }),
      )
    }
    setDrawer(null)
    setCursor(new Date(`${draft.date}T12:00:00`))
    setProfessionalFilter("Todos")
    setToast(`Agendamento salvo: ${new Date(`${draft.date}T12:00:00`).toLocaleDateString("pt-BR")} às ${draft.time} com ${draft.professional}`)
    window.setTimeout(() => setToast(""), 3500)
  }

  const requestClose = () => {
    if (drawer === "form" && (selectedClient || draft.notes || editing))
      setDiscardConfirm(true)
    else setDrawer(null)
  }

  const deleteAppointment = () => {
    if (!editing) return
    deleteItem("agendas", editing.id)
    setDeleteConfirm(false)
    setDrawer(null)
    setToast("Agendamento excluído")
    window.setTimeout(() => setToast(""), 3000)
  }

  const statusClass = (status: string) =>
    `vf-status-${status
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replaceAll(" ", "-")}`

  const dayAppointments = appointments.filter(
    (item) =>
      item.date === iso(cursor) &&
      (professionalFilter === "Todos" ||
        item.professional === professionalFilter),
  )
  const weekStart = addDays(cursor, -((cursor.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  )
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12)
  const monthGridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7))
  const monthDays = Array.from({ length: 42 }, (_, index) =>
    addDays(monthGridStart, index),
  )

  return (
    <div className="vf-agenda-page">
      <div className="vf-agenda-heading">
        <div>
          <span>OPERAÇÃO CLÍNICA</span>
          <h1>Agenda diária</h1>
          <p>Organize os atendimentos da equipe em tempo real.</p>
        </div>
        <button className="vf-new-appointment" onClick={() => openNew()}>
          <Plus size={17} /> Novo agendamento
        </button>
      </div>
      <section className="vf-agenda-toolbar">
        <div className="vf-view-tabs">
          {["Dia", "Semana", "Mês"].map((name) => (
            <button
              className={view === name ? "active" : ""}
              onClick={() => setView(name)}
              key={name}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="vf-date-navigation">
          <button onClick={() => setCursor(addDays(cursor, view === "Dia" ? -1 : view === "Semana" ? -7 : -30))}>
            <ChevronLeft size={18} />
          </button>
          <label>
            <CalendarDays size={16} />
            <input
              type="date"
              value={iso(cursor)}
              onChange={(event) =>
                setCursor(new Date(`${event.target.value}T12:00:00`))
              }
            />
            <span>
              {cursor.toLocaleDateString("pt-BR")} –{" "}
              {cursor.toLocaleDateString("pt-BR", { weekday: "long" })}
            </span>
          </label>
          <button onClick={() => setCursor(addDays(cursor, view === "Dia" ? 1 : view === "Semana" ? 7 : 30))}>
            <ChevronRight size={18} />
          </button>
          <select
            value={professionalFilter}
            onChange={(event) => setProfessionalFilter(event.target.value)}
          >
            <option>Todos</option>
            {professionals.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      </section>

      {view === "Dia" && (
        <section className="vf-day-calendar">
          <div className="vf-professional-head">
            <span>HORÁRIO</span>
            {professionals
              .filter(
                (name) =>
                  professionalFilter === "Todos" ||
                  name === professionalFilter,
              )
              .map((name) => (
                <div key={name}>
                  <span>
                    <strong>{name}</strong>
                    <small>Clínica, Banho e Tosa</small>
                  </span>
                  <HelpCircle size={15} />
                  <Printer size={15} />
                </div>
              ))}
          </div>
          <div className="vf-day-grid">
            {halfHourSlots.map((time) => (
              <div className="vf-time-row" key={time}>
                <span>{time}</span>
                {professionals
                  .filter(
                    (name) =>
                      professionalFilter === "Todos" ||
                      name === professionalFilter,
                  )
                  .map((professional) => {
                    const events = dayAppointments.filter(
                      (item) =>
                        item.professional === professional &&
                        minutesFromTime(item.time || "00:00") >= minutesFromTime(time) &&
                        minutesFromTime(item.time || "00:00") < minutesFromTime(time) + 30,
                    )
                    return (
                      <button
                        className="vf-time-cell"
                        key={professional}
                        onClick={() =>
                          !events.length &&
                          openNew(iso(cursor), time, professional)
                        }
                      >
                        {events.map((item) => (
                          <span
                            className={`vf-appointment ${statusClass(item.status)}`}
                            key={item.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              openEdit(item)
                            }}
                          >
                            <b>{item.time}</b>
                            <strong>{item.animal || item.name}</strong>
                            <small>{item.owner}</small>
                            <em>{item.service}</em>
                          </span>
                        ))}
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </section>
      )}

      {view === "Semana" && (
        <section className="vf-week-grid">
          {weekDays.map((date) => {
            const events = appointments.filter((item) => item.date === iso(date))
            return (
              <div key={iso(date)}>
                <header>
                  <small>{date.toLocaleDateString("pt-BR", { weekday: "short" })}</small>
                  <strong>{date.getDate()}</strong>
                </header>
                <button onClick={() => openNew(iso(date), "08:00")}>
                  <Plus size={14} /> adicionar
                </button>
                {events.slice(0, 8).map((item) => (
                  <button
                    className={`vf-week-event ${statusClass(item.status)}`}
                    onClick={() => openEdit(item)}
                    key={item.id}
                  >
                    <b>{item.time}</b>
                    <span>{item.animal}</span>
                    <small>{item.service}</small>
                  </button>
                ))}
              </div>
            )
          })}
        </section>
      )}

      {view === "Mês" && (
        <section className="vf-month-grid">
          {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => (
            <strong key={day}>{day}</strong>
          ))}
          {monthDays.map((date) => {
            const events = appointments.filter((item) => item.date === iso(date))
            return (
              <button
                className={
                  date.getMonth() !== cursor.getMonth() ? "other-month" : ""
                }
                key={iso(date)}
                onClick={() => {
                  setCursor(date)
                  setView("Dia")
                }}
              >
                <span>{date.getDate()}</span>
                {events.length > 0 && <b>{events.length} agendamento{events.length > 1 ? "s" : ""}</b>}
              </button>
            )
          })}
        </section>
      )}

      {drawer === "search" && (
        <div className="vf-agenda-overlay" onMouseDown={() => setDrawer(null)}>
          <aside className="vf-client-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <button onClick={() => setDrawer(null)}><ArrowLeft size={21} /></button>
              <h2>Agendamento &gt; Localizar Tutor</h2>
            </header>
            <form
              className="vf-client-filters"
              onSubmit={(event) => {
                event.preventDefault()
                setDebouncedFilters(filters)
              }}
            >
              <label><span>Tutor</span><input value={filters.client} onChange={(event) => setFilters({ ...filters, client: event.target.value })} placeholder="Nome ou ficha" /></label>
              <label><span>Telefone</span><input value={filters.phone} onChange={(event) => setFilters({ ...filters, phone: event.target.value })} placeholder="Número" /></label>
              <label><span>Animal</span><input value={filters.pet} onChange={(event) => setFilters({ ...filters, pet: event.target.value })} placeholder="Nome ou ficha" /></label>
              <button type="submit"><Search size={18} /></button>
            </form>
            <div className="vf-search-notice"><CircleHelp size={17} /> Para selecionar, clique no nome do animal.</div>
            <div className="vf-client-table">
              <div className="vf-client-table-head"><strong>Nome</strong><strong>Animais vivos</strong></div>
              {filteredClients.length ? (
                filteredClients.map((client) => (
                  <div className="vf-client-row" key={client.id}>
                    <span>{client.name}</span>
                    <span>
                      <span className="vf-pet-links">
                        {client.pets.map((pet, index) => (
                          <span key={pet.id}>
                            {index > 0 && " - "}
                            <button onClick={() => choosePet(client, pet)}>{pet.name}</button>
                          </span>
                        ))}
                      </span>
                      <button className="vf-new-pet-link" onClick={() => { setSelectedClient(client); setQuickPet(true) }}>+ novo animal</button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="vf-no-client"><UserRound size={30} /><strong>Nenhum tutor encontrado</strong><button onClick={() => { window.sessionStorage.setItem("vetflow-agenda-return", "1"); navigate("/tutores?novo=1") }}>Cadastrar novo tutor</button></div>
              )}
            </div>
            <footer>
              <p><AlertCircle size={15} /> Não encontrou o tutor desejado?<button onClick={() => { window.sessionStorage.setItem("vetflow-agenda-return", "1"); navigate("/tutores?novo=1") }}>Clique aqui para adicionar um tutor.</button></p>
              <button onClick={() => setDrawer(null)}>Cancelar</button>
            </footer>
            <button className="vf-chat" title="Conversar com o tutor" aria-label="Abrir conversas com o tutor" onClick={() => navigate(selectedClient ? `/comunicacao?tutor=${encodeURIComponent(selectedClient.id)}` : "/comunicacao")}><MessageCircle size={20} /></button>
          </aside>
        </div>
      )}

      {drawer === "form" && selectedClient && selectedPet && (
        <div className="vf-agenda-overlay" onMouseDown={requestClose}>
          <aside className="vf-appointment-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <header><h2>Agendamento</h2><button onClick={requestClose}><X size={20} /></button></header>
            <div className="vf-appointment-scroll">
              <section className="vf-client-summary">
                <div>
                  <p><UserRound size={16} /><strong>{selectedClient.name}</strong> <em>({selectedClient.code})</em></p>
                  <p><PawPrint size={16} /><strong>{selectedPet.name}</strong> <em>({selectedPet.id.slice(-6)}), {selectedPet.species}</em></p>
                  <p><Phone size={16} />{selectedClient.phone}</p>
                  <button onClick={() => setDrawer("search")}>⇄ Trocar tutor</button>
                </div>
                <button className="vf-add-pet" onClick={() => setPetSelector(!petSelector)}><Plus /></button>
                {petSelector && (
                  <div className="vf-pet-selector">
                    {selectedClient.pets.filter((pet) => pet.id !== selectedPet.id && !extraPets.some((extra) => extra.id === pet.id)).map((pet) => (
                      <button key={pet.id} onClick={() => { setExtraPets([...extraPets, pet]); setPetSelector(false) }}>{pet.name} • {pet.species}</button>
                    ))}
                  </div>
                )}
              </section>
              {extraPets.length > 0 && (
                <div className="vf-extra-pets">{extraPets.map((pet) => <span key={pet.id}><PawPrint size={14} />{pet.name}<button onClick={() => setExtraPets(extraPets.filter((item) => item.id !== pet.id))}><X size={13} /></button></span>)}</div>
              )}
              <div className="vf-appointment-form">
                <label className={errors.includes("service") ? "error" : ""}><span>Serviço *</span><select value={draft.service} onChange={(event) => selectService(event.target.value)}>{services.map(([name]) => <option key={name}>{name}</option>)}</select></label>
                <label><span>Duração</span><select value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: event.target.value })}>{[5,10,15,20,30,45,60,90,120].map((value) => <option value={value} key={value}>{value} minutos</option>)}</select></label>
                <label className={errors.includes("date") ? "error" : ""}><span>Data *</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, time: "" })} /></label>
                <label className={errors.includes("professional") ? "error" : ""}><span>Profissional *</span><select value={draft.professional} onChange={(event) => setDraft({ ...draft, professional: event.target.value, time: "" })}>{professionals.map((name) => <option key={name}>{name}</option>)}</select></label>
                <label className={errors.includes("time") ? "error" : ""}><span>Horário *</span><select value={draft.time} onChange={(event) => { setDraft({ ...draft, time: event.target.value }); setConflict("") }}><option value="">Selecione um horário</option>{timeSlots.map((time) => <option disabled={occupied(time)} value={time} key={time}>{new Date(`${draft.date}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} às {time} – {draft.professional}{occupied(time) ? " • ocupado" : ""}</option>)}</select>{!availableSlots.length && <small>Sem horários disponíveis neste dia. Tente o próximo dia.</small>}</label>
                <label className={errors.includes("time") ? "error" : ""}><span>Ou digite o horário</span><input type="time" step={300} value={draft.time} onChange={(event) => { setDraft({ ...draft, time: event.target.value }); setConflict("") }} /></label>
                <label><span>Tipo de atendimento</span><select value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })}>{["Consulta", "Retorno", "Vacinação", "Exame", "Cirurgia", "Procedimento", "Banho e tosa", "Teleatendimento"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Sala / consultório</span><select value={draft.sala} onChange={(event) => setDraft({ ...draft, sala: event.target.value })}>{["Consultório 1", "Consultório 2", "Sala de vacinas", "Centro cirúrgico", "Banho e tosa", "Online"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Prioridade</span><select value={draft.prioridade} onChange={(event) => setDraft({ ...draft, prioridade: event.target.value })}>{["Normal", "Preferencial", "Urgente"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Convênio / plano</span><select value={draft.convenio} onChange={(event) => setDraft({ ...draft, convenio: event.target.value })}>{["Particular", ...data.convenios.slice(0, 6).map((item) => item.name)].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Valor previsto (R$)</span><input inputMode="decimal" placeholder="0,00" value={draft.valor} onChange={(event) => setDraft({ ...draft, valor: event.target.value })} /></label>
                <label><span>Pagamento</span><select value={draft.pagamento} onChange={(event) => setDraft({ ...draft, pagamento: event.target.value })}>{["Na recepção", "Pix antecipado", "Cartão", "Faturar no convênio"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Lembrete ao tutor</span><select value={draft.lembrete} onChange={(event) => setDraft({ ...draft, lembrete: event.target.value })}>{["WhatsApp", "SMS", "E-mail", "Não enviar"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Enviar lembrete</span><select value={draft.lembreteAntes} onChange={(event) => setDraft({ ...draft, lembreteAntes: event.target.value })}>{["24 horas antes", "12 horas antes", "2 horas antes", "No dia, às 8h"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="vf-recurrence-check"><input type="checkbox" checked={draft.encaixe} onChange={(event) => setDraft({ ...draft, encaixe: event.target.checked })} /> Encaixe (permitir fora da grade)</label>
                <label className="vf-recurrence-check"><input type="checkbox" checked={draft.confirmado} onChange={(event) => setDraft({ ...draft, confirmado: event.target.checked })} /> Tutor já confirmou presença</label>
                {conflict && <div className="vf-conflict"><AlertCircle size={15} />{conflict}</div>}
                <label className="wide"><span>Observações</span><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                <label className="wide"><span>Status</span><select className={statusClass(draft.status)} value={draft.status} onChange={(event) => { const status = event.target.value; setDraft({ ...draft, status }); if (editing) updateItem("agendas", editing.id, { status }) }}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              </div>
              <label className="vf-recurrence-check"><input type="checkbox" checked={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.checked })} /> Ativar recorrência</label>
              {draft.recurrence && (
                <section className="vf-recurrence">
                  <div><label>Repetir a cada<input type="number" min="1" value={draft.repeatEvery} onChange={(event) => setDraft({ ...draft, repeatEvery: event.target.value })} /></label><select value={draft.repeatUnit} onChange={(event) => setDraft({ ...draft, repeatUnit: event.target.value })}><option>dia</option><option>semana</option><option>mês</option></select></div>
                  {draft.repeatUnit === "semana" && <div className="vf-weekday-chips">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((day) => <button className={selectedWeekdays.includes(day) ? "active" : ""} onClick={() => setSelectedWeekdays(selectedWeekdays.includes(day) ? selectedWeekdays.filter((item) => item !== day) : [...selectedWeekdays, day])} key={day}>{day}</button>)}</div>}
                  <label>Termina em<select value={draft.ends} onChange={(event) => setDraft({ ...draft, ends: event.target.value })}><option>Nunca</option><option>Em uma data</option><option>Após N ocorrências</option></select></label>
                  {draft.ends === "Em uma data" && <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />}
                  {draft.ends === "Após N ocorrências" && <input type="number" min="1" value={draft.occurrences} onChange={(event) => setDraft({ ...draft, occurrences: event.target.value })} />}
                  <p>Toda {draft.repeatUnit}, às {selectedWeekdays.join(", ") || "datas selecionadas"}{draft.ends === "Em uma data" ? `, até ${draft.endDate}` : draft.ends === "Após N ocorrências" ? ` (${draft.occurrences} ocorrências)` : ", sem data final"}.</p>
                </section>
              )}
              <button className="vf-products-button" onClick={() => { setCatalogDraft(selectedProducts); setCatalogOpen(true) }}><Gift size={18} /> Inserir produtos / serviços</button>
              {selectedProducts.length > 0 && <div className="vf-products-summary">{selectedProducts.map((product) => <span key={product.id}>{product.quantity}× {product.name}</span>)}<strong>Total: {money(selectedProducts.reduce((sum,item) => sum + item.price*item.quantity,0))}</strong></div>}
            </div>
            <footer>
              {editing && <button className="vf-delete" onClick={() => setDeleteConfirm(true)}><Trash2 size={16} /> Excluir</button>}
              {editing && <button className="vf-reschedule" onClick={() => document.querySelector<HTMLInputElement>(".vf-appointment-form input[type=date]")?.focus()}>Reagendar</button>}
              <button className="vf-save" onClick={save}><Check size={17} /> Salvar</button>
              <button className="vf-close" onClick={requestClose}>⊘ Fechar</button>
            </footer>
            <button className="vf-chat" title="Conversar com o tutor" aria-label="Abrir conversas com o tutor" onClick={() => navigate(selectedClient ? `/comunicacao?tutor=${encodeURIComponent(selectedClient.id)}` : "/comunicacao")}><MessageCircle size={20} /></button>
          </aside>
        </div>
      )}

      {quickPet && selectedClient && (
        <div className="vf-modal-layer">
          <form className="vf-quick-pet-modal" onSubmit={addQuickPet}>
            <header><h3>Novo animal de {selectedClient.name}</h3><button type="button" onClick={() => setQuickPet(false)}><X size={18} /></button></header>
            <label>Nome *<input value={quickPetForm.name} onChange={(event) => setQuickPetForm({ ...quickPetForm, name: event.target.value })} /></label>
            <div><label>Espécie<select value={quickPetForm.species} onChange={(event) => setQuickPetForm({ ...quickPetForm, species: event.target.value })}><option>Canina</option><option>Felina</option><option>Ave</option></select></label><label>Raça<input value={quickPetForm.breed} onChange={(event) => setQuickPetForm({ ...quickPetForm, breed: event.target.value })} /></label></div>
            <div><label>Sexo<select value={quickPetForm.sex} onChange={(event) => setQuickPetForm({ ...quickPetForm, sex: event.target.value })}><option value="">Selecione</option><option>Macho</option><option>Fêmea</option></select></label><label>Nascimento<input type="date" value={quickPetForm.birth} onChange={(event) => setQuickPetForm({ ...quickPetForm, birth: event.target.value })} /></label></div>
            <footer><button type="button" onClick={() => setQuickPet(false)}>Cancelar</button><button>Salvar e selecionar</button></footer>
          </form>
        </div>
      )}

      {catalogOpen && (
        <div className="vf-modal-layer">
          <section className="vf-catalog-modal">
            <header><h3>Inserir produtos / serviços</h3><button onClick={() => setCatalogOpen(false)}><X size={19} /></button></header>
            <label className="vf-catalog-search"><Search size={16} /><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Buscar no catálogo…" /></label>
            <div className="vf-catalog-list">
              {catalog.filter(([,name]) => name.toLowerCase().includes(catalogSearch.toLowerCase())).map(([id,name,price]) => {
                const selected = catalogDraft.find((item) => item.id === id)
                return <div key={id}><Package size={19} /><span><strong>{name}</strong><small>{money(price)}</small></span><div><button onClick={() => selected && setCatalogDraft(catalogDraft.map((item) => item.id === id ? {...item,quantity:Math.max(0,item.quantity-1)} : item).filter((item) => item.quantity))}>−</button><b>{selected?.quantity || 0}</b><button onClick={() => setCatalogDraft(selected ? catalogDraft.map((item) => item.id === id ? {...item,quantity:item.quantity+1} : item) : [...catalogDraft,{id,name,price,quantity:1}])}>+</button></div><em>{money((selected?.quantity || 0)*price)}</em></div>
              })}
            </div>
            <footer><strong>Total: {money(catalogDraft.reduce((sum,item) => sum+item.price*item.quantity,0))}</strong><div><button onClick={() => setCatalogOpen(false)}>Cancelar</button><button onClick={() => { setSelectedProducts(catalogDraft); setCatalogOpen(false) }}>Adicionar ao agendamento</button></div></footer>
          </section>
        </div>
      )}

      {discardConfirm && <Confirm title="Descartar alterações?" text="Os dados preenchidos serão perdidos." cancel="Continuar editando" confirm="Descartar" onCancel={() => setDiscardConfirm(false)} onConfirm={() => { setDiscardConfirm(false); setDrawer(null) }} />}
      {deleteConfirm && <Confirm title="Excluir agendamento?" text={editing?.recurrenceId ? "Este agendamento faz parte de uma recorrência. A exclusão será aplicada somente a este compromisso." : "Esta ação não poderá ser desfeita."} cancel="Cancelar" confirm="Excluir" danger onCancel={() => setDeleteConfirm(false)} onConfirm={deleteAppointment} />}
      {toast && <div className="vf-agenda-toast"><Check size={17} />{toast}</div>}
    </div>
  )
}

function Confirm({
  title,
  text,
  cancel,
  confirm,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  text: string
  cancel: string
  confirm: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="vf-modal-layer">
      <section className="vf-confirm">
        <AlertCircle size={28} />
        <h3>{title}</h3>
        <p>{text}</p>
        <div><button onClick={onCancel}>{cancel}</button><button className={danger ? "danger" : ""} onClick={onConfirm}>{confirm}</button></div>
      </section>
    </div>
  )
}
