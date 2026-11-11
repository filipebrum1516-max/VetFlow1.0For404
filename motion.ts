/**
 * VetFlow · efeitos globais de movimento.
 * Nada aqui altera o conteúdo que o React desenha: só atributos data-*, variáveis CSS
 * e elementos próprios presos ao <body>. Se algo falhar, a tela continua visível.
 */
const REVEAL = [".vx-glass", ".op-card", ".tl-card", ".eq-card", ".vx-box", ".vx-badge", ".vx-polaroid", ".esc-card", ".pvc-sec", ".tl-group h3", ".dash-card", ".kpi-card"].join(",")
const SKIP = ".vx-drawer, .vx-modal, .op-modal, .op-drop, .dropdown-panel, .vx-top, .sidebar, .header, .login-page"
const RIPPLE = ".vx-btn, .op-btn, .vx-icon-btn, .nav-item, .vx-chip, .op-chip, .vx-pill, .tl-filters button, .op-tabs button, .vx-seg button, .eq-roles button, .tl-card .vx-btn"

let started = false

export function startMotion() {
  if (started || typeof window === "undefined") return
  started = true
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (!reduce) { setupReveal(); setupRipple() }
  setupSpotlight()
}

/* ---------- revelar cartões quando entram na tela, em cascata ---------- */
function setupReveal() {
  if (!("IntersectionObserver" in window) || !("MutationObserver" in window)) return
  let batch = 0
  let batchTimer = 0
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const el = e.target as HTMLElement
      io.unobserve(el)
      el.style.setProperty("--vf-d", `${Math.min(batch, 10) * 55}ms`)
      el.setAttribute("data-vf-reveal", "in")
      batch++
      window.clearTimeout(batchTimer)
      batchTimer = window.setTimeout(() => { batch = 0 }, 120)
      /* depois da animação, tira o atributo para não interferir em nada */
      window.setTimeout(() => { el.removeAttribute("data-vf-reveal"); el.style.removeProperty("--vf-d") }, 1400)
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 })
  const seen = new WeakSet<Element>()
  const scan = (root: ParentNode) => {
    root.querySelectorAll?.(REVEAL).forEach((el) => {
      if (seen.has(el) || el.closest(SKIP)) return
      seen.add(el)
      el.setAttribute("data-vf-reveal", "wait")
      io.observe(el)
      /* rede de segurança: nunca deixar nada invisível */
      window.setTimeout(() => { if (el.getAttribute("data-vf-reveal") === "wait") el.removeAttribute("data-vf-reveal") }, 6000)
    })
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { const el = n as Element; if (el.matches?.(REVEAL)) scan(el.parentElement || document); else scan(el) } })
  })
  const go = () => { scan(document); mo.observe(document.body, { childList: true, subtree: true }) }
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go)
}

/* ---------- onda no clique, desenhada num elemento próprio sobre o botão ---------- */
function setupRipple() {
  document.addEventListener("pointerdown", (ev) => {
    const target = (ev.target as Element | null)?.closest?.(RIPPLE) as HTMLElement | null
    if (!target || (target as HTMLButtonElement).disabled) return
    const r = target.getBoundingClientRect()
    if (!r.width || !r.height) return
    const cs = getComputedStyle(target)
    const box = document.createElement("span")
    box.className = "vf-ripple-box"
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:${cs.borderRadius};color:${/vx-btn-p|pri|\bon\b/.test(target.className) ? "#fff" : "#e94f17"}`
    const size = Math.max(r.width, r.height) * 2.2
    const dot = document.createElement("i")
    dot.style.cssText = `width:${size}px;height:${size}px;left:${ev.clientX - r.left - size / 2}px;top:${ev.clientY - r.top - size / 2}px`
    box.appendChild(dot)
    document.body.appendChild(box)
    window.setTimeout(() => box.remove(), 650)
  }, { passive: true })
}

/* ---------- brilho que acompanha o mouse nos painéis de vidro ---------- */
function setupSpotlight() {
  let raf = 0
  let last: PointerEvent | null = null
  document.addEventListener("pointermove", (ev) => {
    if (ev.pointerType !== "mouse") return
    last = ev
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      raf = 0
      const e = last
      if (!e) return
      const card = (e.target as Element | null)?.closest?.(".vx-glass, .op-card, .tl-card") as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty("--vf-mx", `${e.clientX - r.left}px`)
      card.style.setProperty("--vf-my", `${e.clientY - r.top}px`)
    })
  }, { passive: true })
}
