import RowActions, { RowButton, RowMenu } from "./vfx/RowActions"
import { clinicMetrics } from "./metrics"
import { CadastroDrawer, CadSec, Campo, cadInput } from "./vfx/CadastroDrawer"
import { localISO } from "./date"
import {
  ArrowLeft,
  CalendarDays,
  Cat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleEllipsis,
  Dog,
  Eye,
  Filter,
  HeartPulse,
  Mars,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Syringe,
  Venus,
  X,
} from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useNavigate } from "react-router"
import { useVetFlow, type Item } from "./store"

type AnimalRow = {
  id: string
  name: string
  code: string
  species: string
  breed: string
  owner: string
  phone: string
  status: "Ativo" | "Em tratamento" | "Inativo"
  microchip: string
  lastVisit: string
  doctor: string
  facts?: string
}

function ageOf(birth?: string) {
  if (!birth) return ""
  const b = new Date(`${birth}T12:00:00`)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth()
  if (now.getDate() < b.getDate()) months--
  if (months < 0) return ""
  return months < 12 ? `${months} ${months === 1 ? "mês" : "meses"}` : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "ano" : "anos"}`
}

type TutorOption = {
  id: string
  name: string
  cpf: string
  rg: string
  phone: string
}

const breedOptions = {
  Canino: [
    "Golden Retriever", "Pastor Alemão", "Shih Tzu", "Labrador", "Poodle",
    "Beagle", "Border Collie", "Bulldog Francês", "Dachshund", "Spitz Alemão",
    "Rottweiler", "Sem raça definida",
  ],
  Felino: [
    "Maine Coon", "Siamês", "Persa", "Angorá", "Ragdoll", "Bengal",
    "British Shorthair", "Sphynx", "Sem raça definida",
  ],
}

const exampleTutors: TutorOption[] = [
  {
    id: "tutor-filipe",
    name: "Filipe",
    cpf: "066.370.062-03",
    rg: "6121956512",
    phone: "(69) 99214-2038",
  },
  {
    id: "tutor-carlos",
    name: "Carlos Eduardo",
    cpf: "824.991.070-28",
    rg: "3697482",
    phone: "(69) 99247-8831",
  },
  {
    id: "tutor-beatriz",
    name: "Beatriz Lima",
    cpf: "092.813.649-44",
    rg: "6103942",
    phone: "(69) 98404-1120",
  },
  {
    id: "tutor-bruno",
    name: "Bruno Ribeiro",
    cpf: "517.337.020-05",
    rg: "9048271",
    phone: "(69) 98410-7558",
  },
  {
    id: "tutor-juliana",
    name: "Juliana Martins",
    cpf: "163.870.920-10",
    rg: "7281450",
    phone: "(69) 98177-6109",
  },
  {
    id: "tutor-fernanda",
    name: "Fernanda Souza",
    cpf: "714.204.130-77",
    rg: "5019364",
    phone: "(69) 99381-3404",
  },
]

const speciesBreeds: Record<string, string[]> = {
  Canino: [
    "Golden Retriever",
    "Pastor Alemão",
    "Shih Tzu",
    "Labrador",
    "Poodle",
    "Sem raça definida",
  ],
  Felino: ["Maine Coon", "Siamês", "Persa", "Angorá", "Sem raça definida"],
  Bovino: ["Nelore", "Angus", "Holandesa", "Gir Leiteiro", "Girolando", "Jersey", "Brahman", "Senepol"],
  Equino: ["Quarto de Milha", "Mangalarga Marchador", "Crioulo", "Puro-Sangue Árabe", "Campolina", "Paint Horse"],
  Ave: ["Calopsita", "Canário", "Papagaio"],
  Roedor: ["Hamster", "Porquinho-da-índia"],
  Outro: ["Não informado"],
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>
  const position = normalize(text).indexOf(normalize(term))
  if (position < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, position)}
      <mark>{text.slice(position, position + term.length)}</mark>
      {text.slice(position + term.length)}
    </>
  )
}

export default function AnimalsModule() {
  const { addItem, data, theme, updateItem, deleteItem } = useVetFlow()
  const navigate = useNavigate()
  const lastVisits = useMemo(() => {
    const map = new Map<string, Item>()
    for (const consult of data.consultas) {
      if (!consult.animalId) continue
      const current = map.get(consult.animalId)
      if (!current || (consult.date || "") > (current.date || "")) map.set(consult.animalId, consult)
    }
    return map
  }, [data.consultas])
  const rows = useMemo<AnimalRow[]>(() => {
    const phones = new Map(data.tutores.map((tutor) => [tutor.id, tutor.phone || ""]))
    return data.animais.map((animal, index) => {
      const visit = lastVisits.get(animal.id)
      const number = Number(animal.id.split("-").pop()) || index + 1
      const species = /gat|felin/i.test(animal.species || "") ? "Felino" : /c[aã]o|canin/i.test(animal.species || "") ? "Canino" : animal.species || "Outro"
      return {
        id: animal.id,
        name: animal.name,
        code: animal.extra?.code || `#ANM-${String(number).padStart(4, "0")}`,
        species,
        breed: animal.breed || "Sem raça definida",
        owner: animal.owner || "Sem tutor",
        phone: phones.get(animal.ownerId || "") || animal.phone || "",
        status: (["Ativo", "Em tratamento", "Inativo"].includes(animal.status) ? animal.status : animal.status === "Internado" ? "Em tratamento" : "Inativo") as AnimalRow["status"],
        microchip: animal.extra?.microchip || "",
        lastVisit: visit?.date ? visit.date.split("-").reverse().join("/") : "—",
        doctor: visit?.professional || "",
        facts: [animal.sex, animal.birthDate && `${animal.birthDate.split("-").reverse().join("/")} (${ageOf(animal.birthDate)})`, animal.weight].filter(Boolean).join(" · "),
      }
    })
  }, [data.animais, data.tutores, lastVisits])
  const [menuId, setMenuId] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<AnimalRow | null>(null)
  const [editingAnimal, setEditingAnimal] = useState<Item | null>(null)
  const [perPage, setPerPage] = useState(6)
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get("animal") || "",
  )
  const [status, setStatus] = useState("Todos os status")
  const [species, setSpecies] = useState("Todos os tipos")
  const [sort, setSort] = useState("Mais recentes")
  const [drawerOpen, setDrawerOpen] = useState(() => new URLSearchParams(window.location.search).get("novo") === "1")
  const [toast, setToast] = useState("")
  const [page, setPage] = useState(1)

  const tutors = useMemo(() => {
    const existing = data.tutores.map((tutor, index) => ({
      id: tutor.id,
      name: tutor.name,
      cpf: tutor.cpf || `000.000.00${index}-00`,
      rg: tutor.rg || `000000${index}`,
      phone: tutor.phone || "Não informado",
    }))
    return existing
  }, [data.tutores])

  const filtered = useMemo(() => {
    const result = rows.filter((animal) => {
      const haystack = normalize(
        `${animal.name} ${animal.owner} ${animal.microchip}`,
      )
      return (
        haystack.includes(normalize(query)) &&
        (status === "Todos os status" || animal.status === status) &&
        (species === "Todos os tipos" || animal.species === species)
      )
    })
    if (sort === "Nome A–Z")
      return [...result].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "Mais antigos") return [...result].reverse()
    return result
  }, [query, rows, sort, species, status])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visibleRows = filtered.slice((page - 1) * perPage, page * perPage)
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
  const total = rows.length
  useEffect(() => {
    setPage(1)
  }, [query, sort, species, status, perPage])
  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId("")
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [menuId])
  useEffect(() => {
    setPage((current) => Math.min(current, pages))
  }, [pages])
  const metrics = clinicMetrics(data)
  const pct = (n: number) => (data.animais.length ? `${((n / data.animais.length) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total` : "—")
  const newThisMonth = data.animais.filter((a) => (a.date || "").slice(0, 7) === localISO().slice(0, 7)).length
  const indicators = [
    {
      label: "Total de animais",
      value: data.animais.length,
      detail: `${newThisMonth} cadastrados este mês`,
      icon: <PawPrint />,
      tone: "orange",
    },
    {
      label: "Pacientes ativos",
      value: metrics.patients,
      detail: pct(metrics.patients),
      icon: <ShieldCheck />,
      tone: "aqua",
    },
    {
      label: "Em tratamento",
      value: metrics.inTreatment,
      detail: pct(metrics.inTreatment),
      icon: <HeartPulse />,
      tone: "orange",
    },
    {
      label: "Vacinas em atraso",
      value: metrics.lateVaccines,
      detail: metrics.lateVaccines ? "precisam de atenção" : "tudo em dia",
      icon: <Syringe />,
      tone: "red",
    },
  ]

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 3400)
  }
  const closeAnimalDrawer = () => {
    setDrawerOpen(false)
    setEditingAnimal(null)
  }
  const handleSaved = (animal: AnimalRow, ownerId: string, more: Partial<Item> = {}) => {
    const patch: Partial<Item> = {
      ...more,
      name: animal.name,
      subtitle: `${animal.species === "Felino" ? "Gato" : animal.species === "Canino" ? "Cão" : animal.species} • ${animal.breed}`,
      status: animal.status,
      owner: animal.owner,
      ownerId,
      species: animal.species === "Felino" ? "Gato" : animal.species === "Canino" ? "Cão" : animal.species,
      breed: animal.breed,
      extra: {
        ...(editingAnimal?.extra || {}),
        ...(more.extra || {}),
        code: animal.code,
        microchip: animal.microchip,
      },
    }
    if (editingAnimal) {
      updateItem("animais", editingAnimal.id, patch)
      flash(`${animal.name} atualizado com sucesso.`)
    } else {
      addItem("animais", { ...patch, id: animal.id })
      flash(`Animal cadastrado e vinculado a ${animal.owner}.`)
    }
    closeAnimalDrawer()
  }

  return (
    <div className="animals-page">
      <section className="animals-hero">
        <picture>
          <source
            media="(prefers-color-scheme: dark)"
            srcSet={
              theme === "dark"
                ? "/assets/animals-banner-dark.png"
                : "/assets/animals-banner-light.png"
            }
          />
          <img
            src={
              theme === "dark"
                ? "/assets/animals-banner-dark.png"
                : "/assets/animals-banner-light.png"
            }
            alt="Vetflow Animais — conectando dados, cuidados e vida"
          />
        </picture>
        <div className="animals-glass-metrics">
          {indicators.map((item) => (
            <article key={item.label}>
              <i className={item.tone}>{item.icon}</i>
              <span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <em>{item.detail}</em>
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="animals-table-card">
        <div className="animals-toolbar">
          <label className="animals-search">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, tutor ou microchip..."
            />
          </label>
          <label className="animals-select">
            <Filter />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Todos os status</option>
              <option>Ativo</option>
              <option>Em tratamento</option>
              <option>Inativo</option>
            </select>
            <ChevronDown />
          </label>
          <label className="animals-select">
            <PawPrint />
            <select value={species} onChange={(event) => setSpecies(event.target.value)}>
              <option>Todos os tipos</option>
              <option>Canino</option>
              <option>Felino</option>
              <option>Bovino</option>
              <option>Equino</option>
            </select>
            <ChevronDown />
          </label>
          <label className="animals-select sort-select">
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option>Mais recentes</option>
              <option>Mais antigos</option>
              <option>Nome A–Z</option>
            </select>
            <ChevronDown />
          </label>
          <button className="new-animal-button" onClick={() => { setEditingAnimal(null); setDrawerOpen(true) }}>
            <Plus /> Novo registro
          </button>
        </div>
        <div className="animals-table-scroll">
          <div className="animals-table">
            <div className="animals-table-head">
              <strong>Animal</strong>
              <strong>Tutor</strong>
              <strong>Espécie / Raça</strong>
              <strong>Status</strong>
              <strong>Última consulta</strong>
              <strong>Ações</strong>
            </div>
            {visibleRows.length ? (
              visibleRows.map((animal) => (
                <div className="animals-table-row" key={animal.id}>
                  <div className="animal-identity">
                    <i className="animal-placeholder">
                      <PawPrint />
                    </i>
                    <span>
                      <strong>{animal.name}</strong>
                      <small>{animal.code}</small>
                      {animal.microchip && (
                        <em>
                          Microchip <b>{animal.microchip}</b>
                        </em>
                      )}
                    </span>
                  </div>
                  <div className="animal-owner" data-label="Tutor">
                    <strong>{animal.owner}</strong>
                    <small>{animal.phone}</small>
                  </div>
                  <div className="animal-species" data-label="Espécie / raça">
                    <i>
                      {animal.species === "Felino" ? <Cat /> : animal.species === "Bovino" || animal.species === "Equino" ? <PawPrint /> : <Dog />}
                    </i>
                    <span>
                      <strong>{animal.species}</strong>
                      <small>{animal.breed}</small>
                      {animal.facts && <small className="animal-facts">{animal.facts}</small>}
                    </span>
                  </div>
                  <span
                    className={`animal-status status-${normalize(animal.status).replaceAll(" ", "-")}`}
                    data-label="Status"
                  >
                    <i />
                    {animal.status}
                  </span>
                  <div className="animal-last-visit" data-label="Última consulta">
                    <strong>{animal.lastVisit}</strong>
                    <small>{animal.doctor}</small>
                  </div>
                  <div className="animal-actions" data-label="Ações">
                    <RowActions
                      name={animal.name}
                      onView={() => navigate(`/animais/${animal.id}`)}
                      onEdit={() => {
                        const item = data.animais.find((candidate) => candidate.id === animal.id)
                        if (item) {
                          setEditingAnimal(item)
                          setDrawerOpen(true)
                        }
                      }}
                      onDelete={() => setConfirmDelete(animal)}
                    >
                    <RowButton title="Agendar" onClick={() => navigate(`/agendas?locate=1&pet=${encodeURIComponent(animal.name)}&client=${encodeURIComponent(animal.owner)}`)}>
                      <CalendarDays />
                    </RowButton>
                    <RowMenu
                      items={[
                        ["Abrir ficha completa", () => navigate(`/animais/${animal.id}`)],
                        ["Nova consulta", () => navigate(`/consultas?novo=1&animal=${animal.id}`)],
                        ["Aplicar vacina", () => navigate(`/vacinas?novo=1&animal=${animal.id}`)],
                        ["Solicitar exame", () => navigate(`/exames?novo=1&animal=${animal.id}`)],
                        ["Nova receita", () => navigate(`/prescricoes?novo=1&animal=${animal.id}`)],
                        ["Internar", () => navigate(`/internacoes?novo=1&animal=${animal.id}`)],
                        ["Ver tutor", () => navigate(`/tutores?tutor=${encodeURIComponent(animal.owner)}`)],
                        [animal.status === "Inativo" ? "Reativar" : "Inativar", () => { updateItem("animais", animal.id, { status: animal.status === "Inativo" ? "Ativo" : "Inativo" }); flash(animal.status === "Inativo" ? `${animal.name} reativado.` : `${animal.name} inativado.`) }],
                        ["Excluir", () => setConfirmDelete(animal), true],
                      ]}
                    />
                    </RowActions>
                  </div>
                </div>
              ))
            ) : (
              <div className="animals-empty">
                <Search />
                <strong>Nenhum animal encontrado</strong>
                <span>Ajuste a busca ou os filtros para ver outros resultados.</span>
              </div>
            )}
          </div>
        </div>
        <footer className="animals-table-footer">
          <span>
            Mostrando {visibleRows.length ? (page - 1) * perPage + 1 : 0} a{" "}
            {Math.min(page * perPage, filtered.length)} de {filtered.length} animais
          </span>
          <div className="animals-pagination">
            <button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}>
              <ChevronLeft />
            </button>
            {pageItems.map((value, index) =>
              value === "…" ? (
                <span key={`ellipsis-${index}`}>…</span>
              ) : (
                <button
                  className={page === value ? "active" : ""}
                  onClick={() => setPage(value)}
                  key={value}
                >
                  {value}
                </button>
              ),
            )}
            <button disabled={page === pages} onClick={() => setPage(Math.min(pages, page + 1))}>
              <ChevronRight />
            </button>
          </div>
          <label>
            <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))} aria-label="Itens por página">
              <option value="6">6 por página</option>
              <option value="12">12 por página</option>
              <option value="24">24 por página</option>
            </select>
            <ChevronDown />
          </label>
        </footer>
      </section>

      {drawerOpen && (
        <AnimalDrawer
          key={editingAnimal?.id || "new-animal"}
          tutors={tutors}
          close={closeAnimalDrawer}
          save={handleSaved}
          nextCode={rows.length + 1}
          presetTutor={new URLSearchParams(window.location.search).get("tutor") || ""}
          item={editingAnimal || undefined}
        />
      )}
      {confirmDelete && (
        <div className="vx-modal-layer" onMouseDown={() => setConfirmDelete(null)}>
          <div className="vx-modal" role="alertdialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            {(() => {
              const history = (["consultas", "prontuarios", "vacinas", "exames", "prescricoes", "internacoes", "cirurgias", "agendas"] as const).reduce((n, slug) => n + data[slug].filter((r) => r.animalId === confirmDelete.id).length, 0)
              return history > 0 ? (
                <>
                  <h3 style={{ margin: 0, fontSize: 20 }}>{confirmDelete.name} tem histórico</h3>
                  <p style={{ margin: "8px 0 18px", color: "var(--vx-muted)", fontSize: 14 }}>Há {history} registro(s) clínicos ligados a este animal. Para não perder o prontuário, ele não pode ser excluído. Você pode inativá-lo.</p>
                  <div className="vx-row" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <button className="vx-btn vx-btn-g" onClick={() => setConfirmDelete(null)}>Voltar</button>
                    <button className="vx-btn vx-btn-p" onClick={() => { updateItem("animais", confirmDelete.id, { status: "Inativo" }); flash(`${confirmDelete.name} inativado.`); setConfirmDelete(null) }}>Inativar</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ margin: 0, fontSize: 20 }}>Excluir {confirmDelete.name}?</h3>
                  <p style={{ margin: "8px 0 18px", color: "var(--vx-muted)", fontSize: 14 }}>Este animal não tem histórico. O cadastro sai da unidade ativa e não poderá ser recuperado.</p>
                  <div className="vx-row" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <button className="vx-btn vx-btn-g" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                    <button className="vx-btn vx-btn-d" onClick={() => { deleteItem("animais", confirmDelete.id); flash(`${confirmDelete.name} excluído.`); setConfirmDelete(null) }}>Excluir</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
      {toast && (
        <div className="animals-toast" role="status">
          <ShieldCheck />
          {toast}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`animal-form-field ${className}`}>
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {children}
    </label>
  )
}

function AnimalDrawer({
  tutors,
  close,
  save,
  nextCode,
  presetTutor = "",
  item,
}: {
  tutors: TutorOption[]
  close: () => void
  save: (animal: AnimalRow, ownerId: string, more?: Partial<Item>) => void
  nextCode: number
  presetTutor?: string
  item?: Item
}) {
  const [tutorQuery, setTutorQuery] = useState("")
  const [selectedTutor, setSelectedTutor] = useState<TutorOption | null>(
    () =>
      tutors.find((t) => t.id === (item?.ownerId || presetTutor)) ||
      tutors.find((t) => t.name === item?.owner) ||
      null,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sex, setSex] = useState(item?.sex || "")
  const [species, setSpecies] = useState(() =>
    /gat|felin/i.test(item?.species || "")
      ? "Felino"
      : /c[aã]o|canin/i.test(item?.species || "")
        ? "Canino"
        : item?.species || "",
  )
  const digitCount = tutorQuery.replace(/\D/g, "").length
  const letterCount = tutorQuery.replace(/[^A-Za-zÀ-ÿ]/g, "").length
  const qualifies = digitCount >= 3 || letterCount >= 2
  const tutorResults = useMemo(() => {
    if (!qualifies) return []
    const term = normalize(tutorQuery)
    const digits = tutorQuery.replace(/\D/g, "")
    return tutors
      .filter((tutor) => normalize(tutor.name).includes(term) || (digits && tutor.cpf.replace(/\D/g, "").includes(digits)) || (digits && tutor.rg.replace(/\D/g, "").includes(digits)))
      .slice(0, 6)
  }, [qualifies, tutorQuery, tutors])

  const submit = (form: HTMLFormElement) => {
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>
    const next: Record<string, string> = {}
    if (!selectedTutor) next.tutor = "Escolha o tutor responsável. Pesquise pelo nome, CPF ou RG."
    if (!values.name?.trim()) next.name = "Informe o nome do animal."
    if (!values.species) next.species = "Escolha a espécie."
    if (!values.breed) next.breed = "Escolha a raça. Se não souber, use “Sem raça definida”."
    if (values.birthDate && values.birthDate > localISO()) next.birthDate = "A data de nascimento não pode ser no futuro."
    let weight = ""
    if (values.weight) {
      const kg = Number(values.weight.replace(",", "."))
      if (!Number.isFinite(kg) || kg <= 0 || kg > 150) next.weight = "Use só números, em quilos. Exemplo: 12,5"
      else weight = `${kg.toLocaleString("pt-BR")} kg`
    }
    setErrors(next)
    if (Object.keys(next).length || !selectedTutor) return
    save(
      {
        id: item?.id || `created-${Date.now()}`,
        name: values.name.trim(),
        code: item?.extra?.code || `#ANM-${String(nextCode).padStart(4, "0")}`,
        species: values.species,
        breed: values.breed,
        owner: selectedTutor.name,
        phone: selectedTutor.phone,
        status: (item?.status === "Em tratamento" || item?.status === "Inativo"
          ? item.status
          : "Ativo") as AnimalRow["status"],
        microchip: values.microchip || "",
        lastVisit: item ? "" : "Ainda não consultou",
        doctor: item ? "" : "—",
      },
      selectedTutor.id,
      {
        sex: values.sex || "",
        birthDate: values.birthDate || "",
        weight,
        date: item?.date || localISO(),
        extra: {
          castrado: values.sterilization || "",
          pelagem: values.coat || "",
          pedigree: values.pedigree || "",
          pedigreeNumero: values.pedigreeNumber || "",
        },
      },
    )
  }
  const firstError = Object.values(errors)[0]

  return (
    <CadastroDrawer
      title={item ? `Editar ${item.name}` : "Novo animal"}
      sub={item ? "Atualize os dados do paciente e o vínculo com o tutor." : "Cadastre o paciente e vincule ao tutor. Campos com * são obrigatórios."}
      onClose={close}
      onSubmit={submit}
      submitLabel={item ? "Salvar alterações" : "Cadastrar animal"}
      error={firstError ? "Revise os campos destacados em vermelho." : undefined}
    >
      <>
        <CadSec n={1} title="Tutor responsável" desc="Quem cuida do animal">
          <div className="vx-c6" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedTutor ? (
              <div className="vx-row" style={{ gap: 10, padding: 12, borderRadius: 12, background: "var(--vx-soft)", justifyContent: "space-between" }}>
                <span>
                  <b>{selectedTutor.name}</b>
                  <span className="vx-hint" style={{ display: "block" }}>CPF {selectedTutor.cpf} · RG {selectedTutor.rg}</span>
                </span>
                <button type="button" className="vx-btn vx-btn-g vx-btn-sm" onClick={() => { setSelectedTutor(null); setTutorQuery("") }}>Trocar</button>
              </div>
            ) : (
              <>
                <Campo label="Buscar tutor" req span={6} error={errors.tutor} hint="Digite pelo menos 3 números do CPF/RG ou 2 letras do nome.">
                  <input className={cadInput(errors.tutor)} value={tutorQuery} placeholder="Nome, CPF ou RG" onChange={(e) => { setTutorQuery(e.target.value); setErrors((c) => ({ ...c, tutor: "" })) }} />
                </Campo>
                {qualifies && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tutorResults.length ? (
                      tutorResults.map((tutor) => (
                        <button key={tutor.id} type="button" className="vx-chip" style={{ justifyContent: "flex-start", minHeight: 44, padding: "0 12px" }} onClick={() => { setSelectedTutor(tutor); setTutorQuery("") }}>
                          <b>{tutor.name}</b> <span className="vx-hint">· CPF {tutor.cpf}</span>
                        </button>
                      ))
                    ) : (
                      <p className="vx-hint" style={{ margin: 0 }}>Nenhum tutor encontrado. Cadastre o tutor primeiro, na tela Tutores.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CadSec>

        <CadSec n={2} title="Dados do animal">
          <Campo label="Nome do animal" req span={3} error={errors.name}>
            <input className={cadInput(errors.name)} name="name" defaultValue={item?.name || ""} placeholder="Ex.: Thor" />
          </Campo>
          <Campo label="Espécie" req span={3} error={errors.species}>
            <select className={cadInput(errors.species)} name="species" value={species} onChange={(e) => { setSpecies(e.target.value); setErrors((c) => ({ ...c, species: "", breed: "" })) }}>
              <option value="">Escolha</option>
              {Object.keys(speciesBreeds).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Raça" req span={3} error={errors.breed}>
            <select className={cadInput(errors.breed)} name="breed" defaultValue={item?.breed || ""} disabled={!species}>
              <option value="">{species ? "Escolha" : "Escolha a espécie primeiro"}</option>
              {item?.breed && !(speciesBreeds[species] || []).includes(item.breed) && (
                <option value={item.breed}>{item.breed}</option>
              )}
              {(speciesBreeds[species] || []).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Sexo" span={3}>
            <select className="vx-in" name="sex" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Não sei / não informado</option>
              <option>Macho</option>
              <option>Fêmea</option>
            </select>
          </Campo>
          <Campo label="Castrado?" span={3} hint={sex ? undefined : "Escolha o sexo para liberar."}>
            <select className="vx-in" name="sterilization" defaultValue={item?.extra?.castrado || ""} disabled={!sex}>
              <option value="">Não informado</option>
              <option>Castrado</option>
              <option>Não castrado</option>
            </select>
          </Campo>
          <Campo label="Data de nascimento" span={3} error={errors.birthDate} hint="Se não souber, deixe em branco.">
            <input className={cadInput(errors.birthDate)} name="birthDate" type="date" max={localISO()} defaultValue={item?.birthDate || ""} />
          </Campo>
          <Campo label="Peso (kg)" span={3} error={errors.weight} hint="Exemplo: 12,5">
            <input className={cadInput(errors.weight)} name="weight" inputMode="decimal" defaultValue={(item?.weight || "").replace(/[^\d,.]/g, "")} placeholder="0,0" />
          </Campo>
        </CadSec>

        <CadSec n={3} title="Identificação" desc="Opcional">
          <Campo label="Pelagem" span={3}>
            <input className="vx-in" name="coat" defaultValue={item?.extra?.pelagem || ""} placeholder="Cor e marcas" />
          </Campo>
          <Campo label="Número do microchip" span={3}>
            <input className="vx-in" name="microchip" defaultValue={item?.extra?.microchip || item?.microchip || ""} placeholder="Só se o animal tiver" />
          </Campo>
          <Campo label="Pedigree" span={3}>
            <select className="vx-in" name="pedigree" defaultValue={item?.extra?.pedigree || "Não possui"}>
              <option>Não possui</option>
              <option>Possui</option>
            </select>
          </Campo>
          <Campo label="Número do pedigree" span={3}>
            <input className="vx-in" name="pedigreeNumber" defaultValue={item?.extra?.pedigreeNumero || ""} placeholder="Registro" />
          </Campo>
        </CadSec>
      </>
    </CadastroDrawer>
  )
}
