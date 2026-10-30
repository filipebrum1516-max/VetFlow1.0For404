import { useEffect, useRef, useState } from "react"
import { ChevronDown, Printer } from "lucide-react"
import type { Item } from "../store"
import { conferenciaHtml, duplicatasHtml, orcamentoHtml, printHtml, reciboHtml, saleSlipHtml, type Pay } from "./vendasShared"


type Doc = [string, string, () => void]
/** Documentos disponíveis para a venda (ou orçamento). */
export function docsFor(sale: Item, unitName: string, tutor?: Item): Doc[] {
  const pays: Pay[] = sale.extra?.pagamentos || []
  const isQuote = sale.kind === "Orçamento"
  return isQuote
    ? [["Orçamento (A4)", "Para o cliente assinar", () => printHtml(sale.name, orcamentoHtml(sale, unitName, tutor), true)]]
    : [
        ...(/aguardando|devolvida/i.test(sale.status) ? [["Pré-venda", "Cupom para levar ao caixa", () => printHtml(sale.name, saleSlipHtml(sale, unitName, "pre"))] as Doc] : []),
        ...(pays.length ? [["Comprovante de venda", "Cupom não fiscal (80 mm)", () => printHtml(sale.name, saleSlipHtml(sale, unitName, "comprovante"))] as Doc] : []),
        ...(pays.length ? [["Recibo (A4)", "Com valor por extenso", () => printHtml(sale.name, reciboHtml(sale, unitName, tutor), true)] as Doc] : []),
        ["Duplicata (A4)", pays.some((p) => p.forma === "Duplicata" || p.forma === "Boleto") ? `${pays.filter((p) => p.forma === "Duplicata" || p.forma === "Boleto").reduce((a, p) => a + p.parcelas, 0)} parcelas para aceite` : "Parcela única com vencimento em 30 dias", () => printHtml(sale.name, duplicatasHtml(sale, unitName, tutor), true)],
        ["Conferência / separação (A4)", "Lista para separar e conferir", () => printHtml(sale.name, conferenciaHtml(sale, unitName), true)],
        ...(sale.extra?.entrega ? [["Romaneio de entrega", "Para o entregador", () => printHtml(sale.name, saleSlipHtml(sale, unitName, "romaneio"))] as Doc] : []),
        ["Orçamento (A4)", "Mesmos itens em formato de orçamento", () => printHtml(sale.name, orcamentoHtml({ ...sale, dueDate: sale.dueDate || sale.date } as Item, unitName, tutor), true)],
      ]
}

/** Botões de impressão visíveis, um para cada documento. */
export function PrintBar({ sale, unitName, tutor, only }: { sale: Item; unitName: string; tutor?: Item; only?: string[] }) {
  const docs = docsFor(sale, unitName, tutor).filter(([label]) => !only || only.some((o) => label.startsWith(o)))
  return (
    <div className="op-printbar">
      {docs.map(([label, sub, fn]) => (
        <button key={label} className="op-btn sm" title={sub} onClick={fn}><Printer /> {label.replace(" (A4)", "")}</button>
      ))}
    </div>
  )
}

/** Botão "Imprimir" com todos os documentos disponíveis para a venda. */
export default function PrintMenu({ sale, unitName, tutor, up = false, className = "op-btn" }: { sale: Item; unitName: string; tutor?: Item; up?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener("mousedown", close)
    return () => window.removeEventListener("mousedown", close)
  }, [open])
  const docs = docsFor(sale, unitName, tutor)
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className={className} onClick={() => setOpen(!open)} aria-expanded={open}><Printer /> Imprimir <ChevronDown /></button>
      {open && (
        <div className="op-drop" style={{ width: 280, left: 0, right: "auto", ...(up ? { top: "auto", bottom: "calc(100% + 4px)" } : {}) }}>
          {docs.map(([label, sub, fn]) => (
            <div key={label} className="op-tr click" style={{ gridTemplateColumns: "1fr" }} onClick={() => { fn(); setOpen(false) }}>
              <span><strong>{label}</strong><small>{sub}</small></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
