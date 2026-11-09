import RowActions, { RowButton, RowMenu } from "./vfx/RowActions"
import { clinicMetrics } from "./metrics"
import { CadastroDrawer, CadSec, Campo, cadInput } from "./vfx/CadastroDrawer"
import { TutorBusca } from "./vfx/FormDrawer"
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
  FileText,
  HeartPulse,
  Mars,
  PawPrint,
  Phone,
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
import { accessLevel, useVetFlow, type Item, type UnitData } from "./store"
import { alergiasDoAnimal, CONDICOES, condicoesDoAnimal } from "./vfx/clinico"
import { FichaCadastro } from "./vfx/Ficha"

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
  const { addItem, data, theme, updateItem, deleteItem, user } = useVetFlow()
  const soVer = accessLevel(user?.role, "animais", user?.perms) === "Ver"
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
  const [fichaId, setFichaId] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<AnimalRow | null>(null)
  const [recordAnimal, setRecordAnimal] = useState<Item | null>(() => {
    const ficha = new URLSearchParams(window.location.search).get("ficha")
    return ficha ? data.animais.find((animal) => animal.id === ficha) || null : null
  })
  const [recordEditing, setRecordEditing] = useState(false)
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

  const statusTabs = useMemo(() => {
    const base = rows.filter((animal) => normalize(`${animal.name} ${animal.owner} ${animal.microchip}`).includes(normalize(query)) && (species === "Todos os tipos" || animal.species === species))
    return [["Todos os status", "Todos"], ["Ativo", "Ativos"], ["Em tratamento", "Em tratamento"], ["Inativo", "Inativos"]].map(([key, label]) => ({ key, label, count: key === "Todos os status" ? base.length : base.filter((a) => a.status === key).length }))
  }, [rows, query, species])
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visibleRows = filtered.slice((page - 1) * perPage, page * perPage)
  const fichaAtual = filtered.find((animal) => animal.id === fichaId) || visibleRows[0] || filtered[0]
  const fichaItem = fichaAtual ? data.animais.find((animal) => animal.id === fichaAtual.id) : undefined
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
        ...(more.extra || {}),
        code: animal.code,
        microchip: animal.microchip,
      },
    }
    addItem("animais", { ...patch, id: animal.id })
    flash(`Animal cadastrado e vinculado a ${animal.owner}.`)
    closeAnimalDrawer()
  }
  const openAnimalRecord = (id: string, editing = false) => {
    const item = data.animais.find((candidate) => candidate.id === id)
    if (!item) return
    setRecordAnimal(item)
    setRecordEditing(editing)
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

      <div className="cd-grid cd-animais">
      <section className="animals-table-card lv-card cd-list">
        <nav className="lv-tabs" role="tablist" aria-label="Situação">
          {statusTabs.map((tab) => (
            <button key={tab.key} type="button" role="tab" aria-selected={status === tab.key} className={`lv-tab ${status === tab.key ? "on" : ""}`} onClick={() => setStatus(tab.key)}>
              {tab.label} <b>{tab.count.toLocaleString("pt-BR")}</b>
            </button>
          ))}
        </nav>
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
          {soVer ? null : (
          <button className="new-animal-button" onClick={() => setDrawerOpen(true)}>
            <Plus /> Novo registro
          </button>
          )}
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
                <div
                  className={`animals-table-row cl-click ${fichaAtual?.id === animal.id ? "lv-cur" : ""}`}
                  key={animal.id}
                  aria-current={fichaAtual?.id === animal.id ? "true" : undefined}
                  onClick={(event) => { if ((event.target as HTMLElement).closest("button, a, input, select")) return; setFichaId(animal.id); if (window.innerWidth < 1100) window.setTimeout(() => document.querySelector(".cd-animais .cd-side-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40) }}
                >
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
                      onView={() => openAnimalRecord(animal.id)}
                      onEdit={() => openAnimalRecord(animal.id, true)}
                      onDelete={() => setConfirmDelete(animal)}
                    >
                    <RowButton title="Agendar" onClick={() => navigate(`/agendas?locate=1&pet=${encodeURIComponent(animal.name)}&client=${encodeURIComponent(animal.owner)}`)}>
                      <CalendarDays />
                    </RowButton>
                    <RowMenu
                      items={[
                        ["Abrir ficha completa", () => openAnimalRecord(animal.id)],
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
      <div className="cd-side-wrap">
        {fichaItem ? (
          <FichaCadastro
            slug="animais"
            item={fichaItem}
            foto={typeof fichaItem.extra?.foto === "string" ? fichaItem.extra.foto : undefined}
            sub={fichaAtual ? `${fichaAtual.species} · ${fichaAtual.breed} · ${fichaAtual.code}` : undefined}
            acoes={[
              { label: "Nova consulta", icon: <CalendarDays />, main: true, onClick: () => navigate(`/consultas?novo=1&animal=${fichaItem.id}`) },
              { label: "Aplicar vacina", onClick: () => navigate(`/vacinas?novo=1&animal=${fichaItem.id}`) },
              { label: "Ver tutor", onClick: () => navigate(`/tutores?tutor=${encodeURIComponent(fichaItem.owner || "")}`) },
            ]}
            campos={fichaAtual ? [
              ["Tutor", fichaAtual.owner],
              ["Telefone", fichaAtual.phone],
              ["Espécie", fichaAtual.species],
              ["Raça", fichaAtual.breed],
              ["Sexo · idade · peso", fichaAtual.facts],
              ["Microchip", fichaAtual.microchip],
              ["Última consulta", fichaAtual.doctor ? `${fichaAtual.lastVisit} · ${fichaAtual.doctor}` : fichaAtual.lastVisit],
              ["Alergias", alergiasDoAnimal(fichaItem) || undefined],
              ["Código", fichaAtual.code],
            ] : undefined}
            onEdit={() => openAnimalRecord(fichaItem.id, true)}
            onToast={flash}
          />
        ) : (
          <aside className="cd-side"><section className="cd-pane"><p className="cd-empty">Nenhum animal com estes filtros.</p></section></aside>
        )}
      </div>
      </div>

      {drawerOpen && (
        <AnimalDrawer
          key="new-animal"
          tutors={tutors}
          close={closeAnimalDrawer}
          save={handleSaved}
          nextCode={rows.length + 1}
          presetTutor={new URLSearchParams(window.location.search).get("tutor") || ""}
        />
      )}
      {recordAnimal && (
        <AnimalRecordDrawer
          key={`${recordAnimal.id}-${recordEditing ? "edit" : "view"}`}
          item={recordAnimal}
          tutors={tutors}
          data={data}
          editing={recordEditing}
          close={() => {
            setRecordAnimal(null)
            setRecordEditing(false)
          }}
          setEditing={setRecordEditing}
          save={(patch) => {
            updateItem("animais", recordAnimal.id, patch)
            setRecordAnimal({ ...recordAnimal, ...patch })
            setRecordEditing(false)
            flash(`${patch.name || recordAnimal.name} atualizado com sucesso.`)
          }}
          schedule={() => {
            setRecordAnimal(null)
            navigate(`/consultas?novo=1&animal=${recordAnimal.id}`)
          }}
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

function AnimalRecordDrawer({
  item,
  tutors,
  data,
  editing,
  close,
  setEditing,
  save,
  schedule,
}: {
  item: Item
  tutors: TutorOption[]
  data: UnitData
  editing: boolean
  close: () => void
  setEditing: (value: boolean) => void
  save: (patch: Partial<Item>) => void
  schedule: () => void
}) {
  const [tab, setTab] = useState("Dados")
  const owner = tutors.find((tutor) => tutor.id === item.ownerId) || tutors.find((tutor) => normalize(tutor.name) === normalize(item.owner || ""))
  const species = /gat|felin/i.test(item.species || "") ? "Gato" : /c[aã]o|canin/i.test(item.species || "") ? "Cão" : item.species || "Outro"
  const [form, setForm] = useState({
    name: item.name || "",
    ownerId: owner?.id || item.ownerId || "",
    status: item.status || "Ativo",
    species,
    breed: item.breed || "",
    sex: item.sex || "",
    birthDate: item.birthDate || "",
    weight: item.weight || "",
    coat: item.extra?.pelagem || item.extra?.coat || "",
    microchip: item.extra?.microchip || item.microchip || "",
    sterilization: item.extra?.castrado || item.extra?.sterilization || "",
    notes: item.notes || "",
    outrasCondicoes: String(item.extra?.outrasCondicoes || ""),
    alergias: String(item.extra?.alergias || ""),
  })
  const [condicoes, setCondicoes] = useState<string[]>(() => (Array.isArray(item.extra?.condicoes) ? item.extra.condicoes : []))
  const saude = condicoesDoAnimal(item)
  const alergia = alergiasDoAnimal(item)
  const history = [...data.consultas, ...data.prontuarios]
    .filter((record) => record.animalId === item.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 8)
  const vaccines = data.vacinas.filter((record) => record.animalId === item.id).slice(0, 8)
  const documents = data.documentos.filter((record) => record.animalId === item.id).slice(0, 8)
  const date = (value?: string) => value ? value.split("-").reverse().join("/") : "—"
  const initials = (value = "") => value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "VF"
  const field = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }))
  const submit = () => {
    if (!form.name.trim()) return
    const selectedOwner = tutors.find((tutor) => tutor.id === form.ownerId)
    save({
      name: form.name.trim(),
      ownerId: selectedOwner?.id || item.ownerId,
      owner: selectedOwner?.name || item.owner,
      phone: selectedOwner?.phone || item.phone,
      status: form.status,
      species: form.species,
      breed: form.breed,
      sex: form.sex,
      birthDate: form.birthDate,
      weight: form.weight,
      microchip: form.microchip,
      notes: form.notes,
      subtitle: `${form.species} • ${form.breed || "SRD"}`,
      extra: {
        ...(item.extra || {}),
        coat: form.coat,
        pelagem: form.coat,
        microchip: form.microchip,
        sterilization: form.sterilization,
        castrado: form.sterilization,
        condicoes,
        outrasCondicoes: form.outrasCondicoes,
        alergias: form.alergias,
      },
    })
  }

  return (
    <div className="tf-overlay animal-overlay" onMouseDown={close}>
      <aside className="animal-info-drawer" aria-label={`Ficha de ${item.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <button type="button" onClick={close} aria-label="Voltar"><ArrowLeft size={22} /></button>
          <strong>{editing ? `Editar ${item.name}` : item.name}</strong>
          <button type="button" onClick={close} aria-label="Fechar"><X size={21} /></button>
        </header>
        <div className="animal-panel-scroll">
          <section className="animal-profile">
            <i className="animal-profile-placeholder"><PawPrint /></i>
            <h2>{item.name}</h2>
            <p>{species} • {item.breed || "Sem raça definida"}</p>
            <span>{item.status || "Ativo"}</span>
          </section>

          <section className="animal-owner-card">
            <small>Tutor responsável</small>
            <div>
              <i>{initials(owner?.name || item.owner)}</i>
              <span>
                <strong>{owner?.name || item.owner || "Não informado"}</strong>
                <small><Phone size={12} /> {owner?.phone || item.phone || "Telefone não informado"}</small>
              </span>
              {owner && <button type="button" onClick={() => window.location.assign(`/tutores?tutor=${encodeURIComponent(owner.name)}`)}>Ver tutor</button>}
            </div>
          </section>

          <div className="animal-tabs" role="tablist">
            {["Dados", "Histórico", "Vacinas", "Documentos"].map((name) => (
              <button type="button" role="tab" aria-selected={tab === name} className={tab === name ? "active" : ""} onClick={() => setTab(name)} key={name}>{name}</button>
            ))}
          </div>

          {tab === "Dados" && editing && (
            <form className="tf-form animal-edit-form" onSubmit={(event) => { event.preventDefault(); submit() }}>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Nome *</span><input value={form.name} onChange={(event) => field("name", event.target.value)} /></label>
                <label className="tf-field"><span>Situação</span><select value={form.status} onChange={(event) => field("status", event.target.value)}>{["Ativo", "Em tratamento", "Internado", "Inativo", "Falecido"].map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>
              <div className="tf-field tf-tutor-busca"><span>Tutor responsável</span><TutorBusca tutores={data.tutores} animais={data.animais} value={form.ownerId} onChange={(id) => field("ownerId", id)} /></div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Espécie</span><select value={form.species} onChange={(event) => field("species", event.target.value)}>{["Cão", "Gato", "Bovino", "Equino", "Ave", "Roedor", "Réptil", "Outro"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="tf-field"><span>Raça</span><input value={form.breed} onChange={(event) => field("breed", event.target.value)} /></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Sexo</span><select value={form.sex} onChange={(event) => field("sex", event.target.value)}><option value="">Não informado</option><option>Macho</option><option>Fêmea</option></select></label>
                <label className="tf-field"><span>Esterilização</span><select value={form.sterilization} onChange={(event) => field("sterilization", event.target.value)}><option value="">Não informado</option><option>Castrado</option><option>Não castrado</option></select></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Nascimento</span><input type="date" value={form.birthDate} onChange={(event) => field("birthDate", event.target.value)} /></label>
                <label className="tf-field"><span>Peso</span><input value={form.weight} onChange={(event) => field("weight", event.target.value)} /></label>
              </div>
              <div className="tf-two-fields">
                <label className="tf-field"><span>Pelagem</span><input value={form.coat} onChange={(event) => field("coat", event.target.value)} /></label>
                <label className="tf-field"><span>Microchip</span><input value={form.microchip} onChange={(event) => field("microchip", event.target.value)} /></label>
              </div>
              <fieldset className="animal-health-edit">
                <legend>Doenças e condições (aparecem como risco nas cirurgias)</legend>
                <div>
                  {CONDICOES.map((cond) => (
                    <label key={cond}><input type="checkbox" checked={condicoes.includes(cond)} onChange={() => setCondicoes((cur) => (cur.includes(cond) ? cur.filter((c) => c !== cond) : [...cur, cond]))} /> {cond}</label>
                  ))}
                </div>
              </fieldset>
              <label className="tf-field"><span>Outras doenças</span><input value={form.outrasCondicoes} placeholder="Ex.: hipotireoidismo, sopro grau II" onChange={(event) => field("outrasCondicoes", event.target.value)} /></label>
              <label className="tf-field"><span>Alergias / restrições a medicamentos</span><input value={form.alergias} placeholder="Ex.: reação a dipirona" onChange={(event) => field("alergias", event.target.value)} /></label>
              <label className="tf-textarea"><span>Observações</span><textarea value={form.notes} onChange={(event) => field("notes", event.target.value)} /></label>
            </form>
          )}

          {tab === "Dados" && !editing && (
            <div className={`animal-health ${saude.length || alergia ? "has" : ""}`}>
              <small><HeartPulse size={13} /> Doenças e condições</small>
              {saude.length || alergia ? (
                <>
                  {saude.length > 0 && <div>{saude.map((cond) => <b key={cond}>{cond}</b>)}</div>}
                  {alergia && <p><strong>Alergia / restrição:</strong> {alergia}</p>}
                </>
              ) : (
                <p>Nenhuma doença ou alergia registrada. Use Editar para registrar.</p>
              )}
            </div>
          )}
          {tab === "Dados" && !editing && (
            <div className="animal-data-grid">
              {[
                ["Sexo", item.sex || "Não informado"],
                ["Esterilização", item.extra?.castrado || item.extra?.sterilization || "Não informado"],
                ["Nascimento", item.birthDate ? `${date(item.birthDate)}${ageOf(item.birthDate) ? ` • ${ageOf(item.birthDate)}` : ""}` : "Não informado"],
                ["Espécie", species],
                ["Raça", item.breed || "Não informada"],
                ["Pelagem", item.extra?.pelagem || item.extra?.coat || "Não informada"],
                ["Peso", item.weight || "Não informado"],
                ["Microchip", item.extra?.microchip || item.microchip || "Não informado"],
              ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
              <div className="wide"><small>Observações</small><p>{item.notes || "Nenhuma observação cadastrada."}</p></div>
            </div>
          )}

          {tab === "Histórico" && (
            <div className="animal-timeline">
              {history.length ? history.map((record) => (
                <div key={record.id}><i /><span><small>{date(record.date)}</small><strong>{record.name}</strong><p>{record.professional || record.status}</p></span></div>
              )) : <div className="vx-empty">Nenhum histórico registrado.</div>}
            </div>
          )}
          {tab === "Vacinas" && (
            <div className="animal-list-tab">
              {vaccines.length ? vaccines.map((record) => (
                <div key={record.id}><Syringe /><span><strong>{record.name}</strong><small>Aplicação: {date(record.date)} • Próxima: {date(record.dueDate)}</small></span><b className={/atras/i.test(record.status) ? "late" : "ok"}>{record.status}</b></div>
              )) : <div className="vx-empty">Nenhuma vacina registrada.</div>}
            </div>
          )}
          {tab === "Documentos" && (
            <div className="animal-list-tab">
              {documents.length ? documents.map((record) => (
                <div key={record.id}><FileText /><span><strong>{record.name}</strong><small>{date(record.date)}</small></span></div>
              )) : <div className="vx-empty">Nenhum documento registrado.</div>}
            </div>
          )}
        </div>
        <footer>
          {editing ? (
            <><button type="button" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="animal-save" onClick={submit}>Salvar alterações</button></>
          ) : (
            <><button type="button" onClick={() => { setTab("Dados"); setEditing(true) }}>Editar animal</button><button type="button" onClick={schedule}>Nova consulta</button></>
          )}
        </footer>
      </aside>
    </div>
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
          ...(item?.extra || {}),
          condicoes: new FormData(form).getAll("condicoes").map(String),
          outrasCondicoes: values.outrasCondicoes || "",
          alergias: values.alergias || "",
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

        <CadSec n={4} title="Saúde" desc="Doenças e alergias aparecem como risco nas cirurgias">
          <div className="vx-c6 animal-health-edit">
            <div>
              {CONDICOES.map((cond) => (
                <label key={cond}><input type="checkbox" name="condicoes" value={cond} defaultChecked={(Array.isArray(item?.extra?.condicoes) ? item.extra.condicoes : []).includes(cond)} /> {cond}</label>
              ))}
            </div>
          </div>
          <Campo label="Outras doenças" span={3}>
            <input className="vx-in" name="outrasCondicoes" defaultValue={item?.extra?.outrasCondicoes || ""} placeholder="Ex.: sopro grau II" />
          </Campo>
          <Campo label="Alergias / restrições a medicamentos" span={3}>
            <input className="vx-in" name="alergias" defaultValue={item?.extra?.alergias || ""} placeholder="Ex.: reação a dipirona" />
          </Campo>
        </CadSec>
      </>
    </CadastroDrawer>
  )
}
