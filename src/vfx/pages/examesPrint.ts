/*
 * Impressão do laudo de exame no modelo de laboratório:
 * logo da clínica, dados do paciente, caixa do exame, colunas Resultado | Valor Referencial | (−) Indicador (+),
 * seções em maiúsculas, assinatura do responsável e aviso no rodapé. Um exame por página A4.
 */
import type { Item } from "../../store"
import { esc, printRaw } from "../printDoc"
import { examNo, fmtNum, isUrgent, type ExamRow } from "./examesRef"

export type LaudoCtx = {
  clinic: { name: string; phone?: string; email?: string; site?: string; address?: string; logo?: string }
  animal?: Item
  /** Registro (CRMV) por nome de profissional. */
  crmvOf: (name?: string) => string
}

const dt = (iso?: string) => {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return iso.length <= 10 ? d.toLocaleDateString("pt-BR") : `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function age(birth?: string) {
  if (!birth) return ""
  const b = new Date(birth.length <= 10 ? `${birth}T12:00:00` : birth)
  if (Number.isNaN(b.getTime())) return ""
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth()
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return ""
  return months < 12 ? `${months} ${months === 1 ? "mês" : "meses"}` : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "ano" : "anos"}`
}

/** Código curto de validação, estável para o mesmo exame. */
function hashOf(text: string) {
  let a = 0x811c9dc5, b = 7
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619) >>> 0; b = (b * 31 + text.charCodeAt(i)) >>> 0 }
  return (a.toString(36) + b.toString(36)).toUpperCase().padEnd(14, "X").slice(0, 14)
}

/** "Hemácias" → "Hemácias.......:" (pontinhos até a coluna). */
const dots = (label: string, width = 17) => `${esc(label)}${".".repeat(Math.max(2, width - label.length))}:`

function indicator(row: ExamRow) {
  if (!Number.isFinite(row.v)) return ""
  const span = row.max - row.min
  let pos: number
  if (span <= 0) pos = row.v <= row.min ? 32 : 82
  else pos = 32 + ((row.v - row.min) / span) * 40
  pos = Math.max(3, Math.min(97, pos))
  return `<div class="ind"><i class="ln"></i><i class="tk" style="left:32%"></i><i class="tk" style="left:72%"></i><b style="left:${pos.toFixed(1)}%">★</b></div>`
}

function refText(row: ExamRow) {
  const u = row.u ? ` ${esc(row.u)}` : ""
  if (row.min === 0 && row.max === 0) return `0${u}`
  return `${fmtNum(row.min, row.dec)} a ${fmtNum(row.max, row.dec)}${u}`
}

function rowsHtml(rows: ExamRow[]) {
  let sec = ""
  let html = ""
  const hasPct = rows.some((r) => r.isPct)
  for (const row of rows) {
    const s = row.sec || "RESULTADOS"
    if (s !== sec) { sec = s; html += `<tr class="sec"><td colspan="4">${esc(s)}</td></tr>` }
    const out = Number.isFinite(row.v) && (row.v < row.min || row.v > row.max)
    const pctCell = row.isPct || (hasPct && row.sec === "LEUCOGRAMA") ? `<span class="pct">${row.isPct ? `<b>${fmtNum(row.pct ?? 0, 0)}</b>` : "100"} %</span>` : ""
    const val = row.isPct || (hasPct && row.sec === "LEUCOGRAMA")
      ? `${pctCell}<span class="abs"><b>${fmtNum(row.v, row.dec)}</b> ${esc(row.u)}</span>`
      : `<b>${fmtNum(row.v, row.dec)}</b> ${esc(row.u)}`
    html += `<tr${out ? ' class="out"' : ""}><td class="lb">${dots(row.n)}</td><td class="vl">${val}</td><td class="rf">${refText(row)}</td><td class="ic">${indicator(row)}</td></tr>`
  }
  return html
}

function page(exam: Item, ctx: LaudoCtx, index: number, total: number) {
  const a = ctx.animal
  const x = exam.extra || {}
  const rows: ExamRow[] = Array.isArray(x.resultados) ? x.resultados : []
  const now = new Date().toISOString()
  const resp = x.liberadoPor || x.assinadoPor || exam.professional || ""
  const crmv = x.liberadoCrmv || ctx.crmvOf(resp)
  const c = ctx.clinic
  const site = c.site || c.email || ""
  const idade = age(a?.birthDate)
  const especie = [a?.species || exam.species, a?.breed || exam.breed].filter(Boolean).join(" / ")
  return `<section class="pg">
<header class="top">
  <div class="brand">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : ""}<div><b>${esc(c.name)}</b>${c.address ? `<small>${esc(c.address)}</small>` : ""}</div></div>
  <div class="site">${esc(site)}${c.phone ? `<small>${esc(c.phone)}</small>` : ""}</div>
</header>
<div class="mini"><span>Dt. Cadastro: <b>${dt(exam.createdAt)}</b></span><span>Dt. Impressão: <b>${dt(now)}</b></span><span>VetFlow · Laudo</span><span class="no">${esc(examNo(exam).replace("EX-", "").padStart(11, "0"))}</span></div>
<div class="pac">
  <div class="l">
    <div><span class="k">Paciente:</span> <b class="nome">${esc((exam.animal || a?.name || "").toUpperCase())}</b></div>
    <div><span class="k">Tutor(a):</span> ${esc(exam.owner || a?.owner || "—")}</div>
    <div><span class="k">Espécie/Raça:</span> ${esc(especie || "—")}</div>
    <div><span class="k">Veterinário(a):</span> ${esc(exam.professional || "—")}</div>
  </div>
  <div class="r">
    <div>${a?.birthDate ? `<span class="k">Nasc..:</span> <b>${dt(a.birthDate)}${idade ? ` (${idade})` : ""}</b>` : idade ? `<span class="k">Idade:</span> <b>${idade}</b>` : ""} <span class="k">Sexo:</span> <b>${esc((a?.sex || "—").charAt(0).toUpperCase())}</b></div>
    <div><span class="k">Cód. Pac.:</span> ${esc(String(a?.id || exam.animalId || "").split("-").pop() || "—")}</div>
    <div class="pgn">Página ${index}/${total}</div>
  </div>
</div>
<div class="line"><span>[Convênio: ${esc(x.convenio || "PARTICULAR")} | Código do Exame: ${esc(examNo(exam))}${isUrgent(exam) ? " | URGENTE" : ""}]</span><span>[Coleta: ${dt(x.coleta?.em)} | Liberado: ${dt(x.liberadoEm || x.assinadoEm)}]</span></div>
<div class="box">
  <div class="t"><span>Exame: ${esc(exam.name.toUpperCase())}</span><small>Id Exame: ${esc(examNo(exam))}</small></div>
  <div class="m">Material: ${esc((x.material || "—").toUpperCase())} | Método: ${esc(x.metodo || "—")}</div>
</div>
<div class="hash">Hash (Validador): ${hashOf(exam.id + (x.liberadoEm || ""))}</div>
${rows.length ? `<table class="res">
<thead><tr><th></th><th>Resultado</th><th>Valor Referencial</th><th>(−) Indicador (+)</th></tr></thead>
<tbody>${rowsHtml(rows)}</tbody></table>` : ""}
${x.laudo ? `<div class="obs"><b>${rows.length ? "Observações" : "Laudo"}:</b><p>${esc(x.laudo)}</p></div>` : ""}
<div class="sig"><span>Assinado por: ${esc(resp.toUpperCase() || "—")}</span><span>${esc(crmv)}</span></div>
<footer class="foot">Os exames sofrem influência fisiológica, patológica, medicamentosa, ambiental, da idade, sexo e outras.<br>Somente o médico-veterinário assistente tem condições de interpretá-los corretamente.</footer>
</section>`
}

const CSS = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff;color:#111}
body{font:12px/1.35 "Courier New",Courier,monospace}
.pg{position:relative;width:190mm;min-height:273mm;margin:0 auto;padding:4mm 0 22mm;page-break-after:always;break-after:page}
.pg:last-child{page-break-after:auto;break-after:auto}
.top{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:6px}
.brand{display:flex;align-items:center;gap:10px;font-family:Arial,Helvetica,sans-serif}
.brand img{max-height:62px;max-width:170px;object-fit:contain}
.brand b{display:block;font-size:15px}.brand small{display:block;font-size:9.5px;color:#555;max-width:260px}
.site{text-align:right;color:#d0281e;font:700 16px Arial,Helvetica,sans-serif}.site small{display:block;color:#333;font-size:11px;font-weight:400}
.mini{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#444;border-bottom:1px solid #999;padding:3px 0}
.mini .no{font-weight:700;color:#111;letter-spacing:.06em}
.pac{display:flex;justify-content:space-between;gap:16px;padding:6px 0 8px;font-size:12px}
.pac .k{color:#444}.pac .nome{font-size:14px;font-style:italic}.pac .r{text-align:right}.pac .pgn{margin-top:14px;font-size:10px;color:#444}
.line{display:flex;justify-content:space-between;font-size:9.5px;font-weight:700;border-top:1px solid #111;padding-top:3px}
.box{margin-top:4px;padding:3px 6px;border:1px solid #6b7aa8;background:#eef0fa}
.box .t{display:flex;justify-content:space-between;align-items:flex-start;font-size:15px;font-weight:700}.box .t small{font-size:9px;font-weight:400;color:#444}
.box .m{font-size:9.5px;color:#333}
.hash{text-align:right;font-size:8.5px;color:#555;margin:2px 0 6px}
.res{width:100%;border-collapse:collapse;margin-top:2px}
.res th{font-size:12.5px;font-weight:700;text-align:left;padding:2px 2px 10px}
.res th:nth-child(2){text-align:center}.res th:last-child{text-align:right}
.res td{padding:1px 2px;font-size:12px;vertical-align:middle;white-space:nowrap}
.res tr.sec td{font-weight:700;font-size:13px;padding-top:12px;letter-spacing:.02em}
.res td.lb{width:27%}.res td.vl{width:29%}.res td.rf{width:26%}.res td.ic{width:18%}
.res td.vl .pct{display:inline-block;width:46px;text-align:right;color:#333}
.res td.vl .abs{display:inline-block;min-width:130px;text-align:right}
.res tr.out td.vl b{text-decoration:underline}
.ind{position:relative;height:12px;margin-left:8px}
.ind .ln{position:absolute;left:0;right:0;top:6px;border-top:1px solid #222}
.ind .tk{position:absolute;top:2px;height:9px;border-left:1px solid #222}
.ind b{position:absolute;top:-2px;transform:translateX(-50%);font-size:11px;line-height:12px}
.obs{margin-top:16px;font-size:11.5px}.obs p{margin:3px 0 0;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif}
.sig{margin-top:44px;display:flex;flex-direction:column;font-size:10px;color:#333;padding-left:2px}
.sig span:last-child{padding-left:110px}
.foot{position:absolute;left:0;right:0;bottom:4mm;border-top:1px solid #111;padding-top:3px;font-size:9.5px;color:#222}
@page{size:A4;margin:10mm}
@media screen{body{background:#e9ecf1;padding:14px 0}.pg{background:#fff;padding:10mm;width:210mm;min-height:297mm;margin:0 auto 14px;box-shadow:0 2px 14px rgba(0,0,0,.15)}.foot{left:10mm;right:10mm;bottom:10mm}}
`

export function laudoHtml(exams: Item[], ctx: LaudoCtx) {
  const title = exams.length === 1 ? `Laudo ${examNo(exams[0])}` : `Laudos ${exams[0]?.animal || ""}`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${exams.map((e, i) => page(e, ctx, i + 1, exams.length)).join("")}</body></html>`
}

export function printLaudos(exams: Item[], ctx: LaudoCtx) {
  if (!exams.length) return
  printRaw(laudoHtml(exams, ctx))
}
