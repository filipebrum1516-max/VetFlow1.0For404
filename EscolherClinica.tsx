import { useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { ArrowRight, LogOut, Plus } from "lucide-react"
import { ROLE_HOME, useVetFlow, type Clinic } from "../../store"

export default function EscolherClinica() {
  const { authenticated, user, allData, chooseClinic, logout } = useVetFlow()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState<Clinic | "">("")
  const [tilt, setTilt] = useState<Record<string, string>>({})
  const sparks = useRef(Array.from({ length: 46 }, () => ({ l: Math.random() * 100, t: Math.random() * 100, d: 6 + Math.random() * 10, s: 0.4 + Math.random() * 1.3, o: 0.15 + Math.random() * 0.55, delay: -Math.random() * 12 }))).current
  const stats = useMemo(() => {
    const ex = ["centro", "sul", "norte"].map((id) => allData[id]).filter(Boolean)
    const sum = (k: "animais" | "tutores" | "estoque" | "vendas") => ex.reduce((a, d) => a + (d[k]?.length || 0), 0)
    const mine = allData.minha
    return {
      animais: sum("animais"), tutores: sum("tutores"), produtos: sum("estoque"),
      mAnimais: mine?.animais.length || 0, mClientes: mine?.tutores.length || 0, mProdutos: mine?.estoque.length || 0, mVendas: (mine?.vendas || []).filter((v) => v.kind === "Venda").length,
    }
  }, [allData])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "1") pick("exemplo"); if (e.key === "2") pick("minha") }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
  if (!authenticated || !user) return <Navigate to="/login" replace />

  const pick = (c: Clinic) => {
    if (leaving) return
    setLeaving(c)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.setTimeout(() => {
      chooseClinic(c)
      navigate(ROLE_HOME[user.role])
    }, reduce ? 0 : 650)
  }
  const onMove = (key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    setTilt((t) => ({ ...t, [key]: `perspective(1100px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-6px)` }))
  }
  const off = (key: string) => () => setTilt((t) => ({ ...t, [key]: "" }))
  const hour = new Date().getHours()
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <div className={`esc ${leaving ? `leaving leaving-${leaving}` : ""}`}>
      <div className="esc-aurora" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="esc-grid" aria-hidden="true" />
      <div className="esc-sparks" aria-hidden="true">
        {sparks.map((p, i) => <i key={i} style={{ left: `${p.l}%`, top: `${p.t}%`, opacity: p.o, transform: `scale(${p.s})`, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />)}
      </div>

      <main className="esc-wrap">
        <header className="esc-hd">
          <img src="/assets/vetflow-wordmark-light.png" alt="VetFlow" />
          <span className="esc-hi">{hello}, {user.displayName}</span>
          <h1>Em qual <span>clínica</span> vamos trabalhar hoje?</h1>
          <p>Escolha um ambiente. Você pode trocar a qualquer momento pelo seletor de unidade no menu.</p>
        </header>

        <div className="esc-cards">
          <button className="esc-card a" style={{ transform: tilt.a }} onPointerMove={onMove("a")} onPointerLeave={off("a")} onClick={() => pick("exemplo")}>
            <span className="esc-ring" aria-hidden="true" />
            <span className="esc-badge">Recomendado para começar</span>
            <span className="esc-ill" aria-hidden="true">
              <span className="m m1" /><span className="m m2" />
              {[46, 72, 58, 96, 84, 110].map((h, i) => <span key={i} className="b" style={{ height: h, right: 30 + (5 - i) * 24, animationDelay: `${0.25 + i * 0.08}s` }} />)}
            </span>
            <strong>Clínica exemplo</strong>
            <em>Uma clínica veterinária com dados fictícios para conhecer o sistema e treinar a equipe sem medo de errar.</em>
            <ul>
              <li>3 unidades · {stats.animais.toLocaleString("pt-BR")} animais · {stats.tutores.toLocaleString("pt-BR")} tutores</li>
              <li>{stats.produtos.toLocaleString("pt-BR")} produtos, vendas, caixa e entregas movimentados</li>
              <li>Pode testar à vontade: nada vai para a clínica real</li>
            </ul>
            <span className="esc-go">Explorar a clínica exemplo <kbd>1</kbd><b><ArrowRight size={18} /></b></span>
          </button>

          <button className="esc-card b" style={{ transform: tilt.b }} onPointerMove={onMove("b")} onPointerLeave={off("b")} onClick={() => pick("minha")}>
            <span className="esc-ring" aria-hidden="true" />
            <span className="esc-badge g">Sua operação</span>
            <span className="esc-ill dash" aria-hidden="true">
              <span className="r r1" /><span className="r r2" /><span className="r r3" />
              <span className="plus"><Plus size={34} /></span>
            </span>
            <strong>Minha clínica</strong>
            <em>Ambiente real, só seu. {stats.mProdutos || stats.mClientes ? "Continue de onde parou." : "Começa do zero: cadastre a equipe, os tutores, os animais e os serviços da sua clínica."}</em>
            <ul>
              {stats.mProdutos || stats.mClientes || stats.mVendas
                ? <><li>{stats.mProdutos} produtos · {stats.mClientes} clientes</li><li>{stats.mVendas} vendas registradas</li></>
                : <><li>Dados zerados e só seus</li><li>Cada pessoa entra com o próprio acesso</li></>}
              <li>Separado da clínica exemplo</li>
            </ul>
            <span className="esc-go pri">Entrar na minha clínica <kbd>2</kbd><b><ArrowRight size={18} /></b></span>
          </button>
        </div>

        <footer className="esc-ft">
          <span>Conectado como <b>{user.email}</b> · {user.role}</span>
          <button onClick={() => { logout(); navigate("/login") }}><LogOut size={14} /> Sair</button>
          <a href="/privacidade" target="_blank" rel="noreferrer">Privacidade e LGPD</a>
        </footer>
      </main>
      <div className="esc-flash" aria-hidden="true" />
    </div>
  )
}
