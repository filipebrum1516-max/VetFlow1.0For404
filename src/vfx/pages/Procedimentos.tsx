import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Plus } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions from "../RowActions"
import { brl, fmtDate, itemDate, Page, Pager, SearchBox, StatusPill, usePaged } from "../ui"

const CATEGORIAS: Record<string, string> = {
  Clínico: "#d9601a",
  Cirúrgico: "#6d4bc2",
  Diagnóstico: "#2457c5",
  Estético: "#b4325e",
  Terapêutico: "#0f766e",
}
const seedCat: Record<string, string> = {
  "Curativo simples": "Clínico",
  "Coleta de sangue": "Diagnóstico",
  "Limpeza otológica": "Clínico",
  Fluidoterapia: "Terapêutico",
  "Limpeza dentária": "Cirúrgico",
  "Aplicação de medicamento": "Clínico",
}
type Linha = { name: string; cat: string; catalog?: Item; price: number; duration: string }
const COLS_HIST = "120px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,1.1fr) 140px 110px 128px"

export default function Procedimentos() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("procedimentos")
  const [aba, setAba] = useState<"lista" | "historico">("lista")
  const [query, setQuery] = useState("")

  const linhas = useMemo(() => {
    const map = new Map<string, Linha & { soma: number; n: number }>()
    data.procedimentos.forEach((item) => {
      const row: Linha & { soma: number; n: number } = map.get(item.name) || { name: item.name, cat: seedCat[item.name] || "Clínico", price: 0, duration: "30 min", soma: 0, n: 0 }
      if (item.extra?.catalogo) {
        row.catalog = item
        row.cat = item.extra.naipe || item.category || row.cat
        row.price = item.amountValue || row.price
        row.duration = item.extra.duracao || row.duration
      } else {
        row.soma += item.amountValue || 0
        row.n++
      }
      map.set(item.name, row)
    })
    return [...map.values()]
      .map((row) => ({ ...row, price: row.price || (row.n ? Math.round(row.soma / row.n) : 0) }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [data.procedimentos])

  const q = query.toLowerCase()
  const lista = linhas.filter((row) => `${row.name} ${row.cat}`.toLowerCase().includes(q))
  const historico = data.procedimentos
    .filter((item) => !item.extra?.catalogo)
    .filter((item) => `${item.name} ${item.animal || ""} ${item.owner || ""} ${item.professional || ""}`.toLowerCase().includes(q))
    .sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
  const paged = usePaged(historico, 20, [query, aba])

  const fazer = (row: Linha) => forms.open("procedimentos-exec", undefined, { name: row.name, valor: row.price ? brl(row.price) : "" })
  const editar = (row: Linha) =>
    row.catalog ? forms.open("procedimentos", row.catalog) : forms.open("procedimentos", undefined, { name: row.name, naipe: row.cat, preco: row.price ? brl(row.price) : "" })

  return (
    <Page
      bg="#f4f6f9"
      crumb="Procedimentos"
      title="Procedimentos"
      actions={
        <>
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar" />
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("procedimentos")}>
            <Plus /> Novo procedimento
          </button>
        </>
      }
    >
      <div className="pc-tabs" role="tablist">
        <button role="tab" aria-selected={aba === "lista"} className={aba === "lista" ? "on" : ""} onClick={() => setAba("lista")}>
          Procedimentos <b>{linhas.length}</b>
        </button>
        <button role="tab" aria-selected={aba === "historico"} className={aba === "historico" ? "on" : ""} onClick={() => setAba("historico")}>
          Histórico <b>{historico.length}</b>
        </button>
      </div>

      {aba === "lista" ? (
        <div className="pc-grid">
          {lista.map((row) => (
            <article key={row.name} className="pc-card" style={{ borderTopColor: CATEGORIAS[row.cat] || "#667" }}>
              <span className="pc-cat" style={{ color: CATEGORIAS[row.cat] || "#667" }}>{row.cat}</span>
              <strong>{row.name}</strong>
              <div className="pc-info">
                <span>{row.duration}</span>
                <b>{row.price ? brl(row.price) : "—"}</b>
              </div>
              <div className="pc-foot">
                <button className="vx-btn vx-btn-p" onClick={() => fazer(row)}>Fazer agora</button>
                <RowActions
                  name={row.name}
                  onEdit={() => editar(row)}
                  onDelete={row.catalog ? () => navigate(`/procedimentos/${row.catalog!.id}?excluir=1`) : undefined}
                />
              </div>
            </article>
          ))}
          {!lista.length && <div className="vx-empty">Nenhum procedimento.</div>}
        </div>
      ) : (
        <>
          <div className="vx-table">
            <div className="vx-tr vx-th" style={{ gridTemplateColumns: COLS_HIST }}>
              <span>Data</span><span>Paciente</span><span>Procedimento</span><span>Profissional</span><span>Situação</span><span className="r">Valor</span><span className="r">Ações</span>
            </div>
            {paged.visible.map((item) => (
              <div key={item.id} className="vx-tr" style={{ gridTemplateColumns: COLS_HIST, cursor: "pointer" }} onClick={() => navigate(`/procedimentos/${item.id}`)}>
                <span className="vx-mono">{fmtDate(itemDate(item))}</span>
                <span><strong>{item.animal || "—"}</strong><small className="vx-muted" style={{ display: "block" }}>{item.owner || ""}</small></span>
                <span>{item.name}</span>
                <span>{item.professional || "—"}</span>
                <span><StatusPill status={item.status} /></span>
                <b className="r">{item.amountValue ? brl(item.amountValue) : "—"}</b>
                <span className="r">
                  <RowActions
                    name={`${item.name} de ${item.animal || "paciente"}`}
                    onView={() => navigate(`/procedimentos/${item.id}`)}
                    onEdit={() => forms.open("procedimentos-exec", item)}
                    onDelete={() => navigate(`/procedimentos/${item.id}?excluir=1`)}
                  />
                </span>
              </div>
            ))}
            {!historico.length && <div className="vx-empty">Nenhum registro.</div>}
          </div>
          {paged.pages > 1 && (
            <div className="vx-row" style={{ justifyContent: "center", marginTop: 12 }}>
              <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
            </div>
          )}
        </>
      )}
      {forms.node}
    </Page>
  )
}
