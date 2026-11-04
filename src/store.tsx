import { localDateTime, localISO } from "./date"
import { hashPassword, newSalt, passwordProblems, tempPassword } from "./crypto"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  ["agendas", "Agenda"],
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
  ["vendas", "Balcão"],
  ["caixa", "Caixa"],
  ["entregas", "Entregas"],
  ["estoque", "Estoque"],
  ["financeiro", "Financeiro"],
  ["convenios", "Convênios"],
  ["unidades", "Unidades"],
  ["teleatendimentos", "Teleatendimentos"],
  ["comunicacao", "Comunicação"],
  ["publicacoes", "Publicações"],
  ["documentos", "Documentos"],
  ["ocorrencias", "Ocorrências"],
  ["usuarios", "Usuários e acessos"],
  ["relatorios", "Relatórios"],
] as const

export type ModuleSlug = typeof modules[number][0]
export type UnitData = Record<ModuleSlug, Item[]>

/* "hoje" dos dados de exemplo acompanha a data real, para os relatórios e painéis sempre terem movimento recente */
const TODAY = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })()
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
  ["Banho porte pequeno", 55],
  ["Banho e tosa porte médio", 95],
  ["Tosa higiênica", 45],
  ["Hidratação de pelos", 40],
  ["Táxi dog", 25],
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
  return localISO(date)
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


// Catálogo pet shop + farmácia: [nome, categoria, custo, preço de venda, validade em meses (0 = sem)]
const PET_CATALOG: [string, string, number, number, number][] = [
  ["Ração Premier Cães Adultos 15 kg", "Rações", 189.9, 279.9, 14],
  ["Ração Golden Formula Filhotes 10,1 kg", "Rações", 132.5, 199.9, 12],
  ["Ração Royal Canin Mini Adult 7,5 kg", "Rações", 241, 349.9, 12],
  ["Ração Gatos Castrados Salmão 10,1 kg", "Rações", 158, 239.9, 12],
  ["Ração úmida sachê Gatos 85 g", "Rações", 2.4, 4.9, 18],
  ["Ração Renal Veterinária 2 kg", "Rações", 98, 152.9, 12],
  ["Ração Hypoallergenic 10 kg", "Rações", 312, 459.9, 12],
  ["Areia sanitária 4 kg", "Higiene", 14.5, 26.9, 0],
  ["Petisco Bifinho Carne 65 g", "Petiscos", 4.1, 8.9, 10],
  ["Osso de couro nó 15 cm", "Petiscos", 5.2, 11.9, 18],
  ["Biscoito Dog Pop Integral 250 g", "Petiscos", 7.8, 15.9, 10],
  ["Petisco cremoso Gatos (4 un.)", "Petiscos", 9.9, 19.9, 12],
  ["Palito dental Dentastix (7 un.)", "Petiscos", 13.2, 24.9, 12],
  ["Coleira de nylon ajustável M", "Coleiras e guias", 11, 29.9, 0],
  ["Coleira antipulgas Seresto até 8 kg", "Coleiras e guias", 168, 249.9, 24],
  ["Guia retrátil 5 m", "Coleiras e guias", 38, 79.9, 0],
  ["Peitoral acolchoado P", "Coleiras e guias", 29, 64.9, 0],
  ["Coleira para gatos com guizo", "Coleiras e guias", 6.5, 17.9, 0],
  ["Shampoo neutro 500 ml", "Higiene", 12.4, 27.9, 24],
  ["Condicionador pelos longos 500 ml", "Higiene", 14.9, 32.9, 24],
  ["Tapete higiênico 30 un.", "Higiene", 39, 74.9, 0],
  ["Lenço umedecido pet 100 un.", "Higiene", 9.5, 19.9, 18],
  ["Escova de dente + creme dental", "Higiene", 11.9, 24.9, 18],
  ["Bolinha de borracha maciça", "Brinquedos", 6.9, 16.9, 0],
  ["Mordedor corda dupla", "Brinquedos", 8.5, 21.9, 0],
  ["Varinha com penas para gatos", "Brinquedos", 7.2, 18.9, 0],
  ["Brinquedo recheável Kong M", "Brinquedos", 42, 89.9, 0],
  ["Arranhador papelão para gatos", "Brinquedos", 19, 39.9, 0],
  ["Cama retangular M", "Camas", 68, 139.9, 0],
  ["Cama iglu para gatos", "Camas", 74, 149.9, 0],
  ["Colchonete impermeável G", "Camas", 59, 119.9, 0],
  ["Comedouro inox 500 ml", "Acessórios", 9.8, 22.9, 0],
  ["Bebedouro fonte elétrica 2 L", "Acessórios", 72, 149.9, 0],
  ["Caixa de transporte nº 2", "Acessórios", 64, 129.9, 0],
  ["Roupa pós-cirúrgica P", "Acessórios", 22, 49.9, 0],
  ["Colar elizabetano nº 3", "Acessórios", 7.9, 19.9, 0],
  ["Vermífugo Drontal Plus 10 kg (2 comp.)", "Medicamentos", 28.5, 49.9, 24],
  ["Antipulgas NexGard 4–10 kg", "Medicamentos", 62, 99.9, 24],
  ["Antipulgas Bravecto 10–20 kg", "Medicamentos", 158, 239.9, 24],
  ["Simparic 10,1–20 kg (1 comp.)", "Medicamentos", 58, 92.9, 24],
  ["Meloxicam 2 mg (10 comp.)", "Medicamentos", 18, 34.9, 18],
  ["Otomax pomada otológica 15 g", "Medicamentos", 44, 79.9, 18],
  ["Cefalexina 500 mg (10 comp.)", "Medicamentos", 21, 39.9, 18],
  ["Suplemento Condroitina 60 comp.", "Medicamentos", 69, 119.9, 18],
]

// Conteúdo das publicações: cada tema com legendas diferentes
const PUB_CONTENT: Record<string, { img: string; tags: string; cta: string; caps: string[] }> = {
  "Cuidados no calor": { img: "Calor de 35°? Seu pet sente mais", tags: "#verão #cuidadoscomopet #veterinario", cta: "Agendar check-up", caps: [
    "Dias quentes pedem atenção redobrada: água fresca sempre à vista, passeios só antes das 9h ou depois das 17h e nada de deixar o pet no carro, nem por 5 minutos. Língua muito para fora, gengiva vermelha e cansaço fora do normal são sinais de alerta. 🐶☀️",
    "Teste rápido antes do passeio: encoste a mão no asfalto por 7 segundos. Se estiver quente para você, vai queimar as patinhas dele. Prefira grama e sombra! 🐾",
    "Raças de focinho curto (pug, buldogue, shih-tzu e persas) sofrem mais com o calor. Ambiente ventilado, tapete gelado e muita água. Na dúvida, fale com a gente.",
  ]},
  "Campanha de vacinação antirrábica": { img: "Vacina antirrábica: proteja quem você ama", tags: "#raiva #vacinação #saúdepública", cta: "Agendar vacina", caps: [
    "A raiva não tem cura, mas tem prevenção: uma dose por ano. Cães e gatos a partir de 3 meses. Traga a carteirinha e garanta a proteção de toda a família. 💉",
    "Campanha de vacinação antirrábica na clínica: atendimento por ordem de chegada das 8h às 17h. Gatos em caixa de transporte, cães de coleira e guia, por favor!",
    "Seu pet está com a antirrábica em dia? Confira a carteirinha: se a última dose tem mais de 12 meses, está na hora de renovar.",
  ]},
  "Saúde bucal pet": { img: "Mau hálito não é normal", tags: "#saúdebucal #odontologiaveterinária #petcare", cta: "Avaliar os dentes", caps: [
    "80% dos cães e gatos acima de 3 anos têm algum problema dental. Escovação 3x por semana, petiscos dentais e avaliação anual fazem toda a diferença. 🦷",
    "Tártaro amarelado, gengiva sangrando ou dificuldade para mastigar? Pode ser doença periodontal, que afeta até coração e rins. Agende uma avaliação.",
    "Como começar a escovar: dedeira, pasta própria para pets (nunca a nossa!) e muita paciência. Comece com 10 segundos e um petisco de recompensa.",
  ]},
  "Prevenção de pulgas e carrapatos": { img: "Pulga e carrapato: fora daqui!", tags: "#antipulgas #carrapato #erliquiose", cta: "Ver antipulgas", caps: [
    "Carrapato transmite doença do carrapato (erliquiose e babesiose), que pode ser fatal. O antipulgas em dia, todo mês, é a forma mais barata de proteger. 🛡️",
    "Para cada pulga no seu pet existem outras 95 no ambiente. Trate o animal e também a casa: aspire cantinhos, lave a caminha e use produto no quintal.",
    "Comprimido, pipeta ou coleira? Cada opção tem duração e indicação diferentes. Pergunte ao nosso time qual combina com a rotina do seu pet.",
  ]},
  "Vacinação contra aftosa no rebanho": { img: "Aftosa: rebanho vacinado, mercado aberto", tags: "#aftosa #pecuária #rebanho", cta: "Agendar visita", caps: [
    "Etapa de vacinação contra febre aftosa: vacine todo o rebanho e declare no órgão de defesa agropecuária dentro do prazo. Nossa equipe atende na fazenda. 🐄",
    "Dicas para a vacinação: vacina na geladeira entre 2°C e 8°C, agulha limpa e aplicação na tábua do pescoço. Animal bem contido é menos estresse e menos perda.",
    "Rebanho sem aftosa garante a venda para outros estados e para exportação. Conte com a gente para planejar o manejo sanitário completo.",
  ]},
  "Cuidados com cascos do cavalo": { img: "Sem casco, sem cavalo", tags: "#equinos #casqueamento #cavalos", cta: "Agendar casqueamento", caps: [
    "Casqueamento a cada 30 a 45 dias evita rachaduras, manqueiras e problemas de aprumo. Limpe os cascos todos os dias depois do trabalho. 🐴",
    "Cheiro forte e área escura na ranilha podem ser podridão. Mantenha a baia seca e chame o veterinário ao primeiro sinal.",
    "Ferrageamento correto distribui o peso e protege o casco em terreno pedregoso. Nossa equipe avalia o andamento e indica o melhor ferrageamento.",
  ]},
  "Castração: mitos e verdades": { img: "Castração: mito ou verdade?", tags: "#castração #mitoouverdade #adoçãoresponsável", cta: "Agendar avaliação", caps: [
    "MITO: o pet fica preguiçoso. VERDADE: castração reduz o risco de câncer de mama, infecção no útero e problemas de próstata. Com dieta certa, ele continua ativo. ✂️",
    "A fêmea precisa ter uma cria antes de castrar? Mito! Quanto mais cedo a castração, maior a proteção contra tumores de mama.",
    "Pré-operatório na clínica: exames de sangue, jejum orientado e acompanhamento no pós. Tire suas dúvidas por mensagem.",
  ]},
  "Bem-estar do rebanho leiteiro": { img: "Vaca confortável produz mais leite", tags: "#leite #bemestaranimal #pecuárialeiteira", cta: "Falar com o técnico", caps: [
    "Sombra, água à vontade e cama seca aumentam a produção e reduzem a mastite. Bem-estar também é resultado no tanque. 🥛",
    "Pré-dipping, teste da caneca de fundo escuro e pós-dipping: três passos simples que previnem a mastite na ordenha.",
    "Estresse térmico derruba a produção em até 20%. Ventiladores e aspersores na sala de espera fazem diferença no verão.",
  ]},
  "Check-up do gato idoso": { img: "Gato com mais de 7 anos? Check-up!", tags: "#gatoidoso #felinos #checkup", cta: "Agendar check-up", caps: [
    "Gatos escondem bem a dor. A partir dos 7 anos, faça check-up a cada 6 meses: exames de sangue, urina e pressão detectam doença renal bem no começo. 🐱",
    "Está bebendo mais água e fazendo mais xixi? Pode ser rim ou diabetes. Não espere: quanto antes o diagnóstico, melhor a qualidade de vida.",
    "Atendimento cat friendly: sala separada, horário tranquilo e manuseio gentil. Seu gato merece uma consulta sem estresse.",
  ]},
  "Alimentação do filhote": { img: "Filhote bem alimentado cresce forte", tags: "#filhote #nutriçãopet #primeirosdias", cta: "Ver rações filhote", caps: [
    "Filhote come de 3 a 4 vezes ao dia, sempre com ração específica para a fase e o porte. Nada de leite de vaca: pode causar diarreia. 🍼",
    "Troca de ração aos poucos: em 7 dias, misture a nova com a antiga aumentando a proporção. Assim o intestino se adapta sem problemas.",
    "Petisco é recompensa, não refeição: no máximo 10% das calorias do dia. Temos opções naturais e funcionais no pet shop.",
  ]},
  "Atendimento a campo em haras": { img: "Vamos até o seu haras", tags: "#haras #veterinárioacampo #equinos", cta: "Agendar visita", caps: [
    "Atendimento a campo com estrutura completa: ultrassom portátil, exames e vacinação no seu haras. Menos transporte, menos estresse para o animal. 🚙",
    "Programa reprodutivo: acompanhamento de cio, inseminação e diagnóstico de gestação na própria propriedade.",
    "Plano de saúde do plantel: vermifugação estratégica, vacinas e odontologia equina em visitas agendadas.",
  ]},
  "Bezerros: colostro nas primeiras horas": { img: "Colostro: o primeiro remédio", tags: "#bezerros #colostro #pecuária", cta: "Falar com o técnico", caps: [
    "O bezerro precisa mamar 10% do peso em colostro nas primeiras 6 horas de vida. É ali que ele recebe a defesa que vai protegê-lo nos primeiros meses. 🐮",
    "Cura do umbigo com iodo a 10% logo ao nascer e repetida por 3 dias evita onfalite e perdas no bezerreiro.",
    "Bezerreiro limpo, seco e ventilado reduz diarreias e pneumonias. Pequenos cuidados, grandes resultados no desmame.",
  ]},
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
        "69"
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
      phone: `(69) 9${8100 + index * 113}-${1200 + index * 227}`,
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
  const agendaFirst = new Date(TODAY.getTime() - 18 * DAY)
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

  PET_CATALOG.forEach(([name, category, cost, price, months], k) => {
    const index = stock.length
    const minimum = category === "Rações" ? 8 : 5 + (k % 6)
    const roll = random()
    const quantity = k % 11 === 4 ? 0 : roll < 0.14 ? Math.max(1, Math.floor(minimum * 0.5)) : Math.floor(minimum * (1.5 + random() * 4))
    const due = months ? new Date(TODAY.getTime() + months * 30 * DAY - (k % 7) * 45 * DAY) : null
    stock.push(baseItem(unit.id, "estoque", index, dateInHistory(random), {
      name,
      subtitle: `${quantity} un. • mínimo ${minimum}`,
      status: quantity === 0 ? "Esgotado" : quantity < minimum ? "Abaixo do mínimo" : "Disponível",
      category,
      quantity,
      minimum,
      dueDate: due ? dateValue(due) : undefined,
      amountValue: quantity * cost,
      amount: money(quantity * cost),
      extra: { custo: cost, preco: price, codigo: String(7891000 + k * 37).slice(-6) },
    }))
  })

  const sellers = professionalItems.slice(0, 5).map((item) => item.name).concat(["Recepção"])
  const payForms = ["Pix", "Crédito", "Débito", "Dinheiro", "Pix", "Crédito", "Duplicata", "Dinheiro"]
  const productPool = stock.filter((item) => item.category !== "Materiais" && item.category !== "Vacinas").slice(-60)
  const vendasSeed: Item[] = []
  for (let index = 0; index < Math.round(260 * scale) + 40; index += 1) {
    const animal = animals[(index * 13 + unitIndex) % animals.length]
    const day = new Date(TODAY.getTime() - Math.floor(random() * 62) * DAY)
    const count = 1 + Math.floor(random() * 3)
    const itens = Array.from({ length: count }, (_, k) => {
      const useService = (index + k) % 3 !== 0
      if (useService) {
        const [name, price] = services[(index * 7 + k * 3) % services.length] as unknown as [string, number]
        return { tipo: "Serviço", ref: name, descricao: name, qtd: 1, preco: price, desconto: 0 }
      }
      const prod = productPool[(index * 5 + k) % productPool.length]
      const price = Math.round((12 + ((index + k) % 12) * 11) * 1.8)
      return { tipo: "Produto", ref: prod?.id, descricao: prod?.name || "Produto", qtd: 1 + ((index + k) % 2), preco: Number(prod?.extra?.preco) || price, desconto: 0 }
    })
    const subtotal = itens.reduce((sum, it) => sum + it.qtd * it.preco, 0)
    const desconto = index % 6 === 0 ? Math.round(subtotal * 0.05) : 0
    const total = subtotal - desconto
    const roll = random()
    const status = roll < 0.06 ? "Cancelada" : roll < 0.13 ? "A receber" : roll < 0.18 ? "Parcialmente paga" : "Paga"
    const forma = payForms[index % payForms.length]
    const pago = status === "Paga" ? total : status === "Parcialmente paga" ? Math.round(total * 0.5) : 0
    const parcelas = forma === "Crédito" ? 1 + (index % 4) : 1
    vendasSeed.push(baseItem(unit.id, "vendas", index, day, {
      name: `VND-${String(1200 - index).padStart(6, "0")}`,
      subtitle: `${animal.owner} • ${animal.name}`,
      kind: "Venda",
      status,
      owner: animal.owner,
      ownerId: animal.ownerId,
      animal: animal.name,
      animalId: animal.id,
      professional: sellers[index % sellers.length],
      time: `${String(8 + (index % 11)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
      amountValue: total,
      amount: money(total),
      extra: {
        itens,
        subtotal,
        desconto,
        pago,
        origem: index % 4 === 0 ? "Atendimento" : index % 9 === 0 ? "Orçamento" : "PDV",
        pagamentos: pago ? [{ forma: status === "Parcialmente paga" ? "Dinheiro" : forma, valor: pago, parcelas }] : [],
      },
    }))
  }
  for (let index = 0; index < 18; index += 1) {
    const animal = animals[(index * 29 + 3) % animals.length]
    const day = new Date(TODAY.getTime() - (index * 2 + 1) * DAY)
    const itens = [0, 1].map((k) => {
      const [name, price] = services[(index * 5 + k * 4) % services.length] as unknown as [string, number]
      return { tipo: "Serviço", ref: name, descricao: name, qtd: 1, preco: price, desconto: 0 }
    })
    const total = itens.reduce((sum, it) => sum + it.preco, 0)
    const validade = dateValue(new Date(day.getTime() + 7 * DAY))
    vendasSeed.push(baseItem(unit.id, "vendas", 2000 + index, day, {
      name: `ORC-${String(80 - index).padStart(6, "0")}`,
      subtitle: `${animal.owner} • ${animal.name}`,
      kind: "Orçamento",
      status: ["Aberto", "Enviado", "Aprovado", "Recusado", "Convertido"][index % 5] === "Aberto" && validade < dateValue(TODAY) ? "Vencido" : ["Aberto", "Enviado", "Aprovado", "Recusado", "Convertido"][index % 5],
      owner: animal.owner,
      ownerId: animal.ownerId,
      animal: animal.name,
      animalId: animal.id,
      professional: sellers[index % sellers.length],
      dueDate: validade,
      amountValue: total,
      amount: money(total),
      extra: { itens, subtotal: total, desconto: 0 },
    }))
  }

  /* fluxo balcão → caixa → entrega: numeração por data e vendas recentes */
  {
    const bairros = ["Centro", "Jardim América", "Setor 2", "Nova Esperança", "Vila Rica", "Bela Vista", "Parque dos Ipês"]
    const ruas = ["Rua Rio Branco", "Avenida Brasil", "Rua das Flores", "Rua Tiradentes", "Avenida JK", "Rua Sete de Setembro", "Rua Dom Pedro II"]
    const entregadores = ["Marcos Lima", "Diego Souza", "Paulo Henrique"]
    const salesOnly = vendasSeed.filter((item) => item.kind === "Venda").sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    salesOnly.forEach((sale, index) => { sale.name = `VND-${String(1001 + index).padStart(6, "0")}` })
    const caixaId = `${unit.id}-vendas-cx-seed`
    const recent = salesOnly.slice(-48).reverse()
    recent.forEach((sale, i) => {
      const tutor = tutors.find((item) => item.id === sale.ownerId)
      const tipo = i % 3 === 0 ? "Entrega" : i % 7 === 3 ? "Retirada" : "Balcão"
      const when = new Date(Date.now() - (i * 23 + 4) * 60_000)
      sale.date = dateValue(when)
      sale.time = `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`
      const extra = sale.extra || {}
      if (i % 3 === 1) sale.professional = "Dr. Rafael"
      extra.tipo = tipo
      extra.historico = [`${sale.time} · Venda criada por ${sale.professional}`]
      const total = sale.amountValue || 0
      if (i < 7) {
        sale.status = "Aguardando pagamento"
        extra.pago = 0
        extra.pagamentos = []
        extra.formaSugerida = ["Pix", "Dinheiro", "Crédito", "Duplicata", "Débito", "Fiado", "Pix"][i]
        extra.enviadaAs = sale.time
        extra.finalizadaEm = when.getTime()
      } else if (sale.status !== "Cancelada") {
        sale.status = "Paga"
        extra.pago = total
        extra.caixaId = i < 30 ? caixaId : undefined
        if (extra.caixaId) { extra.recebidoPor = "Dr. Rafael"; extra.recebidoAs = sale.time }
        if (!extra.pagamentos?.length) extra.pagamentos = [{ forma: "Pix", valor: total, parcelas: 1 }]
      }
      if (tipo === "Entrega") {
        const k = Math.floor(i / 3)
        const cobrar = i >= 7 && k % 4 === 1
        const status = i < 7 ? "Aguardando liberação" : ["A separar", "Pronta para sair", "Em rota", "Em rota", "Entregue", "Não entregue", "Concluída", "Concluída", "Pronta para sair", "Concluída", "Entregue", "A separar", "Concluída", "Concluída", "Concluída", "Concluída"][k % 16]
        if (cobrar) {
          sale.status = "Em entrega"
          extra.pago = 0
          extra.pagamentos = []
        }
        if (sale.status === "Paga" && /rota|entregue|concluída/i.test(status)) sale.status = status === "Concluída" ? "Concluída" : "Em entrega"
        const addr = tutor?.address?.split(" • ")[0] || `${ruas[k % ruas.length]}, ${120 + k * 7}`
        const [rua, numero] = addr.split(", ")
        extra.entrega = {
          status,
          entregador: /aguardando|separar/i.test(status) ? "" : entregadores[k % entregadores.length],
          ordem: (k % 5) + 1,
          cep: `76${String(926 + (k % 7)).padStart(3, "0")}-${String(100 + k * 37).slice(-3)}`,
          rua: rua || ruas[k % ruas.length],
          numero: numero || String(100 + k),
          complemento: k % 4 === 0 ? "Casa 2" : "",
          bairro: bairros[k % bairros.length],
          cidade: unit.city,
          uf: "RO",
          referencia: ["Próximo à praça", "Portão azul", "Em frente à escola", "Ao lado do mercado", ""][k % 5],
          telefone: tutor?.phone || "(69) 99999-0000",
          data: sale.date,
          periodo: k % 2 === 0 ? "Manhã" : "Tarde",
          taxa: [8, 10, 12, 15][k % 4],
          aCobrar: cobrar ? total : 0,
          obs: k % 3 === 0 ? "Deixar na portaria se não houver ninguém" : "",
          recebidoPor: /entregue|concluída/i.test(status) ? tutor?.name?.split(" ")[0] || "Cliente" : "",
          motivo: status === "Não entregue" ? "Cliente ausente" : "",
          historico: [`${sale.time} · Entrega criada`],
        }
      }
      sale.extra = extra
    })
    ;[1, 2, 3].forEach((d) => {
      const dif = [0, -12.5, 4][d - 1]
      const total = [5840.3, 6215.9, 4987.4][d - 1]
      vendasSeed.push(baseItem(unit.id, "vendas", 3000 + d, new Date(Date.now() - d * DAY), {
        id: `${caixaId}-${d}`,
        name: `CX-000${4 - d}`,
        subtitle: "Operador",
        kind: "Caixa",
        status: "Fechado",
        professional: d === 2 ? "Recepção" : "Dr. Rafael",
        time: "07:5" + d,
        amountValue: 200,
        extra: { movs: [], fechamento: `${dateValue(new Date(Date.now() - d * DAY))} 18:0${d}`, total, diferenca: dif, esperado: 1200 + d * 90, informado: 1200 + d * 90 + dif, vendas: 18 + d * 3 },
      }))
    })
    vendasSeed.push(baseItem(unit.id, "vendas", 3000, new Date(), {
      id: caixaId,
      name: "CX-0004",
      subtitle: "Operador Dr. Rafael",
      kind: "Caixa",
      status: "Aberto",
      professional: "Dr. Rafael",
      time: "07:58",
      amountValue: 200,
      extra: { movs: [{ tipo: "Sangria", valor: 300, motivo: "Depósito no banco", hora: "12:10", por: "Dr. Rafael" }, { tipo: "Suprimento", valor: 50, motivo: "Troco em moedas", hora: "13:02", por: "Dr. Rafael" }] },
    }))
  }

  const generic = (
    slug: ModuleSlug,
    count: number,
    names: readonly string[],
    statuses: readonly string[],
  ) =>
    Array.from(
      // Catálogos (medicamentos, protocolos, convênios) não repetem nomes com sufixo "#N".
      { length: ["medicamentos", "protocolos", "convenios"].includes(slug) ? names.length : Math.max(8, Math.round(count * scale)) },
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
    vendas: vendasSeed,
    caixa: [],
    entregas: [],
    estoque: stock,
    financeiro: [...financeRevenue, ...expenses].sort((a, b) =>
      b.date!.localeCompare(a.date!),
    ),
    // M-36 / T-08: convênios sem repetição e sem sufixo técnico.
    convenios: generic(
      "convenios",
      8,
      ["VetPlus Essencial", "PetCare Premium", "Amigo Animal", "Clube VetFlow", "Saúde Pet Rondônia", "Bicho Feliz Plano Básico", "AgroVet Rural", "Proteção Felina"],
      ["Ativo", "Ativo", "Em análise", "Ativo", "Suspenso", "Ativo", "Ativo", "Em análise"],
    ).slice(0, 8),
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
    ).map((item, index) => {
      /* agenda realista: alguns hoje, próximos 6 dias agendados, o restante no histórico */
      const REAL_TODAY = new Date(); REAL_TODAY.setHours(12, 0, 0, 0)
      const MOTIVOS = ["Tutor relata coceira e lambedura nas patas há 5 dias.", "Acompanhamento da ferida cirúrgica, 7º dia pós-castração.", "Discutir resultado do hemograma e bioquímico.", "Vômito ocasional desde ontem; apetite preservado.", "Revisão da dose do anti-inflamatório.", "Filhote com diarreia leve; orientar dieta.", "Urinando fora do lugar habitual há 3 dias.", "Retorno de otite: avaliar evolução pela câmera."]
      const slot = index % 19
      const hour = ["08:00", "08:40", "09:20", "10:00", "10:40", "11:20", "13:30", "14:10", "14:50", "15:30", "16:10", "16:50", "17:30"]
      const iso = (d: Date) => dateValue(d)
      let date: string, status: string
      if (index < 7) { date = iso(REAL_TODAY); status = index === 1 ? "Em andamento" : index === 0 ? "Concluído" : "Agendado" }
      else if (index < 25) { date = iso(new Date(REAL_TODAY.getTime() + (1 + (index % 6)) * DAY)); status = "Agendado" }
      else { date = item.date && item.date < iso(REAL_TODAY) ? item.date : iso(new Date(REAL_TODAY.getTime() - (1 + (index % 40)) * DAY)); status = index % 9 === 0 ? "Faltou" : "Concluído" }
      return { ...item, date, status, time: hour[index < 7 ? index * 2 : slot % hour.length], notes: MOTIVOS[index % MOTIVOS.length], extra: { ...(item.extra || {}), ...(status === "Em andamento" ? { inicio: new Date(Date.now() - 6 * 60000).toISOString() } : {}) } }
    }),
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
    publicacoes: (generic(
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
    ) as Item[]).map((item, index) => {
      const topic = item.name.replace(/ #\d+$/, "")
      const c = PUB_CONTENT[topic]
      if (!c) return item
      const num = /#(\d+)$/.exec(item.name)
      const orig = num ? Number(num[1]) - 1 : index % 12
      const v = Math.floor(orig / 12)
      const formato = ["Post", "Carrossel", "Stories", "Reels"][(orig + v) % 4]
      const low = topic.charAt(0).toLowerCase() + topic.slice(1)
      const extras = [
        `Perguntas e respostas sobre ${low}: deixe sua dúvida nos comentários e a nossa equipe responde ao vivo na quinta, às 19h. 💬`,
        `Checklist rápido de ${low}: salve este post e compartilhe com quem também cuida de animais. Precisa de ajuda? Fale com a gente pelo WhatsApp. ✅`,
      ]
      const legenda = v < c.caps.length ? c.caps[v] : extras[(v - c.caps.length) % extras.length]
      const textoImagem = v === 0 ? c.img : v < c.caps.length ? legenda.split(/[.:!?]/)[0].slice(0, 48) : v === c.caps.length ? `Tire suas dúvidas: ${low}` : `Checklist: ${low}`
      const sufixo = ["", " · dica 2", " · dica 3", " · perguntas e respostas", " · checklist"][v] || ` · ${v + 1}`
      return { ...item, name: `${topic}${sufixo}`, category: formato, notes: legenda, extra: { ...(item.extra || {}), legenda, hashtags: c.tags, cta: c.cta, textoImagem, formato } }
    }),
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
        "Autoclave sem aquecer",
        "Tutor reclamou da espera",
        "Medicamento vencido na prateleira",
        "Ar-condicionado da internação parado",
        "Erro no agendamento",
        "Queda de energia por 20 minutos",
        "Etiqueta de amostra ilegível",
        "Cobrança em duplicidade",
        "Impressora da recepção sem papel",
        "Animal escapou da baia",
        "Seringa em falta no consultório",
        "Laudo entregue com atraso",
        "Monitor multiparamétrico com alarme falso",
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
    seedUnits.map((unit, index) => [unit.id, noFutureFacts(generateUnit(unit, index))]),
  )
}

/** E-01: dados de exemplo nunca mostram como já feito algo que ainda não aconteceu (venda às 22:56 quando são 06:30, tele "ao vivo" de dias atrás). */
function noFutureFacts(data: UnitData): UnitData {
  const now = new Date()
  const today = localISO(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const yesterday = localISO(new Date(now.getTime() - DAY))
  const done = /conclu|aplicad|pag|recebid|enviad|entregue|realizad|assinad|finaliz|fechad|transferid/i
  const toMin = (t?: string) => { const [h, m] = (t || "").split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : -1 }
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  const fix = (item: Item): Item => {
    const date = (item.date || "").slice(0, 10)
    if (item.status === "Em andamento" && /teleatend/.test(item.id)) {
      if (date < today) return { ...item, status: "Concluído" }
      if (date > today || toMin(item.time) > nowMin) return { ...item, status: "Agendado" }
      return item
    }
    if (!done.test(item.status || "")) return item
    if (date > today) return { ...item, date: yesterday }
    if (date === today && item.time && toMin(item.time) > nowMin) {
      if (nowMin < 8 * 60) return { ...item, date: yesterday }
      return { ...item, time: hm(Math.max(7 * 60, nowMin - 20 - (toMin(item.time) % 90))) }
    }
    return item
  }
  return Object.fromEntries(Object.entries(data).map(([slug, items]) => [slug, (items as Item[]).map(fix)])) as UnitData
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
  login: (identifier: string, password: string, keep?: boolean) => { user: StaffUser | null; error?: string }
  changePassword: (userId: string, current: string | null, next: string) => string | null
  resetPassword: (userId: string) => string
  verifyPassword: (u: StaffUser, password: string) => boolean
  audit: AuditEntry[]
  acceptTerms: () => void
  termsAccepted: boolean
  logout: () => void
  user: StaffUser | null
  staff: StaffUser[]
  saveStaff: (user: StaffUser) => void
  clinic: Clinic | ""
  chooseClinic: (clinic: Clinic) => void
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

export type AuditEntry = { em: string; quem: string; acao: "criou" | "editou" | "excluiu" | "login" | "logout" | "senha" | "termos"; modulo: string; registro: string; unidade: string }
export const TERMS_VERSION = "2026-10-30"

export type Role = "Administrador" | "Vendedor" | "Caixa" | "Estoque" | "Veterinário" | "Entregador"
export type StaffUser = { id: string; name: string; displayName: string; username: string; email: string; cpf: string; passwordHash: string; salt: string; mustChange?: boolean; password?: string; role: Role; crmv?: string; code?: string; active: boolean; perms?: Record<string, string>; log?: { quando: string; quem: string; acao: string }[] }
export const STAFF: StaffUser[] = [
  { id: "u-admin", name: "Rafael Souza", displayName: "Dr. Rafael", username: "admin", email: "admin@vetflow.com", cpf: "482.315.770-10", passwordHash: "011d01d8447102c0c2e6b444725b68f425a88d08a84cec74ff773b02c76cf149", salt: "c64f4ef740b62274ff8cc66c", mustChange: true, role: "Administrador", crmv: "CRMV-RO 2.841", code: "001", active: true },
  { id: "u-vend", name: "Felipe Brum", displayName: "Felipe Brum", username: "vendedor", email: "vendedor@vetflow.com", cpf: "041.115.882-02", passwordHash: "899528001dd08d0a855e6a6b8a74f8ae5c4422bb11aa1f7c49f6fda8fbdaf1de", salt: "48c7e81a6031d6f1e205d095", mustChange: true, role: "Vendedor", code: "026", active: true },
  { id: "u-caixa", name: "Franciely Rocha", displayName: "Franciely Rocha", username: "caixa", email: "caixa@vetflow.com", cpf: "271.904.338-48", passwordHash: "ba6047209237daa8d52089ab8bf96acf3553deeaf0860c1aa94c710ac9a859b3", salt: "eaf3dac73be77c374b4a8738", mustChange: true, role: "Caixa", code: "030", active: true },
  { id: "u-est", name: "João Matias", displayName: "João Matias", username: "estoque", email: "estoque@vetflow.com", cpf: "660.218.497-31", passwordHash: "bf8d4d70f978232a9ce6c7e2b25d43ce236270e0d9740f1dfea02b13b5ead518", salt: "2acdcc1e688836b1f499e604", mustChange: true, role: "Estoque", code: "037", active: true },
  { id: "u-vet", name: "Ana Martins", displayName: "Dra. Ana Martins", username: "veterinario", email: "veterinario@vetflow.com", cpf: "448.902.115-19", passwordHash: "dc4f60a0fcc4f9a46872df6e9117a942133295cd070e09a91be4f40a271a04bc", salt: "98f286b15565f72c68517553", mustChange: true, role: "Veterinário", crmv: "CRMV-RO 4.215", active: true },
  { id: "u-vet2", name: "Marcos Nunes", displayName: "Dr. Marcos Nunes", username: "veterinario2", email: "marcos@vetflow.com", cpf: "519.337.204-66", passwordHash: "791b14e66e50c05ee6e683e19ef47200ae0cc0a4d70f005d317a3414ad9a09be", salt: "1eb14a66934c68d6f33b08af", mustChange: true, role: "Veterinário", crmv: "CRMV-RO 3.870", active: true },
  { id: "u-vet3", name: "João Lima", displayName: "Dr. João Lima", username: "veterinario3", email: "joao@vetflow.com", cpf: "284.661.093-12", passwordHash: "3a582f68ab75a127639f34ebe92f24cd93da1ea7f57d50ae82e850679f7b7f3f", salt: "44f19021711987491b448847", mustChange: true, role: "Veterinário", crmv: "CRMV-RO 2.904", active: true },
  { id: "u-vet4", name: "Luísa Paiva", displayName: "Dra. Luísa Paiva", username: "veterinario4", email: "luisa@vetflow.com", cpf: "371.905.448-20", passwordHash: "63f92063f401b5af7415a28870a772616bf39727240df60fd539531e43db4542", salt: "f6838afcc4adda501db50b25", mustChange: true, role: "Veterinário", crmv: "CRMV-RO 2.936", active: true },
  { id: "u-ent", name: "Cauã Torres", displayName: "Cauã Torres", username: "entregador", email: "entregador@vetflow.com", cpf: "032.774.519-77", passwordHash: "1cc1c39b027251bf323e1ec8143353008327ed74c3c088c5431100b8cfb43796", salt: "3a191e034631f0aa26034426", mustChange: true, role: "Entregador", active: true },
]
/** Abas liberadas para cada perfil ("*" = todas). */
export const ROLE_ACCESS: Record<Role, string[]> = {
  Administrador: ["*"],
  Vendedor: ["dashboard", "vendas", "estoque", "tutores", "animais", "servicos", "perfil", "configuracoes", "ajuda"],
  Caixa: ["caixa", "vendas", "entregas", "estoque", "tutores", "financeiro", "perfil", "configuracoes", "ajuda"],
  Estoque: ["estoque", "medicamentos", "vendas", "perfil", "configuracoes", "ajuda"],
  "Veterinário": ["dashboard", "agendas", "consultas", "prontuarios", "animais", "tutores", "vacinas", "prescricoes", "medicamentos", "exames", "procedimentos", "cirurgias", "internacoes", "protocolos", "teleatendimentos", "comunicacao", "estoque", "perfil", "configuracoes", "ajuda"],
  Entregador: ["entregas", "perfil", "configuracoes", "ajuda"],
}
export const ROLE_HOME: Record<Role, string> = { Administrador: "/", Vendedor: "/vendas", Caixa: "/caixa", Estoque: "/estoque", "Veterinário": "/agendas", Entregador: "/entregas" }
export function canAccess(role: Role | undefined, area: string) {
  if (!role) return false
  const list = ROLE_ACCESS[role]
  return list.includes("*") || list.includes(area)
}
export type Clinic = "exemplo" | "minha"
export const MINHA_UNIT: Unit = {
  id: "minha", name: "Minha clínica", shortName: "Minha clínica", cnpj: "", phone: "", email: "", street: "", number: "", neighborhood: "", city: "Sua cidade", state: "RO", cep: "", responsible: "", status: "Ativa", profile: "Ambiente real da sua clínica",
} as Unit

const StoreContext = createContext<StoreValue | null>(null)
const STORAGE_KEY = "vetflow-state-v4"
const defaultProfile: UserProfile = {
  name: "Rafael Souza",
  displayName: "Dr. Rafael",
  email: "rafael@vetflow.com.br",
  phone: "(69) 98765-4321",
  crmv: "CRMV-RO 2.841",
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
  const allUnits = useMemo(
    () => [
      ...seedUnits.map((unit) => ({ ...unit, ...unitUpdates[unit.id] })),
      ...customUnits.map((unit) => ({ ...unit, ...unitUpdates[unit.id] })),
    ],
    [customUnits, unitUpdates],
  )
  const minhaUnit = useMemo(() => ({ ...MINHA_UNIT, ...unitUpdates.minha }), [unitUpdates])
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
      { ...seed, ...customData, minha: emptyUnitData() },
      persisted?.changes || [],
    )
  })
  const [staff, setStaff] = useState<StaffUser[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vetflow-staff") || "null")
      if (Array.isArray(saved) && saved.length) {
        /* migração: cadastros antigos tinham a senha em texto puro; viram hash e exigem troca */
        const migrated = (saved as StaffUser[]).map((u) => {
          if (u.passwordHash && u.salt) { const { password: _drop, ...rest } = u; return rest as StaffUser }
          const seed = STAFF.find((x) => x.id === u.id)
          const salt = seed?.salt || newSalt()
          const { password: _old, ...rest } = u
          return { ...rest, salt, passwordHash: seed?.passwordHash || hashPassword(tempPassword(), salt), mustChange: true } as StaffUser
        })
        return [...migrated, ...STAFF.filter((u) => !migrated.some((x) => x.id === u.id))]
      }
    } catch { /* sem cadastro salvo */ }
    return STAFF
  })
  type Session = { token: string; userId: string; clinic: Clinic | ""; exp: number; keep?: boolean }
  const readTokens = (): Record<string, { userId: string; exp: number }> => { try { return JSON.parse(localStorage.getItem("vetflow-auth") || "{}") } catch { return {} } }
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = sessionStorage.getItem("vetflow-session") || localStorage.getItem("vetflow-session-keep")
      if (!raw) return null
      const s = JSON.parse(raw) as Session
      const t = readTokens()[s?.token || ""]
      /* a sessão só vale com um token emitido no login, ainda dentro da validade */
      if (!s?.token || !t || t.userId !== s.userId || t.exp < Date.now()) return null
      return s
    } catch {
      return null
    }
  })
  useEffect(() => {
    try {
      sessionStorage.removeItem("vetflow-session"); localStorage.removeItem("vetflow-session-keep")
      if (session) (session.keep ? localStorage : sessionStorage).setItem(session.keep ? "vetflow-session-keep" : "vetflow-session", JSON.stringify(session))
    } catch { /* sem sessão */ }
  }, [session])
  /* registro de auditoria (I-11) */
  const [audit, setAudit] = useState<AuditEntry[]>(() => { try { return JSON.parse(localStorage.getItem("vetflow-audit") || "[]") } catch { return [] } })
  useEffect(() => { try { localStorage.setItem("vetflow-audit", JSON.stringify(audit.slice(-3000))) } catch { /* sem espaço */ } }, [audit])
  const [termsAccepted, setTermsAccepted] = useState(() => { try { return (JSON.parse(localStorage.getItem("vetflow-terms") || "{}") as Record<string, string>)._version === TERMS_VERSION } catch { return false } })
  const loginFails = useRef<Record<string, { n: number; until: number }>>({})
  useEffect(() => {
    try { localStorage.setItem("vetflow-staff", JSON.stringify(staff)) } catch { /* sem espaço */ }
  }, [staff])
  const units = useMemo(() => (session?.clinic === "minha" ? [minhaUnit] : allUnits), [session?.clinic, allUnits, minhaUnit])
  const user = session ? staff.find((u) => u.id === session.userId) || null : null
  const authenticated = !!user
  const clinic: Clinic | "" = session?.clinic || ""
  const effectiveUnitId = session?.clinic === "minha" ? "minha" : activeUnitId === "minha" ? "centro" : activeUnitId

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

  /* sincroniza entre abas do navegador: venda salva numa aba aparece na hora no Caixa e em Entregas abertos em outra */
  const changesRef = useRef(changes)
  changesRef.current = changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === STORAGE_KEY && e.newValue) {
          const next = JSON.parse(e.newValue)
          const nextChanges: DataChange[] = next?.changes || []
          if (JSON.stringify(nextChanges) === JSON.stringify(changesRef.current)) return
          const custom = Object.fromEntries((next?.customUnits || []).map((u: Unit) => [u.id, emptyUnitData()]))
          setCustomUnits(next?.customUnits || [])
          setChanges(nextChanges)
          setAllData(applyChanges({ ...seed, ...custom, minha: emptyUnitData() }, nextChanges))
        }
        if (e.key === "vetflow-staff" && e.newValue) {
          const list = JSON.parse(e.newValue)
          if (Array.isArray(list) && list.length) setStaff(list)
        }
      } catch { /* ignora dados inválidos de outra aba */ }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [seed])

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
        ? allData[effectiveUnitId].animais.find(
            (item) => item.id === partial.animalId,
          )
        : undefined
      const owner = animal
        ? allData[effectiveUnitId].tutores.find(
            (item) => item.id === animal.ownerId,
          )
        : undefined
      const amountValue = Number(partial.amountValue || 0)
      const item: Item = {
        id: `${effectiveUnitId}-${module}-${Date.now()}`,
        name: partial.name || "Novo registro",
        subtitle:
          partial.subtitle ||
          (animal ? `${animal.name} • ${owner?.name}` : "Cadastro VetFlow"),
        status: partial.status || "Ativo",
        createdAt: new Date().toISOString(),
        date: partial.date || dateValue(TODAY),
        unitId: effectiveUnitId,
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
        [effectiveUnitId]: {
          ...current[effectiveUnitId],
          [module]: [item, ...current[effectiveUnitId][module]],
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "add", unitId: effectiveUnitId, module, id: item.id, item },
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
          unitId: effectiveUnitId,
        },
        ...current,
      ])
      return item
    },
    [effectiveUnitId, allData],
  )

  const updateItem = useCallback(
    (module: ModuleSlug, id: string, patch: Partial<Item>) => {
      setAllData((current) => ({
        ...current,
        [effectiveUnitId]: {
          ...current[effectiveUnitId],
          [module]: current[effectiveUnitId][module].map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "update", unitId: effectiveUnitId, module, id, patch },
      ])
    },
    [effectiveUnitId],
  )

  const deleteItem = useCallback(
    (module: ModuleSlug, id: string) => {
      setAllData((current) => ({
        ...current,
        [effectiveUnitId]: {
          ...current[effectiveUnitId],
          [module]: current[effectiveUnitId][module].filter(
            (item) => item.id !== id,
          ),
        },
      }))
      setChanges((current) => [
        ...current,
        { operation: "delete", unitId: effectiveUnitId, module, id },
      ])
    },
    [effectiveUnitId],
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

  const userProfile = useMemo<UserProfile>(() => {
    if (!user) return profile
    if (user.id === "u-admin") return { ...profile, email: user.email }
    return { ...profile, name: user.name, displayName: user.displayName, email: user.email, crmv: user.crmv || user.role, specialty: user.role }
  }, [user, profile])

  const value = useMemo<StoreValue>(
    () => ({
      units,
      activeUnit: units.find((unit) => unit.id === effectiveUnitId) || units[0],
      activeUnitId: effectiveUnitId,
      setActiveUnitId,
      data: allData[effectiveUnitId] || emptyUnitData(),
      allData,
      notifications: notifications.filter(
        (item) => item.unitId === effectiveUnitId,
      ),
      unreadCount: notifications.filter(
        (item) => item.unitId === effectiveUnitId && !item.read,
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
      addItem: (module, item) => {
        const created = addItem(module, item)
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || "Sistema", acao: "criou", modulo: module, registro: created.name || created.id, unidade: effectiveUnitId }])
        return created
      },
      updateItem: (module, id, patch) => {
        updateItem(module, id, patch)
        const cur = (allData[effectiveUnitId]?.[module] || []).find((x) => x.id === id)
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || "Sistema", acao: "editou", modulo: module, registro: cur?.name || id, unidade: effectiveUnitId }])
      },
      deleteItem: (module, id) => {
        const cur = (allData[effectiveUnitId]?.[module] || []).find((x) => x.id === id)
        deleteItem(module, id)
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || "Sistema", acao: "excluiu", modulo: module, registro: cur?.name || id, unidade: effectiveUnitId }])
      },
      authenticated,
      login: (identifier, password, keep) => {
        const id = identifier.trim().toLowerCase()
        const digits = id.replace(/\D/g, "")
        const f = loginFails.current[id]
        if (f && f.until > Date.now()) return { user: null, error: `Muitas tentativas. Tente de novo em ${Math.ceil((f.until - Date.now()) / 1000)} s.` }
        const found = staff.find((u) => (u.username === id || u.email.toLowerCase() === id || (digits.length === 11 && u.cpf.replace(/\D/g, "") === digits)))
        if (!found || hashPassword(password, found.salt) !== found.passwordHash) {
          const n = (f?.n || 0) + 1
          loginFails.current[id] = { n, until: n >= 5 ? Date.now() + 60_000 : 0 }
          return { user: null, error: n >= 5 ? "Senha incorreta 5 vezes. O acesso foi bloqueado por 1 minuto." : `Usuário ou senha incorretos.${n >= 3 ? ` Restam ${5 - n} tentativa(s).` : ""}` }
        }
        if (!found.active) return { user: null, error: "Este acesso está desativado. Fale com o administrador da clínica." }
        delete loginFails.current[id]
        const token = newSalt() + newSalt()
        const exp = Date.now() + (keep ? 30 : 0.5) * 86_400_000
        try { const t = readTokens(); Object.keys(t).forEach((k) => { if (t[k].exp < Date.now()) delete t[k] }); t[token] = { userId: found.id, exp }; localStorage.setItem("vetflow-auth", JSON.stringify(t)) } catch { /* sem armazenamento */ }
        setSession({ token, userId: found.id, clinic: "", exp, keep: !!keep })
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: found.displayName, acao: "login", modulo: "acesso", registro: found.username, unidade: "" }])
        return { user: found }
      },
      logout: () => {
        try { const t = readTokens(); if (session?.token) delete t[session.token]; localStorage.setItem("vetflow-auth", JSON.stringify(t)) } catch { /* ok */ }
        if (user) setAudit((a) => [...a, { em: new Date().toISOString(), quem: user.displayName, acao: "logout", modulo: "acesso", registro: user.username, unidade: "" }])
        setSession(null)
      },
      verifyPassword: (u, password) => hashPassword(password, u.salt) === u.passwordHash,
      changePassword: (userId, current, next) => {
        const u = staff.find((x) => x.id === userId)
        if (!u) return "Usuário não encontrado."
        if (current !== null && hashPassword(current, u.salt) !== u.passwordHash) return "A senha atual está incorreta."
        const probs = passwordProblems(next)
        if (probs.length) return `A nova senha precisa ter ${probs.join(", ")}.`
        if (hashPassword(next, u.salt) === u.passwordHash) return "A nova senha precisa ser diferente da atual."
        const salt = newSalt()
        setStaff((cur) => cur.map((x) => (x.id === userId ? { ...x, salt, passwordHash: hashPassword(next, salt), mustChange: false } : x)))
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || u.displayName, acao: "senha", modulo: "acesso", registro: u.username, unidade: "" }])
        return null
      },
      resetPassword: (userId) => {
        const temp = tempPassword()
        const salt = newSalt()
        setStaff((cur) => cur.map((x) => (x.id === userId ? { ...x, salt, passwordHash: hashPassword(temp, salt), mustChange: true } : x)))
        const u = staff.find((x) => x.id === userId)
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || "Sistema", acao: "senha", modulo: "acesso", registro: `redefinição · ${u?.username || userId}`, unidade: "" }])
        return temp
      },
      audit,
      termsAccepted,
      acceptTerms: () => {
        try {
          const rec = JSON.parse(localStorage.getItem("vetflow-terms") || "{}")
          rec._version = TERMS_VERSION
          rec[user?.id || "anon"] = { versao: TERMS_VERSION, em: new Date().toISOString(), quem: user?.displayName || "" }
          localStorage.setItem("vetflow-terms", JSON.stringify(rec))
        } catch { /* sem armazenamento */ }
        setTermsAccepted(true)
        setAudit((a) => [...a, { em: new Date().toISOString(), quem: user?.displayName || "Usuário", acao: "termos", modulo: "LGPD", registro: `versão ${TERMS_VERSION}`, unidade: "" }])
      },
      user,
      staff,
      saveStaff: (u) => setStaff((cur) => (cur.some((x) => x.id === u.id) ? cur.map((x) => (x.id === u.id ? u : x)) : [...cur, u])),
      clinic,
      chooseClinic: (c) => {
        setSession((cur) => (cur ? { ...cur, clinic: c } : cur))
        if (c === "exemplo" && activeUnitId === "minha") setActiveUnitId("centro")
      },
      theme,
      toggleTheme: () =>
        setTheme((current) => (current === "light" ? "dark" : "light")),
      highlightedId,
      profile: userProfile,
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
      userProfile,
      timeZone,
      units,
      user,
      staff,
      clinic,
      session,
      effectiveUnitId,
      addUnit,
      updateUnit,
      audit,
      termsAccepted,
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
