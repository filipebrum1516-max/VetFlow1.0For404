import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  CircleDollarSign,
  Boxes,
  Building2,
  LockKeyhole,
  Menu,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Video,
  X,
} from "lucide-react"
import "../landing.css"

/* fundo animado: partículas laranja ligadas por linhas, reagem ao cursor */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let width = 0
    let height = 0
    let frame = 0
    const mouse = { x: -999, y: -999 }
    type P = { x: number; y: number; vx: number; vy: number; r: number }
    let points: P[] = []
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(90, (width * height) / 16000))
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 2,
      }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of points) {
        if (!reduce) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > width) p.vx *= -1
          if (p.y < 0 || p.y > height) p.vy *= -1
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < 120 && d > 0) {
            p.x += (dx / d) * 0.8
            p.y += (dy / d) * 0.8
          }
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(241, 90, 36, .55)"
        ctx.fill()
      }
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i]
          const b = points[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 130) {
            ctx.strokeStyle = `rgba(241, 90, 36, ${0.16 * (1 - d / 130)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      if (!reduce) frame = requestAnimationFrame(draw)
    }
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }
    const onLeave = () => {
      mouse.x = -999
      mouse.y = -999
    }
    resize()
    draw()
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
    }
  }, [])
  return <canvas ref={ref} className="lp-particles" aria-hidden="true" />
}

const modules = [
  [CalendarDays, "Agenda e recepção", "Agenda por profissional, confirmação automática e fila de atendimento do dia."],
  [ClipboardList, "Prontuário eletrônico", "Anamnese, exame físico, diagnóstico, anexos e histórico completo de cada paciente."],
  [Syringe, "Vacinas e lembretes", "Carteira de vacinação digital, controle de reforços e aviso ao tutor."],
  [Stethoscope, "Internação e cirurgia", "Mapa de leitos, prescrição, checklist cirúrgico e evolução por turno."],
  [CircleDollarSign, "Financeiro", "Contas a pagar e receber, caixa, convênios e conciliação por unidade."],
  [Boxes, "Estoque", "Entrada por nota, lotes, validade, estoque mínimo e baixa automática."],
  [Video, "Teleatendimento", "Consulta por vídeo com anotações salvas direto no prontuário."],
  [BarChart3, "Relatórios", "Indicadores clínicos, operacionais e financeiros prontos para imprimir."],
] as const

const faq: [string, string][] = [
  ["Preciso instalar alguma coisa?", "Não. O VetFlow funciona no navegador do computador, tablet ou celular."],
  ["Atende clínicas com mais de uma unidade?", "Sim. Cada unidade tem seus próprios dados, e a gestão vê a rede completa em um só lugar."],
  ["Meus dados ficam seguros?", "O acesso é controlado por usuário e permissão, com registro das alterações feitas por cada pessoa."],
  ["Consigo migrar meus dados atuais?", "Sim. Nossa equipe orienta a importação de tutores, animais e histórico."],
]

export default function Landing() {
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState(0)
  const [sent, setSent] = useState(false)
  const go = (id: string) => {
    setMenu(false)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <span className="lp-brand" aria-label="VetFlow"><img src="/assets/vetflow-cat-mark.png" alt="" className="lp-cat" /><img src="/assets/vetflow-wordmark-dark.png" alt="VetFlow" className="lp-word" /></span>
          <nav className={menu ? "open" : ""}>
            <button onClick={() => go("recursos")}>Recursos</button>
            <button onClick={() => go("como-funciona")}>Como funciona</button>
            <button onClick={() => go("planos")}>Planos</button>
            <button onClick={() => go("duvidas")}>Dúvidas</button>
            <button onClick={() => go("contato")}>Contato</button>
          </nav>
          <div className="lp-nav-cta">
            <button className="lp-btn lp-btn-ghost" onClick={() => navigate("/login")}>
              <LockKeyhole size={16} /> Entrar
            </button>
            <button className="lp-btn lp-btn-primary lp-hide-sm" onClick={() => go("contato")}>
              Agendar demonstração
            </button>
            <button className="lp-burger" aria-label={menu ? "Fechar menu" : "Abrir menu"} onClick={() => setMenu(!menu)}>
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <Particles />
        <div className="lp-glow" aria-hidden="true" />
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-text">
            <span className="lp-tag">Sistema de gestão para clínicas e hospitais veterinários</span>
            <h1>
              A gestão da sua clínica veterinária <em>em um só lugar.</em>
            </h1>
            <p>
              Agenda, prontuário, internação, estoque e financeiro integrados. Menos planilha, menos retrabalho e mais
              tempo para o atendimento.
            </p>
            <div className="lp-hero-cta">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => go("contato")}>
                Agendar demonstração <ArrowRight size={18} />
              </button>
              <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => navigate("/login")}>
                Já sou cliente
              </button>
            </div>
            <ul className="lp-checks">
              <li><Check size={16} /> Implantação assistida</li>
              <li><Check size={16} /> Suporte em português</li>
              <li><Check size={16} /> Multiunidade</li>
            </ul>
          </div>
          <div className="lp-shot" aria-hidden="true">
            <div className="lp-shot-bar"><i /><i /><i /><span>app.vetflow.com.br</span></div>
            <div className="lp-shot-body">
              <aside>
                <b />
                {Array.from({ length: 9 }, (_, index) => <span key={index} className={index === 2 ? "on" : ""} />)}
              </aside>
              <div className="lp-shot-main">
                <div className="lp-shot-kpis">
                  {[["Consultas hoje", "38"], ["Internados", "9"], ["Receita do mês", "R$ 127 mil"], ["Vacinas a vencer", "54"]].map(([label, value]) => (
                    <div key={label}><small>{label}</small><strong>{value}</strong></div>
                  ))}
                </div>
                <div className="lp-shot-table">
                  {[["08:00", "Thor", "Consulta clínica", "Confirmado"], ["08:30", "Mel", "Vacinação V10", "Na recepção"], ["09:00", "Luna", "Retorno", "Em atendimento"], ["09:30", "Bob", "Ultrassonografia", "Agendado"], ["10:00", "Nina", "Castração", "Pré-operatório"]].map((row) => (
                    <div key={row[0]}>
                      <span>{row[0]}</span><b>{row[1]}</b><span>{row[2]}</span><em>{row[3]}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip">
        <div className="lp-wrap lp-strip-in">
          {[["25+", "módulos integrados"], ["20+", "unidades em uma só conta"], ["24 h", "acesso de qualquer lugar"], ["100%", "na nuvem"]].map(([value, label]) => (
            <div key={label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section id="recursos" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Recursos</span>
            <h2>Tudo o que a rotina da clínica precisa</h2>
          </div>
          <div className="lp-grid">
            {modules.map(([Icon, title, text]) => (
              <article key={title} className="lp-card">
                <span className="lp-ico"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="lp-section lp-alt">
        <div className="lp-wrap lp-split">
          <div>
            <span className="lp-kicker">Como funciona</span>
            <h2>Do agendamento à alta, sem perder informação</h2>
            <ol className="lp-steps">
              <li><b>1</b><span><strong>Recepção</strong>O tutor é atendido, o animal é localizado e a consulta é agendada em segundos.</span></li>
              <li><b>2</b><span><strong>Atendimento</strong>O veterinário registra o prontuário, prescreve e solicita exames na mesma tela.</span></li>
              <li><b>3</b><span><strong>Cobrança</strong>Serviços e produtos vão para o caixa e o estoque é baixado automaticamente.</span></li>
              <li><b>4</b><span><strong>Acompanhamento</strong>Retornos e vacinas geram lembretes, e a gestão acompanha tudo nos relatórios.</span></li>
            </ol>
          </div>
          <div className="lp-panel">
            <div className="lp-panel-row"><ShieldCheck /><span><strong>Permissões por perfil</strong>Recepção, veterinário, financeiro e administração com acessos diferentes.</span></div>
            <div className="lp-panel-row"><Building2 /><span><strong>Multiunidade</strong>Troque de unidade sem sair do sistema e compare resultados.</span></div>
            <div className="lp-panel-row"><MessageCircle /><span><strong>Comunicação com o tutor</strong>Confirmações, lembretes e resultados enviados pelo sistema.</span></div>
          </div>
        </div>
      </section>

      <section id="planos" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Planos</span>
            <h2>Escolha o plano do tamanho da sua operação</h2>
          </div>
          <div className="lp-plans">
            {[
              ["Clínica", "Para clínicas com uma unidade", ["Agenda e prontuário", "Vacinas e prescrições", "Financeiro e estoque", "Até 5 usuários"]],
              ["Hospital", "Para hospitais e clínicas 24 h", ["Tudo do plano Clínica", "Internação e centro cirúrgico", "Teleatendimento", "Até 20 usuários"]],
              ["Rede", "Para grupos com várias unidades", ["Tudo do plano Hospital", "Gestão multiunidade", "Relatórios consolidados", "Usuários ilimitados"]],
            ].map(([name, sub, items], index) => (
              <article key={name as string} className={`lp-plan ${index === 1 ? "featured" : ""}`}>
                {index === 1 && <span className="lp-badge">Mais escolhido</span>}
                <h3>{name}</h3>
                <p>{sub}</p>
                <ul>{(items as string[]).map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul>
                <button className={`lp-btn ${index === 1 ? "lp-btn-primary" : "lp-btn-outline"}`} onClick={() => go("contato")}>Falar com um consultor</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="duvidas" className="lp-section lp-alt">
        <div className="lp-wrap lp-narrow">
          <div className="lp-head">
            <span className="lp-kicker">Dúvidas frequentes</span>
            <h2>Perguntas comuns</h2>
          </div>
          {faq.map(([question, answer], index) => (
            <div key={question} className="lp-faq">
              <button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>
                {question}
                <ChevronDown size={18} style={{ transform: open === index ? "rotate(180deg)" : "none" }} />
              </button>
              {open === index && <p>{answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="contato" className="lp-section lp-cta">
        <div className="lp-wrap lp-split">
          <div>
            <h2>Veja o VetFlow funcionando na sua clínica</h2>
            <p>Deixe seu contato e um consultor apresenta o sistema com os dados da sua rotina.</p>
          </div>
          <form className="lp-form" onSubmit={(event) => { event.preventDefault(); setSent(true) }}>
            {sent ? (
              <div className="lp-sent"><Check size={22} /> Recebemos seu contato. Retornaremos em até 1 dia útil.</div>
            ) : (
              <>
                <input required name="nome" placeholder="Seu nome" aria-label="Seu nome" />
                <input required name="clinica" placeholder="Nome da clínica" aria-label="Nome da clínica" />
                <input required name="telefone" type="tel" placeholder="Telefone / WhatsApp" aria-label="Telefone" />
                <button className="lp-btn lp-btn-primary" type="submit">Quero uma demonstração</button>
              </>
            )}
          </form>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <span className="lp-brand" aria-label="VetFlow"><img src="/assets/vetflow-cat-mark.png" alt="" className="lp-cat" /><img src="/assets/vetflow-wordmark-light.png" alt="VetFlow" className="lp-word" /></span>
          <span>© {new Date().getFullYear()} VetFlow 1.0 · 404. Todos os direitos reservados.</span>
          <button onClick={() => navigate("/login")}>Área do cliente</button>
        </div>
      </footer>
    </div>
  )
}
