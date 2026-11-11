/*
 * Impressão padrão de documentos A4 do VetFlow (relatórios, extratos, fechamentos, listas).
 * Cabeçalho com a clínica, título, quem emitiu e quando; resumo em caixas; tabelas limpas;
 * rodapé com número da página. Imprime por um iframe invisível (funciona sem pop-up).
 */
export type DocUnit = { name: string; cnpj?: string; street?: string; number?: string; city?: string; state?: string; phone?: string }
export type DocSection = {
  title?: string
  note?: string
  head?: string[]
  rows?: (string | number)[][]
  /** "r" alinha à direita (valores), "c" ao centro. */
  align?: ("l" | "r" | "c")[]
  /** Linha final em negrito (totais). */
  total?: (string | number)[]
  /** Barras horizontais: [rótulo, valor exibido, proporção 0–1]. */
  bars?: [string, string, number][]
  html?: string
}
export type DocOptions = {
  title: string
  subtitle?: string
  unit: DocUnit
  issuedBy?: string
  meta?: [string, string][]
  kpis?: [string, string, string?][]
  sections: DocSection[]
  signatures?: string[]
  landscape?: boolean
}

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string)

const CSS = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:28px 32px;font:12.5px/1.5 "Inter","Segoe UI",Arial,Helvetica,sans-serif;color:#1a2233;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:14px;border-bottom:3px solid #d9601a}
.brand{display:flex;gap:12px;align-items:center}
.logo{width:42px;height:42px;border-radius:11px;background:#d9601a;color:#fff;display:grid;place-items:center;font-weight:800;font-size:19px}
.brand b{display:block;font-size:16px}.brand small{display:block;color:#5d6675;font-size:11px;max-width:380px}
.doc{text-align:right;max-width:52%}.doc h1{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.01em}.doc p{margin:2px 0 0;color:#5d6675;font-size:11.5px}
.meta{display:flex;flex-wrap:wrap;gap:6px 22px;margin:14px 0 4px;padding:10px 14px;background:#f5f7fa;border-radius:8px;font-size:11.5px}
.meta span b{color:#5d6675;font-weight:600;margin-right:4px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:14px 0 6px}
.kpi{border:1px solid #e3e7ed;border-radius:10px;padding:10px 12px}
.kpi small{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#5d6675;font-weight:700}
.kpi strong{display:block;font-size:19px;margin-top:2px}.kpi span{display:block;font-size:10.5px;color:#6b7482}
h2{font-size:13.5px;margin:22px 0 4px;padding-bottom:5px;border-bottom:1px solid #e3e7ed;display:flex;justify-content:space-between;align-items:baseline}
h2 small{font-weight:500;color:#6b7482;font-size:11px}
.note{color:#5d6675;font-size:11px;margin:4px 0 6px}
table{width:100%;border-collapse:collapse;margin-top:6px}
thead{display:table-header-group}
th{background:#1a2233;color:#fff;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:7px 8px;font-weight:700}
th:first-child{border-radius:6px 0 0 0}th:last-child{border-radius:0 6px 0 0}
td{padding:5px 8px;border-bottom:1px solid #edf0f4;vertical-align:top;font-size:11px;line-height:1.35}
tr:nth-child(even) td{background:#fafbfc}
tr{break-inside:avoid}
.r{text-align:right;white-space:nowrap}.c{text-align:center}
tfoot td{font-weight:800;background:#fff4ec!important;border-top:2px solid #d9601a}
.bars{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.bar{display:grid;grid-template-columns:200px 1fr 110px;gap:10px;align-items:center;font-size:11.5px}
.bar i{display:block;height:10px;border-radius:5px;background:#eef1f5;overflow:hidden}.bar i em{display:block;height:100%;background:#d9601a;border-radius:5px}
.bar b{text-align:right;font-variant-numeric:tabular-nums}
.sigs{display:flex;gap:40px;margin-top:56px}.sigs div{flex:1;border-top:1px solid #1a2233;padding-top:5px;text-align:center;font-size:11px;color:#3b4656}
.ft{margin-top:26px;padding-top:8px;border-top:1px solid #e3e7ed;display:flex;justify-content:space-between;color:#8a93a1;font-size:10px}
@page{size:A4;margin:12mm 10mm 14mm}
@page{@bottom-right{content:"Página " counter(page) " de " counter(pages);font:10px Arial;color:#8a93a1}}
@media print{body{padding:0}}
`

export function docHtml(o: DocOptions) {
  const now = new Date()
  const when = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  const u = o.unit
  const addr = [u.cnpj && `CNPJ ${u.cnpj}`, [u.street, u.number].filter(Boolean).join(", ") + (u.city ? ` · ${u.city}/${u.state || ""}` : ""), u.phone].filter((x) => x && String(x).trim()).join(" · ")
  const section = (s: DocSection) => {
    const al = (i: number) => (s.align?.[i] === "r" ? ' class="r"' : s.align?.[i] === "c" ? ' class="c"' : "")
    const table = s.head
      ? `<table><thead><tr>${s.head.map((h, i) => `<th${al(i)}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
          (s.rows || []).map((r) => `<tr>${r.map((c, i) => `<td${al(i)}>${esc(c)}</td>`).join("")}</tr>`).join("") ||
          `<tr><td colspan="${s.head.length}" class="c">Nenhum registro.</td></tr>`
        }</tbody>${s.total ? `<tfoot><tr>${s.total.map((c, i) => `<td${al(i)}>${esc(c)}</td>`).join("")}</tr></tfoot>` : ""}</table>`
      : ""
    const bars = s.bars
      ? `<div class="bars">${s.bars.map(([l, v, p]) => `<div class="bar"><span>${esc(l)}</span><i><em style="width:${Math.max(2, Math.round(p * 100))}%"></em></i><b>${esc(v)}</b></div>`).join("")}</div>`
      : ""
    return `${s.title ? `<h2>${esc(s.title)}${s.rows ? `<small>${s.rows.length} ${s.rows.length === 1 ? "linha" : "linhas"}</small>` : ""}</h2>` : ""}${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}${bars}${table}${s.html || ""}`
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>${CSS}${o.landscape ? "@page{size:A4 landscape}" : ""}</style></head><body>
<div class="hd"><div class="brand"><div class="logo">V</div><div><b>${esc(u.name)}</b><small>${esc(addr)}</small></div></div>
<div class="doc"><h1>${esc(o.title)}</h1>${o.subtitle ? `<p>${esc(o.subtitle)}</p>` : ""}<p>Emitido em ${when}${o.issuedBy ? ` por ${esc(o.issuedBy)}` : ""}</p></div></div>
${o.meta?.length ? `<div class="meta">${o.meta.map(([k, v]) => `<span><b>${esc(k)}:</b>${esc(v)}</span>`).join("")}</div>` : ""}
${o.kpis?.length ? `<div class="kpis">${o.kpis.map(([l, v, h]) => `<div class="kpi"><small>${esc(l)}</small><strong>${esc(v)}</strong>${h ? `<span>${esc(h)}</span>` : ""}</div>`).join("")}</div>` : ""}
${o.sections.map(section).join("")}
${o.signatures?.length ? `<div class="sigs">${o.signatures.map((s) => `<div>${esc(s)}</div>`).join("")}</div>` : ""}
<div class="ft"><span>VetFlow · sistema de gestão veterinária</span><span>${esc(u.name)} · ${when}</span></div>
</body></html>`
}

export function printDoc(o: DocOptions) {
  printRaw(docHtml(o))
}

/** Imprime um documento HTML completo (já montado por docHtml). */
export function printRaw(html: string) {
  try {
    document.getElementById("vf-print-frame")?.remove()
    const frame = document.createElement("iframe")
    frame.id = "vf-print-frame"
    frame.setAttribute("aria-hidden", "true")
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
    document.body.appendChild(frame)
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (!doc || !frame.contentWindow) throw new Error("sem iframe")
    doc.open(); doc.write(html); doc.close()
    window.setTimeout(() => {
      try { frame.contentWindow!.focus(); frame.contentWindow!.print() } catch { openWindow() }
    }, 250)
    window.setTimeout(() => frame.remove(), 60_000)
  } catch {
    openWindow()
  }
  function openWindow() {
    const win = window.open("", "_blank", "width=900,height=1000")
    if (!win) { window.alert("Não foi possível abrir a impressão. Libere pop-ups para este site e tente de novo."); return }
    win.document.write(html.replace("</body>", "<script>window.onload=()=>window.print()</script></body>"))
    win.document.close()
  }
}
