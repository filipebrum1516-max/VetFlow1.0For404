import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, GitCompare, PenLine, Plus, Printer } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { fmtDate, hash, itemDate, matches, Modal, Page, Pager, SearchBox, Seg, StatusPill, usePaged, useQueryParam } from "../ui"

type Attr = { n: string; u: string; min: number; max: number }
const templates: [RegExp, Attr[]][] = [
  [/hemograma|pré-anest|check-up/i, [{ n: "Hemácias", u: "M/µL", min: 5.5, max: 8.5 }, { n: "Hemoglobina", u: "g/dL", min: 12, max: 18 }, { n: "Leucócitos", u: "mil/µL", min: 6, max: 17 }, { n: "Plaquetas", u: "mil/µL", min: 200, max: 500 }, { n: "Proteína total", u: "g/dL", min: 5.4, max: 7.8 }]],
  [/renal/i, [{ n: "Ureia", u: "mg/dL", min: 21, max: 60 }, { n: "Creatinina", u: "mg/dL", min: 0.5, max: 1.5 }, { n: "SDMA", u: "µg/dL", min: 0, max: 14 }]],
  [/hep[aá]t|bioqu/i, [{ n: "ALT", u: "U/L", min: 10, max: 88 }, { n: "FA", u: "U/L", min: 20, max: 150 }, { n: "Albumina", u: "g/dL", min: 2.6, max: 3.3 }]],
  [/urina/i, [{ n: "Densidade", u: "", min: 1.015, max: 1.045 }, { n: "pH", u: "", min: 5, max: 7 }, { n: "Proteína", u: "mg/dL", min: 0, max: 30 }]],
]
const attrsFor = (name: string) => templates.find(([pattern]) => pattern.test(name))?.[1]
const capColor = (name: string) => (/hemo|pré|check/i.test(name) ? "#b4322a" : /renal|hepat|bioq/i.test(name) ? "#9a6212" : /urina|fezes|parasit/i.test(name) ? "#2457c5" : /ultra|raio|eco|imag/i.test(name) ? "#6d4bc2" : "#2b7a4b")
const liquid = (status: string) => (/conclu/i.test(status) ? 0.92 : /aguard/i.test(status) ? 0.62 : /urgent/i.test(status) ? 0.45 : 0.28)

function results(item: Item): { n: string; u: string; min: number; max: number; v: number }[] | undefined {
  if (item.extra?.resultados) return item.extra.resultados
  const attrs = attrsFor(item.name)
  if (!attrs || !/conclu/i.test(item.status)) return undefined
  return attrs.map((attr, index) => {
    const seed = (hash(item.id + attr.n) % 1000) / 1000
    const span = attr.max - attr.min
    const v = attr.min - span * 0.15 + seed * span * (index === 2 ? 1.5 : 1.25)
    return { ...attr, v: Math.round(v * (attr.max < 2 ? 1000 : 10)) / (attr.max < 2 ? 1000 : 10) }
  })
}

export default function Exames() {
  const { data, updateItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("exames", (saved) => setSelectedId(saved.id))
  const param = useQueryParam("filtro")
  const [filter, setFilter] = useState(param === "Aguardando" ? "Aguardando" : "Todos")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [entering, setEntering] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const list = useMemo(
    () =>
      data.exames
        .filter((item) => matches(item, query))
        .filter((item) =>
          filter === "Todos" ? true : filter === "Aguardando" ? /solicit|aguard/i.test(item.status) : filter === "Laudos" ? /conclu/i.test(item.status) : !!item.urgency || /urgent/i.test(item.status),
        )
        .sort((a, b) => itemDate(b).localeCompare(itemDate(a))),
    [data.exames, filter, query],
  )
  const paged = usePaged(list, 8, [filter, query])
  const selected = list.find((item) => item.id === selectedId) || paged.visible[0]
  const rows = selected ? results(selected) : undefined
  const previous = selected ? data.exames.filter((item) => item.animalId === selected.animalId && item.name === selected.name && item.id !== selected.id && itemDate(item) < itemDate(selected)).sort((a, b) => itemDate(b).localeCompare(itemDate(a)))[0] : undefined
  const prevRows = previous ? results(previous) : undefined
  const outOfRange = rows?.filter((row) => row.v < row.min || row.v > row.max) || []

  const advance = (item: Item) => {
    const next = /solicit|urgent/i.test(item.status) ? "Aguardando resultado" : "Concluído"
    if (next === "Concluído" && !item.extra?.resultados && attrsFor(item.name)) {
      setSelectedId(item.id)
      setEntering(true)
      return
    }
    updateItem("exames", item.id, { status: next })
    forms.toast(`${item.name} de ${item.animal} → ${next}`)
  }
  const saveResults = () => {
    if (!selected) return
    const attrs = attrsFor(selected.name) || []
    const resultados = attrs.map((attr) => ({ ...attr, v: Number(String(draft[attr.n] || "").replace(",", ".")) || 0 }))
    updateItem("exames", selected.id, { status: "Concluído", extra: { ...(selected.extra || {}), resultados } })
    setEntering(false)
    setDraft({})
    forms.toast("Resultado lançado e laudo liberado para assinatura.")
  }
  const sign = () => {
    if (!selected) return
    updateItem("exames", selected.id, { status: "Concluído", extra: { ...(selected.extra || {}), assinado: true, assinadoEm: new Date().toISOString() } })
    forms.toast("Laudo assinado digitalmente.")
  }

  return (
    <Page
      bg="#f1eefa"
      blobs={[["#c9b8ff", 40, 240, 560, 480], ["#a7e3f0", "45%", -80, 380, 380], ["#ffc9d4", "85%", "70%", 340, 340]]}
      crumb="Exames"
      title="Bancada do laboratório"
      sub="Cada amostra é um tubo. Ele enche conforme avança: coleta → análise → laudo."
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar exame ou paciente" />
          <Seg options={[["Todos", "Todos"], ["Aguardando", "Aguardando"], ["Laudos", "Laudos"], ["Urgentes", "Urgentes"]]} value={filter} onChange={setFilter} />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open()}>
            <Plus /> Solicitar exame
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 24, alignItems: "start" }} className="vx-ex-grid">
        <div>
          <div style={{ position: "relative" }}>
            <div className="vx-rack">
              {paged.visible.map((item) => (
                <button key={item.id} className={`vx-tube ${selected?.id === item.id ? "on" : ""}`} onClick={() => setSelectedId(item.id)} aria-label={`${item.name} de ${item.animal}: ${item.status}`}>
                  <span className="cap" style={{ background: capColor(item.name) }} />
                  <span className="glass">
                    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${liquid(item.status) * 100}%`, background: capColor(item.name), opacity: 0.75, transition: "height .4s ease" }} />
                    <span style={{ position: "absolute", left: 6, top: 14, width: 5, height: "70%", borderRadius: 3, background: "rgba(255,255,255,.75)" }} />
                    <span className="tag">EX-{item.id.split("-").pop()}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="vx-glass" style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 34, borderRadius: 12, zIndex: 2 }} />
          </div>
          <div className="vx-rack" style={{ marginTop: 14, alignItems: "start" }}>
            {paged.visible.map((item) => (
              <div key={item.id} style={{ textAlign: "center", minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{item.animal}</div>
                <div style={{ fontSize: 11, color: "var(--vx-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <button className="vx-chip" style={{ marginTop: 6, minHeight: 24, fontSize: 11 }} onClick={() => advance(item)} disabled={/conclu/i.test(item.status)} aria-label={`Avançar ${item.name} de ${item.animal}`}>
                  {/conclu/i.test(item.status) ? "Laudo pronto" : <>Avançar <ArrowRight size={12} /></>}
                </button>
              </div>
            ))}
          </div>
          {!list.length && <div className="vx-glass vx-empty" style={{ marginTop: 20 }}>Nenhum exame neste filtro.</div>}
          <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 18, flexWrap: "wrap", gap: 10 }}>
            <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {[["Hemato", "#b4322a"], ["Bioquímica", "#9a6212"], ["Urina/fezes", "#2457c5"], ["Imagem", "#6d4bc2"]].map(([label, color]) => (
                <span key={label} className="vx-chip"><span className="vx-dot" style={{ background: color }} />{label}</span>
              ))}
            </div>
            <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} label={`Bandeja ${paged.page} de ${paged.pages}`} />
          </div>
        </div>

        {selected ? (
          <div className="vx-laudo" style={{ transform: "rotate(1deg)" }}>
            <div className="vx-row" style={{ justifyContent: "space-between", borderBottom: "1.5px dashed rgba(26,34,51,.2)", paddingBottom: 12, gap: 10 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#5b6474" }}>LAUDO EX-{selected.id.split("-").pop()} · {fmtDate(itemDate(selected))}</div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>{selected.name} · {selected.animal}</div>
              </div>
              <StatusPill status={selected.status} />
            </div>
            {rows ? (
              rows.map((row) => {
                const bad = row.v < row.min || row.v > row.max
                const span = row.max - row.min || 1
                const position = Math.max(2, Math.min(98, 25 + ((row.v - row.min) / span) * 50))
                const prev = prevRows?.find((candidate) => candidate.n === row.n)
                return (
                  <div key={row.n}>
                    <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{row.n}</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800, color: bad ? "#b4322a" : "#1a2233" }}>
                        {comparing && prev ? <span style={{ color: "#5b6474", fontWeight: 600 }}>{prev.v} → </span> : null}
                        {row.v.toLocaleString("pt-BR")} {row.u}
                      </span>
                    </div>
                    <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(26,34,51,.07)", marginTop: 6 }}>
                      <div style={{ position: "absolute", left: "25%", width: "50%", top: 0, bottom: 0, borderRadius: 4, background: "rgba(43,122,75,.22)" }} />
                      <div style={{ position: "absolute", left: `${position}%`, top: -4, width: 4, height: 16, borderRadius: 2, background: bad ? "#b4322a" : "#1a2233", marginLeft: -2 }} />
                    </div>
                    <div className="vx-row" style={{ justifyContent: "space-between", fontSize: 10, color: "#5b6474", marginTop: 3, padding: "0 22%" }}>
                      <span>{row.min}</span>
                      <span>{row.max}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: "18px 0", color: "#5b6474", fontSize: 13 }}>
                {/conclu/i.test(selected.status) ? "Laudo descritivo anexado ao prontuário (exame de imagem)." : "Resultado ainda não liberado. Avance o tubo quando a amostra for analisada."}
              </div>
            )}
            {rows && (
              <div className="vx-note" style={{ marginTop: 4 }}>
                {outOfRange.length ? <><b>{outOfRange.length} fora da referência:</b> {outOfRange.map((row) => row.n).join(", ")}.</> : <><b>Tudo dentro da referência.</b></>}
                {selected.extra?.assinado && <> Assinado em {fmtDate(selected.extra.assinadoEm)}.</>}
              </div>
            )}
            <div className="vx-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {!/conclu/i.test(selected.status) && (
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => advance(selected)}>
                  <ArrowRight /> {/solicit|urgent/i.test(selected.status) ? "Amostra em análise" : "Lançar resultado"}
                </button>
              )}
              {rows && (
                <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => (previous ? setComparing(!comparing) : forms.toast("Não há exame anterior igual para comparar."))}>
                  <GitCompare /> {comparing ? "Ocultar anterior" : "Comparar"}
                </button>
              )}
              <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => window.print()}>
                <Printer /> Imprimir
              </button>
              <button className="vx-btn vx-btn-g vx-btn-sm" onClick={() => navigate(`/exames/${selected.id}`)}>Ficha</button>
              {/conclu/i.test(selected.status) && !selected.extra?.assinado && (
                <button className="vx-btn vx-btn-p vx-btn-sm" onClick={sign}>
                  <PenLine /> Assinar laudo
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="vx-glass vx-empty">Escolha um tubo.</div>
        )}
      </div>
      {entering && selected && (
        <Modal
          title={`Resultado · ${selected.name}`}
          text={`${selected.animal} · informe os valores medidos`}
          onClose={() => setEntering(false)}
          actions={
            <>
              <button className="vx-btn vx-btn-g" onClick={() => setEntering(false)}>Cancelar</button>
              <button className="vx-btn vx-btn-p" onClick={saveResults}>Liberar laudo</button>
            </>
          }
        >
          <div className="vx-g">
            {(attrsFor(selected.name) || []).map((attr) => (
              <label key={attr.n} className="vx-f vx-c3">
                <span className="vx-fl">{attr.n} ({attr.u || "—"}) · ref. {attr.min}–{attr.max}</span>
                <input className="vx-in" inputMode="decimal" value={draft[attr.n] || ""} onChange={(event) => setDraft({ ...draft, [attr.n]: event.target.value })} />
              </label>
            ))}
          </div>
        </Modal>
      )}
      <style>{`@media (max-width: 1100px){ .vx-ex-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {forms.node}
    </Page>
  )
}
