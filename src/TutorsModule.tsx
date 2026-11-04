import RowActions from "./vfx/RowActions"
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Mail,
  MoreVertical,
  PawPrint,
  Phone,
  Plus,
  Search,
  Syringe,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useVetFlow, type Item } from "./store"
import ClienteForm, { fromItem, toItem } from "./vfx/ClienteForm"
import { Confirm } from "./vfx/ui"
import { printHtml } from "./vfx/vendasShared"

type Pet = {
  id: string
  name: string
  species: string
  breed: string
  sex: string
  sterilization: string
  birth: string
  coat: string
  microchip: string
  weight: string
  notes: string
  photo: string
  status: string
}

type TutorRow = {
  id: string
  name: string
  phone: string
  status: "Ativo" | "Inativo"
  lastVisit: string
  pets: Pet[]
  email?: string
  address?: string
  cpf?: string
  rg?: string
  personType?: string
  nationality?: string
  sex?: string
  source?: string
  profession?: string
  birthday?: string
  privacy?: string
  notes?: string
}

const petPhotos = {
  dog: "https://images.unsplash.com/photo-1538291558837-4f8275234328?auto=format&fit=crop&w=240&h=240&q=82",
  dog2:
    "https://images.unsplash.com/photo-1550953581-a75aa86fec20?auto=format&fit=crop&w=240&h=240&q=82",
  cat: "https://images.unsplash.com/photo-1628259679263-d1d5e245b778?auto=format&fit=crop&w=240&h=240&q=82",
}

const pet = (
  id: string,
  name: string,
  species: "Cão" | "Gato",
  photo: string,
  breed = species === "Cão" ? "Sem raça definida" : "Europeu",
): Pet => ({
  id,
  name,
  species,
  breed,
  sex: name === "Mel" || name === "Luna" || name === "Nina" ? "Fêmea" : "Macho",
  sterilization: "Sim",
  birth: "12/03/2021",
  coat: species === "Cão" ? "Caramelo" : "Curta",
  microchip: `98514100${id.padStart(4, "0")}`,
  weight: species === "Cão" ? "12,4 kg" : "4,8 kg",
  notes: "Paciente ativo, acompanhado regularmente pela equipe VetFlow.",
  photo,
  status: "Ativo",
})

export const initialTutors: TutorRow[] = [
  {
    id: "gabriel-ribeiro",
    name: "Gabriel Ribeiro",
    phone: "(69) 98765-4321",
    status: "Ativo",
    lastVisit: "07/05/2025",
    pets: [
      pet("1", "Thor", "Cão", petPhotos.dog),
      pet("2", "Mel", "Gato", petPhotos.cat),
    ],
  },
  {
    id: "juliana-lima",
    name: "Juliana Lima",
    phone: "(69) 97654-3210",
    status: "Ativo",
    lastVisit: "03/05/2025",
    pets: [pet("3", "Mel", "Gato", petPhotos.cat)],
  },
  {
    id: "patricia-ribeiro",
    name: "Patricia Ribeiro",
    phone: "(69) 96543-2109",
    status: "Ativo",
    lastVisit: "29/04/2025",
    pets: [
      pet("4", "Luna", "Cão", petPhotos.dog2),
      pet("5", "Pipoca", "Cão", petPhotos.dog),
      pet("6", "Nina", "Gato", petPhotos.cat),
    ],
  },
  {
    id: "larissa-lima",
    name: "Larissa Lima",
    phone: "(69) 95432-1098",
    status: "Ativo",
    lastVisit: "27/04/2025",
    pets: [pet("7", "Bob", "Cão", petPhotos.dog2)],
  },
  {
    id: "marcelo-lima",
    name: "Marcelo Lima",
    phone: "(69) 94321-0987",
    status: "Ativo",
    lastVisit: "20/04/2025",
    pets: [pet("8", "Nina", "Gato", petPhotos.cat)],
  },
]

const emptyTutor = {
  kind: "Pessoa física",
  fullName: "",
  nationality: "Brasileiro",
  sex: "",
  cpf: "",
  rg: "",
  birthday: "",
  source: "",
  profession: "",
  municipal: "",
  cnpj: "",
  taxRegime: "",
  stateRegistration: "",
  contactType: "Celular",
  phone: "",
  whatsapp: "Sim",
  contactNotes: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
  tags: "",
  notes: "",
}

const emptyPet = {
  name: "",
  sex: "",
  sterilization: "",
  birth: "",
  species: "",
  breed: "",
  coat: "",
  microchip: "",
  weight: "",
  notes: "",
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function Field({
  label,
  name,
  value,
  onChange,
  required,
  type = "text",
  options,
  placeholder,
  disabled,
  error,
  className = "",
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  required?: boolean
  type?: string
  options?: string[]
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}) {
  return (
    <label className={`tf-field ${error ? "has-error" : ""} ${className}`}>
      <span>
        {label}
        {required ? "*" : ""}
      </span>
      {options ? (
        <span className="tf-select-wrap">
          <select
            name={name}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(name, event.target.value)}
          >
            <option value="">{placeholder || "Selecione"}</option>
            {options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <ChevronDown size={17} />
        </span>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />
      )}
      {error && <small>Campo obrigatório.</small>}
    </label>
  )
}

function ToggleRow({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className="tf-toggle-row" onClick={onClick}>
      <span>{label}</span>
      <i className={checked ? "on" : ""}>{checked && <Check size={14} />}</i>
    </button>
  )
}

export default function TutorsModule() {
  const { addItem, updateItem, deleteItem, data, theme, activeUnit } = useVetFlow()
  // Cadastro e edição usam o mesmo formulário completo, com CEP, máscara e validação de CPF/CNPJ (M-12, B-16, B-17, V-10..V-14).
  const [clienteForm, setClienteForm] = useState<{ item: Item | null } | null>(() => (new URLSearchParams(window.location.search).get("novo") === "1" ? { item: null } : null))
  const [confirmTutor, setConfirmTutor] = useState<{ kind: "inativar" | "excluir" | "anonimizar"; tutor: TutorRow } | null>(null)
  const historyOf = (id: string) => (["consultas", "vendas", "prontuarios", "vacinas", "agendas"] as const).reduce((n, slug) => n + data[slug].filter((r) => r.ownerId === id || r.animalId && data.animais.some((a) => a.id === r.animalId && a.ownerId === id)).length, 0)
  const exportTutor = (tutor: TutorRow) => {
    const item = data.tutores.find((t) => t.id === tutor.id)
    const payload = { exportadoEm: new Date().toISOString(), titular: item || tutor, animais: data.animais.filter((a) => a.ownerId === tutor.id) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }))
    const a = document.createElement("a"); a.href = url; a.download = `dados-${tutor.name.replace(/\s+/g, "-").toLowerCase()}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const printTutor = (tutor: TutorRow) => {
    const item = data.tutores.find((t) => t.id === tutor.id)
    const pets = data.animais.filter((a) => a.ownerId === tutor.id)
    printHtml(`Ficha ${tutor.name}`, `<div class="doc"><h1>Ficha do tutor</h1><p><b>${tutor.name}</b></p><p>CPF ${item?.cpf || "—"} · Telefone ${tutor.phone || "—"} · ${item?.email || ""}</p><p>${item?.address || ""}</p><h2>Animais</h2><table><tr><th>Nome</th><th>Espécie</th><th>Raça</th><th>Situação</th></tr>${pets.map((p) => `<tr><td>${p.name}</td><td>${p.species || ""}</td><td>${p.breed || ""}</td><td>${p.status}</td></tr>`).join("")}</table></div>`, true)
  }
  const navigate = useNavigate()
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("tutor") || "")
  const [statusFilter, setStatusFilter] = useState("Todos os status")
  const [sort, setSort] = useState("Mais recentes")
  const [addedRows, setAddedRows] = useState<TutorRow[]>([])
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...emptyTutor })
  const [draftPets, setDraftPets] = useState<Pet[]>([])
  const [animalForm, setAnimalForm] = useState({ ...emptyPet })
  const [animalScreen, setAnimalScreen] = useState(false)
  const [moreAnimalFields, setMoreAnimalFields] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [privacy, setPrivacy] = useState([true, true, true, true])
  const [contactBlocks, setContactBlocks] = useState(1)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<TutorRow | null>(null)
  const [editingTutor, setEditingTutor] = useState(false)
  const [tutorDraft, setTutorDraft] = useState<TutorRow | null>(null)
  const [selectedPet, setSelectedPet] = useState<{
    pet: Pet
    tutor: TutorRow
    edit?: boolean
  } | null>(null)
  const [petTab, setPetTab] = useState("Dados")
  const [toast, setToast] = useState("")
  const [perPage, setPerPage] = useState(5)

  const rows = useMemo(() => {
    const petsByOwner = new Map<string, Item[]>()
    data.animais.forEach((animal) => {
      if (!animal.ownerId) return
      const current = petsByOwner.get(animal.ownerId) || []
      current.push(animal)
      petsByOwner.set(animal.ownerId, current)
    })
    const storedRows: TutorRow[] = data.tutores.map((tutor, index) => ({
      id: tutor.id,
      name: tutor.name,
      phone: tutor.phone || "Telefone não informado",
      status: tutor.status === "Inativo" ? "Inativo" : "Ativo",
      lastVisit: tutor.date
        ? new Date(`${tutor.date}T12:00:00`).toLocaleDateString("pt-BR")
        : new Date(tutor.createdAt).toLocaleDateString("pt-BR"),
      pets: (petsByOwner.get(tutor.id) || []).map((animal, petIndex) => ({
        id: animal.id,
        name: animal.name,
        species: animal.species || "Não informada",
        breed: animal.breed || "Não informada",
        sex: animal.sex || "Não informado",
        sterilization: animal.extra?.sterilization || "Não informado",
        birth: animal.birthDate || "Não informado",
        coat: animal.extra?.coat || "Não informada",
        microchip: animal.extra?.microchip || "Não informado",
        weight: animal.weight || "Não informado",
        notes: animal.notes || "Sem observações.",
        photo:
          animal.species === "Gato"
            ? petPhotos.cat
            : (index + petIndex) % 2
              ? petPhotos.dog2
              : petPhotos.dog,
        status: animal.status || "Ativo",
      })),
      email: tutor.email,
      address: tutor.address,
      cpf: tutor.cpf,
      rg: tutor.rg,
      personType: tutor.personType || "Pessoa física",
      nationality: tutor.nationality || "Brasileira",
      sex: tutor.sex,
      profession: tutor.profession,
      birthday: tutor.birthDate,
      privacy:
        tutor.privacy || "E-mail, Campanha SMS, SMS e WhatsApp",
      notes: tutor.notes,
    }))
    const seen = new Set<string>()
    return [...addedRows, ...storedRows]
      .filter((row) => {
        const key = `${row.id}-${row.name.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, Math.max(320, data.tutores.length))
  }, [addedRows, data.animais, data.tutores])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matching = rows.filter(
      (row) =>
        (!term ||
          row.name.toLowerCase().includes(term) ||
          row.phone.includes(term) ||
          row.pets.some((animal) =>
            animal.name.toLowerCase().includes(term),
          )) &&
        (statusFilter === "Todos os status" || row.status === statusFilter),
    )
    if (sort === "Nome A–Z")
      return [...matching].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "Mais antigos") return [...matching].reverse()
    return matching
  }, [query, rows, sort, statusFilter])
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visibleRows = filtered.slice((page - 1) * perPage, page * perPage)
  const activeCount = rows.filter((row) => row.status === "Ativo").length
  const inactiveCount = rows.length - activeCount
  const pageItems: Array<number | "…"> = useMemo(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)
    const values: Array<number | "…"> = [1]
    if (page > 3) values.push("…")
    for (
      let value = Math.max(2, page - 1);
      value <= Math.min(pages - 1, page + 1);
      value++
    )
      values.push(value)
    if (page < pages - 2) values.push("…")
    values.push(pages)
    return values
  }, [page, pages])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, sort, perPage])
  useEffect(() => {
    setPage((current) => Math.min(current, pages))
  }, [pages])

  const openTutor = (tutor: TutorRow, edit = false) => {
    if (edit) {
      const item = data.tutores.find((t) => t.id === tutor.id)
      if (item) { setClienteForm({ item }); return }
    }
    setSelectedTutor(tutor)
    setTutorDraft({ ...tutor })
    setEditingTutor(edit)
  }

  const changeTutorStatus = (
    tutor: TutorRow,
    status: "Ativo" | "Inativo",
  ) => {
    const updated: TutorRow = {
      ...tutor,
      status,
      pets: tutor.pets.map((animal) => ({ ...animal, status })),
    }
    setAddedRows((current) => [
      updated,
      ...current.filter((candidate) => candidate.id !== tutor.id),
    ])
    if (data.tutores.some((candidate) => candidate.id === tutor.id))
      updateItem("tutores", tutor.id, { status })
    tutor.pets.forEach((animal) => {
      if (data.animais.some((candidate) => candidate.id === animal.id))
        updateItem("animais", animal.id, { status })
    })
    setSelectedTutor((current) =>
      current?.id === tutor.id ? updated : current,
    )
    setTutorDraft((current) =>
      current?.id === tutor.id ? updated : current,
    )
    setSelectedPet((current) =>
      current?.tutor.id === tutor.id
        ? {
            pet: { ...current.pet, status },
            tutor: updated,
          }
        : current,
    )
    setToast(
      status === "Ativo"
        ? "Tutor e animais reativados com sucesso"
        : "Tutor e animais inativados com sucesso",
    )
    window.setTimeout(() => setToast(""), 3500)
  }

  const saveTutorChanges = () => {
    if (!tutorDraft) return
    setAddedRows((current) => [
      tutorDraft,
      ...current.filter((candidate) => candidate.id !== tutorDraft.id),
    ])
    if (data.tutores.some((candidate) => candidate.id === tutorDraft.id))
      updateItem("tutores", tutorDraft.id, {
        name: tutorDraft.name,
        phone: tutorDraft.phone,
        email: tutorDraft.email,
        address: tutorDraft.address,
        cpf: tutorDraft.cpf,
        rg: tutorDraft.rg,
        nationality: tutorDraft.nationality,
        profession: tutorDraft.profession,
        personType: tutorDraft.personType,
        birthDate: tutorDraft.birthday,
        privacy: tutorDraft.privacy,
        notes: tutorDraft.notes,
      })
    setSelectedTutor(tutorDraft)
    setEditingTutor(false)
    setToast("Dados do tutor atualizados com sucesso")
    window.setTimeout(() => setToast(""), 3500)
  }

  const updateForm = (name: string, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => current.filter((field) => field !== name))
  }
  const updateAnimal = (name: string, value: string) => {
    setAnimalForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => current.filter((field) => field !== name))
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setAnimalScreen(false)
    setStep(1)
    setErrors([])
  }

  const goBack = () => {
    if (animalScreen) return setAnimalScreen(false)
    if (step > 1) return setStep((current) => current - 1)
    closeDrawer()
  }

  const nextStep = () => {
    const required: Record<number, string[]> = {
      1: ["fullName", "nationality"],
      2: ["contactType", "phone"],
      3: ["cep", "address", "city", "state"],
      4: [],
    }
    const missing = (required[step] || []).filter(
      (field) => !form[field as keyof typeof form]?.trim(),
    )
    setErrors(missing)
    if (!missing.length) setStep((current) => Math.min(5, current + 1))
  }

  const addDraftPet = (keepAdding = false) => {
    const missing = ["name", "sex", "species", "breed"].filter(
      (field) => !animalForm[field as keyof typeof animalForm].trim(),
    )
    setErrors(missing)
    if (missing.length) return
    const created: Pet = {
      id: `draft-${Date.now()}`,
      name: animalForm.name,
      species: animalForm.species,
      breed: animalForm.breed,
      sex: animalForm.sex,
      sterilization: animalForm.sterilization || "Não informado",
      birth: animalForm.birth || "Não informado",
      coat: animalForm.coat || "Não informada",
      microchip: animalForm.microchip || "Não informado",
      weight: animalForm.weight || "Não informado",
      notes: animalForm.notes || "Sem observações.",
      photo:
        animalForm.species === "Gato" ? petPhotos.cat : petPhotos.dog,
      status: "Ativo",
    }
    setDraftPets((current) => [...current, created])
    setAnimalForm({ ...emptyPet })
    setErrors([])
    if (!keepAdding) setAnimalScreen(false)
  }

  const saveTutor = () => {
    const name = form.fullName.trim()
    if (!name) {
      setStep(1)
      setErrors(["fullName"])
      return
    }
    const storedTutor = addItem("tutores", {
      name,
      phone: form.phone,
      subtitle: `${form.phone}${form.cpf ? ` • CPF ${form.cpf}` : ""}`,
      status: "Ativo",
      cpf: form.cpf,
      address: `${form.address}, ${form.number} ${form.complement}`.trim(),
      rg: form.rg,
      nationality: form.nationality,
      profession: form.profession,
      personType: form.kind,
      birthDate: form.birthday,
      privacy: privacy
        .map((enabled, index) =>
          enabled ? ["E-mail", "SMS", "Campanha SMS", "WhatsApp"][index] : "",
        )
        .filter(Boolean)
        .join(", "),
      notes: form.notes,
    })
    draftPets.forEach((animal) =>
      addItem("animais", {
        name: animal.name,
        owner: name,
        ownerId: storedTutor.id,
        subtitle: `${animal.species} • ${animal.breed}`,
        species: animal.species,
        breed: animal.breed,
        sex: animal.sex,
        birthDate: animal.birth,
        weight: animal.weight,
        notes: animal.notes,
        status: "Ativo",
      }),
    )
    setAddedRows((current) => [
      {
        id: storedTutor.id,
        name,
        phone: form.phone,
        status: "Ativo",
        lastVisit: new Date().toLocaleDateString("pt-BR"),
        pets: draftPets,
        address: `${form.address}, ${form.number} ${form.complement}`.trim(),
        cpf: form.cpf,
        rg: form.rg,
        personType: form.kind,
        nationality: form.nationality,
        sex: form.sex,
        source: form.source,
        profession: form.profession,
        birthday: form.birthday,
        privacy: privacy
          .map((enabled, index) =>
            enabled
              ? ["E-mail", "SMS", "Campanha SMS", "WhatsApp"][index]
              : "",
          )
          .filter(Boolean)
          .join(", "),
        notes: form.notes,
      },
      ...current,
    ])
    closeDrawer()
    setForm({ ...emptyTutor })
    setDraftPets([])
    setToast("Tutor cadastrado com sucesso")
    window.setTimeout(() => setToast(""), 3500)
    if (window.sessionStorage.getItem("vetflow-agenda-return") === "1") {
      window.sessionStorage.removeItem("vetflow-agenda-return")
      window.sessionStorage.setItem("vetflow-agenda-client", storedTutor.id)
      navigate("/agendas?locate=1")
    }
  }

  return (
    <div className="tutors-module">
      <section className="tutors-hero">
        <picture>
          <img
            src={
              theme === "dark"
                ? "/assets/tutors-banner-dark.png"
                : "/assets/tutors-banner-light.png"
            }
            alt="Vet Flow Tutores — amor em cada detalhe"
          />
        </picture>
        <div className="tutor-metrics">
          {[
            [Users, rows.length, "Tutores cadastrados", "Base completa", "orange"],
            [UserRound, activeCount, "Ativos", rows.length ? `${((activeCount / rows.length) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da base` : "—", "aqua"],
            [UserRound, inactiveCount, "Inativos", "Cadastros arquivados", "gray"],
            [TrendingUp, data.tutores.filter((t) => (t.date || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length, "Novos este mês", "cadastrados no mês atual", "orange"],
          ].map(([Icon, value, label, detail, tone]) => {
            const MetricIcon = Icon as typeof Users
            return (
              <article className="tutor-metric" key={String(label)}>
                <i className={`tone-${tone}`}>
                  <MetricIcon size={19} />
                </i>
                <span>
                  <strong>{String(value)}</strong>
                  <small>{String(label)}</small>
                  <em>{String(detail)}</em>
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <main className="tutors-main">
        <section className="tutors-list-card">
          <div className="tutors-actions">
            <label className="tutors-search-field">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, telefone ou pet..."
              />
            </label>
            <label className="tutors-filter">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Todos os status</option>
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="tutors-filter">
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option>Mais recentes</option>
                <option>Mais antigos</option>
                <option>Nome A–Z</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <button className="tf-primary" onClick={() => setClienteForm({ item: null })}>
              <Plus size={18} />
              Novo tutor
            </button>
          </div>
            <div className="tutors-list-head">
              <span>Tutor</span>
              <span>Animais</span>
              <span>Última visita</span>
              <span>Status</span>
              <span />
            </div>
            {visibleRows.map((tutor, index) => (
              <div
                className="tutor-row"
                key={tutor.id}
                role="button"
                tabIndex={0}
                onClick={() => openTutor(tutor)}
              >
                <span className="tutor-person">
                  <i className={`avatar-tone-${index % 5}`}>
                    {initials(tutor.name)}
                  </i>
                  <span>
                    <strong>{tutor.name}</strong>
                    <small>
                      <Phone size={12} /> {tutor.phone}
                    </small>
                  </span>
                </span>
                <span className="pet-chips">
                  {tutor.pets.length ? (
                    tutor.pets.map((animal) => (
                      <button
                        className="pet-name-link"
                        key={animal.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          setPetTab("Dados")
                          setSelectedPet({ pet: animal, tutor, edit: true })
                        }}
                      >
                        {animal.name}
                      </button>
                    ))
                  ) : (
                    <span className="no-pets">
                      Sem animais <b>+ Adicionar</b>
                    </span>
                  )}
                </span>
                <span className="last-visit">
                  <small>Última visita</small>
                  <strong>{tutor.lastVisit}</strong>
                </span>
                <span className={`tutor-status ${tutor.status.toLowerCase()}`}>
                  {tutor.status}
                </span>
                <RowActions
                  name={tutor.name}
                  onView={() => openTutor(tutor)}
                  onEdit={() => openTutor(tutor, true)}
                  onDelete={() => setConfirmTutor({ kind: "excluir", tutor })}
                  deleteDisabled={historyOf(tutor.id) === 0 && !tutor.pets.length ? undefined : "Tem animais ou histórico: use Inativar no menu"}
                >
                <span className="row-menu-wrap">
                  <button
                    className="row-menu-trigger"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenMenu(openMenu === tutor.id ? null : tutor.id)
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {openMenu === tutor.id && (
                    <span className="row-menu">
                      {[
                        "Ver tutor",
                        "Editar",
                        "Adicionar animal",
                        tutor.status === "Ativo"
                          ? "Inativar"
                          : "Ativar novamente",
                        "Imprimir ficha",
                        "Exportar dados (LGPD)",
                        "Anonimizar (LGPD)",
                        ...(historyOf(tutor.id) === 0 && !tutor.pets.length ? ["Excluir"] : []),
                      ].map((label) => (
                          <button
                            key={label}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (label === "Ver tutor") openTutor(tutor)
                              if (label === "Editar") openTutor(tutor, true)
                              if (label === "Inativar")
                                setConfirmTutor({ kind: "inativar", tutor })
                              if (label === "Imprimir ficha") printTutor(tutor)
                              if (label === "Exportar dados (LGPD)") exportTutor(tutor)
                              if (label === "Anonimizar (LGPD)") setConfirmTutor({ kind: "anonimizar", tutor })
                              if (label === "Excluir") setConfirmTutor({ kind: "excluir", tutor })
                              if (label === "Ativar novamente")
                                changeTutorStatus(tutor, "Ativo")
                              if (label === "Adicionar animal") navigate(`/animais?novo=1&tutor=${tutor.id}`)
                              setOpenMenu(null)
                            }}
                          >
                            {label}
                          </button>
                        ),
                      )}
                    </span>
                  )}
                </span>
                </RowActions>
              </div>
            ))}
            <footer className="tutors-pagination">
              <span>
                Mostrando {(page - 1) * perPage + (filtered.length ? 1 : 0)}–
                {Math.min(page * perPage, filtered.length)} de {filtered.length}{" "}
                tutores
              </span>
              <div>
                <button
                  aria-label="Página anterior"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft size={15} />
                </button>
                {pageItems.map((item, index) =>
                  item === "…" ? (
                    <span key={`ellipsis-${index}`}>…</span>
                  ) : (
                    <button
                      className={page === item ? "active" : ""}
                      key={item}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  aria-label="Próxima página"
                  disabled={page === pages}
                  onClick={() =>
                    setPage((current) => Math.min(pages, current + 1))
                  }
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <label>
                <select
                  value={perPage}
                  onChange={(event) => setPerPage(Number(event.target.value))}
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                </select>
                <ChevronDown size={13} />
              </label>
            </footer>
          </section>
      </main>

      {drawerOpen && (
        <div className="tf-overlay" onMouseDown={closeDrawer}>
          <aside
            className="tutor-form-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="tf-drawer-header">
              <button onClick={goBack} aria-label="Voltar">
                <ArrowLeft size={23} />
              </button>
              <div>
                <strong>Adicionar</strong>
                {!animalScreen && (
                  <small>{step === 5 ? "Animais" : "Responsável"}</small>
                )}
              </div>
            </header>
            {animalScreen ? (
              <AnimalForm
                values={animalForm}
                update={updateAnimal}
                errors={errors}
                moreFields={moreAnimalFields}
                setMoreFields={setMoreAnimalFields}
                add={addDraftPet}
              />
            ) : (
              <>
                <div className="tf-drawer-scroll">
                  <div className="tf-step-title">
                    <h2>
                      {
                        [
                          "",
                          "Informações do cliente",
                          "Contatos",
                          "Endereço",
                          "Informações complementares",
                          "Animais",
                        ][step]
                      }
                    </h2>
                    <div>
                      <span>
                        <i style={{ width: `${step * 20}%` }} />
                      </span>
                      <b>{step}/5</b>
                    </div>
                  </div>
                  {step === 1 && (
                    <StepOne
                      form={form}
                      update={updateForm}
                      errors={errors}
                    />
                  )}
                  {step === 2 && (
                    <StepTwo
                      form={form}
                      update={updateForm}
                      errors={errors}
                      blocks={contactBlocks}
                      addBlock={() => setContactBlocks((value) => value + 1)}
                    />
                  )}
                  {step === 3 && (
                    <StepThree
                      form={form}
                      update={updateForm}
                      errors={errors}
                    />
                  )}
                  {step === 4 && (
                    <StepFour
                      form={form}
                      update={updateForm}
                      privacy={privacy}
                      setPrivacy={setPrivacy}
                    />
                  )}
                  {step === 5 && (
                    <div className="tf-animals-step">
                      {draftPets.length ? (
                        <div className="tf-added-pets">
                          {draftPets.map((animal) => (
                            <div key={animal.id}>
                              <span>
                                <strong>{animal.name}</strong>
                                <small>
                                  {animal.species} • {animal.breed}
                                </small>
                              </span>
                              <button
                                onClick={() =>
                                  setDraftPets((current) =>
                                    current.filter(
                                      (candidate) => candidate.id !== animal.id,
                                    ),
                                  )
                                }
                              >
                                <X size={17} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="tf-empty-pets">
                          <PawPrint size={38} />
                          <strong>Adicione animais ao cadastro</strong>
                          <small>Clique no botão abaixo para adicionar</small>
                        </div>
                      )}
                      <button
                        className="tf-outline-wide"
                        onClick={() => navigate(`/animais?novo=1&tutor=${selectedTutor?.id ?? ""}`)}
                      >
                        Adicionar novo animal
                      </button>
                    </div>
                  )}
                </div>
                <footer className="tf-drawer-footer">
                  <button
                    className={step === 5 ? "tf-save" : "tf-next"}
                    onClick={step === 5 ? saveTutor : nextStep}
                  >
                    {step === 5 ? "Salvar" : "Avançar"}
                  </button>
                </footer>
              </>
            )}
          </aside>
        </div>
      )}

      {selectedPet && (
        <AnimalPanel
          selection={selectedPet}
          tab={petTab}
          setTab={setPetTab}
          close={() => setSelectedPet(null)}
          changePet={(animal) =>
            setSelectedPet({ pet: animal, tutor: selectedPet.tutor })
          }
        />
      )}
      {selectedTutor && (
        <div
          className="tf-overlay animal-overlay"
          onMouseDown={() => {
            setSelectedTutor(null)
            setEditingTutor(false)
          }}
        >
          <aside
            className="tutor-record-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <button
                onClick={() => {
                  setSelectedTutor(null)
                  setEditingTutor(false)
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <strong>Ficha do tutor</strong>
              <button
                onClick={() => {
                  setSelectedTutor(null)
                  setEditingTutor(false)
                }}
              >
                <X size={21} />
              </button>
            </header>
            <div className="tutor-record-scroll">
              <section className="tutor-record-hero">
                <i>{initials(selectedTutor.name)}</i>
                <div>
                  <h2>{selectedTutor.name}</h2>
                  <p>
                    <Phone size={14} /> {selectedTutor.phone}
                  </p>
                  <span
                    className={`tutor-status ${selectedTutor.status.toLowerCase()}`}
                  >
                    {selectedTutor.status}
                  </span>
                </div>
                <div className="tutor-record-actions">
                  <button
                    onClick={() => {
                      const item = data.tutores.find((t) => t.id === selectedTutor.id)
                      if (item) setClienteForm({ item })
                    }}
                  >
                    Editar dados
                  </button>
                  <button
                    className={
                      selectedTutor.status === "Ativo" ? "deactivate" : ""
                    }
                    onClick={() =>
                      changeTutorStatus(
                        selectedTutor,
                        selectedTutor.status === "Ativo" ? "Inativo" : "Ativo",
                      )
                    }
                  >
                    {selectedTutor.status === "Ativo"
                      ? "Inativar tutor"
                      : "Ativar novamente"}
                  </button>
                </div>
              </section>
              {editingTutor && tutorDraft ? (
                <section className="tutor-edit-card">
                  <h3>Editar dados do tutor</h3>
                  <div className="tutor-edit-grid">
                    {[
                      ["Nome completo", "name"],
                      ["Telefone", "phone"],
                      ["E-mail", "email"],
                      ["CPF", "cpf"],
                      ["RG", "rg"],
                      ["Nacionalidade", "nationality"],
                      ["Profissão", "profession"],
                      ["Aniversário", "birthday"],
                      ["Endereço", "address"],
                      ["Observações", "notes"],
                    ].map(([label, field]) => (
                      <label
                        className={
                          field === "address" || field === "notes" ? "wide" : ""
                        }
                        key={field}
                      >
                        <span>{label}</span>
                        <input
                          value={String(
                            tutorDraft[field as keyof TutorRow] || "",
                          )}
                          onChange={(event) =>
                            setTutorDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    [field]: event.target.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button className="save-tutor-edit" onClick={saveTutorChanges}>
                    Salvar alterações
                  </button>
                </section>
              ) : (
                <div className="tutor-record-grid">
                  <section className="tutor-record-card responsible-card">
                    <h3>Dados do responsável</h3>
                    <div className="tutor-info-grid">
                      {[
                        ["Nome", selectedTutor.name],
                        ["Código", selectedTutor.id.toUpperCase().slice(-12)],
                        [
                          "Tipo de pessoa",
                          selectedTutor.personType || "Pessoa física",
                        ],
                        [
                          "Nacionalidade",
                          selectedTutor.nationality || "Brasileira",
                        ],
                        ["CPF", selectedTutor.cpf || "Não cadastrado"],
                        ["RG", selectedTutor.rg || "Não cadastrado"],
                        ["Como nos conheceu", selectedTutor.source || "Não cadastrado"],
                        ["Sexo", selectedTutor.sex || "Não cadastrado"],
                        ["Profissão", selectedTutor.profession || "Não cadastrado"],
                        ["Aniversário", selectedTutor.birthday || "Não cadastrado"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <small>{label}</small>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="tutor-record-card">
                    <h3>Privacidade</h3>
                    <small>Canais de comunicação</small>
                    <p>
                      {selectedTutor.privacy ||
                        "E-mail, Campanha SMS, SMS e WhatsApp"}
                    </p>
                  </section>
                  <section className="tutor-record-card tutor-record-pets">
                    <h3>Animais</h3>
                    {selectedTutor.pets.length ? (
                      selectedTutor.pets.map((animal) => (
                        <button
                          key={animal.id}
                          onClick={() => {
                            setPetTab("Dados")
                            setSelectedPet({ pet: animal, tutor: selectedTutor, edit: true })
                          }}
                        >
                          <strong className="tutor-animal-record-link">
                            {animal.name}
                          </strong>
                          <ChevronRight size={17} />
                        </button>
                      ))
                    ) : (
                      <p>Nenhum animal vinculado.</p>
                    )}
                  </section>
                  <section className="tutor-record-card">
                    <h3>Contatos</h3>
                    <div className="contact-record-line">
                      <Phone size={17} />
                      <span>
                        <small>Celular</small>
                        <strong>{selectedTutor.phone} (WhatsApp)</strong>
                      </span>
                    </div>
                    <div className="contact-record-line">
                      <Mail size={17} />
                      <span>
                        <small>E-mail</small>
                        <strong>
                          {selectedTutor.email || "Não cadastrado"}
                        </strong>
                      </span>
                    </div>
                  </section>
                  <section className="tutor-record-card">
                    <h3>Endereço</h3>
                    <p>{selectedTutor.address || "Não cadastrado"}</p>
                  </section>
                  <section className="tutor-record-card">
                    <h3>Agendamentos</h3>
                    <p>
                      Consulte os atendimentos programados deste tutor na
                      Agenda.
                    </p>
                  </section>
                  <section className="tutor-record-card">
                    <h3>Observações</h3>
                    <p>{selectedTutor.notes || "Nenhuma observação cadastrada."}</p>
                  </section>
                  <section className="tutor-record-card">
                    <h3>Portal do cliente</h3>
                    <p>Cliente ainda não possui acesso ao portal.</p>
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      {clienteForm && (
        <ClienteForm
          initial={fromItem(clienteForm.item)}
          existing={clienteForm.item}
          tutores={data.tutores}
          unitCity={activeUnit.city}
          onClose={() => setClienteForm(null)}
          onSave={(d) => {
            const patch = toItem(d, activeUnit.city)
            if (clienteForm.item) {
              updateItem("tutores", clienteForm.item.id, { ...patch, status: clienteForm.item.status, extra: { ...(clienteForm.item.extra || {}), ...(patch.extra || {}) } })
              setAddedRows((rows) => rows.filter((row) => row.id !== clienteForm.item?.id))
              setToast("Dados do tutor atualizados")
            } else {
              addItem("tutores", patch)
              setToast("Tutor cadastrado")
            }
            setClienteForm(null)
            window.setTimeout(() => setToast(""), 3500)
          }}
        />
      )}
      {confirmTutor && (
        <Confirm
          danger={confirmTutor.kind !== "inativar"}
          title={confirmTutor.kind === "inativar" ? `Inativar ${confirmTutor.tutor.name}?` : confirmTutor.kind === "excluir" ? `Excluir ${confirmTutor.tutor.name}?` : `Anonimizar ${confirmTutor.tutor.name}?`}
          text={confirmTutor.kind === "inativar" ? "O tutor e os animais dele deixam de aparecer nas buscas de agendamento e venda. Você pode reativar depois." : confirmTutor.kind === "excluir" ? "Este tutor não tem animais nem histórico. O cadastro será removido." : "Nome, CPF, telefone, e-mail e endereço serão substituídos. O histórico clínico e financeiro continua, sem identificar a pessoa. Não é possível desfazer."}
          confirm={confirmTutor.kind === "inativar" ? "Inativar" : confirmTutor.kind === "excluir" ? "Excluir" : "Anonimizar"}
          onCancel={() => setConfirmTutor(null)}
          onConfirm={() => {
            const t = confirmTutor.tutor
            if (confirmTutor.kind === "inativar") changeTutorStatus(t, "Inativo")
            if (confirmTutor.kind === "excluir") { deleteItem("tutores", t.id); setAddedRows((rows) => rows.filter((row) => row.id !== t.id)); setToast("Tutor excluído") }
            if (confirmTutor.kind === "anonimizar") { updateItem("tutores", t.id, { name: `Titular anonimizado ${t.id.slice(-4)}`, cpf: "", phone: "", email: "", address: "", rg: "", birthDate: "", notes: "", status: "Inativo", extra: { anonimizadoEm: new Date().toISOString() } }); setToast("Dados pessoais anonimizados") }
            setConfirmTutor(null)
            window.setTimeout(() => setToast(""), 3500)
          }}
        />
      )}
      {toast && (
        <div className="tf-success-toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

function StepOne({
  form,
  update,
  errors,
}: {
  form: typeof emptyTutor
  update: (name: string, value: string) => void
  errors: string[]
}) {
  const business = form.kind === "Pessoa jurídica"
  return (
    <div className="tf-form">
      <div className="tf-segmented">
        {["Pessoa física", "Pessoa jurídica"].map((option) => (
          <button
            className={form.kind === option ? "active" : ""}
            key={option}
            onClick={() => update("kind", option)}
          >
            {option}
          </button>
        ))}
      </div>
      {business ? (
        <>
          <Field label="Nacionalidade" required name="nationality" value={form.nationality} onChange={update} options={["Brasileiro", "Estrangeiro"]} />
          <Field label="Nome completo" required name="fullName" value={form.fullName} onChange={update} error={errors.includes("fullName")} />
          <Field label="CNPJ" name="cnpj" value={form.cnpj} onChange={update} />
          <Field label="Regime tributário" name="taxRegime" value={form.taxRegime} onChange={update} options={["Simples Nacional", "Lucro presumido", "Lucro real"]} />
          <Field label="Inscrição municipal" name="municipal" value={form.municipal} onChange={update} />
          <Field label="Tipo de inscrição estadual" required name="stateRegistration" value={form.stateRegistration} onChange={update} options={["Contribuinte", "Isento", "Não contribuinte"]} />
          <Field label="Como nos conheceu?" name="source" value={form.source} onChange={update} options={["Instagram", "Indicação", "Google", "Outro"]} />
        </>
      ) : (
        <>
          <Field label="Nome completo" required name="fullName" value={form.fullName} onChange={update} error={errors.includes("fullName")} />
          <div className="tf-two-fields">
            <Field label="Nacionalidade" required name="nationality" value={form.nationality} onChange={update} options={["Brasileiro", "Estrangeiro"]} />
            <Field label="Sexo" name="sex" value={form.sex} onChange={update} options={["Feminino", "Masculino", "Não informar"]} />
          </div>
          <div className="tf-two-fields">
            <Field label="CPF" name="cpf" value={form.cpf} onChange={update} />
            <Field label="RG" name="rg" value={form.rg} onChange={update} />
          </div>
          <Field label="Aniversário" name="birthday" value={form.birthday} onChange={update} placeholder="dd/mm" />
          <Field label="Como nos conheceu?" name="source" value={form.source} onChange={update} options={["Instagram", "Indicação", "Google", "Outro"]} />
          <Field label="Profissão" name="profession" value={form.profession} onChange={update} options={["Autônomo", "Empresário", "Professor", "Outro"]} />
          <Field label="Inscrição municipal" name="municipal" value={form.municipal} onChange={update} />
          <p className="tf-helper">Preencha apenas se a pessoa possuir Inscrição municipal junto à prefeitura. Essa informação serve exclusivamente para emissão de notas fiscais de serviço.</p>
        </>
      )}
    </div>
  )
}

function StepTwo({
  form,
  update,
  errors,
  blocks,
  addBlock,
}: {
  form: typeof emptyTutor
  update: (name: string, value: string) => void
  errors: string[]
  blocks: number
  addBlock: () => void
}) {
  return (
    <div className="tf-form">
      {Array.from({ length: blocks }, (_, index) => (
        <div className="tf-contact-block" key={index}>
          <div className="tf-divider">
            <i />
            <span>Contato {blocks > 1 ? index + 1 : ""}</span>
            <i />
          </div>
          <Field label="Tipo do contato" required name="contactType" value={index ? "Celular" : form.contactType} onChange={update} options={["Celular", "Telefone residencial", "Telefone comercial"]} />
          <Field label="Número do celular" required name="phone" value={index ? "" : form.phone} onChange={update} placeholder="(00) 00000-0000" error={!index && errors.includes("phone")} />
          <span className="tf-question">Este número é WhatsApp?*</span>
          <div className="tf-segmented">
            {["Sim", "Não"].map((option) => (
              <button className={form.whatsapp === option ? "active" : ""} key={option} onClick={() => update("whatsapp", option)}>{option}</button>
            ))}
          </div>
          <Field label="Observações" name="contactNotes" value={index ? "" : form.contactNotes} onChange={update} />
        </div>
      ))}
      <button className="tf-text-link" onClick={addBlock}>Adicionar outro contato</button>
    </div>
  )
}

function StepThree({
  form,
  update,
  errors,
}: {
  form: typeof emptyTutor
  update: (name: string, value: string) => void
  errors: string[]
}) {
  return (
    <div className="tf-form">
      <Field label="CEP" name="cep" value={form.cep} onChange={update} error={errors.includes("cep")} required />
      <p className="tf-helper">Digite o CEP para preencher o endereço automaticamente. Caso necessário consulte diretamente nos <a>Correios</a>.</p>
      <Field label="Endereço" name="address" value={form.address} onChange={update} required error={errors.includes("address")} />
      <div className="tf-two-fields">
        <Field label="Número" name="number" value={form.number} onChange={update} />
        <Field label="Complemento" name="complement" value={form.complement} onChange={update} />
      </div>
      <Field label="Bairro" name="neighborhood" value={form.neighborhood} onChange={update} />
      <Field label="Cidade" name="city" value={form.city} onChange={update} required error={errors.includes("city")} />
      <Field label="Estado" name="state" value={form.state} onChange={update} required options={["AC", "AM", "RO", "SP", "RJ", "MG", "PR", "SC", "RS"]} error={errors.includes("state")} />
      <Field label="Ponto de referência" name="reference" value={form.reference} onChange={update} />
    </div>
  )
}

function StepFour({
  form,
  update,
  privacy,
  setPrivacy,
}: {
  form: typeof emptyTutor
  update: (name: string, value: string) => void
  privacy: boolean[]
  setPrivacy: (value: boolean[]) => void
}) {
  return (
    <div className="tf-form">
      <Field label="Marcações" name="tags" value={form.tags} onChange={update} />
      <p className="tf-helper">Fixe informações como "Bom pagador" ou "Cliente fiel" que serão exibidas nas telas de Clientes, Agenda e PDV. <a>Saiba mais.</a></p>
      <label className="tf-textarea">
        <span>Observações</span>
        <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </label>
      <h3 className="tf-privacy-title">Privacidade</h3>
      {["Aceita receber E-mails?", "Aceita receber SMS?", "Aceita receber Campanha SMS?", "Aceita receber Whatsapp?"].map((label, index) => (
        <ToggleRow
          key={label}
          label={label}
          checked={privacy[index]}
          onClick={() =>
            setPrivacy(
              privacy.map((value, current) =>
                current === index ? !value : value,
              ),
            )
          }
        />
      ))}
      <p className="tf-helper privacy-note">Recomendamos perguntar ao cliente se aceita as comunicações de mensagens automáticas feitas pela empresa.</p>
    </div>
  )
}

function AnimalForm({
  values,
  update,
  errors,
  moreFields,
  setMoreFields,
  add,
}: {
  values: typeof emptyPet
  update: (name: string, value: string) => void
  errors: string[]
  moreFields: boolean
  setMoreFields: (value: boolean) => void
  add: (keepAdding?: boolean) => void
}) {
  return (
    <>
      <div className="tf-drawer-scroll animal-form-screen">
        <div className="tf-form">
          <Field label="Nome do animal" required name="name" value={values.name} onChange={update} error={errors.includes("name")} />
          <div className="tf-two-fields">
            <Field label="Sexo" name="sex" value={values.sex} onChange={update} required options={["Macho", "Fêmea"]} error={errors.includes("sex")} />
            <Field label="Esterilização" name="sterilization" value={values.sterilization} onChange={update} disabled={!values.sex} options={["Sim", "Não", "Não informado"]} />
          </div>
          <Field label="Nascimento" name="birth" value={values.birth} onChange={update} type="date" />
          <div className="tf-two-fields">
            <Field label="Espécie" name="species" value={values.species} onChange={update} required options={["Cão", "Gato", "Bovino", "Equino", "Ave", "Roedor", "Outro"]} error={errors.includes("species")} />
            <Field label="Raça" name="breed" value={values.breed} onChange={update} required options={["Sem raça definida", "Golden Retriever", "Shih-tzu", "Siamês", "Persa", "Outro"]} error={errors.includes("breed")} />
          </div>
          <Field label="Pelagem" name="coat" value={values.coat} onChange={update} options={["Curta", "Média", "Longa", "Caramelo", "Preta", "Branca"]} />
          <Field label="Microchip" name="microchip" value={values.microchip} onChange={update} />
          {moreFields && (
            <>
              <Field label="Peso" name="weight" value={values.weight} onChange={update} placeholder="Ex.: 8,5 kg" />
              <label className="tf-textarea">
                <span>Observações</span>
                <textarea value={values.notes} onChange={(event) => update("notes", event.target.value)} />
              </label>
            </>
          )}
          <button className="tf-more-fields" onClick={() => setMoreFields(!moreFields)}>Mais campos</button>
          <button className="tf-outline-wide" onClick={() => add(true)}>Adicionar este e mais animais</button>
          <button className="tf-next" onClick={() => add(false)}>Adicionar</button>
        </div>
      </div>
    </>
  )
}

function AnimalPanel({
  selection,
  tab,
  setTab,
  close,
  changePet,
}: {
  selection: { pet: Pet; tutor: TutorRow; edit?: boolean }
  tab: string
  setTab: (tab: string) => void
  close: () => void
  changePet: (pet: Pet) => void
}) {
  const { pet, tutor } = selection
  const { data, updateItem } = useVetFlow()
  const [editing, setEditing] = useState(Boolean(selection.edit))
  const [saved, setSaved] = useState("")
  const blank = (value: string) => (/^não informad/i.test(value || "") ? "" : value || "")
  const [form, setForm] = useState({ name: pet.name, species: pet.species, breed: blank(pet.breed), sex: blank(pet.sex), sterilization: blank(pet.sterilization), birth: blank(pet.birth), coat: blank(pet.coat), weight: blank(pet.weight), microchip: blank(pet.microchip), notes: pet.notes === "Sem observações." ? "" : pet.notes, status: pet.status || "Ativo" })
  useEffect(() => {
    setEditing(Boolean(selection.edit))
    setSaved("")
    setForm({ name: pet.name, species: pet.species, breed: blank(pet.breed), sex: blank(pet.sex), sterilization: blank(pet.sterilization), birth: blank(pet.birth), coat: blank(pet.coat), weight: blank(pet.weight), microchip: blank(pet.microchip), notes: pet.notes === "Sem observações." ? "" : pet.notes, status: pet.status || "Ativo" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id])
  const savePet = () => {
    if (!form.name.trim()) return setSaved("Informe o nome do animal.")
    const current = data.animais.find((animal) => animal.id === pet.id)
    if (current) {
      updateItem("animais", pet.id, {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        birthDate: form.birth,
        weight: form.weight,
        notes: form.notes,
        status: form.status,
        subtitle: `${form.species} • ${form.breed || "SRD"}`,
        extra: { ...(current.extra || {}), coat: form.coat, microchip: form.microchip, sterilization: form.sterilization },
      })
    }
    setEditing(false)
    setSaved("Cadastro do animal atualizado.")
  }
  const go = useNavigate()
  const inStore = data.animais.some((animal) => animal.id === pet.id)
  const tutorInStore = data.tutores.some((item) => item.id === tutor.id)
  const br = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—")
  const history = data.consultas.filter((item) => item.animalId === pet.id).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6)
  const vaccines = data.vacinas.filter((item) => item.animalId === pet.id).slice(0, 6)
  const documents = data.documentos.filter((item) => item.animalId === pet.id).slice(0, 6)
  const download = (name: string, date: string) => {
    const content = `VetFlow\n${name}\nPaciente: ${pet.name} (${pet.species} • ${pet.breed})\nTutor: ${tutor.name}\nData: ${date}\n`
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${name.replace(/\.pdf$/i, "").replace(/\s+/g, "-")}-${pet.name}.txt`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="tf-overlay animal-overlay" onMouseDown={close}>
      <aside className="animal-info-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <button onClick={close}><ArrowLeft size={22} /></button>
          <strong>{pet.name}</strong>
          <button onClick={close}><X size={21} /></button>
        </header>
        <div className="animal-panel-scroll">
          <section className="animal-profile">
            <i className="animal-profile-placeholder">
              <PawPrint />
            </i>
            <h2>{pet.name}</h2>
            <p>{pet.species} • {pet.breed}</p>
            <span>{pet.status}</span>
          </section>
          <section className="animal-owner-card">
            <small>Tutor responsável</small>
            <div>
              <i>{initials(tutor.name)}</i>
              <span>
                <strong>{tutor.name}</strong>
                <small><Phone size={12} /> {tutor.phone}</small>
              </span>
              <button onClick={() => { close(); if (tutorInStore) go(`/tutores/${tutor.id}`) }}>Ver tutor</button>
            </div>
          </section>
          {tutor.pets.length > 1 && (
            <section className="other-pets">
              <small>Outros animais de {tutor.name.split(" ")[0]}</small>
              <div>
                {tutor.pets.map((animal) => (
                  <button className={animal.id === pet.id ? "active" : ""} key={animal.id} onClick={() => changePet(animal)}>
                    <span>{animal.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="animal-tabs">
            {["Dados", "Histórico", "Vacinas", "Documentos"].map((name) => (
              <button className={tab === name ? "active" : ""} onClick={() => setTab(name)} key={name}>{name}</button>
            ))}
          </div>
          {tab === "Dados" && editing && (
            <form className="tf-form animal-edit-form" onSubmit={(event) => { event.preventDefault(); savePet() }}>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Nome *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label className="tf-field"><span>Situação</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{["Ativo", "Em tratamento", "Internado", "Inativo", "Falecido"].map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Espécie</span><select value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value })}>{["Cão", "Gato", "Bovino", "Equino", "Ave", "Roedor", "Réptil", "Outro"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="tf-field"><span>Raça</span><input value={form.breed} onChange={(event) => setForm({ ...form, breed: event.target.value })} /></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Sexo</span><select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}><option value="">Selecione</option><option>Macho</option><option>Fêmea</option></select></label>
                <label className="tf-field"><span>Esterilização</span><select value={form.sterilization} onChange={(event) => setForm({ ...form, sterilization: event.target.value })}><option value="">Selecione</option><option>Castrado</option><option>Não castrado</option></select></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Nascimento</span><input type="date" value={/^\d{4}-/.test(form.birth) ? form.birth : ""} onChange={(event) => setForm({ ...form, birth: event.target.value })} /></label>
                <label className="tf-field"><span>Peso (kg)</span><input inputMode="decimal" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Pelagem</span><input value={form.coat} onChange={(event) => setForm({ ...form, coat: event.target.value })} /></label>
                <label className="tf-field"><span>Microchip</span><input value={form.microchip} onChange={(event) => setForm({ ...form, microchip: event.target.value })} /></label>
              </div>
              <label className="tf-textarea"><span>Observações</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            </form>
          )}
          {saved && <p className="animal-edit-msg">{saved}</p>}
          {tab === "Dados" && !editing && (
            <div className="animal-data-grid">
              {[
                ["Sexo", pet.sex],
                ["Esterilização", pet.sterilization],
                ["Nascimento", `${pet.birth} • 4 anos`],
                ["Espécie", pet.species],
                ["Raça", pet.breed],
                ["Pelagem", pet.coat],
                ["Peso", pet.weight],
                ["Microchip", pet.microchip],
              ].map(([label, value]) => (
                <div key={label}><small>{label}</small><strong>{value}</strong></div>
              ))}
              <div className="wide"><small>Observações</small><p>{pet.notes}</p></div>
            </div>
          )}
          {tab === "Histórico" && (
            <div className="animal-timeline">
              {(history.length ? history.map((item) => [br(item.date), item.name, item.professional || ""]) : [
                ["07/05/2025", "Consulta clínica", "Dra. Ana Martins"],
                ["18/03/2025", "Hemograma completo", "Dr. Rafael Souza"],
                ["22/01/2025", "Retorno e avaliação", "Dra. Ana Martins"],
              ]).map(([date, title, doctor]) => (
                <div key={date + title}><i /><span><small>{date}</small><strong>{title}</strong><p>{doctor}</p></span></div>
              ))}
            </div>
          )}
          {tab === "Vacinas" && (
            <div className="animal-list-tab">
              {(vaccines.length ? vaccines.map((item) => [item.name, br(item.date), br(item.dueDate), item.status === "Atrasada" ? "Atrasada" : "Em dia"]) : [
                ["V10", "10/02/2025", "10/02/2026", "Em dia"],
                ["Antirrábica", "18/03/2024", "18/03/2025", "Atrasada"],
              ]).map(([name, applied, next, status]) => (
                <div key={name}><Syringe /><span><strong>{name}</strong><small>Aplicação: {applied} • Próxima: {next}</small></span><b className={status === "Em dia" ? "ok" : "late"}>{status}</b></div>
              ))}
            </div>
          )}
          {tab === "Documentos" && (
            <div className="animal-list-tab">
              {(documents.length ? documents.map((item) => [`${item.name}.pdf`, br(item.date)]) : [
                ["Resultado-hemograma.pdf", "18/03/2025"],
                ["Carteira-vacinacao.pdf", "10/02/2025"],
              ]).map(([name, date], index) => (
                <div key={name + index}><FileText /><span><strong>{name}</strong><small>{date}</small></span><button aria-label={`Baixar ${name}`} title="Baixar" onClick={() => download(name, date)}><ArrowDownToLine size={17} /></button></div>
              ))}
            </div>
          )}
        </div>
        <footer>{editing ? <><button onClick={() => setEditing(false)}>Cancelar</button><button className="animal-save" onClick={savePet}>Salvar alterações</button></> : <><button onClick={() => { setTab("Dados"); setEditing(true) }}>Editar animal</button><button onClick={() => { close(); go(inStore ? `/consultas?novo=1&animal=${pet.id}` : "/consultas?novo=1") }}>Nova consulta</button></>}</footer>
      </aside>
    </div>
  )
}
