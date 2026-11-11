import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, BookOpen, CalendarClock, CircleCheck, MessageCircle, Plus, Printer, Syringe, TriangleAlert } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, daysBetween, fmtDate, initials, itemDate, Page, StatusPill, todayISO, useQueryParam } from "../ui"
import { FichaDados, FichaLivre } from "../Ficha"
import { CadastroLista, Duo, Ident, Status } from "../CadastroLista"

/*
 * Vacinas abre na lista padrão com abas (Atrasadas · A vencer · Em dia · Todos), uma linha por animal.
 * Clicar no animal abre a CARTEIRA dele: doses aplicadas (carimbo), atrasadas e próximas.
 */
type Aba = "Atrasadas" | "A vencer" | "Em dia" | "Todos"
type Resumo = { animal: Item; doses: Item[]; situacao: Exclude<Aba, "Todos">; ultima?: Item; proxima?: { item: Item; when: string }; atrasadas: number; reforcoAtrasado: Set<string> }
const JANELA = 30 // dias para considerar "a vencer"

function resumir(animal: Item, doses: Item[], hoje: string): Resumo {
  const limite = addDays(hoje, JANELA)
  const pendente = (d: Item) => d.status !== "Aplicada"
  const dataPendente = (d: Item) => d.dueDate || itemDate(d)
  /* última dose aplicada de cada vacina: é ela que define quando vence o reforço */
  const ultimaPorVacina = new Map<string, Item>()
  doses.filter((d) => !pendente(d)).forEach((d) => {
    const atual = ultimaPorVacina.get(d.name)
    if (!atual || itemDate(d) > itemDate(atual)) ultimaPorVacina.set(d.name, d)
  })
  const temPendente = (nome: string) => doses.some((d) => pendente(d) && d.name === nome)
  const atrasadas = [
    ...doses.filter((d) => pendente(d) && (d.status === "Atrasada" || dataPendente(d) < hoje)),
    ...[...ultimaPorVacina.values()].filter((d) => d.dueDate && d.dueDate < hoje && !temPendente(d.name)),
  ].map((d) => ({ item: d, when: pendente(d) ? dataPendente(d) : d.dueDate! })).sort((a, b) => a.when.localeCompare(b.when))
  const futuras = [
    ...doses.filter((d) => pendente(d) && d.status !== "Atrasada" && dataPendente(d) >= hoje).map((d) => ({ item: d, when: dataPendente(d) })),
    ...[...ultimaPorVacina.values()].filter((d) => d.dueDate && d.dueDate >= hoje && !temPendente(d.name)).map((d) => ({ item: d, when: d.dueDate! })),
  ].sort((a, b) => a.when.localeCompare(b.when))
  const aplicadas = doses.filter((d) => !pendente(d)).sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
  const situacao = atrasadas.length ? "Atrasadas" : futuras.some((f) => f.when <= limite) ? "A vencer" : "Em dia"
  return { animal, doses, situacao, ultima: aplicadas[0], proxima: atrasadas[0] || futuras[0], atrasadas: atrasadas.length, reforcoAtrasado: new Set(atrasadas.filter((a) => !pendente(a.item)).map((a) => a.item.id)) }
}
const quando = (iso: string) => {
  const d = daysBetween(todayISO(), iso)
  return d === 0 ? "hoje" : d > 0 ? `em ${d} dia${d === 1 ? "" : "s"}` : `${-d} dia${d === -1 ? "" : "s"} de atraso`
}

export default function Vacinas() {
  const { data, addItem } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("vacinas", (saved) => saved.animalId && setAnimalId(saved.animalId))
  const initialFilter = useQueryParam("filtro")
  const paramAnimal = useQueryParam("animal")
  const [aba, setAba] = useState<Aba>(initialFilter === "A vencer" ? "A vencer" : initialFilter === "Atrasada" ? "Atrasadas" : "Atrasadas")
  const [query, setQuery] = useState("")
  const [animalId, setAnimalId] = useState(() => {
    if (!paramAnimal) return ""
    return data.animais.find((item) => item.id === paramAnimal || normalize(item.name) === normalize(paramAnimal))?.id || ""
  })
  const hoje = todayISO()

  const resumos = useMemo(() => {
    const porAnimal = new Map<string, Item[]>()
    data.vacinas.forEach((v) => v.animalId && porAnimal.set(v.animalId, [...(porAnimal.get(v.animalId) || []), v]))
    const animais = new Map(data.animais.map((a) => [a.id, a]))
    const out: Resumo[] = []
    porAnimal.forEach((doses, id) => {
      const animal = animais.get(id)
      if (animal) out.push(resumir(animal, doses, hoje))
    })
    return out
  }, [data.vacinas, data.animais, hoje])
  const contagem = {
    Atrasadas: resumos.filter((r) => r.situacao === "Atrasadas").length,
    "A vencer": resumos.filter((r) => r.situacao === "A vencer").length,
    "Em dia": resumos.filter((r) => r.situacao === "Em dia").length,
    Todos: resumos.length,
  }
  const lista = resumos
    .filter((r) => (aba === "Todos" || r.situacao === aba) && (!query.trim() || normalize(`${r.animal.name} ${r.animal.owner} ${r.doses.map((d) => d.name).join(" ")}`).includes(normalize(query))))
    .sort((a, b) => (a.proxima?.when || "9999").localeCompare(b.proxima?.when || "9999"))

  const lembrar = (alvo?: Resumo[]) => {
    let sent = 0
    ;(alvo || resumos.filter((r) => r.situacao === "Atrasadas")).forEach((r) => {
      if (sent >= 40) return
      addItem("comunicacao", { name: "Lembrete de vacina", animalId: r.animal.id, status: "Enviada", category: "WhatsApp", extra: { mensagem: `Olá! A vacina de ${r.animal.name} está atrasada. Responda para agendar.` } })
      sent++
    })
    forms.toast(`${sent} lembretes registrados em Comunicação (envio simulado: nenhuma mensagem real sai desta versão).`)
  }

  const animal = data.animais.find((item) => item.id === animalId)
  if (animal) return <Carteira animal={animal} onBack={() => setAnimalId("")} forms={forms} />

  const doMes = data.vacinas.filter((v) => itemDate(v).slice(0, 7) === hoje.slice(0, 7) && /aplicad|conclu/i.test(v.status)).length
  return (
    <CadastroLista
      crumb="Clínico / Vacinas"
      title="Vacinas"
      sub="Pasta de vacinação: toque num animal para abrir a carteira com as doses aplicadas e as que faltam."
      headerActions={contagem.Atrasadas > 0 ? <button className="vx-btn vx-btn-g" onClick={() => lembrar()}><MessageCircle /> Lembrar atrasadas</button> : undefined}
      novo={{ label: "Registrar aplicação", onClick: () => forms.open("vacinas") }}
      kpis={[
        { label: "Com vacina atrasada", value: contagem.Atrasadas, detail: "reforço ou dose vencida", icon: <TriangleAlert />, tone: "red", aba: "Atrasadas" },
        { label: `A vencer em ${JANELA} dias`, value: contagem["A vencer"], detail: "avise o tutor antes", icon: <CalendarClock />, tone: "orange", aba: "A vencer" },
        { label: "Carteiras em dia", value: contagem["Em dia"], detail: "nada pendente", icon: <CircleCheck />, tone: "green", aba: "Em dia" },
        { label: "Aplicadas no mês", value: doMes, detail: `${contagem.Todos} animais com carteira`, icon: <BookOpen />, tone: "aqua" },
      ]}
      abas={[
        { key: "Atrasadas", label: "Atrasadas", count: contagem.Atrasadas, tone: "red" },
        { key: "A vencer", label: "A vencer", count: contagem["A vencer"] },
        { key: "Em dia", label: "Em dia", count: contagem["Em dia"] },
        { key: "Todos", label: "Todos", count: contagem.Todos },
      ]}
      aba={aba}
      onAba={(k) => setAba((k || "Atrasadas") as Aba)}
      query={query}
      onQuery={setQuery}
      placeholder="Buscar animal, tutor ou vacina"
      rows={lista}
      rowKey={(r) => r.animal.id}
      noun="animais"
      vazio="Nenhum animal nesta aba"
      perPageDefault={10}
      exportar={{ nome: "vacinas", linha: (r) => ({ Animal: r.animal.name, Tutor: r.animal.owner || "", UltimaAplicada: r.ultima ? `${r.ultima.name} ${fmtDate(itemDate(r.ultima))}` : "", ProximaDose: r.proxima ? `${r.proxima.item.name} ${fmtDate(r.proxima.when)}` : "", Situacao: r.situacao }) }}
      ficha={(r) => {
        const tutor = data.tutores.find((t) => t.id === r.animal.ownerId)
        const aplicadas = r.doses.filter((d) => d.status === "Aplicada").sort((x, y) => itemDate(y).localeCompare(itemDate(x)))
        const pendentes = r.doses.filter((d) => d.status !== "Aplicada").sort((x, y) => (x.dueDate || itemDate(x)).localeCompare(y.dueDate || itemDate(y)))
        const linha = (d: Item, quandoIso: string, extra?: string) => (
          <button key={d.id} type="button" className="cd-li" onClick={() => forms.open("vacinas", d)}>
            <time>{fmtDate(quandoIso)}</time>
            <span><b>{d.name.replace(/^Vacina\s+/i, "")}</b>{extra ? ` · ${extra}` : ""}</span>
            <Syringe />
          </button>
        )
        return (
          <FichaLivre
            titulo={r.animal.name}
            sub={`${r.animal.subtitle?.split(" • ").slice(0, 2).join(" · ") || ""} · ${r.animal.owner || "sem tutor"}`}
            status={r.situacao === "Atrasadas" ? `${r.atrasadas} atrasada${r.atrasadas > 1 ? "s" : ""}` : r.situacao}
            tom={r.situacao === "Atrasadas" ? "red" : r.situacao === "A vencer" ? "orange" : ""}
            avatar={initials(r.animal.name)}
            cor={colorFor(r.animal.id)}
            acoes={[
              { label: "Registrar aplicação", icon: <Syringe />, main: true, onClick: () => forms.open("vacinas", undefined, { animalId: r.animal.id }) },
              { label: "Abrir carteira", icon: <BookOpen />, onClick: () => setAnimalId(r.animal.id) },
              ...(r.situacao !== "Em dia" ? [{ label: "Lembrar tutor", icon: <MessageCircle />, onClick: () => lembrar([r]) }] : []),
            ]}
            abas={[
              { label: "Próximas", content: pendentes.length || r.proxima ? <div>{r.proxima && !pendentes.some((d) => d.id === r.proxima!.item.id) && linha(r.proxima.item, r.proxima.when, `reforço ${quando(r.proxima.when)}`)}{pendentes.map((d) => linha(d, d.dueDate || itemDate(d), quando(d.dueDate || itemDate(d))))}</div> : <p className="cd-empty">Nada programado.</p> },
              { label: `Aplicadas · ${aplicadas.length}`, content: aplicadas.length ? <div>{aplicadas.slice(0, 12).map((d) => linha(d, itemDate(d), d.professional || ""))}</div> : <p className="cd-empty">Nenhuma dose aplicada.</p> },
              { label: "Dados", content: <FichaDados campos={[["Tutor", r.animal.owner || "—"], ["Telefone", tutor?.phone || ""], ["Última aplicada", r.ultima ? `${r.ultima.name.replace(/^Vacina\s+/i, "")} · ${fmtDate(itemDate(r.ultima))}` : "nenhuma"], ["Próxima dose", r.proxima ? `${fmtDate(r.proxima.when)} · ${quando(r.proxima.when)}` : "—"]]} /> },
            ]}
          />
        )
      }}
      colunas={[
        { label: "Animal", w: "minmax(240px,1.4fr)", cell: (r) => <Ident title={r.animal.name} sub={`${r.animal.subtitle?.split(" • ").slice(0, 2).join(" · ")} · ${r.animal.owner || "sem tutor"}`} initials={initials(r.animal.name)} color={colorFor(r.animal.id)} /> },
        { label: "Última aplicada", w: "minmax(160px,1fr)", cell: (r) => (r.ultima ? <Duo title={r.ultima.name.replace(/^Vacina\s+/i, "")} sub={fmtDate(itemDate(r.ultima))} /> : <Duo title="—" sub="nenhuma aplicada" />) },
        { label: "Próxima dose", w: "minmax(180px,1fr)", cell: (r) => (r.proxima ? <Duo title={r.proxima.item.name.replace(/^Vacina\s+/i, "")} sub={<span className={r.proxima.when < hoje ? "vf-late-txt" : ""}>{fmtDate(r.proxima.when)} · {quando(r.proxima.when)}</span>} /> : <Duo title="—" sub="nada programado" />) },
        { label: "Situação", w: "150px", cell: (r) => <Status status={r.situacao === "Atrasadas" ? `${r.atrasadas} atrasada${r.atrasadas > 1 ? "s" : ""}` : r.situacao === "A vencer" ? "A vencer" : "Em dia"} toneOverride={r.situacao === "Atrasadas" ? "red" : r.situacao === "A vencer" ? "orange" : "green"} /> },
      ]}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ---------------- carteira do animal ---------------- */
function Carteira({ animal, onBack, forms }: { animal: Item; onBack: () => void; forms: ReturnType<typeof usePageForms> }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const hoje = todayISO()
  const tutor = data.tutores.find((item) => item.id === animal.ownerId)
  const doses = useMemo(() => data.vacinas.filter((item) => item.animalId === animal.id).sort((a, b) => itemDate(a).localeCompare(itemDate(b))), [animal.id, data.vacinas])
  const r = resumir(animal, doses, hoje)
  const aplicadas = doses.filter((d) => d.status === "Aplicada").length

  return (
    <Page
      bg="#eef6f0"
      blobs={[["#9fe3c6", 160, 200, 560, 520], ["#ffd39a", "80%", -60, 380, 380]]}
      crumb="Vacinas / Carteira"
      title={`Carteira de ${animal.name}`}
      actions={
        <>
          <button className="vx-btn vx-btn-g" onClick={onBack}><ArrowLeft /> Voltar para a pasta</button>
          <button className="vx-btn vx-btn-g" onClick={() => window.print()}><Printer /> Imprimir</button>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("vacinas", undefined, { animalId: animal.id })}><Plus /> Registrar aplicação</button>
        </>
      }
    >
      <div className="vx-booklet">
        <div className="spine" />
        <div className="pg">
          <div className="vx-lbl" style={{ color: "var(--vx-teal)" }}>Carteira nº {String(data.animais.indexOf(animal) + 1).padStart(4, "0")} · ativa</div>
          <div className="vx-row" style={{ gap: 16 }}>
            <span className="vx-av" style={{ width: 84, height: 84, fontSize: 28, borderRadius: 26, background: colorFor(animal.id) }}>{initials(animal.name)}</span>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em" }}>{animal.name}</div>
              <div style={{ fontSize: 14, color: "var(--vx-muted)" }}>{animal.subtitle} · {animal.sex || "sexo não informado"}</div>
              <button className="vx-chip" style={{ marginTop: 6 }} onClick={() => tutor && navigate(`/tutores/${tutor.id}`)}>Tutor: {animal.owner}</button>
            </div>
          </div>
          <div className="vf-sum">
            <div><small>Aplicadas</small><b>{aplicadas}</b></div>
            <div className={r.atrasadas ? "late" : ""}><small>Atrasadas</small><b>{r.atrasadas}</b></div>
            <div><small>Situação</small><b>{r.situacao === "Atrasadas" ? "Com atraso" : r.situacao}</b></div>
          </div>
          <div className={`vf-next ${r.proxima && r.proxima.when < hoje ? "late" : ""}`}>
            <div className="vx-lbl" style={{ color: "rgba(255,255,255,.8)" }}>{r.proxima && r.proxima.when < hoje ? "Dose atrasada" : "Próxima dose"}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{r.proxima ? r.proxima.item.name : "Nenhuma programada"}</div>
            <div className="vx-row" style={{ justifyContent: "space-between", marginTop: 10, gap: 8 }}>
              <span style={{ fontSize: 14 }}>{r.proxima ? fmtDate(r.proxima.when) : "—"}</span>
              {r.proxima && <span className="vx-chip" style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: 0 }}>{quando(r.proxima.when)}</span>}
            </div>
          </div>
        </div>
        <div className="pg">
          <div className="vx-row" style={{ justifyContent: "space-between" }}>
            <strong style={{ fontSize: 17 }}>Doses</strong>
            <span style={{ fontSize: 12, color: "var(--vx-muted)" }}>toque para abrir</span>
          </div>
          <div className="vx-doses">
            {doses.map((item, index) => (
              <button key={item.id} className={`vx-dose ${item.status !== "Aplicada" ? "pend" : ""}`} onClick={() => navigate(`/vacinas/${item.id}`)}>
                <strong style={{ fontSize: 12, textAlign: "center" }}>{item.name.replace("Vacina ", "")}</strong>
                {item.status === "Aplicada" ? (
                  <span className="vx-stamp" style={{ color: colorFor(item.name), transform: `rotate(${[-8, 6, -4, 9, -10][index % 5]}deg)` }}>
                    <small>APLICADA</small>
                    <b>{fmtDate(itemDate(item), { day: "2-digit", month: "2-digit", year: "2-digit" })}</b>
                  </span>
                ) : item.status === "Atrasada" || (item.dueDate || itemDate(item)) < hoje ? (
                  <span className="vx-late">ATRASADA</span>
                ) : (
                  <span className="vf-due">{fmtDate(item.dueDate || itemDate(item), { day: "2-digit", month: "2-digit" })}</span>
                )}
                <span style={{ fontSize: 11, color: "var(--vx-muted)", textAlign: "center" }}>{item.professional || "—"}</span>
              </button>
            ))}
            <button className="vx-dose pend" onClick={() => forms.open("vacinas", undefined, { animalId: animal.id })} style={{ justifyContent: "center", color: "var(--vx-accent)" }}>
              <Plus /> <strong>Nova dose</strong>
            </button>
          </div>
        </div>
      </div>

      <section className="vf-history">
        <h3><Syringe /> Histórico de vacinas de {animal.name}</h3>
        <div className="vf-row vf-th vf-hrow">
          <span>Vacina</span><span>Aplicada em</span><span>Veterinário</span><span>Próxima dose</span><span>Situação</span>
        </div>
        {[...doses].reverse().map((d) => {
          const atrasada = d.status === "Atrasada" || (d.status !== "Aplicada" && (d.dueDate || itemDate(d)) < hoje)
          const reforco = r.reforcoAtrasado.has(d.id)
          return (
            <button key={d.id} className="vf-row vf-hrow" onClick={() => navigate(`/vacinas/${d.id}`)}>
              <span className="vf-cell"><strong>{d.name}</strong><small>{d.extra?.lote ? `Lote ${d.extra.lote}` : d.extra?.fabricante || ""}</small></span>
              <span className="vf-cell" data-label="Aplicada em"><strong>{d.status === "Aplicada" ? fmtDate(itemDate(d)) : "—"}</strong></span>
              <span className="vf-cell" data-label="Veterinário"><small>{d.professional || "—"}</small></span>
              <span className="vf-cell" data-label="Próxima dose">
                {d.status === "Aplicada" ? (d.dueDate ? <><strong>{fmtDate(d.dueDate)}</strong><small className={d.dueDate < hoje ? "late" : ""}>{quando(d.dueDate)}</small></> : <small>sem reforço</small>) : <><strong>{fmtDate(d.dueDate || itemDate(d))}</strong><small className={atrasada ? "late" : ""}>{quando(d.dueDate || itemDate(d))}</small></>}
              </span>
              <span className="vf-cell" data-label="Situação">{atrasada ? <span className="vf-pill late">Atrasada</span> : reforco ? <span className="vf-pill late">Reforço atrasado</span> : d.status === "Aplicada" && d.dueDate && d.dueDate < hoje ? <span className="vf-pill ok">Aplicada · renovada</span> : <StatusPill status={d.status} />}</span>
            </button>
          )
        })}
        {!doses.length && <div className="vx-empty">Nenhuma vacina registrada para {animal.name}.</div>}
      </section>
      {forms.node}
    </Page>
  )
}
