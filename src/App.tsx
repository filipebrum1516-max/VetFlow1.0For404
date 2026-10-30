import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseMedical,
  Building2,
  CalendarDays,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  FileChartColumn,
  FileText,
  Filter,
  HeartPulse,
  HelpCircle,
  Home,
  Hospital,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Moon,
  MoreHorizontal,
  PackageSearch,
  PawPrint,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Wallet,
  Stethoscope,
  Sun,
  Syringe,
  TestTube2,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import {
  VetFlowProvider,
  formatCurrency,
  inLastDays,
  modules,
  normalize,
  useVetFlow,
  canAccess,
  ROLE_HOME,
  type Item,
  type ModuleSlug,
  type Unit,
  type UnitData,
} from "./store"
import "./vfx.css"
import Detail from "./vfx/Detail"

const TutorsModule = lazy(() => import("./TutorsModule"))
const AgendaModule = lazy(() => import("./AgendaModule"))
const AnimalsModule = lazy(() => import("./AnimalsModule"))
const ProntuariosModule = lazy(() => import("./ProntuariosModule"))
const RelatoriosPage = lazy(() => import("./vfx/pages/Relatorios"))
const VxRelatorio = lazy(() => import("./vfx/pages/Relatorios").then((m) => ({ default: m.Relatorio })))
const VxDashboard = lazy(() => import("./vfx/pages/Dashboard"))
const VxConsultas = lazy(() => import("./vfx/pages/Consultas"))
const VxProfissionais = lazy(() => import("./vfx/pages/Profissionais"))
const VxVacinas = lazy(() => import("./vfx/pages/Vacinas"))
const VxPrescricoes = lazy(() => import("./vfx/pages/Prescricoes"))
const VxMedicamentos = lazy(() => import("./vfx/pages/Medicamentos"))
const VxExames = lazy(() => import("./vfx/pages/Exames"))
const VxProcedimentos = lazy(() => import("./vfx/pages/Procedimentos"))
const VxCirurgias = lazy(() => import("./vfx/pages/Cirurgias"))
const VxInternacoes = lazy(() => import("./vfx/pages/Internacoes"))
const VxProtocolos = lazy(() => import("./vfx/pages/Protocolos"))
const VxVendas = lazy(() => import("./vfx/pages/Vendas"))
const VxCaixa = lazy(() => import("./vfx/pages/Caixa"))
const VxEntregas = lazy(() => import("./vfx/pages/Entregas"))
const VxServicos = lazy(() => import("./vfx/pages/Servicos"))
const VxEstoque = lazy(() => import("./vfx/pages/Estoque"))
const VxFinanceiro = lazy(() => import("./vfx/pages/Financeiro"))
const VxConvenios = lazy(() => import("./vfx/pages/Convenios"))
const VxUnidades = lazy(() => import("./vfx/pages/Unidades"))
const VxTele = lazy(() => import("./vfx/pages/Teleatendimentos"))
const VxComunicacao = lazy(() => import("./vfx/pages/Comunicacao"))
const VxPublicacoes = lazy(() => import("./vfx/pages/Publicacoes"))
const VxDocumentos = lazy(() => import("./vfx/pages/Documentos"))
const VxOcorrencias = lazy(() => import("./vfx/pages/Ocorrencias"))
const VxUsuarios = lazy(() => import("./vfx/pages/Usuarios"))
const VxEquipe = lazy(() => import("./vfx/pages/Equipe"))
const VxEscolha = lazy(() => import("./vfx/pages/EscolherClinica"))
const VxPrivacidade = lazy(() => import("./vfx/pages/Privacidade"))
const VxPerfil = lazy(() => import("./vfx/pages/Sistema").then((m) => ({ default: m.Perfil })))
const VxConfig = lazy(() => import("./vfx/pages/Sistema").then((m) => ({ default: m.Configuracoes })))
const VxAjuda = lazy(() => import("./vfx/pages/Sistema").then((m) => ({ default: m.Ajuda })))
const VxDashProposta = lazy(() => import("./vfx/pages/DashboardProposta"))
const VxLanding = lazy(() => import("./vfx/pages/Landing"))
const VxNotFound = lazy(() => import("./vfx/pages/Sistema").then((m) => ({ default: m.NaoEncontrada })))

function PageLoader() {
  return (
    <div className="vx vx-loader" role="status" aria-live="polite">
      <span className="vx-spinner" />
      <span>Carregando…</span>
    </div>
  )
}

const moduleIcons: Record<ModuleSlug, LucideIcon> = {
  tutores: Users,
  animais: PawPrint,
  prontuarios: ClipboardList,
  consultas: Stethoscope,
  agendas: CalendarDays,
  profissionais: BriefcaseMedical,
  vacinas: Syringe,
  prescricoes: FileText,
  medicamentos: HeartPulse,
  exames: TestTube2,
  procedimentos: Activity,
  cirurgias: Hospital,
  internacoes: Building2,
  protocolos: BookOpen,
  servicos: ShoppingBag,
  vendas: ShoppingCart,
  caixa: Wallet,
  entregas: Truck,
  estoque: Boxes,
  financeiro: CircleDollarSign,
  convenios: ShieldCheck,
  unidades: Building2,
  teleatendimentos: Video,
  comunicacao: MessageCircle,
  publicacoes: Send,
  documentos: Archive,
  ocorrencias: AlertTriangle,
  usuarios: LockKeyhole,
  relatorios: FileChartColumn,
}

const navGroups: [string, ModuleSlug[]][] = [
  ["Vendas", ["vendas", "caixa", "entregas"]],
  [
    "Clínica",
    [
      "animais",
      "tutores",
      "prontuarios",
      "consultas",
      "agendas",
      "profissionais",
    ],
  ],
  [
    "Saúde",
    [
      "vacinas",
      "prescricoes",
      "medicamentos",
      "exames",
      "procedimentos",
      "cirurgias",
      "internacoes",
      "protocolos",
    ],
  ],
  ["Gestão", ["servicos", "estoque", "financeiro", "convenios", "unidades"]],
  ["Relacionamento", ["teleatendimentos", "comunicacao", "publicacoes"]],
  ["Sistema", ["documentos", "ocorrencias", "usuarios", "relatorios"]],
]

const reports = [
  "Atendimentos",
  "Financeiro (receitas e despesas)",
  "Faturamento por serviço",
  "Faturamento por profissional",
  "Estoque e validade",
  "Vacinas aplicadas e atrasadas",
  "Internações",
  "Cirurgias",
  "Agendamentos e faltas",
  "Novos clientes e animais",
  "Convênios",
  "Produtividade da equipe",
  "Ocorrências",
]

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0)
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  }
}

function dateFromZonedParts(date: Date, timeZone: string) {
  const { year, month, day } = zonedDateParts(date, timeZone)
  return new Date(year, month - 1, day, 12)
}

function nextAgendaDate(date: Date, timeZone: string) {
  const parts = zonedDateParts(date, timeZone)
  const candidate = dateFromZonedParts(date, timeZone)
  const outsideBusinessHours =
    parts.hour < 8 || parts.hour >= 18 || [0, 6].includes(candidate.getDay())
  if (outsideBusinessHours) candidate.setDate(candidate.getDate() + 1)
  while ([0, 6].includes(candidate.getDay())) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(interval)
  }, [])
  return now
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}

function Status({ children, tone }: { children: ReactNode; tone?: string }) {
  const value = String(children)
  const resolved =
    tone ||
    (["Ativo", "Concluído", "Confirmado"].includes(value)
      ? "green"
      : value.includes("Pendente")
        ? "orange"
        : "blue")
  return (
    <span className={`status status-${resolved}`}>
      <i />
      {children}
    </span>
  )
}

function UnitSelector({
  dark = false,
  onSelect,
}: {
  dark?: boolean
  onSelect?: () => void
}) {
  const { units, activeUnit, setActiveUnitId, clinic } = useVetFlow()
  const goTo = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])
  const filtered = units.filter(
    (unit) =>
      unit.status === "Ativa" &&
      normalize(`${unit.name} ${unit.city}`).includes(normalize(query)),
  )
  return (
    <div
      className={`unit-control ${dark ? "unit-control-dark" : ""}`}
      ref={ref}
    >
      <button
        className="unit-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <MapPin size={16} />
        <span>
          <small>{clinic === "minha" ? "Minha clínica" : "Clínica exemplo · unidade"}</small>
          <strong>{activeUnit.name}</strong>
        </span>
        <ChevronDown size={15} className={open ? "rotate" : ""} />
      </button>
      {open && (
        <div className="unit-popover">
          <label className="popover-search">
            <Search size={15} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar unidade…"
            />
          </label>
          <div className="unit-options">
            {filtered.map((unit) => (
              <button
                key={unit.id}
                onClick={() => {
                  setActiveUnitId(unit.id)
                  setOpen(false)
                  setQuery("")
                  onSelect?.()
                }}
              >
                <span className="clinic-avatar">
                  {unit.shortName.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{unit.name}</strong>
                  <small>
                    {unit.city}/{unit.state}
                  </small>
                </span>
                {unit.id === activeUnit.id && <Check size={16} />}
              </button>
            ))}
            <button className="unit-switch-clinic" onClick={() => { setOpen(false); goTo("/escolher-clinica") }}>
              <span className="clinic-avatar">⇄</span>
              <span><strong>Trocar de clínica</strong><small>{clinic === "minha" ? "Ir para a Clínica exemplo" : "Ir para a Minha clínica"}</small></span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  closeMobile,
}: {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  mobileOpen: boolean
  closeMobile: () => void
}) {
  const { profile, data, user } = useVetFlow()
  const location = useLocation()
  const navigate = useNavigate()
  const role = user?.role
  const groups = navGroups.map(([g, slugs]) => [g, slugs.filter((slug) => canAccess(role, slug))] as [string, ModuleSlug[]]).filter(([, slugs]) => slugs.length)
  const openAgendaCount = data.agendas.filter(
    (item) => item.status !== "Concluído",
  ).length
  const saleQueueCount = (data.vendas || []).filter((item) => item.status === "Aguardando pagamento").length
  const deliveryCount = (data.vendas || []).filter((item) => item.extra?.entrega && /separar|pronta|rota|não entregue/i.test(item.extra.entrega.status)).length
  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
        mobileOpen ? "sidebar-mobile-open" : ""
      }`}
    >
      <div className="sidebar-top">
        <button
          className="brand"
          onClick={() => {
            navigate(user ? ROLE_HOME[user.role] : "/")
            closeMobile()
          }}
        >
          {collapsed && !mobileOpen ? (
            <i className="brand-logo-compact" aria-label="VetFlow" />
          ) : (
            <i className="brand-logo-expanded">
              <img
                src="/assets/vetflow-sidebar-logo-white.png"
                alt="VetFlow"
              />
            </i>
          )}
        </button>
        {!collapsed && (
          <IconButton label="Recolher menu" onClick={() => setCollapsed(true)}>
            <ChevronRight className="collapse-left" size={18} />
          </IconButton>
        )}
      </div>
      {!collapsed && (
        <div className="sidebar-unit">
          <UnitSelector dark onSelect={closeMobile} />
        </div>
      )}
      <nav className="nav-scroll">
        {canAccess(role, "dashboard") && <button
          className={`nav-item ${
            location.pathname === "/" ? "nav-item-active" : ""
          }`}
          onClick={() => {
            navigate("/")
            closeMobile()
          }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>}
        {groups.map(([group, slugs]) => (
          <div className="nav-group" key={group}>
            {!collapsed && <div className="nav-group-title">{group}</div>}
            {slugs.map((slug) => {
              const label = modules.find(([key]) => key === slug)?.[1]
              const Icon = moduleIcons[slug]
              const active = location.pathname.startsWith(`/${slug}`)
              return (
                <button
                  title={label}
                  className={`nav-item ${active ? "nav-item-active" : ""}`}
                  key={slug}
                  onClick={() => {
                    navigate(`/${slug}`)
                    closeMobile()
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {!collapsed && slug === "agendas" && openAgendaCount > 0 && (
                    <b>{Math.min(openAgendaCount, 99)}</b>
                  )}
                  {!collapsed && slug === "caixa" && saleQueueCount > 0 && (
                    <b>{Math.min(saleQueueCount, 99)}</b>
                  )}
                  {!collapsed && slug === "entregas" && deliveryCount > 0 && (
                    <b>{Math.min(deliveryCount, 99)}</b>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      {collapsed ? (
        <button
          className="sidebar-expand"
          onClick={() => setCollapsed(false)}
          aria-label="Expandir menu"
        >
          <ChevronRight size={16} />
        </button>
      ) : (
        <button
          className="sidebar-profile vx-side-profile"
          onClick={() => {
            navigate("/perfil")
            closeMobile()
          }}
        >
          <span className="avatar">
            {profile.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span style={{ minWidth: 0 }}>
            <strong>{profile.displayName}</strong>
            <small>{user ? `${user.role}${user.crmv && user.role !== "Administrador" ? ` · ${user.crmv}` : ""}` : profile.crmv}</small>
          </span>
          <i className="vx-online" aria-label="online" />
        </button>
      )}
    </aside>
  )
}

function GlobalSearch({ close }: { close: () => void }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    if (!query.trim()) return []
    return modules.flatMap(([slug, label]) =>
      data[slug]
        .filter((item) =>
          normalize(
            `${item.name} ${item.subtitle} ${item.animal || ""} ${item.owner || ""} ${item.notes || ""}`,
          ).includes(normalize(query)),
        )
        .slice(0, 4)
        .map((item) => ({ slug, label, item })),
    )
  }, [data, query])
  const grouped = results.reduce<Record<string, typeof results>>(
    (groups, result) => {
      groups[result.label] = [...(groups[result.label] || []), result]
      return groups
    },
    {},
  )
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div
        className="search-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-modal-input">
          <Search size={21} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar animais, tutores, exames, serviços…"
          />
          <IconButton label="Fechar busca" onClick={close}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="search-results">
          {!query && (
            <div className="empty-state">
              <Search size={28} />
              <strong>Busca global</strong>
              <p>Digite para pesquisar em todos os cadastros da unidade.</p>
            </div>
          )}
          {query && results.length === 0 && (
            <div className="empty-state">
              <PackageSearch size={28} />
              <strong>Nenhum resultado</strong>
              <p>Tente outro nome, documento ou termo clínico.</p>
            </div>
          )}
          {Object.entries(grouped).map(([label, group]) => (
            <section key={label}>
              <small>{label.toUpperCase()}</small>
              {group?.map(({ slug, item }) => {
                const Icon = moduleIcons[slug]
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/${slug}/${item.id}`)
                      close()
                    }}
                  >
                    <span className="search-result-icon">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function Header({ openMobile }: { openMobile: () => void }) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    logout,
    toggleTheme,
    theme,
    profile,
    timeZone,
    activeUnit,
    user,
  } = useVetFlow()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const now = useCurrentTime()
  const currentDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(now)
  const currentTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now)
  useEffect(() => {
    const closeProfile = (event: PointerEvent) => {
      if (
        profileOpen &&
        !profileMenuRef.current?.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
        return
      }
      if (event.key === "Escape") {
        setNotificationsOpen(false)
        setProfileOpen(false)
        setLogoutOpen(false)
      }
    }
    document.addEventListener("pointerdown", closeProfile)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeProfile)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [profileOpen])
  const goFromProfile = (path: string) => {
    setProfileOpen(false)
    navigate(path)
  }
  const slug = location.pathname.split("/")[1] as ModuleSlug
  const title =
    location.pathname === "/"
      ? "Dashboard"
      : modules.find(([key]) => key === slug)?.[1] || "VetFlow"
  return (
    <>
      <header className="header vx-header">
        <IconButton
          label="Abrir menu"
          className="mobile-menu"
          onClick={openMobile}
        >
          <Menu size={21} />
        </IconButton>
        <div className="breadcrumb bc-brand">
          <button className="bc-logo" onClick={() => navigate("/")} aria-label="VetFlow, ir para o Dashboard">
            <img src="/assets/vetflow-cat-mark.png" alt="" className="bc-cat" />
            <img src="/assets/vetflow-wordmark-dark.png" alt="VetFlow" className="bc-word bc-word-light" />
            <img src="/assets/vetflow-wordmark-light.png" alt="VetFlow" className="bc-word bc-word-dark" />
          </button>
          <ChevronRight size={13} />
          <strong>{title}</strong>
        </div>
        <button className="global-search" onClick={() => setSearchOpen(true)}>
          <Search size={17} />
          <span>Pesquisar em tudo…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="header-actions">
          <time className="header-clock" dateTime={now.toISOString()}>
            <Clock3 size={15} />
            <span className="clock-date">{currentDate} •</span>
            {currentTime}
          </time>
          <span className="active-unit-label">
            <Building2 size={14} />
            <span>{activeUnit.name}</span>
          </span>
          <UnitSelector />
          <div className="dropdown-wrap">
            <IconButton
              label="Notificações"
              onClick={() => {
                setNotificationsOpen((value) => !value)
                setProfileOpen(false)
              }}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </IconButton>
            {notificationsOpen && (
              <div className="dropdown-panel notification-panel">
                <div className="dropdown-head">
                  <span>
                    <strong>Notificações</strong>
                    <small>{unreadCount} não lidas</small>
                  </span>
                  <Button variant="ghost" onClick={markAllRead}>
                    Marcar todas como lidas
                  </Button>
                </div>
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <Bell size={24} />
                    <p>Nenhuma notificação nesta unidade.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      className={`notification-row ${
                        !item.read ? "unread" : ""
                      }`}
                      key={item.id}
                      onClick={() => {
                        markRead(item.id)
                        navigate(item.path)
                        setNotificationsOpen(false)
                      }}
                    >
                      <i />
                      <span>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                        <small>{item.time}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="dropdown-wrap" ref={profileMenuRef}>
            <button
              className="user-profile"
              onClick={() => {
                setProfileOpen((value) => !value)
                setNotificationsOpen(false)
              }}
            >
              <span className="avatar">
                {profile.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                <strong>{profile.displayName}</strong>
                <small>{user?.role || "Veterinário"}</small>
              </span>
              <ChevronDown size={15} className={profileOpen ? "rotate" : ""} />
            </button>
            {profileOpen && (
              <div className="dropdown-panel profile-menu">
                <button onClick={() => goFromProfile(user ? ROLE_HOME[user.role] : "/")}>
                  <Home size={17} />
                  <span>Menu inicial</span>
                </button>
                <button onClick={() => goFromProfile("/perfil")}>
                  <UserRound size={17} />
                  <span>Meu perfil</span>
                </button>
                <button onClick={() => goFromProfile("/configuracoes")}>
                  <Settings2 size={17} />
                  <span>Configurações</span>
                </button>
                <button
                  onClick={() => {
                    toggleTheme()
                    setProfileOpen(false)
                  }}
                >
                  {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                  <span>Alternar tema</span>
                </button>
                <button onClick={() => goFromProfile("/escolher-clinica")}>
                  <Building2 size={17} />
                  <span>Trocar de clínica</span>
                </button>
                <button onClick={() => goFromProfile("/privacidade")}>
                  <ShieldCheck size={17} />
                  <span>Privacidade e LGPD</span>
                </button>
                <button onClick={() => goFromProfile("/ajuda")}>
                  <HelpCircle size={17} />
                  <span>Ajuda e suporte</span>
                </button>
                <button
                  className="danger-link"
                  onClick={() => {
                    setProfileOpen(false)
                    setLogoutOpen(true)
                  }}
                >
                  <LogOut size={17} />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {searchOpen && <GlobalSearch close={() => setSearchOpen(false)} />}
      {logoutOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setLogoutOpen(false)}
        >
          <div
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="danger-icon">
              <LogOut size={22} />
            </span>
            <h2 id="logout-title">Deseja realmente sair do sistema?</h2>
            <p>
              Sua sessão será encerrada e será necessário entrar novamente para
              acessar o VetFlow.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => setLogoutOpen(false)}
              >
                Continuar no sistema
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setLogoutOpen(false)
                  logout()
                  navigate("/login", { replace: true })
                }}
              >
                Sim, sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PrintHead() {
  const { activeUnit, profile } = useVetFlow()
  const location = useLocation()
  const slug = location.pathname.split("/")[1]
  const title =
    location.pathname === "/" ? "Dashboard" : modules.find(([key]) => key === slug)?.[1] || "VetFlow"
  const now = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  return (
    <div className="vx-print-head" aria-hidden="true">
      <img src="/assets/vetflow-logo.png" alt="" />
      <span style={{ textAlign: "right" }}>
        <b>{title}</b>
        <small>{activeUnit.name} · emitido em {now} por {profile.displayName}</small>
      </span>
    </div>
  )
}

function Shell() {
  const { authenticated, clinic, user } = useVetFlow()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!authenticated) return <Navigate to="/site" replace />
  if (!clinic) return <Navigate to="/escolher-clinica" replace />
  const area = location.pathname === "/" ? "dashboard" : location.pathname.split("/")[1]
  if (user && !canAccess(user.role, area)) return <Navigate to={ROLE_HOME[user.role]} replace />
  return (
    <div className={`app-shell ${collapsed ? "shell-collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <div className="app-main">
        <Header openMobile={() => setMobileOpen(true)} />
        <main>
          <PrintHead />
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
          <div className="vx-print-foot">VetFlow 1.0 · 404 — documento gerado pelo sistema</div>
        </main>
        <footer className="vx-copy">© {new Date().getFullYear()} VetFlow 1.0 · 404. Todos os direitos reservados.</footer>
      </div>
    </div>
  )
}

function Login() {
  const { authenticated, clinic, login, theme } = useVetFlow()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [accepted, setAccepted] = useState(() => { try { return localStorage.getItem("vetflow-lgpd") === "1" } catch { return false } })
  if (authenticated) return <Navigate to={clinic ? "/" : "/escolher-clinica"} replace />

  const cover =
    theme === "dark"
      ? "/assets/vetflow-login-cover-dark.png"
      : "/assets/vetflow-login-cover.png"

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const id = String(values.get("email") || "").trim()
    const pass = String(values.get("password") || "")
    if (!id || !pass) return setError("Informe usuário, e-mail ou CPF e a senha.")
    if (!accepted) return setError("Para entrar, aceite os Termos de Uso e a Política de Privacidade.")
    setLoading(true)
    window.setTimeout(() => {
      const u = login(id, pass)
      if (!u) {
        setLoading(false)
        setError("Usuário ou senha incorretos.")
        return
      }
      try { localStorage.setItem("vetflow-lgpd", "1") } catch { /* sem armazenamento */ }
      navigate("/escolher-clinica")
    }, 350)
  }
  return (
    <div className="login-page">
      <section className="login-brand-panel login-image-panel">
        <img src={cover} alt="VetFlow 1.0 com cachorro" />
      </section>
      <section className="login-form-panel">
        <form className="login-form-card" onSubmit={submit}>
          <img src="/assets/vetflow-logo.png" alt="VetFlow" />
          <span className="eyebrow">LOGIN</span>
          <h2>Bem-vindo ao VetFlow</h2>
          <p>Entre com seu usuário, e-mail ou CPF e sua senha.</p>
          <label>
            <span>Usuário, e-mail ou CPF</span>
            <div className="input-control">
              <Mail size={18} />
              <input name="email" type="text" autoComplete="username" placeholder="Digite seu usuário, e-mail ou CPF" />
            </div>
          </label>
          <label>
            <span>Senha</span>
            <div className="input-control">
              <LockKeyhole size={18} />
              <input name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" />
            </div>
          </label>
          <label className="login-terms">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>Li e aceito os <a href="/privacidade" target="_blank" rel="noreferrer">Termos de Uso e a Política de Privacidade</a> (LGPD).</span>
          </label>
          {error && (
            <div className="form-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar no VetFlow"}
          </Button>
          <button type="button" className="text-link" onClick={() => setError("Peça ao administrador da clínica para redefinir sua senha em Usuários e acessos.")}>
            Esqueci minha senha
          </button>
          <div className="login-accounts" aria-label="Acessos de teste">
            <b>Acessos de teste</b>
            {[["Administrador", "admin", "admin123"], ["Vendedor", "vendedor", "vendedor123"], ["Caixa", "caixa", "caixa123"], ["Estoque", "estoque", "estoque123"], ["Veterinário", "veterinario", "vet123"], ["Entregador", "entregador", "entrega123"]].map(([r, u, pw]) => (
              <span key={u} className={`role-${normalize(r)}`}><i>{r}</i><code>{u}</code><code>{pw}</code></span>
            ))}
          </div>
          <button type="button" className="text-link" onClick={() => navigate("/site")}>
            ← Voltar ao site
          </button>
        </form>
      </section>
    </div>
  )
}

function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </section>
  )
}

type Indicator = {
  label: string
  value: string
  detail: string
  tone: string
  match: (item: Item) => boolean
}

const hasStatus = (item: Item, terms: string[]) =>
  terms.some((term) => normalize(item.status).includes(normalize(term)))

function moduleIndicators(
  slug: ModuleSlug,
  items: Item[],
  data: UnitData,
): Indicator[] {
  const all = () => true
  const status = (terms: string[]) => (item: Item) => hasStatus(item, terms)
  const count = (predicate: (item: Item) => boolean) =>
    items.filter(predicate).length
  const metric = (
    label: string,
    predicate: (item: Item) => boolean,
    detail: string,
    tone: string,
    value?: string,
  ): Indicator => ({
    label,
    value: value ?? String(count(predicate)),
    detail,
    tone,
    match: predicate,
  })
  const recent = (item: Item) => inLastDays(item, 30)
  const active = status(["ativo", "confirmado", "aplicada", "assinada"])
  const pending = status([
    "pendente",
    "aguardando",
    "aberta",
    "análise",
    "rascunho",
  ])
  const complete = status([
    "conclu",
    "resolvida",
    "recebido",
    "pago",
    "publicada",
    "arquivado",
    "alta",
  ])
  const total = metric("Total", all, "nos filtros atuais", "blue")

  if (slug === "tutores")
    return [
      total,
      metric("Ativos", status(["Ativo"]), "relacionamento ativo", "green"),
      metric(
        "Inadimplentes",
        status(["Inadimplente"]),
        "com valores em aberto",
        "red",
      ),
      metric("Novos no mês", recent, "últimos 30 dias", "orange"),
    ]
  if (slug === "animais") {
    const overdueAnimals = new Set(
      data.vacinas.filter(status(["Atrasada"])).map((item) => item.animalId),
    )
    return [
      total,
      metric("Ativos", status(["Ativo"]), "pacientes ativos", "green"),
      metric(
        "Em tratamento",
        status(["tratamento"]),
        "acompanhamento clínico",
        "orange",
      ),
      metric("Internados", status(["Internado"]), "sob cuidado", "violet"),
      metric(
        "Vacinas em atraso",
        (item) => overdueAnimals.has(item.id),
        "reforço necessário",
        "red",
      ),
    ]
  }
  if (slug === "consultas")
    return [
      total,
      metric(
        "Hoje",
        (item) => item.date === "2026-10-09",
        "agenda do dia",
        "blue",
      ),
      metric(
        "Em andamento",
        status(["Em andamento"]),
        "atendimento aberto",
        "orange",
      ),
      metric(
        "Retornos pendentes",
        (item) =>
          normalize(item.service || "").includes("retorno") &&
          !hasStatus(item, ["Concluído"]),
        "aguardam conclusão",
        "red",
      ),
    ]
  if (slug === "vacinas")
    return [
      metric("Aplicadas", status(["Aplicada"]), "histórico completo", "green"),
      metric(
        "A vencer em 30 dias",
        status(["A vencer"]),
        "reforços próximos",
        "orange",
      ),
      metric("Atrasadas", status(["Atrasada"]), "ação necessária", "red"),
      total,
    ]
  if (slug === "prescricoes")
    return [
      metric("Ativas", status(["Ativa"]), "em uso", "green"),
      metric("Vencendo", status(["Vencendo"]), "revisar validade", "orange"),
      metric(
        "Renovações pendentes",
        status(["Renovação"]),
        "aguardam profissional",
        "red",
      ),
      total,
    ]
  if (slug === "exames")
    return [
      metric("Solicitados", status(["Solicitado"]), "pedidos abertos", "blue"),
      metric(
        "Aguardando resultado",
        status(["Aguardando"]),
        "em processamento",
        "orange",
      ),
      metric("Concluídos", status(["Concluído"]), "laudos liberados", "green"),
      metric("Urgentes", (item) => !!item.urgency, "prioridade clínica", "red"),
    ]
  if (slug === "estoque") {
    const stockValue = items.reduce(
      (sum, item) => sum + (item.amountValue || 0),
      0,
    )
    return [
      total,
      metric(
        "Abaixo do mínimo",
        (item) => (item.quantity || 0) < (item.minimum || 0),
        "reposição indicada",
        "red",
      ),
      metric(
        "Vencendo / vencidos",
        status(["Vencido"]),
        "revisar lotes",
        "orange",
      ),
      metric(
        "Valor em estoque",
        all,
        "custo dos itens",
        "green",
        formatCurrency(stockValue),
      ),
    ]
  }
  if (slug === "financeiro") {
    const revenue = items
      .filter((item) => item.category === "Receita")
      .reduce((sum, item) => sum + (item.amountValue || 0), 0)
    const expenses = items
      .filter((item) => item.category === "Despesa")
      .reduce((sum, item) => sum + (item.amountValue || 0), 0)
    const receivable = items
      .filter(status(["A receber"]))
      .reduce((sum, item) => sum + (item.amountValue || 0), 0)
    const overdue = items
      .filter(status(["Vencido"]))
      .reduce((sum, item) => sum + (item.amountValue || 0), 0)
    return [
      metric(
        "Receita",
        (item) => item.category === "Receita",
        "entradas",
        "green",
        formatCurrency(revenue),
      ),
      metric(
        "Despesas",
        (item) => item.category === "Despesa",
        "saídas",
        "red",
        formatCurrency(expenses),
      ),
      metric(
        "Saldo",
        all,
        "receita menos despesas",
        "blue",
        formatCurrency(revenue - expenses),
      ),
      metric(
        "A receber",
        status(["A receber"]),
        "valores em aberto",
        "orange",
        formatCurrency(receivable),
      ),
      metric(
        "Vencido",
        status(["Vencido"]),
        "requer cobrança",
        "red",
        formatCurrency(overdue),
      ),
    ]
  }

  const labels: Partial<Record<ModuleSlug, [string, string, string, string]>> =
    {
      prontuarios: [
        "Prontuários",
        "Atualizados no mês",
        "Com pendências",
        "Revisados",
      ],
      profissionais: [
        "Profissionais",
        "Ativos",
        "Plantões",
        "Atendimentos no mês",
      ],
      procedimentos: [
        "Procedimentos",
        "Agendados",
        "Em andamento",
        "Concluídos",
      ],
      cirurgias: ["Cirurgias", "Agendadas", "Pré-operatório", "Concluídas"],
      internacoes: ["Internações", "Em andamento", "Em observação", "Altas"],
      protocolos: ["Protocolos", "Ativos", "Em revisão", "Aprovados"],
      servicos: ["Serviços", "Ativos", "Mais utilizados", "Atualizados no mês"],
      convenios: ["Convênios", "Ativos", "Em análise", "Suspensos"],
      teleatendimentos: [
        "Teleatendimentos",
        "Agendados",
        "Em andamento",
        "Concluídos",
      ],
      comunicacao: ["Comunicações", "Enviadas", "Pendentes", "Respondidas"],
      publicacoes: ["Publicações", "Publicadas", "Agendadas", "Rascunhos"],
      documentos: ["Documentos", "Assinados", "Pendentes", "Arquivados"],
      ocorrencias: ["Ocorrências", "Abertas", "Em análise", "Resolvidas"],
      usuarios: ["Usuários", "Ativos", "Convites pendentes", "Bloqueados"],
      medicamentos: ["Medicamentos", "Disponíveis", "Controlados", "Ativos"],
      agendas: ["Agendamentos", "Confirmados", "Aguardando", "Concluídos"],
      unidades: ["Unidades", "Ativas", "Disponíveis", "Atualizadas"],
      relatorios: ["Relatórios", "Atualizados", "Agendados", "Gerados"],
    }
  const names = labels[slug] || [
    "Registros",
    "Ativos",
    "Pendentes",
    "Concluídos",
  ]
  return [
    metric(names[0], all, "registros", "blue"),
    metric(names[1], active, "em operação", "green"),
    metric(names[2], pending, "requerem atenção", "orange"),
    metric(names[3], complete, "finalizados", "violet"),
  ]
}

function Dashboard() {
  const { activeUnit, data, timeZone } = useVetFlow()
  const navigate = useNavigate()
  const [period, setPeriod] = useState(30)

  const hour = zonedDateParts(new Date(), timeZone).hour
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  const periodConsultations = useMemo(
    () => data.consultas.filter((item) => inLastDays(item, period)),
    [data.consultas, period],
  )
  const periodFinance = useMemo(
    () => data.financeiro.filter((item) => inLastDays(item, period)),
    [data.financeiro, period],
  )
  const totals = useMemo(() => {
    const revenue = periodFinance
      .filter((item) => item.category === "Receita")
      .reduce((sum, item) => sum + (item.amountValue || 0), 0)
    const activeAdmissions = data.internacoes.filter((item) =>
      hasStatus(item, ["Em andamento", "Em observação"]),
    ).length
    return {
      appointments: periodConsultations.length,
      revenue,
      patients: data.animais.filter((item) => item.status !== "Falecido")
        .length,
      occupancy: Math.round(
        (activeAdmissions / Math.max(1, data.internacoes.length)) * 100,
      ),
    }
  }, [data.animais, data.internacoes, periodConsultations, periodFinance])
  const chartPoints = useMemo(() => {
    const buckets = period <= 15 ? 7 : 10
    const values = Array.from({ length: buckets }, () => 0)
    periodConsultations.forEach((item) => {
      const age = Math.max(
        0,
        Math.floor(
          (new Date("2026-10-09T12:00:00").getTime() -
            new Date(`${item.date}T12:00:00`).getTime()) /
            86_400_000,
        ),
      )
      const bucket = Math.min(
        buckets - 1,
        Math.floor((age / Math.max(1, period)) * buckets),
      )
      values[buckets - 1 - bucket] += 1
    })
    const max = Math.max(...values, 1)
    return values.map((value) => ({
      value,
      height: Math.max(8, Math.round((value / max) * 100)),
    }))
  }, [period, periodConsultations])

  const metricCards: [LucideIcon, string, string, string, string, string][] = [
    [
      CalendarDays,
      "Atendimentos",
      String(totals.appointments),
      `${period} dias selecionados`,
      "orange",
      "/consultas",
    ],
    [
      CircleDollarSign,
      "Receita",
      formatCurrency(totals.revenue),
      "mesma base do financeiro",
      "green",
      "/financeiro",
    ],
    [
      PawPrint,
      "Pacientes ativos",
      String(totals.patients),
      "Cadastros da unidade",
      "aqua",
      "/animais",
    ],
    [
      Hospital,
      "Ocupação",
      `${totals.occupancy}%`,
      "Leitos monitorados",
      "violet",
      "/internacoes",
    ],
  ]

  return (
    <div className="page dash-page">
      <div className="dash-greeting">
        <div>
          <span className="eyebrow">VISÃO EXECUTIVA</span>
          <h1>{greeting}, Dr. Rafael</h1>
          <p>{activeUnit.name} • indicadores atualizados em tempo real</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate("/relatorios")}>
            <FileChartColumn size={17} />
            Ver relatórios
          </Button>
          <Button onClick={() => navigate("/consultas/novo")}>
            <Plus size={17} />
            Nova consulta
          </Button>
        </div>
      </div>

      <section className="dash-metrics">
        {metricCards.map(([Icon, label, value, detail, tone, path]) => (
          <button
            className="dash-metric-card"
            key={label}
            onClick={() => navigate(path)}
          >
            <i className={`tone-${tone}`}>
              <Icon size={20} />
            </i>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              <em>{detail}</em>
            </span>
          </button>
        ))}
      </section>

      <section className="command-center dash-glass-panel">
        <div>
          <span>
            <Activity size={16} /> CENTRO DE OPERAÇÕES
          </span>
          <h2>
            {data.agendas.filter((item) => item.status !== "Concluído").length}{" "}
            atividades requerem acompanhamento
          </h2>
          <p>
            Consultas, internações, vacinas e pendências financeiras organizadas
            por prioridade.
          </p>
        </div>
        <Button onClick={() => navigate("/agendas")}>
          Abrir agenda <ChevronRight size={17} />
        </Button>
      </section>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>Atendimentos no período</h2>
              <p>{totals.appointments} atendimentos • comparação automática</p>
            </div>
            <div className="period-tabs">
              {[7, 15, 30, 90].map((value) => (
                <button
                  className={period === value ? "active" : ""}
                  onClick={() => setPeriod(value)}
                  key={value}
                >
                  {value} dias
                </button>
              ))}
            </div>
          </div>
          <div className="animated-chart">
            {chartPoints.map((point, index) => (
              <button
                title={`${point.value} atendimentos`}
                key={`${period}-${index}`}
              >
                <i style={{ height: `${point.height}%` }} />
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Próximos atendimentos</h2>
              <p>Agenda da unidade</p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/agendas")}>
              Ver todos
            </Button>
          </div>
          <div className="compact-list">
            {data.agendas.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/agendas/${item.id}`)}
              >
                <span className="pet-avatar">
                  {item.animal?.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.animal} • {item.professional}
                  </small>
                </span>
                <b>{item.time}</b>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function RecordForm({
  module,
  item,
  close,
  success,
}: {
  module: ModuleSlug
  item?: Item
  close: () => void
  success: (item: Item) => void
}) {
  const { addItem, updateItem, data, timeZone } = useVetFlow()
  const label = modules.find(([slug]) => slug === module)?.[1]
  const [error, setError] = useState("")
  const defaultDate = dateFromZonedParts(new Date(), timeZone)
  if (module === "agendas") {
    const agendaDate = nextAgendaDate(new Date(), timeZone)
    defaultDate.setFullYear(
      agendaDate.getFullYear(),
      agendaDate.getMonth(),
      agendaDate.getDate(),
    )
  }
  const defaultDateValue = `${defaultDate.getFullYear()}-${String(
    defaultDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}`
  const linkedModules: ModuleSlug[] = [
    "vacinas",
    "prescricoes",
    "exames",
    "procedimentos",
    "cirurgias",
    "internacoes",
    "consultas",
    "agendas",
    "teleatendimentos",
  ]
  const requiresAnimal = linkedModules.includes(module)
  const hasDedicatedForm = [
    "tutores",
    "animais",
    "profissionais",
    "prontuarios",
    "consultas",
    "agendas",
  ].includes(module)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>
    const animal = data.animais.find(
      (candidate) => candidate.id === form.animalId,
    )
    const tutor = data.tutores.find(
      (candidate) => candidate.id === form.ownerId,
    )
    const professional = data.profissionais.find(
      (candidate) => candidate.id === form.professionalId,
    )

    if (module === "tutores") {
      form.subtitle = [form.phone, form.email].filter(Boolean).join(" • ")
    } else if (module === "animais") {
      form.owner = tutor?.name || ""
      form.subtitle = [form.species, form.breed].filter(Boolean).join(" • ")
    } else if (module === "profissionais") {
      form.subtitle = [form.category, form.registration]
        .filter(Boolean)
        .join(" • ")
    } else if (["prontuarios", "consultas", "agendas"].includes(module)) {
      form.animal = animal?.name || ""
      form.owner = animal?.owner || ""
      form.ownerId = animal?.ownerId || ""
      form.professional = professional?.name || ""
      form.subtitle = [animal?.name, animal?.owner].filter(Boolean).join(" • ")
      if (module !== "prontuarios") form.name = form.service
    } else if (animal && !form.subtitle?.trim()) {
      form.subtitle = `${animal.name} • ${animal.owner}`
    }

    const requiredByModule: Partial<Record<ModuleSlug, string[]>> = {
      tutores: ["name", "phone", "email"],
      animais: ["name", "ownerId", "species", "breed"],
      profissionais: ["name", "registration", "category", "phone"],
      prontuarios: ["name", "animalId", "professionalId", "date"],
      consultas: ["service", "animalId", "professionalId", "date", "time"],
      agendas: ["service", "animalId", "professionalId", "date", "time"],
    }
    const required = requiredByModule[module] || ["name", "subtitle"]
    if (
      required.some((field) => !form[field]?.trim()) ||
      (requiresAnimal && data.animais.length > 0 && !animal)
    ) {
      return setError("Preencha todos os campos obrigatórios indicados.")
    }
    if (item) {
      updateItem(module, item.id, form)
      success({ ...item, ...form })
    } else success(addItem(module, form))
  }
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="form-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {item ? "EDITAR REGISTRO" : "NOVO REGISTRO"}
            </span>
            <h2>{item ? `Editar ${item.name}` : `Novo em ${label}`}</h2>
            <p>Os dados serão vinculados à unidade ativa.</p>
          </div>
          <IconButton label="Fechar" type="button" onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
        <div className={`form-grid ${hasDedicatedForm ? "dedicated-form" : ""}`}>
          {module === "tutores" && (
            <>
              <label>
                <span>Nome completo *</span>
                <input name="name" defaultValue={item?.name} placeholder="Nome do tutor" />
              </label>
              <label>
                <span>CPF</span>
                <input name="cpf" defaultValue={item?.cpf} placeholder="000.000.000-00" />
              </label>
              <label>
                <span>Telefone *</span>
                <input name="phone" defaultValue={item?.phone} placeholder="(00) 00000-0000" />
              </label>
              <label>
                <span>E-mail *</span>
                <input name="email" type="email" defaultValue={item?.email} placeholder="tutor@email.com" />
              </label>
              <label className="full-field">
                <span>Endereço</span>
                <input name="address" defaultValue={item?.address} placeholder="Rua, número, bairro e cidade" />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue={item?.status || "Ativo"}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                  <option>Inadimplente</option>
                </select>
              </label>
              <label className="full-field">
                <span>Observações</span>
                <textarea name="notes" defaultValue={item?.notes} placeholder="Preferências de contato e informações relevantes…" />
              </label>
            </>
          )}
          {module === "animais" && (
            <>
              <label>
                <span>Nome do animal *</span>
                <input name="name" defaultValue={item?.name} placeholder="Nome do paciente" />
              </label>
              <label>
                <span>Tutor responsável *</span>
                <select name="ownerId" defaultValue={item?.ownerId || ""}>
                  <option value="">Selecione o tutor</option>
                  {data.tutores.map((tutor) => (
                    <option value={tutor.id} key={tutor.id}>{tutor.name} • {tutor.phone}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Espécie *</span>
                <select name="species" defaultValue={item?.species || ""}>
                  <option value="">Selecione</option>
                  <option>Cão</option>
                  <option>Gato</option>
                  <option>Ave</option>
                  <option>Roedor</option>
                  <option>Outro</option>
                </select>
              </label>
              <label>
                <span>Raça *</span>
                <input name="breed" defaultValue={item?.breed} placeholder="Raça ou sem raça definida" />
              </label>
              <label>
                <span>Sexo</span>
                <select name="sex" defaultValue={item?.sex || ""}>
                  <option value="">Não informado</option>
                  <option>Macho</option>
                  <option>Fêmea</option>
                </select>
              </label>
              <label>
                <span>Data de nascimento</span>
                <input name="birthDate" type="date" defaultValue={item?.birthDate} />
              </label>
              <label>
                <span>Peso atual</span>
                <input name="weight" defaultValue={item?.weight} placeholder="Ex.: 12,5 kg" />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue={item?.status || "Ativo"}>
                  <option>Ativo</option>
                  <option>Em tratamento</option>
                  <option>Internado</option>
                  <option>Inativo</option>
                </select>
              </label>
              <label className="full-field">
                <span>Observações clínicas</span>
                <textarea name="notes" defaultValue={item?.notes} placeholder="Alergias, condições preexistentes e cuidados relevantes…" />
              </label>
            </>
          )}
          {module === "profissionais" && (
            <>
              <label>
                <span>Nome completo *</span>
                <input name="name" defaultValue={item?.name} placeholder="Nome do profissional" />
              </label>
              <label>
                <span>Registro profissional *</span>
                <input name="registration" defaultValue={item?.registration || item?.subtitle?.split(" • ")[1]} placeholder="Ex.: CRMV-RO 1234" />
              </label>
              <label>
                <span>Especialidade *</span>
                <input name="category" defaultValue={item?.category} placeholder="Ex.: Clínica geral" />
              </label>
              <label>
                <span>Telefone *</span>
                <input name="phone" defaultValue={item?.phone} placeholder="(00) 00000-0000" />
              </label>
              <label>
                <span>E-mail</span>
                <input name="email" type="email" defaultValue={item?.email} placeholder="profissional@clinica.com" />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue={item?.status || "Ativo"}>
                  <option>Ativo</option>
                  <option>Plantão eventual</option>
                  <option>Afastado</option>
                  <option>Inativo</option>
                </select>
              </label>
              <label className="full-field">
                <span>Observações</span>
                <textarea name="notes" defaultValue={item?.notes} placeholder="Disponibilidade, áreas de atuação e informações relevantes…" />
              </label>
            </>
          )}
          {["prontuarios", "consultas", "agendas"].includes(module) && (
            <>
              <label>
                <span>Animal / tutor *</span>
                <select name="animalId" defaultValue={item?.animalId || ""}>
                  <option value="">Selecione o paciente</option>
                  {data.animais.map((animal) => (
                    <option value={animal.id} key={animal.id}>{animal.name} • tutor: {animal.owner}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Profissional responsável *</span>
                <select name="professionalId" defaultValue={item?.professionalId || ""}>
                  <option value="">Selecione o profissional</option>
                  {data.profissionais.map((professional) => (
                    <option value={professional.id} key={professional.id}>{professional.name} • {professional.category}</option>
                  ))}
                </select>
              </label>
              {module === "prontuarios" ? (
                <>
                  <label>
                    <span>Título da evolução *</span>
                    <input name="name" defaultValue={item?.name} placeholder="Ex.: Evolução clínica de retorno" />
                  </label>
                  <label>
                    <span>Tipo de registro</span>
                    <select name="category" defaultValue={item?.category || "Evolução clínica"}>
                      <option>Evolução clínica</option>
                      <option>Anamnese</option>
                      <option>Resultado de exame</option>
                      <option>Prescrição</option>
                      <option>Alta médica</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>{module === "agendas" ? "Serviço / motivo *" : "Tipo de consulta *"}</span>
                    <input name="service" defaultValue={item?.service || item?.name} placeholder="Ex.: Consulta clínica" />
                  </label>
                  <label>
                    <span>Tipo de atendimento</span>
                    <select name="category" defaultValue={item?.category || "Clínica"}>
                      <option>Clínica</option>
                      <option>Retorno</option>
                      <option>Emergência</option>
                      <option>Vacinação</option>
                      <option>Exame</option>
                    </select>
                  </label>
                </>
              )}
              <label>
                <span>Data *</span>
                <input name="date" type="date" defaultValue={item?.date || defaultDateValue} />
              </label>
              <label>
                <span>Horário *</span>
                <input name="time" type="time" defaultValue={item?.time || "09:00"} />
              </label>
              <label>
                <span>Status</span>
                <select name="status" defaultValue={item?.status || (module === "agendas" ? "Agendado" : "Em andamento")}>
                  <option>Agendado</option>
                  <option>Confirmado</option>
                  <option>Em andamento</option>
                  <option>Concluído</option>
                  <option>Cancelado</option>
                </select>
              </label>
              {module === "prontuarios" && (
                <>
                  <label className="full-field">
                    <span>Histórico e anamnese</span>
                    <textarea name="clinicalHistory" defaultValue={item?.clinicalHistory} placeholder="Queixa principal, histórico, sinais clínicos e achados do exame físico…" />
                  </label>
                  <label className="full-field">
                    <span>Diagnóstico / hipótese diagnóstica</span>
                    <textarea name="diagnosis" defaultValue={item?.diagnosis} placeholder="Diagnóstico confirmado ou hipóteses em investigação…" />
                  </label>
                  <label className="full-field">
                    <span>Conduta e tratamento</span>
                    <textarea name="treatment" defaultValue={item?.treatment} placeholder="Conduta adotada, medicações e orientações ao tutor…" />
                  </label>
                </>
              )}
              {module !== "prontuarios" && (
                <label className="full-field">
                  <span>{module === "agendas" ? "Observações do agendamento" : "Queixa principal e observações"}</span>
                  <textarea name="notes" defaultValue={item?.notes} placeholder={module === "agendas" ? "Preferências do tutor, preparo necessário ou informações para a recepção…" : "Motivo da consulta, sintomas informados e observações iniciais…"} />
                </label>
              )}
            </>
          )}
          {!hasDedicatedForm && requiresAnimal && data.animais.length > 0 && (
            <label>
              <span>Animal vinculado *</span>
              <select
                name="animalId"
                defaultValue={item?.animalId || data.animais[0]?.id}
              >
                {data.animais.map((animal) => (
                  <option value={animal.id} key={animal.id}>
                    {animal.name} • {animal.owner}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!hasDedicatedForm && <label>
            <span>Nome *</span>
            <input
              name="name"
              defaultValue={item?.name}
              placeholder="Nome ou título do registro"
            />
          </label>}
          {!hasDedicatedForm && <label>
            <span>Informação secundária *</span>
            <input
              name="subtitle"
              defaultValue={item?.subtitle}
              placeholder="Animal, tutor ou descrição"
            />
          </label>}
          {!hasDedicatedForm && <label>
            <span>Status</span>
            <select name="status" defaultValue={item?.status || "Ativo"}>
              <option>Ativo</option>
              <option>Confirmado</option>
              <option>Pendente</option>
              <option>Concluído</option>
              <option>Cancelado</option>
            </select>
          </label>}
          {!hasDedicatedForm && <label>
            <span>Profissional</span>
            <select
              name="professional"
              defaultValue={item?.professional || "Dr. Rafael Souza"}
            >
              {data.profissionais.map((professional) => (
                <option key={professional.id}>{professional.name}</option>
              ))}
            </select>
          </label>}
          {!hasDedicatedForm && <label>
            <span>Data</span>
            <input
              name="date"
              type="date"
              defaultValue={item?.date || defaultDateValue}
            />
          </label>}
          {!hasDedicatedForm && <label>
            <span>Horário</span>
            <input
              name="time"
              type="time"
              defaultValue={item?.time || "09:00"}
            />
          </label>}
          {!hasDedicatedForm && <label className="full-field">
            <span>Observações</span>
            <textarea
              name="notes"
              defaultValue={item?.notes}
              placeholder="Informações relevantes…"
            />
          </label>}
        </div>
        {error && (
          <div className="form-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit">Salvar registro</Button>
        </div>
      </form>
    </div>
  )
}

function ModuleRoute() {
  const { module = "" } = useParams()
  return modules.some(([slug]) => slug === module) ? <ModuleList key={module} /> : <VxNotFound />
}

function ModuleList() {
  const { module = "animais" } = useParams()
  const slug = module as ModuleSlug
  const { data, highlightedId } = useVetFlow()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos")
  const [periodFilter, setPeriodFilter] = useState(
    slug === "financeiro" ? "30" : "all",
  )
  const [sort, setSort] = useState("recent")
  const [indicatorFilter, setIndicatorFilter] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [toast, setToast] = useState("")
  const perPage = 8
  const title = modules.find(([key]) => key === slug)?.[1] || "Registros"
  const items = data[slug] || []
  const queryFiltered = useMemo(
    () =>
      items
        .filter(
          (item) =>
            periodFilter === "all" || inLastDays(item, Number(periodFilter)),
        )
        .filter((item) =>
          normalize(
            `${item.name} ${item.subtitle} ${item.status} ${item.owner || ""} ${item.professional || ""}`,
          ).includes(normalize(query)),
        ),
    [items, query, periodFilter],
  )
  const statusFiltered = useMemo(
    () =>
      queryFiltered.filter(
        (item) => status === "Todos" || item.status === status,
      ),
    [queryFiltered, status],
  )
  const indicators = useMemo(
    () => moduleIndicators(slug, statusFiltered, data),
    [slug, statusFiltered, data],
  )
  const filtered = useMemo(
    () =>
      statusFiltered
        .filter((item) => {
          const indicator = indicators.find(
            (candidate) => candidate.label === indicatorFilter,
          )
          return indicator ? indicator.match(item) : true
        })
        .sort((a, b) =>
          sort === "recent"
            ? b.createdAt.localeCompare(a.createdAt)
            : a.name.localeCompare(b.name),
        ),
    [statusFiltered, indicators, indicatorFilter, sort],
  )
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const visible = filtered.slice((page - 1) * perPage, page * perPage)
  useEffect(() => {
    setPage(1)
  }, [query, status, sort, indicatorFilter])
  return (
    <div className="page">
      <PageTitle
        eyebrow="GESTÃO INTEGRADA"
        title={title}
        description={`Cadastros, histórico e operação de ${title.toLowerCase()} na unidade ativa.`}
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={17} />
          Novo registro
        </Button>
      </PageTitle>
      <section
        className={`summary-strip indicator-count-${indicators.length} ${
          slug === "financeiro" ? "finance-summary" : ""
        }`}
      >
        {indicators.map((indicator) => (
          <button
            className={indicatorFilter === indicator.label ? "active" : ""}
            onClick={() =>
              setIndicatorFilter((current) =>
                current === indicator.label ? "" : indicator.label,
              )
            }
            key={indicator.label}
          >
            <span className={`metric-icon metric-${indicator.tone}`}>
              <BarChart3 size={17} />
            </span>
            <span>
              <small>{indicator.label}</small>
              <strong title={indicator.value}>{indicator.value}</strong>
              <em>{indicator.detail}</em>
            </span>
          </button>
        ))}
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar em ${title.toLowerCase()}…`}
            />
          </label>
          <label className="select-filter">
            <Filter size={15} />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setIndicatorFilter("")
              }}
            >
              <option>Todos</option>
              {[...new Set(items.map((item) => item.status))]
                .sort()
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <label className="select-filter">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Mais recentes</option>
              <option value="name">Nome A–Z</option>
            </select>
          </label>
          <label className="select-filter">
            <CalendarDays size={15} />
            <select
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value)
                setIndicatorFilter("")
              }}
            >
              <option value="all">Todo o histórico</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Últimos 12 meses</option>
            </select>
          </label>
          <span className="result-count">{filtered.length} resultados</span>
        </div>
        <div
          className={`data-table ${
            slug === "profissionais" ? "professionals-table" : ""
          }`}
        >
          <div className="record-row table-head">
            <span>Registro</span>
            <span>Detalhes</span>
            <span>Profissional / contato</span>
            <span>Data</span>
            <span>Status</span>
            <span />
          </div>
          {visible.length === 0 ? (
            <div className="empty-state">
              <PackageSearch size={28} />
              <strong>
                {items.length === 0
                  ? slug === "financeiro"
                    ? "Nenhum lançamento ainda"
                    : `Nenhum registro em ${title.toLowerCase()}`
                  : "Nenhum registro encontrado"}
              </strong>
              <p>
                {items.length === 0
                  ? "Esta unidade está pronta para receber o primeiro cadastro."
                  : "Ajuste a busca ou os filtros."}
              </p>
              {items.length === 0 && (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus size={16} />
                  {slug === "financeiro"
                    ? "Adicionar lançamento"
                    : "Adicionar primeiro registro"}
                </Button>
              )}
            </div>
          ) : (
            visible.map((item) => {
              const Icon = moduleIcons[slug]
              return (
                <button
                  className={`record-row ${
                    highlightedId === item.id ? "new-highlight" : ""
                  }`}
                  key={item.id}
                  onClick={() => navigate(`/${slug}/${item.id}`)}
                >
                  <span className="record-name">
                    <i>
                      <Icon size={17} />
                    </i>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.id.toUpperCase()}</small>
                    </span>
                  </span>
                  <span className="record-details">{item.subtitle}</span>
                  <span className="record-contact">
                    {item.professional ||
                      item.phone ||
                      item.owner ||
                      "Equipe VetFlow"}
                  </span>
                  <span>
                    {item.date ||
                      new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <Status>{item.status}</Status>
                  <ChevronRight size={16} />
                </button>
              )
            })
          )}
        </div>
        <div className="pagination">
          <span>
            Página {page} de {pages}
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page === pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </section>
      {formOpen && (
        <RecordForm
          module={slug}
          close={() => setFormOpen(false)}
          success={(item) => {
            setFormOpen(false)
            setToast(`${item.name} foi criado e aparece primeiro na lista.`)
            window.setTimeout(() => setToast(""), 3500)
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

const reportDefinitions: Record<
  string,
  { title: string; description: string; modules: ModuleSlug[] }
> = {
  atendimentos: {
    title: "Atendimentos",
    description: "Histórico de consultas e atendimentos registrados na unidade.",
    modules: ["consultas"],
  },
  financeiro: {
    title: "Financeiro (receitas e despesas)",
    description: "Lançamentos financeiros da unidade ativa.",
    modules: ["financeiro"],
  },
  "faturamento-servico": {
    title: "Faturamento por serviço",
    description: "Lançamentos financeiros para análise dos serviços prestados.",
    modules: ["financeiro"],
  },
  "faturamento-profissional": {
    title: "Faturamento por profissional",
    description: "Lançamentos financeiros associados à equipe da unidade.",
    modules: ["financeiro"],
  },
  "estoque-validade": {
    title: "Estoque e validade",
    description: "Itens cadastrados e informações disponíveis de estoque.",
    modules: ["estoque"],
  },
  vacinas: {
    title: "Vacinas aplicadas e atrasadas",
    description: "Registros de vacinação dos pacientes.",
    modules: ["vacinas"],
  },
  internacoes: {
    title: "Internações",
    description: "Registros de internações da unidade.",
    modules: ["internacoes"],
  },
  cirurgias: {
    title: "Cirurgias",
    description: "Registros cirúrgicos disponíveis na unidade.",
    modules: ["cirurgias"],
  },
  "agendamentos-faltas": {
    title: "Agendamentos e faltas",
    description: "Agendamentos registrados na unidade.",
    modules: ["agendas"],
  },
  "novos-clientes": {
    title: "Novos clientes e animais",
    description: "Cadastros de tutores e pacientes.",
    modules: ["tutores", "animais"],
  },
  convenios: {
    title: "Convênios",
    description: "Convênios cadastrados na unidade.",
    modules: ["convenios"],
  },
  produtividade: {
    title: "Produtividade da equipe",
    description: "Registros de consultas e agendamentos para acompanhamento operacional.",
    modules: ["consultas", "agendas"],
  },
  ocorrencias: {
    title: "Ocorrências",
    description: "Ocorrências registradas no sistema.",
    modules: ["ocorrencias"],
  },
}

function ReportDetails() {
  const { reportSlug = "" } = useParams()
  const navigate = useNavigate()
  const { data, activeUnit } = useVetFlow()
  const report = reportDefinitions[reportSlug]
  const rows = report
    ? report.modules.flatMap((moduleSlug) => data[moduleSlug] || [])
    : []

  if (!report) {
    return (
      <div className="page report-detail-page">
        <section className="panel empty-state large">
          <AlertTriangle size={30} />
          <h2>Relatório não encontrado</h2>
          <p>Selecione um relatório disponível no painel de relatórios.</p>
          <Button onClick={() => navigate("/relatorios")}>Voltar aos relatórios</Button>
        </section>
      </div>
    )
  }

  return (
    <div className="page report-detail-page">
      <button className="back-link" onClick={() => navigate("/relatorios")}>
        <ArrowLeft size={16} />
        Voltar para relatórios
      </button>
      <PageTitle
        eyebrow="INTELIGÊNCIA DE NEGÓCIO"
        title={report.title}
        description={`${report.description} Unidade: ${activeUnit.name}.`}
      >
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir relatório
        </Button>
      </PageTitle>
      <section className="summary-strip report-summary-strip">
        <div className="panel" style={{ padding: 18 }}>
          <small>Registros encontrados</small>
          <h2 style={{ margin: "6px 0 0" }}>{rows.length}</h2>
        </div>
      </section>
      <section className="panel table-panel report-detail-panel">
        <div className="table-toolbar">
          <strong>{report.title}</strong>
          <span className="result-count">{rows.length} registros</span>
        </div>
        <div className="data-table">
          <div className="record-row table-head">
            <span>Registro</span>
            <span>Detalhes</span>
            <span>Profissional / contato</span>
            <span>Data</span>
            <span>Status</span>
            <span />
          </div>
          {rows.length === 0 ? (
            <div className="empty-state">
              <PackageSearch size={28} />
              <strong>Nenhum registro disponível</strong>
              <p>Cadastre informações no módulo correspondente para alimentar este relatório.</p>
            </div>
          ) : (
            rows.map((item) => (
              <button
                className="record-row"
                key={`${item.unitId || "unidade"}-${item.id}`}
                onClick={() => {
                  const targetModule = report.modules.find((moduleSlug) =>
                    (data[moduleSlug] || []).some((candidate) => candidate.id === item.id),
                  )
                  if (targetModule) navigate(`/${targetModule}/${item.id}`)
                }}
              >
                <span><strong>{item.name}</strong></span>
                <span>{item.subtitle || item.service || "—"}</span>
                <span>{item.professional || item.phone || item.owner || "—"}</span>
                <span>{item.date || item.createdAt?.slice(0, 10) || "—"}</span>
                <span><Status>{item.status || "Sem status"}</Status></span>
                <ChevronRight size={16} />
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function RouteError() {
  return (
    <div className="vx vx-loader" role="alert" style={{ flexDirection: "column", minHeight: "100vh", textAlign: "center", padding: 24 }}>
      <strong style={{ fontSize: 22, color: "#1a2233" }}>Algo deu errado nesta tela.</strong>
      <span style={{ fontWeight: 500 }}>Seus dados estão salvos. Tente abrir de novo.</span>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="vx-btn vx-btn-g" onClick={() => window.history.back()}>Voltar</button>
        <button className="vx-btn vx-btn-p" onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/site",
    element: (
      <Suspense fallback={<PageLoader />}>
        <VxLanding />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/escolher-clinica",
    element: (
      <Suspense fallback={<PageLoader />}>
        <VxEscolha />
      </Suspense>
    ),
  },
  {
    path: "/privacidade",
    element: (
      <Suspense fallback={<PageLoader />}>
        <VxPrivacidade />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <VxDashboard /> },
      { path: "painel-classico", element: <Dashboard /> },
      { path: "dashboard-proposta", element: <VxDashProposta /> },
      { path: "unidades", element: <VxUnidades /> },
      { path: "relatorios", element: <RelatoriosPage /> },
      { path: "relatorios/:reportSlug", element: <VxRelatorio /> },
      { path: "tutores", element: <TutorsModule /> },
      { path: "animais", element: <AnimalsModule /> },
      { path: "prontuarios", element: <ProntuariosModule /> },
      { path: "agendas", element: <AgendaModule /> },
      { path: "vendas", element: <VxVendas /> },
      { path: "caixa", element: <VxCaixa /> },
      { path: "entregas", element: <VxEntregas /> },
      { path: "consultas", element: <VxConsultas /> },
      { path: "profissionais", element: <VxProfissionais /> },
      { path: "vacinas", element: <VxVacinas /> },
      { path: "prescricoes", element: <VxPrescricoes /> },
      { path: "medicamentos", element: <VxMedicamentos /> },
      { path: "exames", element: <VxExames /> },
      { path: "procedimentos", element: <VxProcedimentos /> },
      { path: "cirurgias", element: <VxCirurgias /> },
      { path: "internacoes", element: <VxInternacoes /> },
      { path: "protocolos", element: <VxProtocolos /> },
      { path: "servicos", element: <VxServicos /> },
      { path: "estoque", element: <VxEstoque /> },
      { path: "financeiro", element: <VxFinanceiro /> },
      { path: "convenios", element: <VxConvenios /> },
      { path: "teleatendimentos", element: <VxTele /> },
      { path: "comunicacao", element: <VxComunicacao /> },
      { path: "publicacoes", element: <VxPublicacoes /> },
      { path: "documentos", element: <VxDocumentos /> },
      { path: "ocorrencias", element: <VxOcorrencias /> },
      { path: "usuarios", element: <VxEquipe /> },
      { path: "usuarios-permissoes", element: <VxUsuarios /> },
      { path: "perfil", element: <VxPerfil /> },
      { path: "configuracoes", element: <VxConfig /> },
      { path: "ajuda", element: <VxAjuda /> },
      {
        path: ":module/:id",
        element: (
          <Detail
            renderLegacyForm={(module, item, close) => (
              <RecordForm module={module} item={item} close={close} success={close} />
            )}
          />
        ),
      },
      { path: ":module", element: <ModuleRoute /> },
      { path: "*", element: <VxNotFound /> },
    ],
  },
])

export default function App() {
  return (
    <VetFlowProvider>
      <RouterProvider router={router} />
    </VetFlowProvider>
  )
}
