import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Archive, ArchiveRestore, ArrowLeft, CheckCircle2, Clock3, Edit3, FileSignature, FileText, FolderOpen, Inbox, Link2, ListChecks, MessageSquarePlus, PawPrint, Printer, Send, TriangleAlert, UserRound } from "lucide-react"
import { normalize, useVetFlow, type Item } from "../../store"
import { usePageForms } from "../hooks"
import { addDays, colorFor, fmtDate, GovSign, initials, itemDate, Page, StatusPill, todayISO } from "../ui"
import { CadastroLista, Duo, Ident, Status } from "../CadastroLista"
import { FichaCadastro } from "../Ficha"

/*
 * Documentos como um sistema de controle de processos:
 * cada documento é um PROCESSO com número, interessados (animal e tutor), responsável,
 * prazo, etapa e andamentos. A lista é a "mesa de trabalho"; ao abrir o processo aparecem
 * os andamentos, os dados e o documento — e só ali dá para imprimir.
 */
type Caixa = "entrada" | "atrasados" | "assinados" | "arquivados" | "todos"
type Andamento = { em: string; por: string; texto: string; tipo?: "abertura" | "envio" | "assinatura" | "arquivo" | "despacho" | "reenvio" }
const ETAPAS = ["Aberto", "Aguardando assinatura", "Assinado", "Arquivado"] as const
const etapaDe = (item: Item) => (/arquiv/i.test(item.status) ? 3 : /assinad/i.test(item.status) ? 2 : 1)
const gavetaDe = (item: Item) => String(item.extra?.gaveta || (item.category && !/^(rotina|prioridade)$/i.test(item.category) ? item.category : /contrato|declara/i.test(item.name) ? "Administrativos" : "Clínicos"))
const templates: Record<string, string> = {
  "Termo de consentimento": "Eu, {tutor.nome}, CPF {tutor.cpf}, responsável pelo animal {animal.nome}, espécie {animal.especie}, raça {animal.raca}, declaro ter sido informado(a) sobre o procedimento indicado e seus riscos, e autorizo sua realização pelo(a) {vet.nome}, CRMV {vet.crmv}.",
  "Laudo laboratorial": "Paciente {animal.nome} ({animal.especie}, {animal.raca}), tutor {tutor.nome}. Amostra coletada em {data}. Resultados dentro dos valores de referência, exceto os itens destacados. Responsável técnico: {vet.nome}, CRMV {vet.crmv}.",
  "Autorização cirúrgica": "Eu, {tutor.nome}, CPF {tutor.cpf}, autorizo a equipe da {unidade} a realizar procedimento cirúrgico e anestésico no animal {animal.nome}, ciente dos riscos inerentes. Cirurgião responsável: {vet.nome}, CRMV {vet.crmv}.",
  "Contrato de internação": "Contrato de prestação de serviços de internação do paciente {animal.nome}, firmado entre {unidade} e {tutor.nome}, CPF {tutor.cpf}. Diária, materiais e medicamentos serão cobrados conforme tabela vigente. Médico veterinário responsável: {vet.nome}.",
}

export default function Documentos() {
  const { data, activeUnit, updateItem, user } = useVetFlow()
  const navigate = useNavigate()
  const forms = usePageForms("documentos", (saved) => setFichaId(saved.id))
  const [fichaId, setFichaId] = useState("")
  const hoje = todayISO()
  const [caixa, setCaixa] = useState<Caixa>("entrada")
  const [tipo, setTipo] = useState("Todos")
  const [query, setQuery] = useState("")
  const [abertoId, setAbertoId] = useState(() => new URLSearchParams(window.location.search).get("processo") || "")

  /* número do processo: ordem de abertura na unidade (estável) */
  const numeros = useMemo(() => {
    const map = new Map<string, string>()
    ;[...data.documentos]
      .sort((a, b) => `${a.createdAt}${a.id}`.localeCompare(`${b.createdAt}${b.id}`))
      .forEach((item, i) => map.set(item.id, item.extra?.protocolo || `${(item.createdAt || itemDate(item)).slice(0, 4)}/${String(i + 1).padStart(5, "0")}`))
    return map
  }, [data.documentos])
  const numero = (item: Item) => `DOC ${numeros.get(item.id) || "—"}`
  const prazoDe = (item: Item) => String(item.extra?.prazo || addDays(itemDate(item), 7))
  const atrasado = (item: Item) => etapaDe(item) === 1 && prazoDe(item) < hoje

  const contagem = {
    entrada: data.documentos.filter((d) => etapaDe(d) === 1).length,
    assinados: data.documentos.filter((d) => etapaDe(d) === 2).length,
    arquivados: data.documentos.filter((d) => etapaDe(d) === 3).length,
    todos: data.documentos.length,
  }
  const atrasados = data.documentos.filter(atrasado).length
  const tipos = useMemo(() => {
    const m = new Map<string, number>()
    data.documentos.forEach((d) => m.set(d.name, (m.get(d.name) || 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [data.documentos])
  const lista = useMemo(
    () =>
      data.documentos
        .filter((d) => caixa === "todos" || (caixa === "entrada" ? etapaDe(d) === 1 : caixa === "atrasados" ? atrasado(d) : caixa === "assinados" ? etapaDe(d) === 2 : etapaDe(d) === 3))
        .filter((d) => tipo === "Todos" || d.name === tipo)
        .filter((d) => !query.trim() || normalize(`${numero(d)} ${d.name} ${d.animal || ""} ${d.owner || ""} ${d.professional || ""} ${gavetaDe(d)}`).includes(normalize(query)))
        .sort((a, b) => Number(atrasado(b)) - Number(atrasado(a)) || itemDate(b).localeCompare(itemDate(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.documentos, caixa, tipo, query, numeros],
  )

  const aberto = data.documentos.find((d) => d.id === abertoId)
  if (aberto)
    return (
      <Processo
        item={aberto}
        numero={numero(aberto)}
        prazo={prazoDe(aberto)}
        atrasado={atrasado(aberto)}
        onBack={() => setAbertoId("")}
        forms={forms}
        unidade={activeUnit.name}
        usuario={user?.displayName || "Equipe"}
        updateItem={updateItem}
        navigate={navigate}
      />
    )

  return (
    <CadastroLista
      crumb="Clínico / Documentos"
      title="Documentos"
      sub="Cada documento fica ligado ao animal e ao tutor — abra para ver os andamentos e imprimir."
      novo={{ label: "Novo documento", onClick: () => forms.open("documentos") }}
      kpis={[
        { label: "Em tramitação", value: contagem.entrada, detail: "aguardando assinatura", icon: <Inbox />, tone: "blue", aba: "entrada" },
        { label: "Prazo vencido", value: atrasados, detail: "passaram do prazo de assinatura", icon: <TriangleAlert />, tone: "red", aba: "atrasados" },
        { label: "Assinados", value: contagem.assinados, detail: "prontos para arquivar", icon: <CheckCircle2 />, tone: "green", aba: "assinados" },
        { label: "Arquivados", value: contagem.arquivados, detail: "guardados conforme a tabela", icon: <Archive />, tone: "aqua", aba: "arquivados" },
      ]}
      abas={[
        { key: "entrada", label: "Em tramitação", count: contagem.entrada },
        { key: "atrasados", label: "Prazo vencido", count: atrasados, tone: "red" },
        { key: "assinados", label: "Assinados", count: contagem.assinados },
        { key: "arquivados", label: "Arquivados", count: contagem.arquivados },
        { key: "todos", label: "Todos", count: contagem.todos },
      ]}
      aba={caixa}
      onAba={(k) => setCaixa((k || "entrada") as Caixa)}
      query={query}
      onQuery={setQuery}
      placeholder="Nº do documento, paciente, tutor ou tipo"
      filtros={[{ label: "Tipo", icon: <FolderOpen />, value: tipo, onChange: setTipo, options: [["Todos", "Todos os tipos"], ...tipos.map(([nome, n]) => [nome, `${nome} (${n})`] as [string, string])] }]}
      rows={lista}
      rowKey={(d) => d.id}
      noun="documentos"
      vazio="Nenhum documento nesta caixa"
      perPageDefault={10}
      exportar={{ nome: "documentos", linha: (d) => ({ Numero: numero(d), Documento: d.name, Paciente: d.animal || "", Tutor: d.owner || "", Responsavel: d.professional || "", Prazo: fmtDate(prazoDe(d)), Etapa: ETAPAS[etapaDe(d)], Situacao: atrasado(d) ? "Prazo vencido" : d.status }) }}
      atual={fichaId}
      onAtual={setFichaId}
      ficha={(d) => {
        const etapa = etapaDe(d)
        const andar = (patch: Partial<Item>, texto: string, tipo: Andamento["tipo"], extraPatch: Record<string, unknown> = {}) => {
          updateItem("documentos", d.id, { ...patch, extra: { ...(d.extra || {}), ...extraPatch, andamentos: [...(d.extra?.andamentos || []), { em: new Date().toISOString(), por: user?.displayName || "Equipe", texto, tipo }] } })
          forms.toast(`${numero(d)}: ${texto.toLowerCase()}`)
        }
        return (
          <FichaCadastro
            slug="documentos"
            item={d}
            icone={<FileText size={28} />}
            sub={`${numero(d)} · aberto em ${fmtDate(itemDate(d))}`}
            status={atrasado(d) ? "Prazo vencido" : d.status}
            statusTom={atrasado(d) ? "red" : etapa === 1 ? "blue" : etapa === 3 ? "gray" : ""}
            semUso
            acoes={[
              { label: "Abrir documento", icon: <FolderOpen />, main: true, onClick: () => setAbertoId(d.id) },
              ...(etapa === 1 ? [{ label: "Marcar assinado", icon: <CheckCircle2 />, onClick: () => andar({ status: "Assinado" }, "Marcado como assinado", "assinatura", { assinadoEm: new Date().toISOString(), assinadoPor: user?.displayName || "Equipe" }) }, { label: "Reenviar link", icon: <Send />, onClick: () => andar({}, "Link de assinatura reenviado ao tutor", "reenvio", { reenviadoEm: new Date().toISOString() }) }] : []),
              ...(etapa === 2 ? [{ label: "Arquivar", icon: <Archive />, onClick: () => andar({ status: "Arquivado" }, "Arquivado", "arquivo", { arquivadoEm: new Date().toISOString(), arquivadoPor: user?.displayName || "Equipe" }) }] : []),
              ...(etapa === 3 ? [{ label: "Desarquivar", icon: <ArchiveRestore />, onClick: () => andar({ status: d.extra?.assinadoEm ? "Assinado" : "Pendente" }, "Desarquivado", "arquivo") }] : []),
            ]}
            onEdit={() => forms.open("documentos", d)}
            abrir={() => setAbertoId(d.id)}
            onToast={forms.toast}
            campos={[
              ["Paciente", d.animal || "sem vínculo"],
              ["Tutor", d.owner || "—"],
              ["Responsável", d.professional || "—"],
              ["Gaveta", gavetaDe(d)],
              ["Prazo", etapa === 1 ? `${fmtDate(prazoDe(d))}${atrasado(d) ? " · vencido" : ""}` : "concluído"],
              ["Etapa", ETAPAS[etapa]],
              ["Como o tutor assina", String(d.extra?.metodo || "Link no WhatsApp + selfie")],
              ["Guardar por", String(d.extra?.guarda || "5 anos")],
            ]}
          />
        )
      }}
      colunas={[
        { label: "Documento", w: "minmax(250px,1.4fr)", cell: (d) => <Ident square title={d.name} sub={`${numero(d)} · aberto em ${fmtDate(itemDate(d))}`} icon={<FileText />} color={colorFor(d.name)} /> },
        { label: "Interessados", w: "minmax(180px,1fr)", cell: (d) => (d.animalId ? <Duo title={<><PawPrint size={13} /> {d.animal}</>} sub={d.owner || "tutor não informado"} /> : <span className="pz-warn"><Link2 /> sem vínculo</span>) },
        { label: "Responsável", w: "minmax(150px,.8fr)", cell: (d) => <Duo title={d.professional || "—"} sub={gavetaDe(d)} /> },
        { label: "Prazo", w: "120px", cell: (d) => (etapaDe(d) === 1 ? <Duo title={fmtDate(prazoDe(d))} sub={atrasado(d) ? "vencido" : "para assinar"} /> : <Duo title="—" sub="concluído" />) },
        { label: "Etapa", w: "150px", cell: (d) => { const etapa = etapaDe(d); return <div className="cl-duo"><span className="pz-steps" aria-label={`Etapa ${ETAPAS[etapa]}`}>{ETAPAS.map((e, i) => <i key={e} className={i < etapa ? "done" : i === etapa ? "on" : ""} title={e} />)}</span><small>{ETAPAS[etapa]}</small></div> } },
        { label: "Situação", w: "150px", cell: (d) => (atrasado(d) ? <Status status="Prazo vencido" toneOverride="red" /> : <Status status={d.status} toneOverride={etapaDe(d) === 1 ? "blue" : undefined} />) },
      ]}
    >
      {forms.node}
    </CadastroLista>
  )
}

/* ======================= processo aberto ======================= */
function Processo({ item, numero, prazo, atrasado, onBack, forms, unidade, usuario, updateItem, navigate }: {
  item: Item; numero: string; prazo: string; atrasado: boolean; onBack: () => void; forms: ReturnType<typeof usePageForms>
  unidade: string; usuario: string; updateItem: (m: "documentos", id: string, p: Partial<Item>) => void; navigate: (to: string) => void
}) {
  const { data } = useVetFlow()
  const [aba, setAba] = useState<"andamentos" | "documento" | "dados">("andamentos")
  const [despacho, setDespacho] = useState("")
  const animal = data.animais.find((a) => a.id === item.animalId)
  const tutor = data.tutores.find((t) => t.id === (item.ownerId || animal?.ownerId))
  const vet = data.profissionais.find((p) => p.id === item.professionalId)
  const etapa = etapaDe(item)
  const ex = item.extra || {}

  const andamentos: Andamento[] = useMemo(() => {
    const base: Andamento[] = [{ em: item.createdAt || itemDate(item), por: item.professional || "Equipe", texto: `Documento aberto: ${item.name}${ex.evento ? ` (${ex.evento})` : ""}.`, tipo: "abertura" }]
    base.push({ em: item.createdAt || itemDate(item), por: "Sistema", texto: `Enviado para assinatura do tutor${ex.metodo ? ` · ${ex.metodo}` : ""}. Prazo: ${fmtDate(prazo)}.`, tipo: "envio" })
    if (ex.reenviadoEm) base.push({ em: ex.reenviadoEm, por: usuario, texto: "Link de assinatura reenviado ao tutor.", tipo: "reenvio" })
    if (etapa >= 2) base.push({ em: ex.assinadoEm || itemDate(item), por: ex.assinadoPor || item.owner || "Tutor", texto: "Documento assinado pelas partes.", tipo: "assinatura" })
    if (etapa === 3) base.push({ em: ex.arquivadoEm || itemDate(item), por: ex.arquivadoPor || "Equipe", texto: `Documento arquivado · guarda ${ex.guarda || "5 anos"}.`, tipo: "arquivo" })
    const extras: Andamento[] = Array.isArray(ex.andamentos) ? ex.andamentos : []
    return [...base, ...extras].sort((a, b) => String(a.em).localeCompare(String(b.em)))
  }, [item, ex, etapa, prazo, usuario])

  const registrar = (patch: Partial<Item>, texto: string, tipo: Andamento["tipo"], extraPatch: Record<string, unknown> = {}) => {
    const lista: Andamento[] = [...(Array.isArray(ex.andamentos) ? ex.andamentos : []), ...(tipo === "despacho" ? [{ em: new Date().toISOString(), por: usuario, texto, tipo }] : [])]
    updateItem("documentos", item.id, { ...patch, extra: { ...ex, ...extraPatch, andamentos: lista } })
    forms.toast(texto)
  }
  const assinar = () => registrar({ status: "Assinado" }, `${numero}: marcado como assinado.`, "assinatura", { assinadoEm: new Date().toISOString(), assinadoPor: usuario })
  const arquivar = () => registrar({ status: "Arquivado" }, `${numero}: arquivado.`, "arquivo", { arquivadoEm: new Date().toISOString(), arquivadoPor: usuario })
  const desarquivar = () => registrar({ status: ex.assinadoEm ? "Assinado" : "Pendente" }, `${numero}: desarquivado.`, "arquivo", { arquivadoEm: undefined })
  const reenviar = () => registrar({}, `Link de assinatura reenviado para ${item.owner || "o tutor"}.`, "reenvio", { reenviadoEm: new Date().toISOString() })
  const anotar = () => {
    if (despacho.trim().length < 3) return
    registrar({}, despacho.trim(), "despacho")
    setDespacho("")
  }

  const texto = (String(ex.conteudo || templates[item.name] || "Documento emitido por {unidade} em {data} referente ao paciente {animal.nome}, tutor {tutor.nome}. Responsável: {vet.nome}."))
    .replaceAll("{tutor.nome}", tutor?.name || item.owner || "—")
    .replaceAll("{tutor.cpf}", tutor?.cpf || "___.___.___-__")
    .replaceAll("{animal.nome}", animal?.name || item.animal || "—")
    .replaceAll("{animal.especie}", animal?.species || "—")
    .replaceAll("{animal.raca}", animal?.breed || "—")
    .replaceAll("{vet.nome}", vet?.name || item.professional || "—")
    .replaceAll("{vet.crmv}", vet?.registration || "—")
    .replaceAll("{procedimento}", ex.evento || "procedimento indicado")
    .replaceAll("{unidade}", unidade)
    .replaceAll("{data}", fmtDate(itemDate(item)))

  return (
    <Page
      className="pz-page"
      bg="#eef0f4"
      blobs={[["#c7d2fe", -80, -40, 460, 380], ["#fde2c7", "78%", 120, 420, 360]]}
      crumb={`Documentos / ${numero}`}
      title={item.name}
      actions={
        <>
          <button className="vx-btn vx-btn-g" onClick={onBack}><ArrowLeft /> Voltar aos documentos</button>
          <button className="vx-btn vx-btn-g" onClick={() => forms.open("documentos", item)}><Edit3 /> Editar</button>
          {etapa === 1 && <button className="vx-btn vx-btn-g" onClick={reenviar}><Send /> Reenviar link</button>}
          {etapa === 1 && <button className="vx-btn vx-btn-p" onClick={assinar}><CheckCircle2 /> Marcar assinado</button>}
          {etapa === 2 && <button className="vx-btn vx-btn-p" onClick={arquivar}><Archive /> Arquivar</button>}
          {etapa === 3 && <button className="vx-btn vx-btn-g" onClick={desarquivar}><ArchiveRestore /> Desarquivar</button>}
        </>
      }
    >
      <section className="pz-head">
        <div className="pz-head-main">
          <span className="pz-num">{numero}</span>
          <div className="pz-flow">
            {ETAPAS.map((e, i) => (
              <span key={e} className={i < etapa ? "done" : i === etapa ? "on" : ""}>
                <i>{i < etapa ? <CheckCircle2 /> : i + 1}</i>{e}
              </span>
            ))}
          </div>
          <dl className="pz-meta">
            <div><dt>Aberto em</dt><dd>{fmtDate(itemDate(item))}</dd></div>
            <div><dt>Responsável</dt><dd>{item.professional || "—"}</dd></div>
            <div><dt>Prazo</dt><dd className={atrasado ? "late" : ""}>{etapa === 1 ? `${fmtDate(prazo)}${atrasado ? " · vencido" : ""}` : "concluído"}</dd></div>
            <div><dt>Gaveta</dt><dd>{gavetaDe(item)}</dd></div>
          </dl>
        </div>
        <div className="pz-parts">
          <span className="pz-rail-lbl">Interessados</span>
          {animal ? (
            <button className="pz-part" onClick={() => navigate(`/animais?ficha=${encodeURIComponent(animal.id)}`)}>
              <i style={{ background: colorFor(animal.id) }}>{initials(animal.name)}</i>
              <span><strong>{animal.name}</strong><small>Paciente · {animal.subtitle?.split(" • ").slice(0, 2).join(" · ")}</small></span>
            </button>
          ) : (
            <button className="pz-part warn" onClick={() => forms.open("documentos", item)}><i><Link2 /></i><span><strong>Sem animal vinculado</strong><small>Clique para vincular o paciente</small></span></button>
          )}
          {tutor || item.owner ? (
            <button className="pz-part" onClick={() => tutor && navigate(`/tutores?tutor=${encodeURIComponent(tutor.name)}`)}>
              <i className="tutor"><UserRound /></i>
              <span><strong>{tutor?.name || item.owner}</strong><small>Tutor responsável{tutor?.cpf ? ` · CPF ${tutor.cpf}` : ""}</small></span>
            </button>
          ) : null}
        </div>
      </section>

      <div className="pz-tabs" role="tablist">
        {([["andamentos", "Andamentos", ListChecks], ["documento", "Documento", FileSignature], ["dados", "Dados do documento", FolderOpen]] as const).map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}><Icon /> {label}</button>
        ))}
      </div>

      {aba === "andamentos" && (
        <section className="pz-card">
          <ol className="pz-timeline">
            {andamentos.map((a, i) => (
              <li key={i} className={a.tipo}>
                <i>{a.tipo === "assinatura" ? <CheckCircle2 /> : a.tipo === "arquivo" ? <Archive /> : a.tipo === "despacho" ? <MessageSquarePlus /> : a.tipo === "envio" || a.tipo === "reenvio" ? <Send /> : <FileText />}</i>
                <div>
                  <small>{fmtDate(String(a.em).slice(0, 10))}{String(a.em).length > 10 ? ` · ${new Date(a.em).toTimeString().slice(0, 5)}` : ""} · {a.por}</small>
                  <p>{a.texto}</p>
                </div>
              </li>
            ))}
            {etapa === 1 && (
              <li className="pending"><i><Clock3 /></i><div><small>próxima etapa</small><p>Aguardando assinatura de {item.owner || "tutor"} até {fmtDate(prazo)}.</p></div></li>
            )}
          </ol>
          <div className="pz-despacho">
            <textarea className="vx-in" rows={2} value={despacho} onChange={(e) => setDespacho(e.target.value)} placeholder="Registrar um andamento (ex.: tutor pediu para assinar na recepção amanhã)" />
            <button className="vx-btn vx-btn-p" disabled={despacho.trim().length < 3} onClick={anotar}><MessageSquarePlus /> Registrar andamento</button>
          </div>
        </section>
      )}

      {aba === "documento" && (
        <section className="pz-docwrap">
          <div className="pz-doc-actions">
            <span>Pré-visualização do documento</span>
            <button className="vx-btn vx-btn-g" onClick={() => forms.open("documentos", item)}><Edit3 /> Editar texto</button>
            <button className="vx-btn vx-btn-p" onClick={() => window.print()}><Printer /> Imprimir</button>
          </div>
          <article className="vx-doc pz-doc" id="vx-doc-print">
            <div className="vx-row" style={{ justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "#8a6a52" }}>{unidade.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{numero} · {fmtDate(itemDate(item))}</span>
            </div>
            <h3 style={{ margin: "6px 0 0", fontFamily: "Fraunces, serif", fontSize: 24 }}>{item.name}</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{texto}</p>
            {ex.riscos && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}><b>Riscos específicos:</b> {ex.riscos}</p>}
            <div className="vx-sign-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
              {[item.owner || "Tutor", item.professional || "Veterinário"].map((who, index) => (
                <div key={who + index} style={{ fontSize: 12, position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <GovSign compact name={who} signed={etapa >= 2} by={ex.assinadoPor} when={ex.assinadoEm || itemDate(item)} />
                  <span style={{ display: "block", borderTop: "1px solid #1a2233", marginTop: 8, paddingTop: 6 }} />
                  {who}
                  <div style={{ color: "#6b7280", fontSize: 11 }}>{index ? "Médico(a) veterinário(a)" : "Tutor responsável"}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {aba === "dados" && (
        <section className="pz-card">
          <dl className="pz-dl">
            <div><dt>Número</dt><dd>{numero}</dd></div>
            <div><dt>Tipo</dt><dd>{item.name}</dd></div>
            <div><dt>Situação</dt><dd><StatusPill status={item.status} /></dd></div>
            <div><dt>Evento</dt><dd>{ex.evento || ex.cirurgia || "—"}</dd></div>
            <div><dt>Quem assina</dt><dd>{(ex.signatarios || ["Tutor", "Veterinário"]).join(", ")}</dd></div>
            <div><dt>Como o tutor assina</dt><dd>{ex.metodo || "Link no WhatsApp + selfie"}</dd></div>
            <div><dt>Gaveta</dt><dd>{gavetaDe(item)}</dd></div>
            <div><dt>Guardar por</dt><dd>{ex.guarda || "5 anos"}</dd></div>
            <div><dt>Etiquetas</dt><dd>{ex.etiquetas || "—"}</dd></div>
            <div><dt>Confidencial</dt><dd>{ex.confidencial ? "Sim · só veterinários e administração" : "Não"}</dd></div>
            <div><dt>Bloqueia procedimento</dt><dd>{ex.bloquear ? "Sim, até assinar" : "Não"}</dd></div>
            <div><dt>Cópia no prontuário</dt><dd>{ex.copiarProntuario === false ? "Não" : "Sim"}</dd></div>
          </dl>
        </section>
      )}
      <style>{`@media print { body * { visibility:hidden } #vx-doc-print, #vx-doc-print * { visibility:visible } #vx-doc-print{ position:absolute; left:0; top:0; width:100%; box-shadow:none } }`}</style>
      {forms.node}
    </Page>
  )
}
