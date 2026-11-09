import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Activity, CircleDollarSign, ClipboardList, Layers, Play, Stethoscope } from "lucide-react"
import { useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import RowActions, { RowButton } from "../RowActions"
import { brl, fmtDate, itemDate, todayISO } from "../ui"
import { CadastroLista, Duo, Ident, initialsOf, Status } from "../CadastroLista"
import { FichaCadastro } from "../Ficha"

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

export default function Procedimentos() {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("procedimentos")
  const [aba, setAba] = useState<"lista" | "historico">("lista")
  const [query, setQuery] = useState("")
  const [cat, setCat] = useState("Todas")
  const [sit, setSit] = useState("Todas")

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
  const lista = linhas.filter((row) => `${row.name} ${row.cat}`.toLowerCase().includes(q) && (cat === "Todas" || row.cat === cat))
  const historico = data.procedimentos
    .filter((item) => !item.extra?.catalogo)
    .filter((item) => `${item.name} ${item.animal || ""} ${item.owner || ""} ${item.professional || ""}`.toLowerCase().includes(q))
    .filter((item) => sit === "Todas" || (sit === "Concluídos" ? /conclu/i.test(item.status) : sit === "Em andamento" ? /andamento/i.test(item.status) : /agend|pend/i.test(item.status)))
    .sort((a, b) => itemDate(b).localeCompare(itemDate(a)))

  const fazer = (row: Linha) => forms.open("procedimentos-exec", undefined, { name: row.name, valor: row.price ? brl(row.price) : "" })
  const editar = (row: Linha) =>
    row.catalog ? forms.open("procedimentos", row.catalog) : forms.open("procedimentos", undefined, { name: row.name, naipe: row.cat, preco: row.price ? brl(row.price) : "" })

  const realizados = (name: string) => data.procedimentos.filter((p) => !p.extra?.catalogo && p.name === name).length
  const todosHist = data.procedimentos.filter((item) => !item.extra?.catalogo)
  const hoje = todHoje(todosHist)
  const faturado = todosHist.filter((p) => /conclu/i.test(p.status)).reduce((n, p) => n + (p.amountValue || 0), 0)
  const kpis = [
    { label: "Procedimentos no catálogo", value: linhas.length, detail: `${new Set(linhas.map((l) => l.cat)).size} categorias`, icon: <ClipboardList />, tone: "orange" as const },
    { label: "Realizados hoje", value: hoje, detail: "registrados na unidade", icon: <Activity />, tone: "aqua" as const },
    { label: "Em andamento", value: todosHist.filter((p) => /andamento/i.test(p.status)).length, detail: "sendo feitos agora", icon: <Stethoscope />, tone: "green" as const },
    { label: "Faturado", value: brl(faturado), detail: "procedimentos concluídos", icon: <CircleDollarSign />, tone: "gray" as const },
  ]
  const abas = {
    abas: [
      { key: "lista", label: "Catálogo", count: linhas.length },
      { key: "historico", label: "Histórico", count: historico.length },
    ],
    aba,
    onAba: (k: string) => setAba(k === "historico" ? "historico" : "lista"),
  }

  if (aba === "lista")
    return (
      <CadastroLista
        crumb="Procedimentos"
        title="Procedimentos"
        kpis={kpis}
        {...abas}
        query={query}
        onQuery={setQuery}
        placeholder="Buscar procedimento ou categoria..."
        filtros={[{ label: "Categoria", icon: <Layers />, value: cat, onChange: setCat, options: [["Todas", "Todas as categorias"], ...Object.keys(CATEGORIAS)] }]}
        novo={{ label: "Novo procedimento", onClick: () => forms.open("procedimentos") }}
        rows={lista}
        exportar={{ nome: "procedimentos", linha: (row) => ({ Procedimento: row.name, Categoria: row.cat, Duracao: row.duration, Realizados: realizados(row.name), Preco: row.price || "" }) }}
        rowKey={(row) => row.name}
        noun="procedimentos"
        ficha={(row) =>
          row.catalog ? (
            <FichaCadastro
              slug="procedimentos"
              item={row.catalog}
              sub={`${row.cat} · ${row.duration} · ${realizados(row.name)} realizados`}
              acoes={[{ label: "Fazer agora", icon: <Play />, main: true, onClick: () => fazer(row) }]}
              campos={[
                ["Categoria", row.cat],
                ["Duração", row.duration],
                ["Preço", row.price ? brl(row.price) : undefined],
                ["Sala", row.catalog.extra?.sala || "Sala de procedimentos"],
                ["Realizados", `${realizados(row.name)} no histórico`],
                ["Exige termo", row.catalog.extra?.termo ? "Sim" : undefined],
              ]}
              onEdit={() => editar(row)}
              onToast={forms.toast}
            />
          ) : (
            <aside className="cd-side">
              <section className="cd-pane">
                <div className="cd-hero">
                  <i className="cd-big" style={{ background: CATEGORIAS[row.cat] || "#667" }}>{initialsOf(row.name)}</i>
                  <div className="cd-hero-t"><strong>{row.name}</strong><span>{row.cat} · {realizados(row.name)} realizados</span><span className="lv-pill orange"><i />Fora do catálogo</span></div>
                </div>
                <div className="cd-acts">
                  <button type="button" className="main" onClick={() => editar(row)}><ClipboardList />Adicionar ao catálogo</button>
                  <button type="button" onClick={() => fazer(row)}><Play />Fazer agora</button>
                </div>
                <p className="cd-empty">Este procedimento foi registrado em atendimentos, mas ainda não tem cadastro com preço, duração e materiais.</p>
              </section>
            </aside>
          )
        }
        vazio="Nenhum procedimento encontrado"
        colunas={[
          { label: "Procedimento", w: "minmax(260px,1.5fr)", cell: (row) => <Ident title={row.name} sub={row.catalog ? "no catálogo" : "registrado em atendimentos"} icon={<Stethoscope />} color={CATEGORIAS[row.cat] || "#667"} /> },
          { label: "Categoria", w: "minmax(140px,.8fr)", ficha: false, cell: (row) => <Duo title={row.cat} sub={row.catalog?.extra?.sala || "Sala de procedimentos"} /> },
          { label: "Duração", w: "120px", ficha: false, cell: (row) => <Duo title={row.duration} sub="média" /> },
          { label: "Realizados", w: "120px", cell: (row) => <Duo title={`${realizados(row.name)}×`} sub="no histórico" /> },
          { label: "Preço", w: "130px", cell: (row) => <span className="cl-money">{row.price ? brl(row.price) : "—"}</span> },
        ]}
        acoes={(row) => (
          <RowActions name={row.name} onEdit={() => editar(row)} onDelete={row.catalog ? () => navigate(`/procedimentos/${row.catalog!.id}?excluir=1`) : undefined}>
            <RowButton title="Fazer agora" onClick={() => fazer(row)}><Play /></RowButton>
          </RowActions>
        )}
      >
        {forms.node}
      </CadastroLista>
    )

  return (
    <CadastroLista
      crumb="Procedimentos"
      title="Procedimentos"
      kpis={kpis}
      {...abas}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar paciente, tutor, procedimento ou profissional..."
      filtros={[{ label: "Situação", icon: <Activity />, value: sit, onChange: setSit, options: [["Todas", "Todas as situações"], "Agendados", "Em andamento", "Concluídos"] }]}
      novo={{ label: "Registrar procedimento", onClick: () => forms.open("procedimentos-exec") }}
      rows={historico}
      exportar={{ nome: "procedimentos-historico", linha: (item) => ({ Paciente: item.animal || "", Tutor: item.owner || "", Procedimento: item.name, Data: fmtDate(itemDate(item)), Profissional: item.professional || "", Valor: item.amountValue || "", Situacao: item.status }) }}
      rowKey={(item) => item.id}
      onRow={(item) => navigate(`/procedimentos/${item.id}`)}
      noun="registros"
      vazio="Nenhum procedimento registrado"
      colunas={[
        { label: "Paciente", w: "minmax(230px,1.2fr)", cell: (item) => <Ident title={item.animal || "—"} sub={item.owner || ""} initials={initialsOf(item.animal || "")} color={CATEGORIAS[seedCat[item.name] || "Clínico"]} /> },
        { label: "Procedimento", w: "minmax(180px,1fr)", cell: (item) => <Duo title={item.name} sub={seedCat[item.name] || "Clínico"} /> },
        { label: "Data", w: "130px", cell: (item) => <Duo title={fmtDate(itemDate(item))} sub={item.time || ""} /> },
        { label: "Profissional", w: "minmax(150px,.8fr)", cell: (item) => <Duo title={item.professional || "—"} /> },
        { label: "Valor", w: "110px", cell: (item) => <span className="cl-money">{item.amountValue ? brl(item.amountValue) : "—"}</span> },
        { label: "Situação", w: "140px", cell: (item) => <Status status={item.status} /> },
      ]}
      acoes={(item) => (
        <RowActions name={`${item.name} de ${item.animal || "paciente"}`} onView={() => navigate(`/procedimentos/${item.id}`)} onEdit={() => forms.open("procedimentos-exec", item)} onDelete={() => navigate(`/procedimentos/${item.id}?excluir=1`)} />
      )}
    >
      {forms.node}
    </CadastroLista>
  )
}
const todHoje = (list: Item[]) => list.filter((p) => itemDate(p) === todayISO()).length
