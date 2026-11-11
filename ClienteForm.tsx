import { useState } from "react"
import type { Item } from "../store"
import { brl, parseMoney } from "./ui"
import { CadastroDrawer, CadSec, Campo, cadInput } from "./CadastroDrawer"
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
export const maskCep = (v: string) => dig(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
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

/** Cadastro completo do cliente/tutor (novo ou edição): mesmo padrão de todos os cadastros. */
export default function ClienteForm({ initial, existing, tutores, unitCity, onClose, onSave }: { initial: ClienteData; existing?: Item | null; tutores: Item[]; unitCity: string; onClose: () => void; onSave: (d: ClienteData) => void }) {
  const [d, setD] = useState<ClienteData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
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
    const errs: Record<string, string> = {}
    if (d.nome.trim().length < 3) errs.nome = pj ? "Informe a razão social (mínimo 3 letras)." : "Informe o nome completo (mínimo 3 letras)."
    if (d.doc && !docOk) errs.doc = pj ? "CNPJ inválido. Confira os 14 números." : "CPF inválido. Confira os 11 números."
    if (dupe) errs.doc = `Já existe um cliente com este ${pj ? "CNPJ" : "CPF"}: ${dupe.name}.`
    if (!d.telefone && !d.whatsapp) errs.telefone = "Informe pelo menos um telefone com DDD."
    else if (d.telefone && dig(d.telefone).length < 10) errs.telefone = "Telefone incompleto: informe DDD e número."
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.email = "E-mail inválido. Exemplo: nome@email.com."
    if (d.nascimento && d.nascimento > new Date().toISOString().slice(0, 10)) errs.nascimento = "A data de nascimento não pode ser no futuro."
    if (d.cep && dig(d.cep).length !== 8) errs.cep = "CEP incompleto: são 8 números."
    setErrors(errs)
    if (!Object.keys(errs).length) onSave(d)
  }
  const firstError = Object.values(errors)[0]

  return (
    <CadastroDrawer
      title={existing ? `Editar tutor · ${existing.name}` : "Novo tutor"}
      sub={existing ? "Altere os dados e salve. O histórico do tutor não muda." : "Preencha os dados do tutor. Você poderá cadastrar os animais depois."}
      onClose={onClose}
      onSubmit={() => save()}
      submitLabel={existing ? "Salvar alterações" : "Cadastrar tutor"}
      error={firstError ? "Revise os campos destacados em vermelho." : undefined}
    >
      <CadSec n={1} title="Quem é" desc={pj ? "Empresa" : "Pessoa física"}>
        <div className="vx-c6" style={{ display: "flex", gap: 8 }}>
          {(["Física", "Jurídica"] as const).map((t) => (
            <button key={t} type="button" className={`vx-chip ${d.tipo === t ? "on" : ""}`} aria-pressed={d.tipo === t} onClick={() => set({ tipo: t, doc: "" })} style={{ minHeight: 40 }}>
              {t === "Física" ? "Pessoa física (CPF)" : "Pessoa jurídica (CNPJ)"}
            </button>
          ))}
        </div>
        <Campo label={pj ? "Razão social" : "Nome completo"} req span={4} error={errors.nome}>
          <input className={cadInput(errors.nome)} autoFocus value={d.nome} placeholder={pj ? "Nome da empresa" : "Ex.: Maria Souza Lima"} onChange={(e) => set({ nome: e.target.value })} />
        </Campo>
        <Campo label={pj ? "Nome fantasia" : "Como prefere ser chamado"} span={2}>
          <input className="vx-in" value={d.fantasia} placeholder="Opcional" onChange={(e) => set({ fantasia: e.target.value })} />
        </Campo>
        <Campo label={pj ? "CNPJ" : "CPF"} span={3} error={errors.doc} hint={!errors.doc && d.doc ? (docOk ? "Documento válido." : undefined) : "Usado para evitar cadastro repetido."}>
          <input className={cadInput(errors.doc)} inputMode="numeric" placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"} value={d.doc} onChange={(e) => set({ doc: pj ? maskCnpj(e.target.value) : maskCpf(e.target.value) })} />
        </Campo>
        <Campo label={pj ? "Inscrição estadual" : "RG"} span={3}>
          <input className="vx-in" value={d.rgIe} onChange={(e) => set({ rgIe: e.target.value })} />
        </Campo>
        {!pj && (
          <>
            <Campo label="Data de nascimento" span={3} error={errors.nascimento}>
              <input className={cadInput(errors.nascimento)} type="date" max={new Date().toISOString().slice(0, 10)} value={d.nascimento} onChange={(e) => set({ nascimento: e.target.value })} />
            </Campo>
            <Campo label="Sexo" span={3}>
              <select className="vx-in" value={d.sexo} onChange={(e) => set({ sexo: e.target.value })}>
                <option value="">Prefere não informar</option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
              </select>
            </Campo>
          </>
        )}
      </CadSec>

      <CadSec n={2} title="Como falar com a pessoa" desc="Pelo menos um telefone">
        <Campo label="Telefone" req span={3} error={errors.telefone}>
          <input className={cadInput(errors.telefone)} inputMode="tel" placeholder="(69) 90000-0000" value={d.telefone} onChange={(e) => set({ telefone: maskPhone(e.target.value) })} />
        </Campo>
        <Campo label="WhatsApp" span={3} hint="Se for o mesmo número, pode deixar em branco.">
          <input className="vx-in" inputMode="tel" placeholder="(69) 90000-0000" value={d.whatsapp} onChange={(e) => set({ whatsapp: maskPhone(e.target.value) })} />
        </Campo>
        <Campo label="E-mail" span={4} error={errors.email}>
          <input className={cadInput(errors.email)} type="email" placeholder="nome@email.com" value={d.email} onChange={(e) => set({ email: e.target.value })} />
        </Campo>
        <label className="vx-c6" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={d.contatoWhats} onChange={(e) => set({ contatoWhats: e.target.checked })} />
          Aceita receber avisos, comprovantes e lembretes pelo WhatsApp
        </label>
      </CadSec>

      <CadSec n={3} title="Endereço" desc="Digite o CEP para preencher sozinho">
        <Campo label="CEP" span={2} error={errors.cep} hint={cepMsg || undefined}>
          <input
            className={cadInput(errors.cep)}
            inputMode="numeric"
            placeholder="00000-000"
            value={d.cep}
            onChange={(e) => {
              const v = maskCep(e.target.value)
              set({ cep: v })
              if (dig(v).length === 8) lookupCep(v)
            }}
          />
        </Campo>
        <Campo label="Rua" span={4}>
          <input className="vx-in" value={d.rua} onChange={(e) => set({ rua: e.target.value })} />
        </Campo>
        <Campo label="Número" span={2}>
          <input className="vx-in" value={d.numero} onChange={(e) => set({ numero: e.target.value })} />
        </Campo>
        <Campo label="Complemento" span={2}>
          <input className="vx-in" value={d.complemento} onChange={(e) => set({ complemento: e.target.value })} />
        </Campo>
        <Campo label="Bairro" span={2}>
          <input className="vx-in" value={d.bairro} onChange={(e) => set({ bairro: e.target.value })} />
        </Campo>
        <Campo label="Cidade" span={3}>
          <input className="vx-in" placeholder={unitCity} value={d.cidade} onChange={(e) => set({ cidade: e.target.value })} />
        </Campo>
        <Campo label="UF" span={1}>
          <input className="vx-in" maxLength={2} value={d.uf} onChange={(e) => set({ uf: e.target.value.toUpperCase() })} />
        </Campo>
        <Campo label="Ponto de referência" span={6}>
          <input className="vx-in" value={d.referencia} onChange={(e) => set({ referencia: e.target.value })} />
        </Campo>
      </CadSec>

      <CadSec n={4} title="Crédito e observações" desc="Opcional">
        <Campo label="Limite para vendas anotadas (R$)" span={3} hint={`Limite atual: ${brl(parseMoney(d.limite))}. O caixa recusa vendas anotadas acima disso.`}>
          <input className="vx-in" inputMode="decimal" value={d.limite} onChange={(e) => set({ limite: e.target.value })} />
        </Campo>
        <Campo label="Dia de vencimento" span={3}>
          <select className="vx-in" value={d.vencimentoDia} onChange={(e) => set({ vencimentoDia: e.target.value })}>
            {["5", "10", "15", "20", "25", "30"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
        <label className="vx-c6" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={d.bloqueado} onChange={(e) => set({ bloqueado: e.target.checked })} />
          Bloquear vendas anotadas para este cliente
        </label>
        <Campo label="Observações" span={6}>
          <textarea className="vx-in" placeholder="Preferências, restrições, como prefere ser atendido…" value={d.obs} onChange={(e) => set({ obs: e.target.value })} />
        </Campo>
      </CadSec>
    </CadastroDrawer>
  )
}
