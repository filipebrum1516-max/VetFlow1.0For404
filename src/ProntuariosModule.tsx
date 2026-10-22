import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileUp,
  FolderOpen,
  Paperclip,
  PawPrint,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
import { normalize, useVetFlow, type Item } from "./store"

/* =========================================================
   Tipos e configurações
   ========================================================= */
type Mode = "digital" | "fisico"
type FileGroup = "request" | "lab" | "imaging" | "physical"
type Medication = {
  id: string
  name: string
  dose: string
  route: string
  frequency: string
  duration: string
  notes: string
}
type StoredFile = { name: string; size: number }
type KeptFile = { file: StoredFile; url?: string }
type Extras = {
  code: string
  mode: Mode
  recordType: string
  complaint: string
  history?: string
  physicalExam: string
  vitals: Record<string, string>
  suspicion: string
  medications: Medication[]
  examRequestText: string
  labText: string
  imagingText: string
  returnDate: string
  files: Record<FileGroup, StoredFile[]>
}

const GROUPS: FileGroup[] = ["request", "lab", "imaging", "physical"]

const VITALS: {
  key: string
  label: string
  placeholder?: string
  options?: string[]
}[] = [
  { key: "temperature", label: "Temperatura corporal (graus Celsius)", placeholder: "Ex.: 38,5" },
  { key: "heartRate", label: "Frequência cardíaca (batimentos por minuto)", placeholder: "Ex.: 120" },
  { key: "respiratoryRate", label: "Frequência respiratória (movimentos por minuto)", placeholder: "Ex.: 24" },
  { key: "weight", label: "Peso (quilogramas)", placeholder: "Ex.: 12,5" },
  { key: "capillary", label: "Tempo de preenchimento capilar (segundos)", placeholder: "Ex.: 2" },
  { key: "mucous", label: "Cor das mucosas", options: ["Rosadas (normal)", "Pálidas", "Congestas (avermelhadas)", "Ictéricas (amareladas)", "Cianóticas (azuladas)"] },
  { key: "hydration", label: "Nível de hidratação", options: ["Normal", "Desidratação leve", "Desidratação moderada", "Desidratação grave"] },
  { key: "consciousness", label: "Nível de consciência", options: ["Alerta", "Sonolento", "Apático", "Inconsciente"] },
  { key: "pain", label: "Avaliação de dor", options: ["Ausente", "Leve", "Moderada", "Intensa"] },
]

const RECORD_TYPES = ["Consulta clínica", "Retorno", "Emergência", "Vacinação", "Exame", "Cirurgia", "Internação"]
const STATUSES = ["Em andamento", "Solicitado", "Concluído"]
const ROUTES = [
  "Via oral",
  "Via intravenosa (na veia)",
  "Via subcutânea (embaixo da pele)",
  "Via intramuscular (no músculo)",
  "Uso tópico (na pele)",
  "Uso oftálmico (nos olhos)",
  "Uso otológico (nos ouvidos)",
]
const PER_PAGE_OPTIONS = [5, 10, 20, 50]

const emptyFiles = (): Record<FileGroup, File[]> => ({
  request: [],
  lab: [],
  imaging: [],
  physical: [],
})
const newMedication = (): Medication => ({
  id: `med-${Math.random().toString(36).slice(2, 9)}`,
  name: "",
  dose: "",
  route: ROUTES[0],
  frequency: "",
  duration: "",
  notes: "",
})

/* Os campos complementares ficam guardados no navegador.
   Para produção, envie estes mesmos dados para o seu servidor. */
const STORAGE_KEY = "vetflow-prontuarios-extras"
const fileUrls = new Map<string, string>()

function loadExtras(): Record<string, Extras> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}
function saveExtras(id: string, extras: Extras) {
  try {
    const all = loadExtras()
    all[id] = extras
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* armazenamento indisponível */
  }
}
function removeExtras(id: string) {
  try {
    const all = loadExtras()
    delete all[id]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* armazenamento indisponível */
  }
  Array.from(fileUrls.keys())
    .filter((key) => key.startsWith(`${id}:`))
    .forEach((key) => fileUrls.delete(key))
}

const formatDate = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : value || "Não informada"
const megabytes = (size: number) =>
  `${(size / 1024 / 1024).toFixed(2).replace(".", ",")} megabytes`
const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}
const statusClass = (status: string) =>
  status === "Concluído"
    ? "done"
    : status === "Solicitado" || status.startsWith("Aguardando")
      ? "wait"
      : "going"

/* ---------- código do prontuário (seis números) ---------- */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const codeOf = (id: string, extras?: Extras) =>
  extras?.code || String(100000 + (hash(id) % 900000))
const newCode = () => String(100000 + Math.floor(Math.random() * 900000))

/* ---------- nomes de animais: um nome só para cada animal ---------- */
const NAME_POOL = [
  "Amora","Apolo","Aurora","Babi","Balu","Belinha","Billy","Bolota","Bruce","Cacau","Caju","Capitu","Charlotte",
  "Cookie","Dengo","Diana","Duque","Fiona","Floquinho","Fred","Frida","Gaia","Gigi","Jade","Joca","Kiara","Kiko",
  "Lili","Lola","Luke","Maggie","Maya","Meg","Mia","Mike","Milu","Molly","Nala","Nino","Pandora","Paçoca","Pérola",
  "Peter","Pingo","Pipoca","Pitoco","Pretinha","Princesa","Ravi","Rex","Romeu","Safira","Sam","Simba","Sol","Sophie",
  "Spike","Teodoro","Tico","Toby","Tom","Valentina","Zeca","Zoe","Ayla","Bartô","Bidu","Bisteca","Blue","Brisa",
  "Cindy","Dara","Elvis","Estrela","Fubá","George","Hanna","Jack","Jujuba","Leona","Lupita","Marley","Mimi",
  "Murphy","Olívia","Ozzy","Paco","Penélope","Ravena","Sasha","Scott","Theo","Tulipa","Yuki","Ziggy","Alfredo",
  "Atena","Bela","Biscoito","Branca","Brownie","Cleo","Cometa","Dolly","Dori","Fofão","Gatuno","Hércules","Indy",
  "Jasmin","Kira","Lord","Lupi","Mel","Nick","Oliver","Pantera","Pelúcia","Rubi","Sabrina","Sultão","Tigre","Trufa",
  "Úrsula","Vitória","Xuxa","Zara","Anjo","Bandit","Chiquinha","Dudu","Esmeralda","Gordo","Hulk","Iara","Jerry",
  "Kaiser","Lara","Mingau","Nuvem","Oreo","Pudim","Quindim","Rambo","Samba","Tufão","Uva","Vento","Wilson",
  "Pit","Teo","Thor","Chico","Luna","Nina","Bento","Bob","Max","Bella","Lucky","Pepe","Zeus","Nico",
]
const baseOf = (name: string) =>
  name.replace(/\s+(\d+|júnior|filho|do sol|da lua)$/i, "").trim() || name

/* Nomes repetidos recebem outro nome da lista, sem números. */
function buildNameMap(entities: { key: string; name: string }[]) {
  const map = new Map<string, string>()
  const used = new Set<string>()
  const pending: { key: string }[] = []
  entities.forEach((entity) => {
    const base = baseOf(entity.name)
    if (!used.has(normalize(base))) {
      used.add(normalize(base))
      map.set(entity.key, base)
    } else pending.push(entity)
  })
  pending.forEach((entity) => {
    const start = hash(entity.key) % NAME_POOL.length
    let chosen = NAME_POOL[start]
    for (let attempt = 0; attempt < NAME_POOL.length; attempt++) {
      const candidate = NAME_POOL[(start + attempt) % NAME_POOL.length]
      if (!used.has(normalize(candidate))) {
        chosen = candidate
        break
      }
    }
    used.add(normalize(chosen))
    map.set(entity.key, chosen)
  })
  return map
}

/* ---------- nomes de doenças usados nos prontuários de exemplo ---------- */
const DISEASES = [
  "Gastroenterite alimentar",
  "Dermatite alérgica",
  "Otite externa",
  "Parvovirose canina",
  "Cinomose",
  "Leptospirose",
  "Giardíase",
  "Sarna demodécica",
  "Insuficiência renal crônica",
  "Pancreatite aguda",
  "Displasia coxofemoral",
  "Conjuntivite bacteriana",
  "Cistite bacteriana",
  "Doença periodontal",
  "Rinotraqueíte felina",
  "Leucemia viral felina",
  "Hipotireoidismo",
  "Diabetes mellitus",
  "Erliquiose canina",
  "Babesiose",
  "Verminose intestinal",
  "Traqueobronquite infecciosa canina",
  "Úlcera de córnea",
  "Piodermite superficial",
  "Dermatofitose",
  "Cardiopatia valvar",
  "Alergia alimentar",
  "Fratura de membro posterior",
]
const diseaseOf = (id: string) => DISEASES[hash(`doenca:${id}`) % DISEASES.length]

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

/* Mesma estrutura do campo do cadastro de animais */
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

/* =========================================================
   Paginação (igual à da tela de tutores)
   ========================================================= */
function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (value: number) => void
}) {
  const items = useMemo(() => {
    const wanted = new Set<number>([1, 2, pages, page - 1, page, page + 1])
    const sorted = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
    const out: ({ kind: "page"; value: number } | { kind: "gap"; target: number })[] = []
    sorted.forEach((value, index) => {
      if (index > 0) {
        const previous = sorted[index - 1]
        if (value - previous === 2) out.push({ kind: "page", value: previous + 1 })
        else if (value - previous > 2)
          out.push({ kind: "gap", target: Math.round((previous + value) / 2) })
      }
      out.push({ kind: "page", value })
    })
    return out
  }, [page, pages])
  return (
    <div className="pv-pages">
      <button className="pv-arrow" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
        <ChevronLeft size={18} />
      </button>
      {items.map((entry, index) =>
        entry.kind === "gap" ? (
          <button className="pv-gap" key={`gap-${index}`} onClick={() => onPage(entry.target)} aria-label="Ir para páginas intermediárias">
            …
          </button>
        ) : (
          <button
            key={entry.value}
            className={`pv-page ${entry.value === page ? "active" : ""}`}
            onClick={() => onPage(entry.value)}
            aria-current={entry.value === page ? "page" : undefined}
          >
            {entry.value}
          </button>
        ),
      )}
      <button className="pv-arrow" disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Próxima página">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

/* =========================================================
   Menu para trocar a situação direto na lista
   ========================================================= */
function StatusMenu({
  status,
  onChange,
}: {
  status: string
  onChange: (value: string) => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const options = STATUSES.includes(status) ? STATUSES : [status, ...STATUSES]

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [pos])

  const toggle = () => {
    if (pos) return setPos(null)
    const rect = button.current?.getBoundingClientRect()
    if (!rect) return
    const menuHeight = options.length * 44 + 16
    const below = rect.bottom + 6
    const top = below + menuHeight > window.innerHeight ? rect.top - menuHeight - 6 : below
    setPos({ top: Math.max(8, top), left: rect.left })
  }

  return (
    <>
      <button
        type="button"
        ref={button}
        className={`pr-pill pv-status-btn ${statusClass(status)}`}
        onClick={toggle}
        title="Alterar situação"
      >
        <i />
        {status}
        <ChevronDown size={13} />
      </button>
      {pos && (
        <div className="pv-menu-backdrop" onMouseDown={() => setPos(null)}>
          <div
            className="pv-menu"
            style={{ top: pos.top, left: pos.left }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <small>Alterar situação para</small>
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={option === status ? "current" : ""}
                onClick={() => {
                  setPos(null)
                  if (option !== status) onChange(option)
                }}
              >
                <span className={`pr-pill ${statusClass(option)}`}>
                  <i />
                  {option}
                </span>
                {option === status && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* =========================================================
   Confirmação de exclusão
   ========================================================= */
function ConfirmDelete({
  animal,
  code,
  onCancel,
  onConfirm,
}: {
  animal: string
  code: string
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onCancel])
  return (
    <div className="pv-confirm-backdrop" onMouseDown={onCancel}>
      <div
        className="pv-confirm"
        role="alertdialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="pv-confirm-icon">
          <Trash2 size={22} />
        </span>
        <h2>Excluir prontuário?</h2>
        <p>
          O prontuário de {animal} (código {code}) e todos os arquivos anexados
          serão removidos. Esta ação não pode ser desfeita.
        </p>
        <div>
          <button type="button" className="pv-confirm-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="pv-confirm-delete" onClick={onConfirm}>
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Módulo principal
   ========================================================= */
export default function ProntuariosModule() {
  const { data, addItem, updateItem, deleteItem } = useVetFlow()
  const [view, setView] = useState<"folder" | "list">("folder")
  const [opening, setOpening] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos os status")
  const [vet, setVet] = useState("Todos os veterinários")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)
  const [drawer, setDrawer] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [printOnOpen, setPrintOnOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [extrasMap, setExtrasMap] = useState<Record<string, Extras>>(loadExtras)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 3600)
  }

  /* um nome só para cada animal */
  const nameMap = useMemo(() => {
    const animalIds = new Set(data.animais.map((animal) => animal.id))
    const entities = [
      ...data.animais.map((animal) => ({ key: `a:${animal.id}`, name: animal.name })),
      ...data.prontuarios
        .filter((record) => !record.animalId || !animalIds.has(record.animalId))
        .map((record) => ({ key: `p:${record.id}`, name: record.animal || record.name })),
    ]
    return buildNameMap(entities)
  }, [data.animais, data.prontuarios])
  const animalName = (animal: Item) => animal.name
  const recordAnimalName = (record: Item) =>
    (record.animalId && data.animais.find((animal) => animal.id === record.animalId)?.name) || record.animal || record.name

  const rows = useMemo(
    () => [...data.prontuarios].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.prontuarios],
  )
  const veterinarians = useMemo(
    () => [...new Set(rows.map((item) => item.professional).filter(Boolean))] as string[],
    [rows],
  )
  const statusFilterOptions = useMemo(
    () => [...new Set([...STATUSES, ...rows.map((item) => item.status)])],
    [rows],
  )
  const filtered = useMemo(
    () =>
      rows.filter((item) => {
        const code = codeOf(item.id, extrasMap[item.id])
        const text = normalize(
          `${recordAnimalName(item)} ${item.owner || ""} ${item.diagnosis || ""} ${diseaseOf(item.id)} ${item.professional || ""} ${code}`,
        )
        return (
          text.includes(normalize(query)) &&
          (status === "Todos os status" || item.status === status) &&
          (vet === "Todos os veterinários" || item.professional === vet)
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, query, status, vet, nameMap, extrasMap],
  )
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visible = filtered.slice((page - 1) * perPage, page * perPage)
  useEffect(() => {
    setPage(1)
  }, [query, status, vet, perPage])
  useEffect(() => {
    setPage((current) => Math.min(current, pages))
  }, [pages])

  const detailIndex = detailId ? filtered.findIndex((item) => item.id === detailId) : -1
  const detail = detailId ? rows.find((item) => item.id === detailId) || null : null
  const editing = editId ? rows.find((item) => item.id === editId) || null : null
  const toDelete = deleteId ? rows.find((item) => item.id === deleteId) || null : null

  const monthAgo = Date.now() - 30 * 86_400_000
  const recentCount = rows.filter(
    (item) => item.date && new Date(`${item.date}T12:00:00`).getTime() >= monthAgo,
  ).length
  const ongoingCount = rows.filter((item) => item.status === "Em andamento").length

  const openFolder = () => {
    setOpening(true)
    window.setTimeout(() => {
      setView("list")
      setOpening(false)
    }, 520)
  }
  const saved = (item: Item, extras: Extras, edited: boolean) => {
    saveExtras(item.id, extras)
    setExtrasMap(loadExtras())
    setDrawer(false)
    setEditId(null)
    if (!edited) {
      setView("list")
      setPage(1)
    }
    showToast(
      edited
        ? "Prontuário atualizado ✓"
        : "Prontuário salvo e vinculado ao animal e ao tutor ✓",
    )
  }
  const openDetail = (id: string, print = false) => {
    setPrintOnOpen(print)
    setDetailId(id)
  }
  const openEdit = (id: string) => {
    setPrintOnOpen(false)
    setEditId(id)
  }
  const changeStatus = (id: string, value: string) => {
    updateItem("prontuarios", id, { status: value })
    showToast(`Situação alterada para "${value}" ✓`)
  }
  const confirmDelete = () => {
    if (!toDelete) return
    const id = toDelete.id
    deleteItem("prontuarios", id)
    removeExtras(id)
    setExtrasMap(loadExtras())
    setDeleteId(null)
    if (detailId === id) setDetailId(null)
    if (editId === id) setEditId(null)
    showToast("Prontuário excluído ✓")
  }

  return (
    <div className="pr-page">
      {view === "folder" ? (
        <section className="pr-stage">
          <button
            className={`pr-folder ${opening ? "is-opening" : ""}`}
            onClick={openFolder}
            aria-label="Abrir pasta de prontuários"
          >
            <span className="pr-folder-back">
              <i className="pr-folder-tab">Pasta clínica</i>
            </span>
            <span className="pr-sheet s1" />
            <span className="pr-sheet s2" />
            <span className="pr-sheet s3" />
            <span className="pr-folder-front">
              <span className="pr-folder-icon">
                <FolderOpen size={34} />
              </span>
              <h1>Prontuários</h1>
              <p>
                Histórico clínico completo de cada paciente: dados do tutor,
                exames, diagnóstico, medicações e documentos digitalizados.
              </p>
              <span className="pr-folder-stats">
                <span><strong>{rows.length}</strong><small>prontuários</small></span>
                <span><strong>{ongoingCount}</strong><small>em andamento</small></span>
                <span><strong>{recentCount}</strong><small>nos últimos trinta dias</small></span>
              </span>
              <em>Clique para abrir a pasta</em>
            </span>
          </button>
          <button className="pr-btn-primary pr-stage-new" onClick={() => setDrawer(true)}>
            <Plus size={18} /> Novo prontuário
          </button>
        </section>
      ) : (
        <>
          <div className="pr-list-head">
            <button className="pr-back" onClick={() => setView("folder")}>
              <ArrowLeft size={16} /> Fechar pasta
            </button>
            <div>
              <h1>Prontuários</h1>
              <p>Histórico clínico completo dos pacientes da unidade ativa.</p>
            </div>
            <button className="pr-btn-primary" onClick={() => setDrawer(true)}>
              <Plus size={18} /> Novo prontuário
            </button>
          </div>

          <section className="pr-panel">
            <div className="pr-toolbar">
              <label className="pr-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por animal, tutor, veterinário, doença ou código..."
                />
              </label>
              <select className="pr-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>Todos os status</option>
                {statusFilterOptions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select className="pr-select" value={vet} onChange={(event) => setVet(event.target.value)}>
                <option>Todos os veterinários</option>
                {veterinarians.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <span className="pr-count">{filtered.length} resultados</span>
            </div>

            <div className="pr-scroll">
              <div className="pr-table">
                <div className="pr-row pr-head">
                  <span>Paciente</span>
                  <span>Tutor</span>
                  <span>Veterinário responsável</span>
                  <span>Suspeita ou diagnóstico</span>
                  <span>Data</span>
                  <span>Situação</span>
                  <span>Ações</span>
                </div>
                {visible.length ? (
                  visible.map((item) => {
                    const extra = extrasMap[item.id]
                    const tutor = data.tutores.find((candidate) => candidate.id === item.ownerId)
                    const name = recordAnimalName(item)
                    const code = codeOf(item.id, extra)
                    return (
                      <div
                        className="pr-row pv-clickable"
                        key={item.id}
                        onClick={() => openDetail(item.id)}
                      >
                        <span className="pr-patient">
                          <i><PawPrint size={18} /></i>
                          <span>
                            <strong>{name}</strong>
                            <small>
                              Prontuário de {name} · cód. {code}
                              {extra?.files?.physical?.length ? (
                                <span className="pv-clip" title="Prontuário físico anexado">
                                  <Paperclip size={12} />
                                </span>
                              ) : null}
                            </small>
                          </span>
                        </span>
                        <span>
                          <strong>{item.owner || "Não informado"}</strong>
                          <small>{tutor?.phone || ""}</small>
                        </span>
                        <span>
                          <strong>{item.professional || "Não informado"}</strong>
                          <small>{item.category || extra?.recordType || "Consulta clínica"}</small>
                        </span>
                        <span className="pr-summary">
                          {item.diagnosis ||
                            extra?.suspicion ||
                            (extra ? "Não informado" : diseaseOf(item.id))}
                        </span>
                        <span>
                          <strong>{formatDate(item.date)}</strong>
                          <small>{item.time || ""}</small>
                        </span>
                        <span onClick={(event) => event.stopPropagation()}>
                          <StatusMenu
                            status={item.status}
                            onChange={(value) => changeStatus(item.id, value)}
                          />
                        </span>
                        <span className="pr-actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" title="Ver prontuário completo" onClick={() => openDetail(item.id)}>
                            <Eye size={15} />
                          </button>
                          <button type="button" title="Editar prontuário" onClick={() => openEdit(item.id)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" title="Imprimir" onClick={() => openDetail(item.id, true)}>
                            <Printer size={15} />
                          </button>
                          <button type="button" className="danger" title="Excluir prontuário" onClick={() => setDeleteId(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="pr-empty">
                    <ClipboardList size={28} />
                    <strong>Nenhum prontuário encontrado</strong>
                    <span>Ajuste a busca ou crie um novo prontuário.</span>
                  </div>
                )}
              </div>
            </div>

            <footer className="pv-foot">
              <span className="pv-foot-info">
                Mostrando {filtered.length ? (page - 1) * perPage + 1 : 0}–
                {Math.min(page * perPage, filtered.length)} de {filtered.length} prontuários
              </span>
              <Pagination page={page} pages={pages} onPage={setPage} />
              <label className="pv-per">
                <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))}>
                  {PER_PAGE_OPTIONS.map((value) => (
                    <option value={value} key={value}>{value} por página</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </>
      )}

      {detail && (
        <DetailDrawer
          key={detail.id}
          item={detail}
          extras={extrasMap[detail.id]}
          animalName={recordAnimalName(detail)}
          code={codeOf(detail.id, extrasMap[detail.id])}
          autoPrint={printOnOpen}
          close={() => setDetailId(null)}
          onEdit={() => openEdit(detail.id)}
          onDelete={() => setDeleteId(detail.id)}
          onStatus={(value) => changeStatus(detail.id, value)}
          onPrev={detailIndex > 0 ? () => openDetail(filtered[detailIndex - 1].id) : undefined}
          onNext={
            detailIndex >= 0 && detailIndex < filtered.length - 1
              ? () => openDetail(filtered[detailIndex + 1].id)
              : undefined
          }
          position={detailIndex >= 0 ? `${detailIndex + 1} de ${filtered.length}` : ""}
        />
      )}
      {(drawer || editing) && (
        <RecordDrawer
          key={editing ? `edit-${editing.id}` : "new"}
          editing={editing || undefined}
          editingExtras={editing ? extrasMap[editing.id] : undefined}
          close={() => {
            setDrawer(false)
            setEditId(null)
          }}
          onSaved={saved}
          addRecord={(form) => addItem("prontuarios", form)}
          updateRecord={(id, form) => updateItem("prontuarios", id, form)}
          animalName={animalName}
        />
      )}
      {toDelete && (
        <ConfirmDelete
          animal={recordAnimalName(toDelete)}
          code={codeOf(toDelete.id, extrasMap[toDelete.id])}
          onCancel={() => setDeleteId(null)}
          onConfirm={confirmDelete}
        />
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

/* =========================================================
   Área de envio de arquivos
   ========================================================= */
function FileDrop({
  title,
  hint,
  files,
  onChange,
  existing = [],
  onRemoveExisting,
}: {
  title: string
  hint: string
  files: File[]
  onChange: (files: File[]) => void
  existing?: KeptFile[]
  onRemoveExisting?: (index: number) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const add = (list: FileList | null) => {
    if (list) onChange([...files, ...Array.from(list)])
  }
  return (
    <div className="pv-drop-wrap">
      <div
        className={`pv-drop ${over ? "over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          add(event.dataTransfer.files)
        }}
      >
        <FileUp size={30} />
        <strong>{title}</strong>
        <small>{hint}</small>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="application/pdf,image/png,image/jpeg"
        onChange={(event) => {
          add(event.target.files)
          event.target.value = ""
        }}
      />
      {(existing.length > 0 || files.length > 0) && (
        <ul className="pv-files">
          {existing.map((entry, index) => (
            <li key={`old-${entry.file.name}-${index}`}>
              <Paperclip size={14} />
              {entry.url ? (
                <a href={entry.url} target="_blank" rel="noreferrer">{entry.file.name}</a>
              ) : (
                <span>{entry.file.name}</span>
              )}
              <small>já anexado · {megabytes(entry.file.size)}</small>
              <button type="button" onClick={() => onRemoveExisting?.(index)} aria-label="Remover arquivo">
                <X size={14} />
              </button>
            </li>
          ))}
          {files.map((file, index) => (
            <li key={`new-${file.name}-${index}`}>
              <Paperclip size={14} />
              <span>{file.name}</span>
              <small>{megabytes(file.size)}</small>
              <button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label="Remover arquivo">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* =========================================================
   Cadastro e edição de prontuário
   (mesma estrutura do cadastro de animais)
   ========================================================= */
function RecordDrawer({
  editing,
  editingExtras,
  close,
  onSaved,
  addRecord,
  updateRecord,
  animalName,
}: {
  editing?: Item
  editingExtras?: Extras
  close: () => void
  onSaved: (item: Item, extras: Extras, edited: boolean) => void
  addRecord: (form: Record<string, string>) => Item
  updateRecord: (id: string, form: Record<string, string>) => void
  animalName: (animal: Item) => string
}) {
  const { data } = useVetFlow()
  const isEdit = !!editing

  const initialTutor = editing
    ? data.tutores.find((candidate) => candidate.id === editing.ownerId) ||
      data.tutores.find((candidate) => normalize(candidate.name) === normalize(editing.owner || "")) ||
      null
    : null
  const initialVet = editing
    ? data.profissionais.find((candidate) => candidate.id === editing.professionalId) ||
      data.profissionais.find((candidate) => normalize(candidate.name) === normalize(editing.professional || ""))
    : undefined

  const [mode, setMode] = useState<Mode>(editingExtras?.mode || "digital")
  const [tutorQuery, setTutorQuery] = useState("")
  const [tutor, setTutor] = useState<Item | null>(initialTutor)
  const [animalId, setAnimalId] = useState(editing?.animalId || "")
  const [vetId, setVetId] = useState(initialVet?.id || "")
  const [date, setDate] = useState(editing?.date || localToday())
  const [time, setTime] = useState(editing?.time || "09:00")
  const [recordType, setRecordType] = useState(
    editing?.category || editingExtras?.recordType || RECORD_TYPES[0],
  )
  const [status, setStatus] = useState(editing?.status || STATUSES[0])
  const [complaint, setComplaint] = useState(
    editingExtras ? editingExtras.complaint : editing?.clinicalHistory || "",
  )
  const [history, setHistory] = useState(editingExtras?.history || "")
  const [physicalExam, setPhysicalExam] = useState(editingExtras?.physicalExam || "")
  const [vitals, setVitals] = useState<Record<string, string>>(editingExtras?.vitals || {})
  const [suspicion, setSuspicion] = useState(editingExtras?.suspicion || "")
  const [diagnosis, setDiagnosis] = useState(editing?.diagnosis || "")
  const [treatment, setTreatment] = useState(editing?.treatment || "")
  const [medications, setMedications] = useState<Medication[]>(
    editingExtras?.medications?.length ? editingExtras.medications : [newMedication()],
  )
  const [examRequestText, setExamRequestText] = useState(editingExtras?.examRequestText || "")
  const [labText, setLabText] = useState(editingExtras?.labText || "")
  const [imagingText, setImagingText] = useState(editingExtras?.imagingText || "")
  const [returnDate, setReturnDate] = useState(editingExtras?.returnDate || "")
  const [notes, setNotes] = useState(editing?.notes || "")
  const [files, setFiles] = useState<Record<FileGroup, File[]>>(emptyFiles)
  const [kept, setKept] = useState<Record<FileGroup, KeptFile[]>>(() => {
    const result = { request: [], lab: [], imaging: [], physical: [] } as Record<FileGroup, KeptFile[]>
    if (editing && editingExtras?.files) {
      GROUPS.forEach((group) => {
        result[group] = (editingExtras.files[group] || []).map((file, index) => ({
          file,
          url: fileUrls.get(`${editing.id}:${group}:${index}`),
        }))
      })
    }
    return result
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const digitCount = tutorQuery.replace(/\D/g, "").length
  const letterCount = tutorQuery.replace(/[^A-Za-zÀ-ÿ]/g, "").length
  const qualifies = digitCount >= 3 || letterCount >= 2
  const tutorResults = useMemo(() => {
    if (!qualifies) return []
    const term = normalize(tutorQuery)
    const digits = tutorQuery.replace(/\D/g, "")
    return data.tutores
      .filter(
        (candidate) =>
          normalize(candidate.name).includes(term) ||
          (digits && (candidate.cpf || "").replace(/\D/g, "").includes(digits)) ||
          (digits && (candidate.rg || "").replace(/\D/g, "").includes(digits)),
      )
      .slice(0, 6)
  }, [qualifies, tutorQuery, data.tutores])

  const tutorAnimals = tutor
    ? data.animais.filter(
        (animal) =>
          animal.ownerId === tutor.id ||
          normalize(animal.owner || "") === normalize(tutor.name),
      )
    : []
  const animal = data.animais.find((candidate) => candidate.id === animalId)
  const veterinarian = data.profissionais.find((candidate) => candidate.id === vetId)

  const typeOptions = RECORD_TYPES.includes(recordType) ? RECORD_TYPES : [recordType, ...RECORD_TYPES]
  const statusOptions = STATUSES.includes(status) ? STATUSES : [status, ...STATUSES]

  const setFile = (group: FileGroup) => (list: File[]) =>
    setFiles((current) => ({ ...current, [group]: list }))
  const removeKept = (group: FileGroup) => (index: number) =>
    setKept((current) => ({
      ...current,
      [group]: current[group].filter((_, i) => i !== index),
    }))
  const updateMedication = (id: string, field: keyof Medication, value: string) =>
    setMedications((current) =>
      current.map((medication) => (medication.id === id ? { ...medication, [field]: value } : medication)),
    )
  const clearError = (key: string) => setErrors((current) => ({ ...current, [key]: "" }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (!tutor) found.tutor = "Selecione o tutor responsável."
    if (!animal) found.animal = "Selecione o animal."
    if (!veterinarian) found.vet = "Selecione o médico veterinário responsável."
    if (!date) found.date = "Informe a data do atendimento."
    if (mode === "digital" && !complaint.trim()) found.complaint = "Descreva a queixa principal e os sintomas."
    if (mode === "fisico" && files.physical.length + kept.physical.length === 0)
      found.physical = "Anexe a digitalização do prontuário físico."
    setErrors(found)
    if (Object.keys(found).length || !tutor || !animal || !veterinarian) return

    const displayName = animalName(animal)
    const form: Record<string, string> = {
      name: `Prontuário de ${displayName}`,
      subtitle: `${displayName} • ${tutor.name}`,
      status,
      animalId: animal.id,
      animal: displayName,
      ownerId: tutor.id,
      owner: tutor.name,
      professionalId: veterinarian.id,
      professional: veterinarian.name,
      date,
      time,
      category: recordType,
      clinicalHistory: [complaint, history].filter(Boolean).join("\n\n"),
      diagnosis,
      treatment,
      notes,
    }

    let record: Item
    if (editing) {
      updateRecord(editing.id, form)
      record = { ...editing, ...form } as Item
    } else {
      record = addRecord(form)
    }

    /* arquivos: mantém os que continuam e acrescenta os novos */
    const stored = { request: [], lab: [], imaging: [], physical: [] } as Record<FileGroup, StoredFile[]>
    const urls: [string, string][] = []
    GROUPS.forEach((group) => {
      const list: StoredFile[] = []
      kept[group].forEach((entry) => {
        if (entry.url) urls.push([`${record.id}:${group}:${list.length}`, entry.url])
        list.push(entry.file)
      })
      files[group].forEach((file) => {
        urls.push([`${record.id}:${group}:${list.length}`, URL.createObjectURL(file)])
        list.push({ name: file.name, size: file.size })
      })
      stored[group] = list
    })
    Array.from(fileUrls.keys())
      .filter((key) => key.startsWith(`${record.id}:`))
      .forEach((key) => fileUrls.delete(key))
    urls.forEach(([key, url]) => fileUrls.set(key, url))

    onSaved(
      record,
      {
        code: editingExtras?.code || newCode(),
        mode,
        recordType,
        complaint,
        history,
        physicalExam,
        vitals,
        suspicion,
        medications: medications.filter((medication) => medication.name.trim()),
        examRequestText,
        labText,
        imagingText,
        returnDate,
        files: stored,
      },
      isEdit,
    )
  }

  return (
    <div className="animals-page" style={{ display: "contents" }}>
      <div className="animal-drawer-backdrop" onMouseDown={close}>
        <aside className="animal-drawer pv-drawer" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <button type="button" onClick={close} aria-label="Voltar">
              <ArrowLeft />
            </button>
            <span>
              <small>{isEdit ? "Editar" : "Adicionar"}</small>
              <strong>Prontuário</strong>
            </span>
            <button type="button" onClick={close} aria-label="Fechar">
              <X />
            </button>
          </header>
          <form onSubmit={submit}>
            <div className="animal-form-scroll">
              {/* forma de cadastro */}
              <div className="pv-mode">
                <button type="button" className={mode === "digital" ? "on" : ""} onClick={() => setMode("digital")}>
                  <strong>Preencher no sistema</strong>
                  <small>Registrar o atendimento campo a campo</small>
                </button>
                <button type="button" className={mode === "fisico" ? "on" : ""} onClick={() => setMode("fisico")}>
                  <strong>Carregar prontuário físico</strong>
                  <small>Enviar a digitalização do papel</small>
                </button>
              </div>

              {/* tutor */}
              <section className={`tutor-search-box ${errors.tutor ? "error" : ""}`}>
                <span className="form-section-label">Tutor responsável *</span>
                {tutor ? (
                  <div className="selected-tutor">
                    <i>{tutor.name[0]}</i>
                    <span>
                      <strong>{tutor.name}</strong>
                      <small>
                        CPF {tutor.cpf || "—"} · RG {tutor.rg || "—"}
                      </small>
                    </span>
                    <button
                      type="button"
                      aria-label="Trocar tutor"
                      onClick={() => {
                        setTutor(null)
                        setAnimalId("")
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
                        clearError("tutor")
                      }}
                      placeholder="Pesquisar tutor por nome, CPF ou RG *"
                    />
                    {qualifies && (
                      <div className="tutor-results">
                        {tutorResults.length ? (
                          tutorResults.map((candidate) => (
                            <button
                              type="button"
                              key={candidate.id}
                              onClick={() => {
                                setTutor(candidate)
                                setTutorQuery("")
                              }}
                            >
                              <i>{candidate.name[0]}</i>
                              <span>
                                <strong>
                                  <Highlight text={candidate.name} term={tutorQuery} />
                                </strong>
                                <small>
                                  CPF <Highlight text={candidate.cpf || "—"} term={tutorQuery} /> · RG{" "}
                                  <Highlight text={candidate.rg || "—"} term={tutorQuery} />
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
                {errors.tutor && <em>{errors.tutor}</em>}
                {tutor && (
                  <div className="pv-tutor-details">
                    <div><small>Telefone</small><strong>{tutor.phone || "Não informado"}</strong></div>
                    <div><small>Correio eletrônico</small><strong>{tutor.email || "Não informado"}</strong></div>
                    <div className="full"><small>Endereço completo</small><strong>{tutor.address || "Não informado"}</strong></div>
                  </div>
                )}
              </section>

              {/* animal */}
              <div className="animal-form-grid">
                <Field label="Animal" required className={`wide ${errors.animal ? "error" : ""}`}>
                  <select
                    value={animalId}
                    disabled={!tutor}
                    onChange={(event) => {
                      setAnimalId(event.target.value)
                      clearError("animal")
                    }}
                  >
                    <option value="">
                      {tutor
                        ? tutorAnimals.length
                          ? "Selecione o animal"
                          : "Este tutor não possui animal cadastrado"
                        : "Selecione o tutor primeiro"}
                    </option>
                    {tutorAnimals.map((candidate) => (
                      <option value={candidate.id} key={candidate.id}>
                        {animalName(candidate)} • {candidate.species} • {candidate.breed}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </Field>
                <Field label="Espécie">
                  <input disabled value={animal?.species || ""} placeholder="Preenchido automaticamente" />
                </Field>
                <Field label="Raça">
                  <input disabled value={animal?.breed || ""} placeholder="Preenchido automaticamente" />
                </Field>
                <Field label="Sexo">
                  <input disabled value={animal?.sex || ""} placeholder="Preenchido automaticamente" />
                </Field>
                <Field label="Nascimento">
                  <input disabled value={animal?.birthDate ? formatDate(animal.birthDate) : ""} placeholder="Preenchido automaticamente" />
                </Field>

                <Field label="Médico veterinário responsável" required className={`wide ${errors.vet ? "error" : ""}`}>
                  <select
                    value={vetId}
                    onChange={(event) => {
                      setVetId(event.target.value)
                      clearError("vet")
                    }}
                  >
                    <option value="">Selecione o veterinário</option>
                    {data.profissionais.map((professional) => (
                      <option value={professional.id} key={professional.id}>
                        {professional.name} • {professional.category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </Field>
                <Field label="Registro no Conselho Regional de Medicina Veterinária" className="wide">
                  <input
                    disabled
                    value={veterinarian?.registration || veterinarian?.subtitle?.split(" • ")[1] || ""}
                    placeholder="Preenchido automaticamente"
                  />
                </Field>

                <Field label="Data do atendimento" required className={errors.date ? "error" : ""}>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  <CalendarDays />
                </Field>
                <Field label="Horário">
                  <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </Field>
                <Field label="Tipo de atendimento">
                  <select value={recordType} onChange={(event) => setRecordType(event.target.value)}>
                    {typeOptions.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </Field>
                <Field label="Situação do prontuário">
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    {statusOptions.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </Field>
              </div>

              {/* prontuário físico */}
              {mode === "fisico" && (
                <>
                  <h4 className="pv-section">Prontuário físico digitalizado</h4>
                  <FileDrop
                    title="Selecione ou arraste as páginas do prontuário"
                    hint="Fotografias ou digitalizações em PDF, PNG ou JPG"
                    files={files.physical}
                    onChange={setFile("physical")}
                    existing={kept.physical}
                    onRemoveExisting={removeKept("physical")}
                  />
                  {errors.physical && <em className="pv-error">{errors.physical}</em>}
                  <div className="animal-form-grid">
                    <Field label="Observações sobre o documento" className="wide">
                      <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: prontuário antigo da clínica anterior, páginas fora de ordem..." />
                    </Field>
                  </div>
                </>
              )}

              {/* prontuário digital */}
              {mode === "digital" && (
                <>
                  <h4 className="pv-section">Queixa, sintomas e histórico</h4>
                  <div className="animal-form-grid">
                    <Field label="Queixa principal e sintomas apresentados" required className={`wide ${errors.complaint ? "error" : ""}`}>
                      <textarea
                        rows={4}
                        value={complaint}
                        onChange={(event) => {
                          setComplaint(event.target.value)
                          clearError("complaint")
                        }}
                        placeholder="Descreva por extenso o que o tutor relatou e o que o animal apresentava: vômito, falta de apetite, coceira, mancar, tosse..."
                      />
                    </Field>
                    <Field label="Histórico do paciente (anamnese)" className="wide">
                      <textarea rows={3} value={history} onChange={(event) => setHistory(event.target.value)} placeholder="Doenças anteriores, alimentação, vacinas, vermífugos, cirurgias, alergias, convívio com outros animais..." />
                    </Field>
                  </div>

                  <h4 className="pv-section">Parâmetros clínicos no momento do exame</h4>
                  <div className="animal-form-grid">
                    {VITALS.map((vital) => (
                      <Field label={vital.label} key={vital.key}>
                        {vital.options ? (
                          <>
                            <select value={vitals[vital.key] || ""} onChange={(event) => setVitals((c) => ({ ...c, [vital.key]: event.target.value }))}>
                              <option value="">Selecione</option>
                              {vital.options.map((option) => (
                                <option key={option}>{option}</option>
                              ))}
                            </select>
                            <ChevronDown />
                          </>
                        ) : (
                          <input value={vitals[vital.key] || ""} onChange={(event) => setVitals((c) => ({ ...c, [vital.key]: event.target.value }))} placeholder={vital.placeholder} />
                        )}
                      </Field>
                    ))}
                    <Field label="Exame físico: achados observados" className="wide">
                      <textarea rows={3} value={physicalExam} onChange={(event) => setPhysicalExam(event.target.value)} placeholder="Descreva o que foi observado: pele, olhos, ouvidos, boca, abdômen, gânglios, articulações..." />
                    </Field>
                  </div>

                  <h4 className="pv-section">Suspeita clínica, diagnóstico e conduta</h4>
                  <div className="animal-form-grid">
                    <Field label="Suspeita clínica (nome da doença suspeita)" className="wide">
                      <textarea rows={3} value={suspicion} onChange={(event) => setSuspicion(event.target.value)} placeholder="Doenças que o veterinário está investigando, escritas por extenso. Ex.: gastroenterite alimentar." />
                    </Field>
                    <Field label="Diagnóstico (nome da doença confirmada)" className="wide">
                      <textarea rows={3} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Doença diagnosticada, escrita por extenso e sem siglas. Ex.: parvovirose canina." />
                    </Field>
                    <Field label="Conduta e tratamento" className="wide">
                      <textarea rows={3} value={treatment} onChange={(event) => setTreatment(event.target.value)} placeholder="O que foi feito no atendimento e as orientações dadas ao tutor." />
                    </Field>
                  </div>

                  <h4 className="pv-section">Medicações e doses</h4>
                  {medications.map((medication, index) => (
                    <div className="pv-med" key={medication.id}>
                      <header>
                        <strong>Medicamento {index + 1}</strong>
                        {medications.length > 1 && (
                          <button type="button" onClick={() => setMedications((c) => c.filter((m) => m.id !== medication.id))} aria-label="Remover medicamento">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </header>
                      <div className="animal-form-grid">
                        <Field label="Nome do medicamento" className="wide">
                          <input value={medication.name} onChange={(event) => updateMedication(medication.id, "name", event.target.value)} placeholder="Nome comercial ou princípio ativo, por extenso" />
                        </Field>
                        <Field label="Dose">
                          <input value={medication.dose} onChange={(event) => updateMedication(medication.id, "dose", event.target.value)} placeholder="Ex.: dez miligramas por quilograma" />
                        </Field>
                        <Field label="Via de administração">
                          <select value={medication.route} onChange={(event) => updateMedication(medication.id, "route", event.target.value)}>
                            {ROUTES.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                          <ChevronDown />
                        </Field>
                        <Field label="Frequência">
                          <input value={medication.frequency} onChange={(event) => updateMedication(medication.id, "frequency", event.target.value)} placeholder="Ex.: a cada doze horas" />
                        </Field>
                        <Field label="Duração do tratamento">
                          <input value={medication.duration} onChange={(event) => updateMedication(medication.id, "duration", event.target.value)} placeholder="Ex.: sete dias" />
                        </Field>
                        <Field label="Observações" className="wide">
                          <input value={medication.notes} onChange={(event) => updateMedication(medication.id, "notes", event.target.value)} placeholder="Ex.: administrar após a alimentação" />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="pv-add" onClick={() => setMedications((c) => [...c, newMedication()])}>
                    <Plus size={16} /> Adicionar outro medicamento
                  </button>

                  <h4 className="pv-section">Solicitação de exames</h4>
                  <div className="animal-form-grid">
                    <Field label="Exames solicitados" className="wide">
                      <textarea rows={2} value={examRequestText} onChange={(event) => setExamRequestText(event.target.value)} placeholder="Liste por extenso os exames pedidos." />
                    </Field>
                  </div>
                  <FileDrop
                    title="Anexar cópia da solicitação de exames"
                    hint="PDF, PNG ou JPG"
                    files={files.request}
                    onChange={setFile("request")}
                    existing={kept.request}
                    onRemoveExisting={removeKept("request")}
                  />

                  <h4 className="pv-section">Exames laboratoriais</h4>
                  <div className="animal-form-grid">
                    <Field label="Resultado e interpretação" className="wide">
                      <textarea rows={3} value={labText} onChange={(event) => setLabText(event.target.value)} placeholder="Hemograma, bioquímica, urina, fezes e outros. Descreva os resultados relevantes por extenso." />
                    </Field>
                  </div>
                  <FileDrop
                    title="Anexar cópia dos exames laboratoriais"
                    hint="PDF, PNG ou JPG"
                    files={files.lab}
                    onChange={setFile("lab")}
                    existing={kept.lab}
                    onRemoveExisting={removeKept("lab")}
                  />

                  <h4 className="pv-section">Exames de imagem</h4>
                  <div className="animal-form-grid">
                    <Field label="Laudo e interpretação" className="wide">
                      <textarea rows={3} value={imagingText} onChange={(event) => setImagingText(event.target.value)} placeholder="Radiografia, ultrassonografia, tomografia e outros. Descreva os achados por extenso." />
                    </Field>
                  </div>
                  <FileDrop
                    title="Anexar cópia dos exames de imagem"
                    hint="PDF, PNG ou JPG"
                    files={files.imaging}
                    onChange={setFile("imaging")}
                    existing={kept.imaging}
                    onRemoveExisting={removeKept("imaging")}
                  />

                  <h4 className="pv-section">Retorno e observações</h4>
                  <div className="animal-form-grid">
                    <Field label="Data recomendada para o retorno" className="wide">
                      <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
                      <CalendarDays />
                    </Field>
                    <Field label="Observações gerais" className="wide">
                      <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Qualquer informação adicional relevante." />
                    </Field>
                  </div>
                </>
              )}
            </div>
            <footer>
              <button type="submit">{isEdit ? "Salvar alterações" : "Salvar"}</button>
            </footer>
          </form>
        </aside>
      </div>
    </div>
  )
}

/* =========================================================
   Visualização completa do prontuário
   ========================================================= */
function DetailDrawer({
  item,
  extras,
  animalName,
  code,
  autoPrint,
  close,
  onEdit,
  onDelete,
  onStatus,
  onPrev,
  onNext,
  position,
}: {
  item: Item
  extras?: Extras
  animalName: string
  code: string
  autoPrint: boolean
  close: () => void
  onEdit: () => void
  onDelete: () => void
  onStatus: (value: string) => void
  onPrev?: () => void
  onNext?: () => void
  position: string
}) {
  const { data } = useVetFlow()
  const tutor =
    data.tutores.find((candidate) => candidate.id === item.ownerId) ||
    data.tutores.find((candidate) => normalize(candidate.name) === normalize(item.owner || ""))
  const animal = data.animais.find((candidate) => candidate.id === item.animalId)
  const veterinarian = data.profissionais.find((candidate) => candidate.id === item.professionalId)
  const text = (value?: string) => value?.trim() || "Não informado"
  const statusOptions = STATUSES.includes(item.status) ? STATUSES : [item.status, ...STATUSES]

  useEffect(() => {
    if (!autoPrint) return
    const timer = window.setTimeout(() => window.print(), 450)
    return () => window.clearTimeout(timer)
  }, [autoPrint])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [close])

  const View = ({ label, value, wide }: { label: string; value?: string; wide?: boolean }) => (
    <div className={`pv-view-item ${wide ? "wide" : ""}`}>
      <small>{label}</small>
      <p>{text(value)}</p>
    </div>
  )
  const files = (group: FileGroup, label: string) => {
    const list = extras?.files?.[group] || []
    return (
      <div className="pv-view-item wide">
        <small>{label}</small>
        {list.length ? (
          <ul className="pv-files">
            {list.map((file, index) => {
              const url = fileUrls.get(`${item.id}:${group}:${index}`)
              return (
                <li key={`${file.name}-${index}`}>
                  <Paperclip size={14} />
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">{file.name}</a>
                  ) : (
                    <span>{file.name}</span>
                  )}
                  <small>{megabytes(file.size)}</small>
                </li>
              )
            })}
          </ul>
        ) : (
          <p>Nenhum arquivo anexado.</p>
        )}
      </div>
    )
  }

  return (
    <div className="animals-page" style={{ display: "contents" }}>
      <div className="animal-drawer-backdrop" onMouseDown={close}>
        <aside className="animal-drawer pv-drawer pv-detail" onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <button type="button" onClick={close} aria-label="Voltar">
              <ArrowLeft />
            </button>
            <span>
              <small>Prontuário de {animalName}</small>
              <strong>Cód. {code}</strong>
            </span>
            <button type="button" onClick={close} aria-label="Fechar">
              <X />
            </button>
          </header>
          <div className="animal-form-scroll">
            {/* ações */}
            <div className="pv-view-bar">
              <span className="pv-view-nav">
                {position && <small>{position}</small>}
                <button type="button" disabled={!onPrev} onClick={onPrev} aria-label="Prontuário anterior" title="Prontuário anterior">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" disabled={!onNext} onClick={onNext} aria-label="Próximo prontuário" title="Próximo prontuário">
                  <ChevronRight size={18} />
                </button>
              </span>
              <span className="pv-view-nav">
                <button type="button" onClick={onEdit} aria-label="Editar prontuário" title="Editar prontuário">
                  <Pencil size={17} />
                </button>
                <button type="button" onClick={() => window.print()} aria-label="Imprimir prontuário" title="Imprimir">
                  <Printer size={17} />
                </button>
                <button type="button" className="danger" onClick={onDelete} aria-label="Excluir prontuário" title="Excluir prontuário">
                  <Trash2 size={17} />
                </button>
              </span>
            </div>

            {/* situação */}
            <div className="pv-status-switch" role="group" aria-label="Situação do prontuário">
              <small>Situação</small>
              <div>
                {statusOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`${statusClass(option)} ${option === item.status ? "on" : ""}`}
                    onClick={() => option !== item.status && onStatus(option)}
                    aria-pressed={option === item.status}
                  >
                    <i />
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <h4 className="pv-section">Tutor responsável</h4>
            <div className="pv-view-grid">
              <View label="Nome completo" value={item.owner || tutor?.name} wide />
              <View label="Cadastro de Pessoa Física" value={tutor?.cpf} />
              <View label="Registro Geral" value={tutor?.rg} />
              <View label="Telefone" value={tutor?.phone} />
              <View label="Correio eletrônico" value={tutor?.email} />
              <View label="Endereço completo" value={tutor?.address} wide />
            </div>

            <h4 className="pv-section">Animal e veterinário responsável</h4>
            <div className="pv-view-grid">
              <View label="Nome do animal" value={animalName} />
              <View label="Espécie" value={animal?.species} />
              <View label="Raça" value={animal?.breed} />
              <View label="Sexo" value={animal?.sex} />
              <View label="Médico veterinário responsável" value={item.professional} wide />
              <View label="Registro no Conselho Regional de Medicina Veterinária" value={veterinarian?.registration} wide />
              <View label="Tipo de atendimento" value={item.category || extras?.recordType} />
              <View label="Data e horário" value={`${formatDate(item.date)} ${item.time || ""}`} />
            </div>

            {extras?.files?.physical?.length ? (
              <>
                <h4 className="pv-section">Prontuário físico digitalizado</h4>
                <div className="pv-view-grid">{files("physical", "Páginas digitalizadas")}</div>
              </>
            ) : null}

            <h4 className="pv-section">Queixa, sintomas e histórico</h4>
            <div className="pv-view-grid">
              <View label="Queixa principal, sintomas e histórico" value={item.clinicalHistory || extras?.complaint} wide />
            </div>

            <h4 className="pv-section">Parâmetros clínicos no momento do exame</h4>
            <div className="pv-view-grid">
              {VITALS.map((vital) => (
                <View key={vital.key} label={vital.label} value={extras?.vitals?.[vital.key]} />
              ))}
              <View label="Exame físico: achados observados" value={extras?.physicalExam} wide />
            </div>

            <h4 className="pv-section">Suspeita clínica, diagnóstico e conduta</h4>
            <div className="pv-view-grid">
              <View label="Suspeita clínica" value={extras?.suspicion} wide />
              <View label="Diagnóstico" value={item.diagnosis || (extras ? "" : diseaseOf(item.id))} wide />
              <View label="Conduta e tratamento" value={item.treatment} wide />
            </div>

            <h4 className="pv-section">Medicações e doses</h4>
            {extras?.medications?.length ? (
              extras.medications.map((medication, index) => (
                <div className="pv-med" key={medication.id}>
                  <header>
                    <strong>
                      {index + 1}. {medication.name}
                    </strong>
                  </header>
                  <div className="pv-view-grid">
                    <View label="Dose" value={medication.dose} />
                    <View label="Via de administração" value={medication.route} />
                    <View label="Frequência" value={medication.frequency} />
                    <View label="Duração do tratamento" value={medication.duration} />
                    {medication.notes && <View label="Observações" value={medication.notes} wide />}
                  </div>
                </div>
              ))
            ) : (
              <p className="pv-muted">Nenhuma medicação registrada.</p>
            )}

            <h4 className="pv-section">Exames</h4>
            <div className="pv-view-grid">
              <View label="Exames solicitados" value={extras?.examRequestText} wide />
              {files("request", "Cópia da solicitação de exames")}
              <View label="Resultado dos exames laboratoriais" value={extras?.labText} wide />
              {files("lab", "Cópia dos exames laboratoriais")}
              <View label="Laudo dos exames de imagem" value={extras?.imagingText} wide />
              {files("imaging", "Cópia dos exames de imagem")}
            </div>

            <h4 className="pv-section">Retorno e observações</h4>
            <div className="pv-view-grid">
              <View label="Data recomendada para o retorno" value={extras?.returnDate ? formatDate(extras.returnDate) : ""} />
              <View label="Observações gerais" value={item.notes} wide />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}