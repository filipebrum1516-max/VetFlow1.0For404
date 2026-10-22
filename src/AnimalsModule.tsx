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
      }
    })
  }, [data.animais, data.tutores, lastVisits])
  const [menuId, setMenuId] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<AnimalRow | null>(null)
  const [perPage, setPerPage] = useState(6)
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get("animal") || "",
  )
  const [status, setStatus] = useState("Todos os status")
  const [species, setSpecies] = useState("Todos os tipos")
  const [sort, setSort] = useState("Mais recentes")
  const [drawerOpen, setDrawerOpen] = useState(false)
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
  const indicators = [
    {
      label: "Total de animais",
      value: total,
      detail: "+14 este mês",
      icon: <PawPrint />,
      tone: "orange",
    },
    {
      label: "Ativos",
      value: rows.filter((item) => item.status === "Ativo").length,
      detail: "86,3% do total",
      icon: <ShieldCheck />,
      tone: "aqua",
    },
    {
      label: "Em tratamento",
      value: rows.filter((item) => item.status === "Em tratamento").length,
      detail: "8,6% do total",
      icon: <HeartPulse />,
      tone: "orange",
    },
    {
      label: "Vacinas em atraso",
      value: rows.filter((item) => item.status === "Inativo").length,
      detail: "5,1% precisam de atenção",
      icon: <Syringe />,
      tone: "red",
    },
  ]

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 3400)
  }
  const handleSaved = (animal: AnimalRow, ownerId: string) => {
    addItem("animais", {
      id: animal.id,
      name: animal.name,
      subtitle: `${animal.species === "Felino" ? "Gato" : animal.species === "Canino" ? "Cão" : animal.species} • ${animal.breed}`,
      status: animal.status,
      owner: animal.owner,
      ownerId,
      species: animal.species === "Felino" ? "Gato" : animal.species === "Canino" ? "Cão" : animal.species,
      breed: animal.breed,
      extra: { code: animal.code, microchip: animal.microchip },
    })
    setDrawerOpen(false)
    flash(`Animal cadastrado e vinculado a ${animal.owner}.`)
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
          <button className="new-animal-button" onClick={() => setDrawerOpen(true)}>
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
                  <div className="animal-owner">
                    <strong>{animal.owner}</strong>
                    <small>{animal.phone}</small>
                  </div>
                  <div className="animal-species">
                    <i>
                      {animal.species === "Felino" ? <Cat /> : animal.species === "Bovino" || animal.species === "Equino" ? <PawPrint /> : <Dog />}
                    </i>
                    <span>
                      <strong>{animal.species}</strong>
                      <small>{animal.breed}</small>
                    </span>
                  </div>
                  <span
                    className={`animal-status status-${normalize(animal.status).replaceAll(" ", "-")}`}
                  >
                    <i />
                    {animal.status}
                  </span>
                  <div className="animal-last-visit">
                    <strong>{animal.lastVisit}</strong>
                    <small>{animal.doctor}</small>
                  </div>
                  <div className="animal-actions">
                    <button title="Visualizar ficha" aria-label={`Ver ficha de ${animal.name}`} onClick={() => navigate(`/animais/${animal.id}`)}>
                      <Eye />
                    </button>
                    <button title="Agendar" aria-label={`Agendar para ${animal.name}`} onClick={() => navigate(`/agendas?locate=1&pet=${encodeURIComponent(animal.name)}&client=${encodeURIComponent(animal.owner)}`)}>
                      <CalendarDays />
                    </button>
                    <span style={{ position: "relative", display: "inline-flex" }}>
                      <button title="Mais opções" aria-label="Mais opções" aria-expanded={menuId === animal.id} onClick={(event) => { event.stopPropagation(); setMenuId(menuId === animal.id ? "" : animal.id) }}>
                        <CircleEllipsis />
                      </button>
                      {menuId === animal.id && (
                        <span className="vx-rowmenu" role="menu" onClick={(event) => event.stopPropagation()}>
                          <button role="menuitem" onClick={() => navigate(`/animais/${animal.id}`)}>Abrir ficha completa</button>
                          <button role="menuitem" onClick={() => navigate(`/consultas?novo=1&animal=${animal.id}`)}>Nova consulta</button>
                          <button role="menuitem" onClick={() => navigate(`/vacinas?novo=1&animal=${animal.id}`)}>Aplicar vacina</button>
                          <button role="menuitem" onClick={() => navigate(`/exames?novo=1&animal=${animal.id}`)}>Solicitar exame</button>
                          <button role="menuitem" onClick={() => navigate(`/prescricoes?novo=1&animal=${animal.id}`)}>Nova receita</button>
                          <button role="menuitem" onClick={() => navigate(`/internacoes?novo=1&animal=${animal.id}`)}>Internar</button>
                          <button role="menuitem" onClick={() => navigate(`/tutores?tutor=${encodeURIComponent(animal.owner)}`)}>Ver tutor</button>
                          <button role="menuitem" onClick={() => { updateItem("animais", animal.id, { status: animal.status === "Inativo" ? "Ativo" : "Inativo" }); setMenuId(""); flash(animal.status === "Inativo" ? `${animal.name} reativado.` : `${animal.name} inativado.`) }}>{animal.status === "Inativo" ? "Reativar" : "Inativar"}</button>
                          <button role="menuitem" className="danger" onClick={() => { setConfirmDelete(animal); setMenuId("") }}>Excluir</button>
                        </span>
                      )}
                    </span>
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
          tutors={tutors}
          close={() => setDrawerOpen(false)}
          save={handleSaved}
          nextCode={rows.length + 1}
        />
      )}
      {confirmDelete && (
        <div className="vx-modal-layer" onMouseDown={() => setConfirmDelete(null)}>
          <div className="vx-modal" role="alertdialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Excluir {confirmDelete.name}?</h3>
            <p style={{ margin: "8px 0 18px", color: "var(--vx-muted)", fontSize: 14 }}>O cadastro sai da unidade ativa e não poderá ser recuperado.</p>
            <div className="vx-row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="vx-btn vx-btn-g" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="vx-btn vx-btn-d" onClick={() => { deleteItem("animais", confirmDelete.id); flash(`${confirmDelete.name} excluído.`); setConfirmDelete(null) }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="animals-toast">
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
}: {
  tutors: TutorOption[]
  close: () => void
  save: (animal: AnimalRow, ownerId: string) => void
  nextCode: number
}) {
  const [tutorQuery, setTutorQuery] = useState("")
  const [selectedTutor, setSelectedTutor] = useState<TutorOption | null>(null)
  const [tutorError, setTutorError] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [sex, setSex] = useState("")
  const [species, setSpecies] = useState("")
  const [more, setMore] = useState(false)
  const digitCount = tutorQuery.replace(/\D/g, "").length
  const letterCount = tutorQuery.replace(/[^A-Za-zÀ-ÿ]/g, "").length
  const qualifies = digitCount >= 3 || letterCount >= 2
  const tutorResults = useMemo(() => {
    if (!qualifies) return []
    const term = normalize(tutorQuery)
    const digits = tutorQuery.replace(/\D/g, "")
    return tutors
      .filter(
        (tutor) =>
          normalize(tutor.name).includes(term) ||
          (digits && tutor.cpf.replace(/\D/g, "").includes(digits)) ||
          (digits && tutor.rg.replace(/\D/g, "").includes(digits)),
      )
      .slice(0, 6)
  }, [qualifies, tutorQuery, tutors])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<
      string,
      string
    >
    const missingTutor = !selectedTutor
    const missingName = !values.name?.trim()
    setTutorError(missingTutor)
    setNameError(missingName)
    if (missingTutor || missingName || !values.species || !values.breed) return
    const id = `created-${Date.now()}`
    save(
      {
        id,
        name: values.name.trim(),
        code: `#ANM-${String(nextCode).padStart(4, "0")}`,
        species: values.species,
        breed: values.breed,
        owner: selectedTutor.name,
        phone: selectedTutor.phone,
        status: "Ativo",
        microchip: values.microchip || "",
        lastVisit: "Ainda não consultou",
        doctor: "—",
      },
      selectedTutor.id,
    )
  }

  return (
    <div className="animal-drawer-backdrop" onMouseDown={close}>
      <aside className="animal-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <button type="button" onClick={close}>
            <ArrowLeft />
          </button>
          <span>
            <small>Adicionar</small>
            <strong>Animal</strong>
          </span>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="animal-form-scroll">
            <section className={`tutor-search-box ${tutorError ? "error" : ""}`}>
              <span className="form-section-label">Tutor responsável *</span>
              {selectedTutor ? (
                <div className="selected-tutor">
                  <i>{selectedTutor.name[0]}</i>
                  <span>
                    <strong>{selectedTutor.name}</strong>
                    <small>
                      CPF {selectedTutor.cpf} · RG {selectedTutor.rg}
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label="Trocar tutor"
                    onClick={() => {
                      setSelectedTutor(null)
                      setTutorQuery("")
                    }}
                  >
                    <X />
                  </button>
                </div>
              ) : (
                <div className="tutor-search-control">
                  <Search />
                  <input
                    value={tutorQuery}
                    onChange={(event) => {
                      setTutorQuery(event.target.value)
                      setTutorError(false)
                    }}
                    placeholder="Pesquisar tutor por nome, CPF ou RG *"
                  />
                  {qualifies && (
                    <div className="tutor-results">
                      {tutorResults.length ? (
                        tutorResults.map((tutor) => (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTutor(tutor)
                              setTutorQuery("")
                            }}
                            key={tutor.id}
                          >
                            <i>{tutor.name[0]}</i>
                            <span>
                              <strong>
                                <Highlight text={tutor.name} term={tutorQuery} />
                              </strong>
                              <small>
                                CPF <Highlight text={tutor.cpf} term={tutorQuery} /> ·
                                RG <Highlight text={tutor.rg} term={tutorQuery} />
                              </small>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p>Nenhum tutor encontrado. Cadastre o tutor primeiro.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {tutorError && <em>Selecione um tutor responsável.</em>}
            </section>

            <div className="animal-form-grid">
              <Field
                label="Nome do animal"
                required
                className={`wide ${nameError ? "error" : ""}`}
              >
                <input
                  name="name"
                  placeholder="Digite o nome do animal"
                  onChange={() => setNameError(false)}
                />
              </Field>
              <Field label="Sexo">
                <select name="sex" value={sex} onChange={(event) => setSex(event.target.value)}>
                  <option value="">Selecione</option>
                  <option>Macho</option>
                  <option>Fêmea</option>
                </select>
                {sex === "Macho" ? <Mars /> : sex === "Fêmea" ? <Venus /> : <ChevronDown />}
              </Field>
              <Field label="Esterilização">
                <select name="sterilization" disabled={!sex}>
                  <option value="">Selecione</option>
                  <option>Castrado</option>
                  <option>Não castrado</option>
                </select>
                <ChevronDown />
              </Field>
              <Field label="Nascimento" className="wide">
                <input name="birthDate" type="date" />
                <CalendarDays />
              </Field>
              <Field label="Espécie" required>
                <select
                  name="species"
                  value={species}
                  onChange={(event) => setSpecies(event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {Object.keys(speciesBreeds).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown />
              </Field>
              <Field label="Raça" required>
                <select name="breed" disabled={!species} required>
                  <option value="">Selecione</option>
                  {(speciesBreeds[species] || []).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown />
              </Field>
              <Field label="Pelagem" className="wide">
                <input name="coat" placeholder="Cor e características da pelagem" />
              </Field>
              <Field label="Microchip" className="wide">
                <input name="microchip" placeholder="Número de identificação do microchip" />
              </Field>
            </div>
            <button className="more-animal-fields" type="button" onClick={() => setMore(!more)}>
              Mais campos <ChevronDown className={more ? "open" : ""} />
            </button>
            {more && (
              <div className="animal-extra-fields">
                <div className="animal-form-grid">
                  <Field label="Pedigree">
                    <select name="pedigree">
                      <option>Não possui</option>
                      <option>Possui</option>
                    </select>
                    <ChevronDown />
                  </Field>
                  <Field label="Nº do Pedigree">
                    <input name="pedigreeNumber" placeholder="Registro" />
                  </Field>
                </div>
              </div>
            )}
          </div>
          <footer>
            <button type="submit">Salvar</button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
