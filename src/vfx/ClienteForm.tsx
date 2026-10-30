import { useState, type ReactNode } from "react"
import { AlertTriangle, Check, MapPin, UserPlus, X } from "lucide-react"
import type { Item } from "../store"
import { brl, parseMoney } from "./ui"
import Layer from "./OpLayer"
import { LIMITE_FIADO } from "./vendasShared"

/* ---------------- máscaras e validações ---------------- */
const dig = (v: string) => v.replace(/\D/g, "")
export const maskCpf = (v: string) => dig(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
export const maskCnpj = (v: string) => dig(v).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
export const maskPhone = (v: string) => {
  const d = dig(v).slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
}
const maskCep = (v: string) => dig(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
export function validCpf(v: string) {
  const c = dig(v)
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  const calc = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10])
}
export function validCnpj(v: string) {
  const c = dig(v)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (n: number) => { const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}

export type ClienteData = {
  tipo: "Física" | "Jurídica"
  nome: string
  fantasia: string
  doc: string
  rgIe: string
  nascimento: string
  sexo: string
  telefone: string
  whatsapp: string
  email: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  referencia: string
  limite: string
  vencimentoDia: string
  contatoWhats: boolean
  bloqueado: boolean
  obs: string
}

export function fromItem(t?: Item | null, prefill = ""): ClienteData {
  const e = t?.extra?.cadastro || {}
  const [ruaNum = "", cidade = ""] = (t?.address || "").split(" • ")
  const [rua = "", numero = ""] = ruaNum.split(", ")
  const digits = dig(prefill)
  return {
    tipo: e.tipo || (t?.personType === "Jurídica" ? "Jurídica" : "Física"),
    nome: t?.name || (digits.length >= 3 ? "" : prefill),
    fantasia: e.fantasia || "",
    doc: t?.cpf || (digits.length === 11 ? maskCpf(digits) : digits.length === 14 ? maskCnpj(digits) : ""),
    rgIe: t?.rg || e.rgIe || "",
    nascimento: t?.birthDate || e.nascimento || "",
    sexo: t?.sex || e.sexo || "",
    telefone: t?.phone || (digits.length >= 10 && digits.length <= 11 ? maskPhone(digits) : ""),
    whatsapp: e.whatsapp || t?.phone || "",
    email: t?.email || "",
    cep: e.cep || "",
    rua: e.rua || rua,
    numero: e.numero || numero,
    complemento: e.complemento || "",
    bairro: e.bairro || "",
    cidade: e.cidade || cidade,
    uf: e.uf || "RO",
    referencia: e.referencia || "",
    limite: String(t?.extra?.limiteCredito ?? LIMITE_FIADO).replace(".", ","),
    vencimentoDia: e.vencimentoDia || "10",
    contatoWhats: e.contatoWhats ?? true,
    bloqueado: !!t?.extra?.bloqueadoFiado,
    obs: t?.notes || "",
  }
}

export function toItem(d: ClienteData, unitCity: string): Partial<Item> {
  return {
    name: d.nome.trim(),
    subtitle: d.tipo === "Jurídica" ? `CNPJ ${d.doc || "—"}${d.fantasia ? ` · ${d.fantasia}` : ""}` : `Cliente${d.doc ? ` · CPF ${d.doc}` : ""}`,
    personType: d.tipo,
    cpf: d.doc,
    rg: d.rgIe,
    birthDate: d.nascimento,
    sex: d.sexo,
    phone: d.telefone,
    email: d.email,
    address: d.rua ? `${d.rua}, ${d.numero || "s/n"} • ${d.cidade || unitCity}` : "",
    notes: d.obs,
    status: "Ativo",
    extra: {
      cadastro: { tipo: d.tipo, fantasia: d.fantasia, rgIe: d.rgIe, nascimento: d.nascimento, sexo: d.sexo, whatsapp: d.whatsapp, cep: d.cep, rua: d.rua, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, uf: d.uf, referencia: d.referencia, vencimentoDia: d.vencimentoDia, contatoWhats: d.contatoWhats },
      limiteCredito: parseMoney(d.limite),
      bloqueadoFiado: d.bloqueado,
    },
  }
}

/** Gaveta de cadastro completo do cliente (nova ou edição). */
export default function ClienteForm({ initial, existing, tutores, unitCity, onClose, onSave }: { initial: ClienteData; existing?: Item | null; tutores: Item[]; unitCity: string; onClose: () => void; onSave: (d: ClienteData) => void }) {
  const [d, setD] = useState<ClienteData>(initial)
  const [errors, setErrors] = useState<string[]>([])
  const [cepMsg, setCepMsg] = useState("")
  const set = (patch: Partial<ClienteData>) => setD((x) => ({ ...x, ...patch }))
  const pj = d.tipo === "Jurídica"
  const docOk = !d.doc || (pj ? validCnpj(d.doc) : validCpf(d.doc))
  const dupe = d.doc && dig(d.doc).length >= 11 ? tutores.find((t) => t.id !== existing?.id && dig(t.cpf || "") === dig(d.doc)) : undefined

  const lookupCep = async (cep: string) => {
    if (dig(cep).length !== 8) return
    setCepMsg("Buscando CEP…")
    try {
      const ctrl = new AbortController()
      const tm = window.setTimeout(() => ctrl.abort(), 3500)
      const res = await fetch(`https://viacep.com.br/ws/${dig(cep)}/json/`, { signal: ctrl.signal })
      window.clearTimeout(tm)
      const j = await res.json()
      if (j.erro) throw new Error("cep")
      setD((x) => ({ ...x, rua: j.logradouro || x.rua, bairro: j.bairro || x.bairro, cidade: j.localidade || x.cidade, uf: j.uf || x.uf }))
      setCepMsg("Endereço preenchido pelo CEP.")
    } catch {
      setCepMsg("Não foi possível consultar o CEP. Preencha manualmente.")
    }
  }

  const save = () => {
    const errs: string[] = []
    if (d.nome.trim().length < 3) errs.push(pj ? "Informe a razão social." : "Informe o nome completo.")
    if (!d.telefone && !d.whatsapp) errs.push("Informe pelo menos um telefone.")
    if (d.doc && !docOk) errs.push(pj ? "CNPJ inválido." : "CPF inválido.")
    if (dupe) errs.push(`Já existe um cliente com este ${pj ? "CNPJ" : "CPF"}: ${dupe.name}.`)
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.push("E-mail inválido.")
    setErrors(errs)
    if (!errs.length) onSave(d)
  }

  const F = ({ label, children, span }: { label: string; children: ReactNode; span?: number }) => (
    <label className="op-f" style={span ? { gridColumn: `span ${span}` } : undefined}><span>{label}</span>{children}</label>
  )

  return (
    <Layer className="op-drawer-layer" onMouseDown={onClose}>
      <aside className="op-drawer op-drawer-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="op-ch"><h2 style={{ fontSize: 14, textTransform: "none", letterSpacing: 0 }}><UserPlus size={16} /> {existing ? `Editar cliente · ${existing.name}` : "Novo cliente"}</h2><button className="op-x" onClick={onClose} aria-label="Fechar"><X /></button></div>
        <div className="body">
          <div className="op-tabs" style={{ alignSelf: "flex-start" }}>{(["Física", "Jurídica"] as const).map((t) => <button key={t} className={d.tipo === t ? "on" : ""} onClick={() => set({ tipo: t, doc: "" })}>Pessoa {t.toLowerCase()}</button>)}</div>

          <div className="op-sec">Identificação</div>
          <div className="op-fields op-grid4">
            {F({ label: pj ? "Razão social *" : "Nome completo *", span: 2, children: <input className="op-in" autoFocus value={d.nome} onChange={(e) => set({ nome: e.target.value })} /> })}
            {pj
              ? F({ label: "Nome fantasia", span: 2, children: <input className="op-in" value={d.fantasia} onChange={(e) => set({ fantasia: e.target.value })} /> })
              : F({ label: "Apelido / como chamar", span: 2, children: <input className="op-in" value={d.fantasia} onChange={(e) => set({ fantasia: e.target.value })} /> })}
            {F({ label: pj ? "CNPJ" : "CPF", children: <input className={`op-in ${d.doc && !docOk ? "bad" : ""}`} inputMode="numeric" placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"} value={d.doc} onChange={(e) => set({ doc: pj ? maskCnpj(e.target.value) : maskCpf(e.target.value) })} /> })}
            {F({ label: pj ? "Inscrição estadual" : "RG", children: <input className="op-in" value={d.rgIe} onChange={(e) => set({ rgIe: e.target.value })} /> })}
            {!pj && F({ label: "Data de nascimento", children: <input className="op-in" type="date" value={d.nascimento} onChange={(e) => set({ nascimento: e.target.value })} /> })}
            {!pj && F({ label: "Sexo", children: <select className="op-in" value={d.sexo} onChange={(e) => set({ sexo: e.target.value })}><option value="">—</option><option>Feminino</option><option>Masculino</option><option>Outro</option></select> })}
          </div>
          {d.doc && !docOk && <div className="op-note bad"><AlertTriangle /> {pj ? "CNPJ" : "CPF"} com dígitos inválidos.</div>}
          {dupe && <div className="op-note warn"><AlertTriangle /> Já existe um cliente com este documento: <b>{dupe.name}</b>.</div>}

          <div className="op-sec">Contato</div>
          <div className="op-fields op-grid4">
            {F({ label: "Telefone *", children: <input className="op-in" inputMode="tel" placeholder="(00) 00000-0000" value={d.telefone} onChange={(e) => set({ telefone: maskPhone(e.target.value) })} /> })}
            {F({ label: "WhatsApp", children: <input className="op-in" inputMode="tel" placeholder="(00) 00000-0000" value={d.whatsapp} onChange={(e) => set({ whatsapp: maskPhone(e.target.value) })} /> })}
            {F({ label: "E-mail", span: 2, children: <input className="op-in" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} /> })}
          </div>
          <label className="op-check"><input type="checkbox" checked={d.contatoWhats} onChange={(e) => set({ contatoWhats: e.target.checked })} /> Aceita receber avisos, comprovantes e lembretes pelo WhatsApp</label>

          <div className="op-sec"><MapPin size={12} /> Endereço</div>
          <div className="op-fields op-grid4">
            {F({ label: "CEP", children: <input className="op-in" inputMode="numeric" placeholder="00000-000" value={d.cep} onChange={(e) => { const v = maskCep(e.target.value); set({ cep: v }); if (dig(v).length === 8) lookupCep(v) }} /> })}
            {F({ label: "Rua", span: 2, children: <input className="op-in" value={d.rua} onChange={(e) => set({ rua: e.target.value })} /> })}
            {F({ label: "Número", children: <input className="op-in" value={d.numero} onChange={(e) => set({ numero: e.target.value })} /> })}
            {F({ label: "Complemento", children: <input className="op-in" value={d.complemento} onChange={(e) => set({ complemento: e.target.value })} /> })}
            {F({ label: "Bairro", children: <input className="op-in" value={d.bairro} onChange={(e) => set({ bairro: e.target.value })} /> })}
            {F({ label: "Cidade", children: <input className="op-in" placeholder={unitCity} value={d.cidade} onChange={(e) => set({ cidade: e.target.value })} /> })}
            {F({ label: "UF", children: <input className="op-in" maxLength={2} value={d.uf} onChange={(e) => set({ uf: e.target.value.toUpperCase() })} /> })}
            {F({ label: "Ponto de referência", span: 4, children: <input className="op-in" value={d.referencia} onChange={(e) => set({ referencia: e.target.value })} /> })}
          </div>
          {cepMsg && <p className="muted" style={{ margin: 0, fontSize: 12 }}>{cepMsg}</p>}

          <div className="op-sec">Crédito (vendas anotadas)</div>
          <div className="op-fields op-grid4">
            {F({ label: "Limite de crédito (R$)", children: <input className="op-in r" inputMode="decimal" value={d.limite} onChange={(e) => set({ limite: e.target.value })} /> })}
            {F({ label: "Dia de vencimento", children: <select className="op-in" value={d.vencimentoDia} onChange={(e) => set({ vencimentoDia: e.target.value })}>{["5", "10", "15", "20", "25", "30"].map((x) => <option key={x}>{x}</option>)}</select> })}
            <label className="op-check" style={{ gridColumn: "span 2", alignSelf: "end", paddingBottom: 10 }}><input type="checkbox" checked={d.bloqueado} onChange={(e) => set({ bloqueado: e.target.checked })} /> Bloquear vendas anotadas (fiado)</label>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Limite atual: {brl(parseMoney(d.limite))}. O caixa recusa vendas anotadas acima desse valor.</p>

          <div className="op-sec">Observações</div>
          <textarea className="op-in" placeholder="Preferências, restrições, como prefere ser atendido…" value={d.obs} onChange={(e) => set({ obs: e.target.value })} />

          {errors.length > 0 && <div className="op-note bad" style={{ flexDirection: "column", gap: 4 }}>{errors.map((x) => <span key={x}>• {x}</span>)}</div>}
        </div>
        <div className="foot">
          <button className="op-btn" onClick={onClose}>Cancelar</button>
          <button className="op-btn pri" onClick={save}><Check /> {existing ? "Salvar alterações" : "Cadastrar e usar na venda"}</button>
        </div>
      </aside>
    </Layer>
  )
}
