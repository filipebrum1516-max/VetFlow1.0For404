import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Item = {
  id: string
  name: string
  subtitle: string
  status: string
  createdAt: string
  unitId?: string
  animalId?: string
  ownerId?: string
  professionalId?: string
  animal?: string
  owner?: string
  species?: string
  breed?: string
  phone?: string
  email?: string
  professional?: string
  date?: string
  time?: string
  service?: string
  notes?: string
  amount?: string
  amountValue?: number
  category?: string
  quantity?: number
  minimum?: number
  dueDate?: string
  urgency?: boolean
  kind?: string
  address?: string
  cpf?: string
  registration?: string
  sex?: string
  birthDate?: string
  weight?: string
  clinicalHistory?: string
  diagnosis?: string
  treatment?: string
  rg?: string
  nationality?: string
  profession?: string
  personType?: string
  privacy?: string
  duration?: number
  products?: string
  recurrenceId?: string
  extra?: Record<string, any>
}

export type Unit = {
  id: string
  name: string
  shortName: string
  cnpj: string
  phone: string
  email: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  cep: string
  responsible: string
  status: "Ativa" | "Inativa"
  profile: string
  extra?: Record<string, any>
}

export type Notification = {
  id: string
  title: string
  detail: string
  time: string
  read: boolean
  path: string
  unitId: string
}

export type UserProfile = {
  name: string
  displayName: string
  email: string
  phone: string
  crmv: string
  specialty: string
  bio: string
}

export const modules = [
  ["tutores", "Tutores"],
  ["animais", "Animais"],
  ["prontuarios", "Prontuários"],
  ["consultas", "Consultas"],
  ["agendas", "Agendas"],
  ["profissionais", "Profissionais"],
  ["vacinas", "Vacinas"],
  ["prescricoes", "Prescrições"],
  ["medicamentos", "Medicamentos"],
  ["exames", "Exames"],
  ["procedimentos", "Procedimentos"],
  ["cirurgias", "Cirurgias"],
  ["internacoes", "Internações"],
  ["protocolos", "Protocolos"],
  ["servicos", "Serviços"],
  ["estoque", "Estoque"],
  ["financeiro", "Financeiro"],
  ["convenios", "Convênios"],
  ["unidades", "Unidades"],
  ["teleatendimentos", "Teleatendimentos"],
  ["comunicacao", "Comunicação"],
  ["publicacoes", "Publicações"],
  ["documentos", "Documentos"],
  ["ocorrencias", "Ocorrências"],
  ["usuarios", "Usuários e Acessos"],
  ["relatorios", "Relatórios"],
] as const

export type ModuleSlug = typeof modules[number][0]
export type UnitData = Record<ModuleSlug, Item[]>

const TODAY = new Date("2026-10-09T12:00:00")
const START = new Date("2024-10-01T12:00:00")
const DAY = 86_400_000

const seedUnits: Unit[] = [
  {
    id: "centro",
    name: "Unidade - Mirante da Serra",
    shortName: "Mirante da Serra",
    cnpj: "12.345.678/0001-90",
    phone: "(69) 3463-1200",
    email: "mirante@vetflow.com.br",
    street: "Avenida Marechal Rondon",
    number: "1240",
    neighborhood: "Centro",
    city: "Mirante da Serra",
    state: "RO",
    cep: "76.926-000",
    responsible: "Dra. Ana Martins",
    status: "Ativa",
    profile: "Hospital de referência e maior volume clínico",
  },
  {
    id: "sul",
    name: "Unidade - Nova União",
    shortName: "Nova União",
    cnpj: "12.345.678/0002-70",
    phone: "(69) 3466-1300",
    email: "novauniao@vetflow.com.br",
    street: "Rua Independência",
    number: "385",
    neighborhood: "Centro",
    city: "Nova União",
    state: "RO",
    cep: "76.924-000",
    responsible: "Dr. João Lima",
    status: "Ativa",
    profile: "Clínica de bairro com atendimento preventivo",
  },
  {
    id: "norte",
    name: "Unidade - Urupá",
    shortName: "Urupá",
    cnpj: "12.345.678/0003-50",
    phone: "(69) 3413-1100",
    email: "urupa@vetflow.com.br",
    street: "Avenida Jorge Teixeira",
    number: "820",
    neighborhood: "Centro",
    city: "Urupá",
    state: "RO",
    cep: "76.929-000",
    responsible: "Dr. Marcos Nunes",
    status: "Ativa",
    profile: "Pronto atendimento 24h, emergências e internações",
  },
]

const unitScale: Record<string, number> = { centro: 1, sul: 0.48, norte: 0.82 }
const ownerFirst = [
  "Ana",
  "Bruno",
  "Camila",
  "Carlos",
  "Daniel",
  "Fernanda",
  "Gabriel",
  "Helena",
  "João",
  "Juliana",
  "Larissa",
  "Lucas",
  "Mariana",
  "Marcelo",
  "Patrícia",
  "Paulo",
  "Renata",
  "Ricardo",
  "Sandra",
  "Thiago",
  "Vanessa",
  "Vinícius",
]
const ownerLast = [
  "Almeida",
  "Barbosa",
  "Cardoso",
  "Castro",
  "Costa",
  "Freitas",
  "Gomes",
  "Lima",
  "Martins",
  "Mendes",
  "Moreira",
  "Nunes",
  "Oliveira",
  "Pereira",
  "Ribeiro",
  "Rocha",
  "Rodrigues",
  "Santos",
  "Silva",
  "Souza",
  "Teixeira",
]
const petNames = [
  "Thor",
  "Luna",
  "Mel",
  "Nina",
  "Max",
  "Bento",
  "Amora",
  "Fred",
  "Maya",
  "Bob",
  "Jade",
  "Simba",
  "Lola",
  "Theo",
  "Meg",
  "Pipoca",
  "Chico",
  "Belinha",
  "Zeca",
  "Kiara",
  "Apolo",
  "Frida",
  "Luke",
  "Pandora",
  "Tobias",
  "Ayla",
  "Aurora",
  "Babi",
  "Balu",
  "Billy",
  "Bolota",
  "Bruce",
  "Cacau",
  "Caju",
  "Capitu",
  "Charlotte",
  "Cookie",
  "Dengo",
  "Diana",
  "Duque",
  "Fiona",
  "Floquinho",
  "Gaia",
  "Gigi",
  "Joca",
  "Kiko",
  "Lili",
  "Maggie",
  "Mia",
  "Mike",
  "Milu",
  "Molly",
  "Nala",
  "Nino",
  "Paçoca",
  "Pérola",
  "Peter",
  "Pingo",
  "Pitoco",
  "Pretinha",
  "Princesa",
  "Ravi",
  "Rex",
  "Romeu",
  "Safira",
  "Sam",
  "Sol",
  "Sophie",
  "Spike",
  "Teodoro",
  "Tico",
  "Toby",
  "Tom",
  "Valentina",
  "Zoe",
  "Bartô",
  "Bidu",
  "Bisteca",
  "Blue",
  "Brisa",
  "Cindy",
  "Dara",
  "Elvis",
  "Estrela",
  "Fubá",
  "George",
  "Hanna",
  "Jack",
  "Jujuba",
  "Leona",
  "Lupita",
  "Marley",
  "Mimi",
  "Murphy",
  "Olívia",
  "Ozzy",
  "Paco",
  "Penélope",
  "Ravena",
  "Sasha",
  "Scott",
  "Tulipa",
  "Yuki",
  "Ziggy",
  "Alfredo",
  "Atena",
  "Bela",
  "Biscoito",
  "Branca",
  "Brownie",
  "Cleo",
  "Cometa",
  "Dolly",
  "Dori",
  "Fofão",
  "Gatuno",
  "Hércules",
  "Indy",
  "Jasmin",
  "Kira",
  "Lord",
  "Lupi",
  "Nick",
  "Oliver",
  "Pantera",
  "Pelúcia",
  "Rubi",
  "Sabrina",
  "Sultão",
  "Tigre",
  "Trufa",
  "Úrsula",
  "Vitória",
  "Xuxa",
  "Zara",
  "Anjo",
  "Bandit",
  "Chiquinha",
  "Dudu",
  "Esmeralda",
  "Gordo",
  "Hulk",
  "Iara",
  "Jerry",
  "Kaiser",
  "Lara",
  "Mingau",
  "Nuvem",
  "Oreo",
  "Pudim",
  "Quindim",
  "Rambo",
  "Samba",
  "Tufão",
  "Uva",
  "Vento",
  "Wilson",
  "Pit",
  "Teo",
  "Bella",
  "Lucky",
  "Pepe",
  "Zeus",
  "Nico",
]
const cattleBreeds = ["Nelore", "Angus", "Holandesa", "Gir Leiteiro", "Girolando", "Jersey", "Brahman", "Senepol"]
const horseBreeds = ["Quarto de Milha", "Mangalarga Marchador", "Crioulo", "Puro-Sangue Árabe", "Campolina", "Paint Horse"]
const cattleNames = ["Mimosa", "Malhada", "Estrela Dalva", "Boneca", "Pintada", "Valente", "Trovão", "Brasão", "Serena", "Florinda", "Chuvisco", "Bandeirante", "Jurema", "Faceira", "Tufão", "Cacique"]
const horseNames = ["Pégaso", "Relâmpago", "Tornado", "Zorro", "Ventania", "Faísca", "Alazão", "Imperador", "Furacão", "Cigana", "Sertanejo", "Galope"]
const largeVaccines = {
  Bovino: ["Vacina contra febre aftosa", "Vacina contra brucelose (B19)", "Vacina contra raiva dos herbívoros", "Vacina contra clostridioses", "Vacina reprodutiva (IBR/BVD)"],
  Equino: ["Vacina contra influenza equina", "Vacina contra tétano", "Vacina contra encefalomielite", "Vacina contra raiva dos herbívoros", "Vacina contra rinopneumonite"],
}
const largeServices = {
  Bovino: ["Atendimento a campo", "Diagnóstico de gestação", "Exame andrológico", "Casqueamento", "Vacinação do rebanho"],
  Equino: ["Atendimento a campo", "Casqueamento e ferrageamento", "Exame de claudicação", "Odontologia equina", "Ultrassonografia reprodutiva"],
}
const breeds = [
  "SRD",
  "Shih Tzu",
  "Poodle",
  "Golden Retriever",
  "Bulldog Francês",
  "Labrador",
  "Yorkshire",
  "Spitz Alemão",
  "Beagle",
  "Dachshund",
  "Persa",
  "Siamês",
  "Ragdoll",
  "Maine Coon",
  "Bengal",
]
const professionals = [
  ["rafael", "Dr. Rafael Souza", "Dermatologia"],
  ["ana", "Dra. Ana Martins", "Clínica geral"],
  ["joao", "Dr. João Lima", "Cirurgia"],
  ["luisa", "Dra. Luísa Paiva", "Felinos"],
  ["marcos", "Dr. Marcos Nunes", "Emergência"],
] as const
const services = [
  ["Consulta clínica", 190],
  ["Retorno", 110],
  ["Vacinação", 145],
  ["Consulta dermatológica", 260],
  ["Consulta cardiológica", 310],
  ["Ultrassonografia", 280],
  ["Atendimento emergencial", 390],
  ["Consulta de felinos", 230],
] as const
const examNames = [
  "Hemograma completo",
  "Ultrassom abdominal",
  "Perfil renal",
  "Raio-X de tórax",
  "Bioquímico hepático",
  "Urina tipo I",
  "Ecocardiograma",
  "Citologia de pele",
]
const vaccines = [
  "Vacina V10",
  "Vacina V8",
  "Vacina antirrábica",
  "Vacina quádrupla felina (V4)",
  "Vacina quíntupla felina (V5)",
  "Vacina contra gripe canina",
  "Vacina contra giárdia",
  "Vacina contra leishmaniose",
  "Vacina contra leucemia felina (FeLV)",
  "Vacina tríplice felina (V3)",
]
const medicines = [
  "Prednisona 20 mg",
  "Dipirona 500 mg",
  "Amoxicilina + clavulanato 250 mg",
  "Meloxicam 0,5 mg",
  "Cefalexina 300 mg",
  "Ômega 3 veterinário",
  "Enrofloxacino 50 mg",
  "Metronidazol 250 mg",
  "Doxiciclina 100 mg",
  "Tramadol 50 mg",
  "Gabapentina 100 mg",
  "Omeprazol 10 mg",
  "Ondansetrona 4 mg",
  "Maropitant (Cerenia) 16 mg",
  "Furosemida 40 mg",
  "Pimobendan 5 mg",
  "Benazepril 5 mg",
  "Ivermectina 6 mg",
  "Fluralaner (Bravecto) 500 mg",
  "Prazinquantel + pirantel",
  "Cetoconazol 200 mg",
  "Itraconazol 100 mg",
  "Carprofeno 75 mg",
  "Dexametasona 2 mg/ml",
  "Ranitidina 75 mg",
  "Fenobarbital 100 mg",
  "Silimarina 90 mg",
  "Sucralfato 1 g",
  "Clindamicina 150 mg",
  "Apoquel (oclacitinib) 5,4 mg",
]
const procedures = [
  "Curativo simples",
  "Coleta de sangue",
  "Limpeza otológica",
  "Fluidoterapia",
  "Limpeza dentária",
  "Aplicação de medicamento",
]

function randomFactory(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4_294_967_296
  }
}

function pick<T>(list: readonly T[], random: () => number) {
  return list[Math.floor(random() * list.length)]
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateInHistory(random: () => number, seasonal = false) {
  const span = Math.floor((TODAY.getTime() - START.getTime()) / DAY)
  let day = Math.floor(Math.sqrt(random()) * span)
  const candidate = new Date(START.getTime() + day * DAY)
  if (seasonal && random() < 0.42) {
    candidate.setMonth(random() < 0.55 ? 0 : 1)
    if (candidate > TODAY) candidate.setFullYear(candidate.getFullYear() - 1)
    day = Math.max(0, Math.floor((candidate.getTime() - START.getTime()) / DAY))
  }
  return new Date(START.getTime() + day * DAY)
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function baseItem(
  unitId: string,
  slug: ModuleSlug,
  index: number,
  date: Date,
  patch: Partial<Item>,
): Item {
  return {
    id: `${unitId}-${slug}-${index + 1}`,
    name: "Registro",
    subtitle: "VetFlow",
    status: "Ativo",
    unitId,
    createdAt: date.toISOString(),
    date: dateValue(date),
    ...patch,
  }
}

function generateUnit(unit: Unit, unitIndex: number): UnitData {
  const random = randomFactory(19_840 + unitIndex * 9_973)
  const scale = unitScale[unit.id]
  const ownerCount = Math.round(320 * scale)
  const animalCount = Math.round(430 * scale)
  const consultationCount = Math.round(1_150 * scale)

  const tutors = Array.from({ length: ownerCount }, (_, index) => {
    const name = `${ownerFirst[index % ownerFirst.length]} ${ownerLast[(index * 7 + unitIndex) % ownerLast.length]}`
    const created = dateInHistory(random)
    const overdue = index % 17 === 0
    return baseItem(unit.id, "tutores", index, created, {
      name,
      subtitle: `Cliente desde ${created.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`,
      phone: `(${
        unit.id === "norte" ? "11" : index % 4 === 0 ? "13" : "11"
      }) 9${String(7000 + (index % 2999)).padStart(4, "0")}-${String(1100 + ((index * 37) % 8800)).padStart(4, "0")}`,
      email: `${normalize(name).replaceAll(" ", ".")}${index}@email.com`,
      address: `${pick(["Rua", "Avenida", "Alameda"], random)} ${pick(ownerLast, random)}, ${80 + index} • ${unit.city}`,
      status: overdue ? "Inadimplente" : index % 41 === 0 ? "Inativo" : "Ativo",
      amountValue: overdue ? 180 + (index % 9) * 65 : 0,
      amount: overdue ? money(180 + (index % 9) * 65) : money(0),
      notes:
        "Contato autorizado por WhatsApp. Cadastro e consentimentos atualizados.",
    })
  })

  const animals = Array.from({ length: animalCount }, (_, index) => {
    const owner = tutors[index % tutors.length]
    const species =
      index % 9 === 4 ? "Bovino" : index % 13 === 6 ? "Equino" : index % 5 === 1 ? "Gato" : "Cão"
    const breedPool =
      species === "Bovino"
        ? cattleBreeds
        : species === "Equino"
          ? horseBreeds
          : species === "Gato"
            ? breeds.slice(10)
            : breeds.slice(0, 10)
    const bigPool = species === "Bovino" ? cattleNames : species === "Equino" ? horseNames : null
    const name = bigPool ? bigPool[index % bigPool.length] : petNames[index % petNames.length]
    const created = dateInHistory(random)
    const status =
      index % 97 === 0
        ? "Falecido"
        : index % 19 === 0
          ? "Internado"
          : index % 11 === 0
            ? "Em tratamento"
            : "Ativo"
    return baseItem(unit.id, "animais", index, created, {
      name,
      subtitle: `${species} • ${breedPool[index % breedPool.length]}`,
      species,
      breed: breedPool[index % breedPool.length],
      owner: owner.name,
      ownerId: owner.id,
      status,
      weight: species === "Bovino" ? `${380 + (index % 9) * 45} kg` : species === "Equino" ? `${360 + (index % 7) * 40} kg` : undefined,
      notes: `Paciente acompanhado desde ${created.toLocaleDateString("pt-BR")}. Histórico clínico e vacinal disponível.`,
    })
  })

  const professionalItems = professionals.map(([id, name, specialty], index) =>
    baseItem(unit.id, "profissionais", index, START, {
      id: `${unit.id}-profissional-${id}`,
      name,
      subtitle: `${specialty} • CRMV-SP ${28_410 + index * 317}`,
      registration: `CRMV-SP ${28_410 + index * 317}`,
      status: index === 4 && unit.id !== "norte" ? "Plantão eventual" : "Ativo",
      category: specialty,
      phone: `(11) 9${8100 + index * 113}-${1200 + index * 227}`,
    }),
  )

  const consultations = Array.from(
    { length: consultationCount },
    (_, index) => {
      let date = dateInHistory(random)
      if (random() < (unit.id === "norte" ? 0.26 : 0.12)) {
        date = new Date(
          Math.min(
            TODAY.getTime(),
            date.getTime() + ((6 - date.getDay() + 7) % 7) * DAY,
          ),
        )
      }
      const animal = animals[Math.floor(random() * animals.length)]
      const owner =
        tutors.find((item) => item.id === animal.ownerId) || tutors[0]
      const professional = pick(professionalItems, random)
      const weekend = [0, 6].includes(date.getDay())
      const emergencyBoost = unit.id === "norte" && (weekend || random() < 0.24)
      const [service, basePrice] = emergencyBoost
        ? services[6]
        : pick(services, random)
      const amountValue = Math.round(basePrice * (0.9 + random() * 0.35))
      const status =
        index % 23 === 0
          ? "Faltou"
          : index % 19 === 0
            ? "Cancelado"
            : "Concluído"
      return baseItem(unit.id, "consultas", index, date, {
        name: service,
        subtitle: `${animal.name} • ${owner.name}`,
        animal: animal.name,
        animalId: animal.id,
        owner: owner.name,
        ownerId: owner.id,
        professional: professional.name,
        professionalId: professional.id,
        service,
        status,
        time: `${String(8 + (index % (unit.id === "norte" ? 16 : 10))).padStart(2, "0")}:${
          index % 2 ? "30" : "00"
        }`,
        amountValue,
        amount: money(amountValue),
        category: emergencyBoost ? "Emergência" : "Clínica",
        urgency: emergencyBoost,
        notes:
          status === "Concluído"
            ? "Atendimento finalizado e prontuário atualizado."
            : "Registro operacional da consulta.",
      })
    },
  ).sort((a, b) => b.date!.localeCompare(a.date!))

  // agenda variada: de 3 a 14 horários por dia, espalhados entre 7h e 19h30
  const agendaFirst = new Date("2026-09-21T12:00:00")
  const agendas: Item[] = []
  for (let day = 0; day < 56; day++) {
    const date = new Date(agendaFirst.getTime() + day * DAY)
    const weekday = date.getDay()
    const perDay = weekday === 0 ? Math.floor(random() * 3) : weekday === 6 ? 2 + Math.floor(random() * 5) : 3 + Math.floor(random() * 12)
    const used = new Set<string>()
    for (let n = 0; n < perDay; n++) {
      const index = agendas.length
      const animal = animals[Math.floor(random() * animals.length)]
      const owner = tutors.find((item) => item.id === animal.ownerId) || tutors[0]
      const professional = professionalItems[Math.floor(random() * professionalItems.length)]
      const large = animal.species === "Bovino" || animal.species === "Equino"
      const service = large
        ? largeServices[animal.species as "Bovino" | "Equino"][index % 5]
        : services[Math.floor(random() * services.length)][0]
      let slot = 0
      let time = ""
      do {
        slot = Math.floor(random() * 50)
        time = `${String(7 + Math.floor(slot / 4)).padStart(2, "0")}:${["00", "15", "30", "45"][slot % 4]}`
      } while (used.has(`${professional.id}-${time}`) && used.size < 200)
      used.add(`${professional.id}-${time}`)
      const past = date.getTime() < TODAY.getTime()
      const status = past
        ? ["Concluído", "Concluído", "Concluído", "Faltou", "Cancelado"][Math.floor(random() * 5)]
        : ["Agendado", "Confirmado", "Confirmado", "Aguardando confirmação"][Math.floor(random() * 4)]
      agendas.push(
        baseItem(unit.id, "agendas", index, date, {
          name: String(service),
          subtitle: `${animal.name} • ${owner.name}`,
          animal: animal.name,
          animalId: animal.id,
          owner: owner.name,
          ownerId: owner.id,
          phone: owner.phone,
          professional: professional.name,
          professionalId: professional.id,
          service: String(service),
          status,
          time,
          duration: large ? 90 : [20, 30, 30, 45, 60][Math.floor(random() * 5)],
          notes: large ? "Atendimento na propriedade do tutor." : index % 7 === 0 ? "Tutor solicitou atenção ao histórico de alergias." : "Agendamento confirmado pelo tutor.",
        }),
      )
    }
  }

  const linked = (
    slug: ModuleSlug,
    count: number,
    names: readonly string[],
    statuses: readonly string[],
    seasonal = false,
  ) =>
    Array.from({ length: Math.round(count * scale) }, (_, index) => {
      const animal = animals[(index * 17 + unitIndex) % animals.length]
      const owner =
        tutors.find((item) => item.id === animal.ownerId) || tutors[0]
      const professional = professionalItems[index % professionalItems.length]
      const date = dateInHistory(random, seasonal)
      const name = names[index % names.length]
      return baseItem(unit.id, slug, index, date, {
        name,
        subtitle: `${animal.name} • ${owner.name}`,
        animal: animal.name,
        animalId: animal.id,
        owner: owner.name,
        ownerId: owner.id,
        professional: professional.name,
        professionalId: professional.id,
        status: statuses[index % statuses.length],
        category: index % 9 === 0 ? "Urgente" : "Rotina",
        urgency: index % 9 === 0,
        dueDate: dateValue(
          new Date(date.getTime() + (30 + (index % 330)) * DAY),
        ),
        amountValue: 80 + (index % 8) * 45,
        amount: money(80 + (index % 8) * 45),
        notes: `Registro de ${name.toLowerCase()} vinculado ao prontuário de ${animal.name}.`,
      })
    }).sort((a, b) => b.date!.localeCompare(a.date!))

  const speciesById = new Map(animals.map((animal) => [animal.id, animal.species]))
  const vaccinesData = linked(
    "vacinas",
    560,
    vaccines,
    ["Aplicada", "A vencer", "Atrasada"],
    true,
  ).map((item, index) => {
    const kind = speciesById.get(item.animalId || "") as "Bovino" | "Equino" | undefined
    if (kind !== "Bovino" && kind !== "Equino") return item
    return { ...item, name: largeVaccines[kind][index % largeVaccines[kind].length] }
  })
  const prescriptions = linked("prescricoes", 430, medicines, [
    "Ativa",
    "Vencendo",
    "Renovação pendente",
    "Concluída",
  ])
  const exams = linked("exames", 490, examNames, [
    "Solicitado",
    "Aguardando resultado",
    "Concluído",
    "Urgente",
  ])
  const proceduresData = linked("procedimentos", 360, procedures, [
    "Agendado",
    "Em andamento",
    "Concluído",
    "Pendente",
  ])
  const surgeries = linked(
    "cirurgias",
    unit.id === "norte" ? 170 : 110,
    [
      "Castração",
      "Ovariohisterectomia",
      "Limpeza dentária",
      "Retirada de nódulo",
    ],
    ["Agendada", "Pré-operatório", "Concluída", "Cancelada"],
  )
  const admissions = linked(
    "internacoes",
    unit.id === "norte" ? 280 : 110,
    [
      "Observação clínica",
      "Pós-operatório",
      "Fluidoterapia",
      "UTI e monitoramento",
    ],
    ["Em andamento", "Alta médica", "Em observação", "Encerrada"],
  )

  const financeRevenue = consultations
    .filter((item) => item.status === "Concluído")
    .map((consultation, index) =>
      baseItem(
        unit.id,
        "financeiro",
        index,
        new Date(`${consultation.date}T12:00:00`),
        {
          name: `${consultation.service} • Receita`,
          subtitle: consultation.subtitle,
          animal: consultation.animal,
          animalId: consultation.animalId,
          owner: consultation.owner,
          ownerId: consultation.ownerId,
          professional: consultation.professional,
          professionalId: consultation.professionalId,
          status:
            index % 29 === 0
              ? "A receber"
              : index % 47 === 0
                ? "Vencido"
                : "Recebido",
          category: "Receita",
          kind: "Receita",
          amountValue: consultation.amountValue,
          amount: consultation.amount,
          service: consultation.service,
        },
      ),
    )
  const expenseCount = Math.max(36, Math.round(96 * scale))
  const revenueTotal = financeRevenue.reduce(
    (total, item) => total + (item.amountValue || 0),
    0,
  )
  const expenseBudget = revenueTotal * 0.58
  const expenseWeights = Array.from(
    { length: expenseCount },
    (_, index) => 1 + ((index * 17) % 9) / 10,
  )
  const totalExpenseWeight = expenseWeights.reduce(
    (total, weight) => total + weight,
    0,
  )
  const expenses = Array.from({ length: expenseCount }, (_, index) => {
    const date = dateInHistory(random)
    const amountValue = Math.round(
      (expenseBudget * expenseWeights[index]) / totalExpenseWeight,
    )
    const names = [
      "Fornecedor MedPet",
      "Laboratório VetLab",
      "Energia elétrica",
      "Folha de pagamento",
      "Materiais cirúrgicos",
    ]
    return baseItem(
      unit.id,
      "financeiro",
      financeRevenue.length + index,
      date,
      {
        name: names[index % names.length],
        subtitle: `Despesa operacional • ${unit.shortName}`,
        status: index % 31 === 0 ? "Vencido" : "Pago",
        category: "Despesa",
        kind: "Despesa",
        amountValue,
        amount: money(amountValue),
      },
    )
  })

  const stock = Array.from(
    { length: Math.round(145 * scale) + 45 },
    (_, index) => {
      const name = [
        ...vaccines,
        ...medicines,
        "Seringa 5 ml",
        "Luva cirúrgica",
        "Cateter 22G",
        "Soro fisiológico",
      ][index % (vaccines.length + medicines.length + 4)]
      const roll = random()
      const minimum = 6 + (index % 15)
      const quantity =
        roll < 0.12
          ? Math.floor(random() * 3)
          : roll < 0.3
            ? Math.max(1, Math.floor(minimum * (0.3 + random() * 0.65)))
            : roll < 0.55
              ? Math.floor(minimum * (1 + random() * 0.8))
              : Math.floor(minimum * (2 + random() * 8))
      const unitCost = 6 + (index % 12) * 11
      const due = new Date(TODAY.getTime() + ((index % 19) - 4) * 30 * DAY)
      return baseItem(unit.id, "estoque", index, dateInHistory(random), {
        name: index >= vaccines.length + medicines.length + 4 ? `${name} • lote ${2_410 + index}` : name,
        subtitle: `${quantity} un. • mínimo ${minimum}`,
        status:
          quantity < minimum
            ? "Abaixo do mínimo"
            : due < TODAY
              ? "Vencido"
              : "Disponível",
        category: vaccines.includes(name)
          ? "Vacinas"
          : medicines.includes(name)
            ? "Medicamentos"
            : "Materiais",
        quantity,
        minimum,
        dueDate: dateValue(due),
        amountValue: quantity * unitCost,
        amount: money(quantity * unitCost),
      })
    },
  )

  const generic = (
    slug: ModuleSlug,
    count: number,
    names: readonly string[],
    statuses: readonly string[],
  ) =>
    Array.from(
      { length: Math.max(8, Math.round(count * scale)) },
      (_, index) => {
        const date = dateInHistory(random)
        return baseItem(unit.id, slug, index, date, {
          name:
            index < names.length
              ? names[index]
              : `${names[index % names.length]} #${index + 1}`,
          subtitle: `${unit.shortName} • atualizado em ${date.toLocaleDateString("pt-BR")}`,
          status: statuses[index % statuses.length],
          professional:
            professionalItems[index % professionalItems.length].name,
          professionalId:
            professionalItems[index % professionalItems.length].id,
          category: index % 5 === 0 ? "Prioridade" : "Rotina",
          amountValue: 95 + (index % 9) * 40,
          amount: money(95 + (index % 9) * 40),
          notes:
            "Registro operacional com histórico de alterações e responsável identificado.",
        })
      },
    ).sort((a, b) => b.date!.localeCompare(a.date!))

  const prontuarios = [
    ...consultations.slice(0, Math.round(550 * scale)),
    ...exams.slice(0, Math.round(80 * scale)),
  ].map((item, index) => ({
    ...item,
    id: `${unit.id}-prontuarios-${index + 1}`,
    name: `Evolução • ${item.name}`,
  }))

  return {
    tutores: tutors,
    animais: animals,
    profissionais: professionalItems,
    consultas: consultations,
    agendas,
    prontuarios,
    vacinas: vaccinesData,
    prescricoes: prescriptions,
    medicamentos: generic("medicamentos", medicines.length, medicines, [
      "Disponível",
      "Controlado",
      "Ativo",
    ]),
    exames: exams,
    procedimentos: proceduresData,
    cirurgias: surgeries,
    internacoes: admissions,
    protocolos: generic(
      "protocolos",
      24,
      [
        "Protocolo vacinal canino",
        "Protocolo vacinal felino",
        "Controle de dor aguda",
        "Sepse veterinária",
        "Profilaxia cirúrgica",
        "Atendimento ao politraumatizado",
        "Gastroenterite aguda em filhotes",
        "Cetoacidose diabética",
        "Insuficiência renal crônica felina",
        "Dermatite atópica canina",
        "Otite externa recorrente",
        "Parada cardiorrespiratória (RCP)",
        "Fluidoterapia em desidratação",
        "Intoxicação por chumbinho",
        "Convulsão e status epilepticus",
        "Obstrução uretral felina",
        "Anestesia em paciente idoso",
        "Pós-operatório de castração",
        "Cólica equina",
        "Mastite bovina",
        "Retenção de placenta em vacas",
        "Diarreia em bezerros",
        "Manejo sanitário do rebanho",
        "Claudicação em equinos",
      ],
      ["Ativo", "Em revisão", "Aprovado"],
    ),
    servicos: services.map(([name, price], index) =>
      baseItem(unit.id, "servicos", index, START, {
        name,
        subtitle: `${money(Math.round(price * (0.92 + unitIndex * 0.06)))} • ${45 + index * 10} min`,
        status: "Ativo",
        amountValue: price,
        amount: money(price),
      }),
    ),
    estoque: stock,
    financeiro: [...financeRevenue, ...expenses].sort((a, b) =>
      b.date!.localeCompare(a.date!),
    ),
    convenios: generic(
      "convenios",
      28,
      ["VetPlus Essencial", "PetCare Premium", "Amigo Animal", "Clube VetFlow"],
      ["Ativo", "Em análise", "Suspenso"],
    ),
    unidades: seedUnits.map((item, index) =>
      baseItem(unit.id, "unidades", index, START, {
        id: item.id,
        name: item.name,
        subtitle: `${item.city} • ${item.profile}`,
        status: item.id === unit.id ? "Unidade ativa" : "Disponível",
      }),
    ),
    teleatendimentos: linked(
      "teleatendimentos",
      95,
      [
        "Retorno remoto",
        "Orientação pós-operatória",
        "Avaliação de exames",
        "Triagem remota",
      ],
      ["Agendado", "Concluído", "Em andamento", "Faltou"],
    ),
    comunicacao: linked(
      "comunicacao",
      210,
      [
        "Confirmação de consulta",
        "Lembrete de vacina",
        "Resultado disponível",
        "Pesquisa de satisfação",
      ],
      ["Enviada", "Lida", "Pendente", "Respondida"],
    ),
    publicacoes: generic(
      "publicacoes",
      54,
      [
        "Cuidados no calor",
        "Campanha de vacinação antirrábica",
        "Saúde bucal pet",
        "Prevenção de pulgas e carrapatos",
        "Vacinação contra aftosa no rebanho",
        "Cuidados com cascos do cavalo",
        "Castração: mitos e verdades",
        "Bem-estar do rebanho leiteiro",
        "Check-up do gato idoso",
        "Alimentação do filhote",
        "Atendimento a campo em haras",
        "Bezerros: colostro nas primeiras horas",
      ],
      ["Publicada", "Agendada", "Rascunho"],
    ),
    documentos: linked(
      "documentos",
      260,
      [
        "Termo de consentimento",
        "Laudo laboratorial",
        "Autorização cirúrgica",
        "Contrato de internação",
      ],
      ["Assinado", "Pendente", "Arquivado"],
    ),
    ocorrencias: linked(
      "ocorrencias",
      unit.id === "norte" ? 95 : 60,
      [
        "Atraso no atendimento",
        "Reação vacinal leve",
        "Divergência de estoque",
        "Falha de equipamento",
      ],
      ["Aberta", "Em análise", "Resolvida"],
    ),
    usuarios: [
      ...professionalItems.map((item, index) => ({
        ...item,
        id: `${unit.id}-usuarios-${index + 1}`,
        subtitle: `${item.category} • acesso ${index % 2 ? "hoje" : "ontem"}`,
        status: "Ativo",
      })),
      ...generic(
        "usuarios",
        16,
        ["Marina Alves", "Filipe Araújo", "Carla Dias", "Rodrigo Melo"],
        ["Ativo", "Convite pendente", "Bloqueado"],
      ).map((item, index) => ({
        ...item,
        id: `${unit.id}-usuarios-${professionalItems.length + index + 1}`,
      })),
    ],
    relatorios: generic(
      "relatorios",
      24,
      [
        "Atendimentos",
        "Financeiro",
        "Estoque e validade",
        "Produtividade da equipe",
      ],
      ["Atualizado", "Agendado", "Gerado"],
    ),
  }
}

function makeSeed(): Record<string, UnitData> {
  return Object.fromEntries(
    seedUnits.map((unit, index) => [unit.id, generateUnit(unit, index)]),
  )
}

function emptyUnitData(): UnitData {
  return Object.fromEntries(
    modules.map(([slug]) => [slug, []]),
  ) as UnitData
}

type DataChange = {
  operation: "add" | "update" | "delete"
  unitId: string
  module: ModuleSlug
  id: string
  item?: Item
  patch?: Partial<Item>
}

function applyChanges(
  seed: Record<string, UnitData>,
  changes: DataChange[],
): Record<string, UnitData> {
  return changes.reduce((current, change) => {
    const records = current[change.unitId][change.module]
    const nextRecords =
      change.operation === "add" && change.item
        ? [change.item, ...records]
        : change.operation === "update"
          ? records.map((item) =>
              item.id === change.id ? { ...item, ...change.patch } : item,
            )
          : records.filter((item) => item.id !== change.id)
    return {
      ...current,
      [change.unitId]: {
        ...current[change.unitId],
        [change.module]: nextRecords,
      },
    }
  }, seed)
}

type StoreValue = {
  units: Unit[]
  activeUnit: Unit
  activeUnitId: string
  setActiveUnitId: (id: string) => void
  data: UnitData
  allData: Record<string, UnitData>
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  addItem: (module: ModuleSlug, item: Partial<Item>) => Item
  updateItem: (module: ModuleSlug, id: string, patch: Partial<Item>) => void
  deleteItem: (module: ModuleSlug, id: string) => void
  authenticated: boolean
  login: (unitId: string) => void
  logout: () => void
  theme: "light" | "dark"
  toggleTheme: () => void
  highlightedId: string
  profile: UserProfile
  updateProfile: (patch: Partial<UserProfile>) => void
  timeZone: string
  setTimeZone: (timeZone: string) => void
  addUnit: (unit: Omit<Unit, "id" | "shortName" | "profile">) => Unit
  updateUnit: (id: string, patch: Partial<Unit>) => void
}

const StoreContext = createContext<StoreValue | null>(null)
const STORAGE_KEY = "vetflow-state-v4"
const defaultProfile: UserProfile = {
  name: "Rafael Souza",
  displayName: "Dr. Rafael",
  email: "rafael@vetflow.com.br",
  phone: "(11) 98765-4321",
  crmv: "CRMV-SP 28.410",
  specialty: "Dermatologia veterinária",
  bio: "Médico-veterinário com atuação em clínica geral e dermatologia de cães e gatos.",
}

function seedNotifications(): Notification[] {
  return seedUnits.flatMap((unit, index) => [
    {
      id: `${unit.id}-n1`,
      title: "Resultado de exame disponível",
      detail: `Hemograma liberado pelo VetLab na ${unit.name}.`,
      time: "Ontem",
      read: false,
      path: `/exames/${unit.id}-exames-1`,
      unitId: unit.id,
    },
    {
      id: `${unit.id}-n2`,
      title: "Estoque abaixo do mínimo",
      detail: "Vacina V10 requer reposição.",
      time: "Semana passada",
      read: index === 1,
      path: `/estoque/${unit.id}-estoque-1`,
      unitId: unit.id,
    },
    {
      id: `${unit.id}-n3`,
      title: "Consulta confirmada",
      detail: "Tutor confirmou o retorno agendado.",
      time: "Mês passado",
      read: true,
      path: `/consultas/${unit.id}-consultas-2`,
      unitId: unit.id,
    },
  ])
}

export function VetFlowProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("vetflow-state-v3") ||
        "null"
      return JSON.parse(
        stored
          .replaceAll("Unidade Centro", "Unidade - Mirante da Serra")
          .replaceAll("Unidade Zona Sul", "Unidade - Nova União")
          .replaceAll("Unidade Norte 24h", "Unidade - Urupá")
          .replaceAll("Centro •", "Mirante da Serra •")
          .replaceAll("Zona Sul •", "Nova União •")
          .replaceAll("Norte 24h •", "Urupá •"),
      )
    } catch {
      return null
    }
  }, [])
  const seed = useMemo(() => makeSeed(), [])
  const [customUnits, setCustomUnits] = useState<Unit[]>(
    persisted?.customUnits || [],
  )
  const [unitUpdates, setUnitUpdates] = useState<
    Record<string, Partial<Unit>>
  >(persisted?.unitUpdates || {})
  const units = useMemo(
    () => [
      ...seedUnits.map((unit) => ({ ...unit, ...unitUpdates[unit.id] })),
      ...customUnits.map((unit) => ({ ...unit, ...unitUpdates[unit.id] })),
    ],
    [customUnits, unitUpdates],
  )
  const [changes, setChanges] = useState<DataChange[]>(persisted?.changes || [])
  const [activeUnitId, setActiveUnitId] = useState<string>(
    persisted?.activeUnitId || "centro",
  )
  const [allData, setAllData] = useState<Record<string, UnitData>>(() => {
    const customData = Object.fromEntries(
      (persisted?.customUnits || []).map((unit: Unit) => [
        unit.id,
        emptyUnitData(),
      ]),
    )
    return applyChanges(
      { ...seed, ...customData },
      persisted?.changes || [],
    )
  })
  const [authenticated, setAuthenticated] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem("vetflow-session") === "admin"
      } catch {
        return false
      }
    },
  )
  const [theme, setTheme] = useState<"light" | "dark">(
    persisted?.theme || "light",
  )
  const [highlightedId, setHighlightedId] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>(
    persisted?.notifications || seedNotifications(),
  )
  const [profile, setProfile] = useState<UserProfile>(
    persisted?.profile || defaultProfile,
  )
  const [timeZone, setTimeZone] = useState<string>(
    persisted?.timeZone || "America/Manaus",
  )

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeUnitId,
          changes,
          authenticated: false,
          theme,
          notifications,
          profile,
          timeZone,
          customUnits,
          unitUpdates,
        }),
      )
      localStorage.removeItem("vetflow-state-v3")
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    document.documentElement.dataset.theme = theme
  }, [
    activeUnitId,
    changes,
    authenticated,
    theme,
    notifications,
    profile,
    timeZone,
    customUnits,
    unitUpdates,
  ])

  const addItem = useCallback(
    (module: ModuleSlug, partial: Partial<Item>) => {
      const animal = partial.animalId
        ? allData[activeUnitId].animais.find(
            (item) => item.id === partial.animalId,
          )
        : undefined
      const owner = animal
        ? allData[activeUnitId].tutores.find(
            (item) => item.id === animal.ownerId,
          )
        : undefined
      const amountValue = Number(partial.amountValue || 0)
      const item: Item = {
        id: `${activeUnitId}-${module}-${Date.now()}`,
        name: partial.name || "Novo registro",
        subtitle:
          partial.subtitle ||
          (animal ? `${animal.name} • ${owner?.name}` : "Cadastro VetFlow"),
        status: partial.status || "Ativo",
        createdAt: new Date().toISOString(),
        date: partial.date || dateValue(TODAY),
        unitId: activeUnitId,
        ...partial,
        animal: partial.animal || animal?.name,
        owner: partial.owner || owner?.name,
        ownerId: partial.ownerId || owner?.id,
        amountValue,
        amount:
          partial.amount || (amountValue ? money(amountValue) : undefined),
      }
      setAllData((current) => ({
        ...current,
        [activeUnitId]: {
          ...current[activeUnitId],
          [module]: [item, ...current[activeUnitId][module]],
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "add", unitId: activeUnitId, module, id: item.id, item },
      ])
      setHighlightedId(item.id)
      window.setTimeout(() => setHighlightedId(""), 3000)
      setNotifications((current) => [
        {
          id: `n-${Date.now()}`,
          title: "Novo registro criado",
          detail: `${item.name} foi adicionado em ${modules.find(([slug]) => slug === module)?.[1]}.`,
          time: "Agora",
          read: false,
          path: `/${module}/${item.id}`,
          unitId: activeUnitId,
        },
        ...current,
      ])
      return item
    },
    [activeUnitId, allData],
  )

  const updateItem = useCallback(
    (module: ModuleSlug, id: string, patch: Partial<Item>) => {
      setAllData((current) => ({
        ...current,
        [activeUnitId]: {
          ...current[activeUnitId],
          [module]: current[activeUnitId][module].map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "update", unitId: activeUnitId, module, id, patch },
      ])
    },
    [activeUnitId],
  )

  const deleteItem = useCallback(
    (module: ModuleSlug, id: string) => {
      setAllData((current) => ({
        ...current,
        [activeUnitId]: {
          ...current[activeUnitId],
          [module]: current[activeUnitId][module].filter(
            (item) => item.id !== id,
          ),
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "delete", unitId: activeUnitId, module, id },
      ])
    },
    [activeUnitId],
  )

  const addUnit = useCallback(
    (partial: Omit<Unit, "id" | "shortName" | "profile">) => {
      const baseId =
        normalize(partial.name.replace(/^Unidade\s*-\s*/i, ""))
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "nova-unidade"
      const id = `${baseId}-${Date.now().toString(36)}`
      const shortName = partial.name.replace(/^Unidade\s*-\s*/i, "").trim()
      const unit: Unit = {
        ...partial,
        id,
        shortName,
        profile: `${partial.street}, ${partial.number} • ${partial.city}/${partial.state}`,
      }
      setCustomUnits((current) => [...current, unit])
      setAllData((current) => ({ ...current, [id]: emptyUnitData() }))
      return unit
    },
    [],
  )

  const updateUnit = useCallback(
    (id: string, patch: Partial<Unit>) => {
      setUnitUpdates((current) => ({
        ...current,
        [id]: { ...current[id], ...patch },
      }))
      if (patch.status === "Inativa" && id === activeUnitId) {
        const fallback = units.find(
          (unit) => unit.id !== id && unit.status === "Ativa",
        )
        if (fallback) setActiveUnitId(fallback.id)
      }
    },
    [activeUnitId, units],
  )

  const value = useMemo<StoreValue>(
    () => ({
      units,
      activeUnit: units.find((unit) => unit.id === activeUnitId) || units[0],
      activeUnitId,
      setActiveUnitId,
      data: allData[activeUnitId] || emptyUnitData(),
      allData,
      notifications: notifications.filter(
        (item) => item.unitId === activeUnitId,
      ),
      unreadCount: notifications.filter(
        (item) => item.unitId === activeUnitId && !item.read,
      ).length,
      markRead: (id) =>
        setNotifications((current) =>
          current.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
        ),
      markAllRead: () =>
        setNotifications((current) =>
          current.map((item) =>
            item.unitId === activeUnitId ? { ...item, read: true } : item,
          ),
        ),
      addItem,
      updateItem,
      deleteItem,
      authenticated,
      login: (unitId) => {
        setActiveUnitId(unitId)
        setAuthenticated(true)
        try { sessionStorage.setItem("vetflow-session", "admin") } catch { /* sem sessão */ }
      },
      logout: () => {
        try { sessionStorage.removeItem("vetflow-session") } catch { /* sem sessão */ }
        setAuthenticated(false)
      },
      theme,
      toggleTheme: () =>
        setTheme((current) => (current === "light" ? "dark" : "light")),
      highlightedId,
      profile,
      updateProfile: (patch) =>
        setProfile((current) => ({ ...current, ...patch })),
      timeZone,
      setTimeZone,
      addUnit,
      updateUnit,
    }),
    [
      activeUnitId,
      allData,
      notifications,
      addItem,
      updateItem,
      deleteItem,
      authenticated,
      theme,
      highlightedId,
      profile,
      timeZone,
      units,
      addUnit,
      updateUnit,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useVetFlow() {
  const context = useContext(StoreContext)
  if (!context)
    throw new Error("useVetFlow deve ser usado dentro de VetFlowProvider")
  return context
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function formatCurrency(value: number) {
  return money(value)
}

export function inLastDays(item: Item, days: number) {
  const date = new Date(`${item.date || item.createdAt.slice(0, 10)}T12:00:00`)
  return date >= new Date(TODAY.getTime() - days * DAY) && date <= TODAY
}
