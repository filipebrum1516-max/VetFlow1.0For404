import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, BookOpen, CalendarClock, CircleCheck, MessageCircle, Plus, Printer, Search, Syringe, TriangleAlert } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, daysBetween, fmtDate, initials, itemDate, Page, Pager, StatusPill, todayISO, usePaged, useQueryParam } from "../ui"

/*
 * Vacinas abre numa PASTA com abas (Atrasadas · A vencer · Em dia · Todos), uma linha por animal.
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
  const initialFilter = useQueryParam("filtro")
  const paramAnimal = useQueryParam("animal")
  // Estados persistidos por versões anteriores podem chegar sem uma coleção
  // ou com vínculos apenas pelo nome. A pasta precisa renderizar durante a hidratação.
  const animals = Array.isArray(data.animais) ? data.animais : []
  const vaccines = Array.isArray(data.vacinas) ? data.vacinas : []
  const [aba, setAba] = useState<Aba>(initialFilter === "A vencer" ? "A vencer" : initialFilter === "Atrasada" ? "Atrasadas" : "Atrasadas")
  const [query, setQuery] = useState("")
  const [animalId, setAnimalId] = useState(() => {
    if (!paramAnimal) return ""
    return animals.find((item) => item.id === paramAnimal || normalize(item.name) === normalize(paramAnimal))?.id || ""
  })
  const forms = usePageForms("vacinas", (saved) => {
    const linked = animals.find((item) => item.id === saved.animalId || normalize(item.name) === normalize(saved.animal || ""))
    if (linked) setAnimalId(linked.id)
  })
  const hoje = todayISO()

  useEffect(() => {
    if (!animals.length) {
      if (animalId) setAnimalId("")
      return
    }
    if (animalId && !animals.some((item) => item.id === animalId)) {
      setAnimalId("")
      return
    }
    if (!animalId && paramAnimal) {
      const linked = animals.find((item) => item.id === paramAnimal || normalize(item.name) === normalize(paramAnimal))
      if (linked) setAnimalId(linked.id)
    }
  }, [animalId, animals, paramAnimal])

  const resumos = useMemo(() => {
    const porAnimal = new Map<string, Item[]>()
    const animais = new Map(animals.map((animal) => [animal.id, animal]))
    const animaisPorNome = new Map(animals.map((animal) => [normalize(animal.name), animal.id]))
    vaccines.forEach((vaccine) => {
      const linkedId = vaccine.animalId || animaisPorNome.get(normalize(vaccine.animal || ""))
      if (linkedId) porAnimal.set(linkedId, [...(porAnimal.get(linkedId) || []), vaccine])
    })
    const out: Resumo[] = []
    porAnimal.forEach((doses, id) => {
      const animal = animais.get(id)
      if (animal) out.push(resumir(animal, doses, hoje))
    })
    return out
  }, [animals, vaccines, hoje])
  const contagem = {
    Atrasadas: resumos.filter((r) => r.situacao === "Atrasadas").length,
    "A vencer": resumos.filter((r) => r.situacao === "A vencer").length,
    "Em dia": resumos.filter((r) => r.situacao === "Em dia").length,
    Todos: resumos.length,
  }
  const lista = resumos
    .filter((r) => (aba === "Todos" || r.situacao === aba) && (!query.trim() || normalize(`${r.animal.name} ${r.animal.owner} ${r.doses.map((d) => d.name).join(" ")}`).includes(normalize(query))))
    .sort((a, b) => (a.proxima?.when || "9999").localeCompare(b.proxima?.when || "9999"))
  const paged = usePaged(lista, 10, [aba, query])

  const lembrar = () => {
    let sent = 0
    resumos.filter((r) => r.situacao === "Atrasadas").forEach((r) => {
      if (sent >= 40) return
      addItem("comunicacao", { name: "Lembrete de vacina", animalId: r.animal.id, status: "Enviada", category: "WhatsApp", extra: { mensagem: `Olá! A vacina de ${r.animal.name} está atrasada. Responda para agendar.` } })
      sent++
    })
    forms.toast(`${sent} lembretes registrados em Comunicação (envio simulado: nenhuma mensagem real sai desta versão).`)
  }

  const animal = animals.find((item) => item.id === animalId)
  if (animal) return <Carteira animal={animal} onBack={() => setAnimalId("")} forms={forms} />

  const ABAS: [Aba, string, typeof TriangleAlert][] = [["Atrasadas", "late", TriangleAlert], ["A vencer", "soon", CalendarClock], ["Em dia", "ok", CircleCheck], ["Todos", "all", BookOpen]]
  return (
    <Page
      bg="#eef6f0"
      blobs={[["#9fe3c6", 160, 200, 560, 520], ["#ffd39a", "80%", -60, 380, 380], ["#ffb8b0", "65%", 600, 300, 300]]}
      crumb="Vacinas"
      title="Vacinas"
      actions={
        <>
          <label className="vx-search">
            <Search />
            <input aria-label="Buscar animal, tutor ou vacina" placeholder="Buscar animal, tutor ou vacina" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button className="vx-btn vx-btn-p" onClick={() => forms.open("vacinas")}>
            <Plus /> Registrar aplicação
          </button>
        </>
      }
    >
      <div className="vf-folder">
        <div className="vf-tabs" role="tablist" aria-label="Situação vacinal">
          {ABAS.map(([nome, cls, Icon]) => (
            <button key={nome} role="tab" aria-selected={aba === nome} className={`vf-tab ${cls} ${aba === nome ? "on" : ""}`} onClick={() => setAba(nome)}>
              <Icon /> {nome} <b>{contagem[nome]}</b>
            </button>
          ))}
        </div>
        <div className={`vf-body ${ABAS.find(([n]) => n === aba)?.[1]}`}>
          <div className="vf-paper">
            <div className="vf-paper-head">
              <div>
                <span className="vf-label">Pasta de vacinação · {aba}</span>
                <h2>{aba === "Atrasadas" ? "Animais com vacina atrasada" : aba === "A vencer" ? `Reforços nos próximos ${JANELA} dias` : aba === "Em dia" ? "Carteiras em dia" : "Todos os animais vacinados"}</h2>
              </div>
              {aba === "Atrasadas" && contagem.Atrasadas > 0 && (
                <button className="vx-btn vx-btn-g" onClick={lembrar}><MessageCircle /> Lembrar tutores por WhatsApp</button>
              )}
            </div>
            <div className="vf-list">
              <div className="vf-row vf-th">
                <span>Animal</span><span>Última aplicada</span><span>Próxima dose</span><span>Situação</span><span />
              </div>
              {paged.visible.map((r) => (
                <button key={r.animal.id} className="vf-row" onClick={() => setAnimalId(r.animal.id)}>
                  <span className="vf-pet">
                    <i style={{ background: colorFor(r.animal.id) }}>{initials(r.animal.name)}</i>
                    <span><strong>{r.animal.name}</strong><small>{r.animal.subtitle?.split(" • ").slice(0, 2).join(" · ")} · {r.animal.owner || "sem tutor"}</small></span>
                  </span>
                  <span className="vf-cell" data-label="Última aplicada">
                    {r.ultima ? <><strong>{r.ultima.name.replace(/^Vacina\s+/i, "")}</strong><small>{fmtDate(itemDate(r.ultima))}</small></> : <small>nenhuma aplicada</small>}
                  </span>
                  <span className="vf-cell" data-label="Próxima dose">
                    {r.proxima ? <><strong>{r.proxima.item.name.replace(/^Vacina\s+/i, "")}</strong><small className={r.proxima.when < hoje ? "late" : ""}>{fmtDate(r.proxima.when)} · {quando(r.proxima.when)}</small></> : <small>nada programado</small>}
                  </span>
                  <span className="vf-cell" data-label="Situação">
                    <span className={`vf-pill ${r.situacao === "Atrasadas" ? "late" : r.situacao === "A vencer" ? "soon" : "ok"}`}>
                      {r.situacao === "Atrasadas" ? `${r.atrasadas} atrasada${r.atrasadas > 1 ? "s" : ""}` : r.situacao === "A vencer" ? "A vencer" : "Em dia"}
                    </span>
                  </span>
                  <span className="vf-open"><BookOpen /> Abrir carteira</span>
                </button>
              ))}
              {!lista.length && <div className="vx-empty">Nenhum animal nesta aba{query ? " com essa busca" : ""}.</div>}
            </div>
            {paged.pages > 1 && (
              <div className="vx-row" style={{ justifyContent: "center", marginTop: 14 }}>
                <Pager page={paged.page} pages={paged.pages} onPage={paged.setPage} />
              </div>
            )}
          </div>
        </div>
      </div>
      {forms.node}
    </Page>
  )
}

/* ---------------- carteira do animal ---------------- */
function Carteira({ animal, onBack, forms }: { animal: Item; onBack: () => void; forms: ReturnType<typeof usePageForms> }) {
  const { data } = useVetFlow()
  const navigate = useNavigate()
  const hoje = todayISO()
  const animals = Array.isArray(data.animais) ? data.animais : []
  const vaccines = Array.isArray(data.vacinas) ? data.vacinas : []
  const tutors = Array.isArray(data.tutores) ? data.tutores : []
  const tutor = tutors.find((item) => item.id === animal.ownerId)
    || tutors.find((item) => normalize(item.name) === normalize(animal.owner || ""))
  const doses = useMemo(
    () => vaccines
      .filter((item) => item.animalId === animal.id || normalize(item.animal || "") === normalize(animal.name))
      .sort((a, b) => itemDate(a).localeCompare(itemDate(b))),
    [animal.id, animal.name, vaccines],
  )
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
          <div className="vx-lbl" style={{ color: "var(--vx-teal)" }}>Carteira nº {String(Math.max(0, animals.indexOf(animal)) + 1).padStart(4, "0")} · ativa</div>
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
