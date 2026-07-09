import type {
  AppData,
  Category,
  ClientRoutine,
  CoachingSession,
  CriticalProcess,
  DeliveryGuideItem,
  Guardian,
  HandoverItem,
  MarketBenchmark,
  MethodologyPillar,
  OrgScenario,
  OrgScenarioItem,
  Person,
  Stakeholder,
  SuccessIndicator,
  Supplier
} from "../lib/types";
import { categoriesSeed, suppliersSeed } from "./seedSpend";

const id = (prefix: string, index: number) => `${prefix}-${String(index + 1).padStart(3, "0")}`;

const areas = ["RH", "TI", "Juridico", "Marketing", "Financas", "Facilities", "Operacoes"];
const inferArea = (name: string, index: number) => {
  const upper = name.toUpperCase();
  if (upper.includes("SAP") || upper.includes("TELECOM") || upper.includes("TECNOLOGIA")) return "TI";
  if (upper.includes("MULLEN") || upper.includes("PUBLICIDADE")) return "Marketing";
  if (upper.includes("TICKET") || upper.includes("REPOM") || upper.includes("PAGAMENTO")) return "Financas";
  if (upper.includes("VIX") || upper.includes("VIACAO") || upper.includes("MOVIDA") || upper.includes("FRET")) return "Operacoes";
  if (upper.includes("GR") || upper.includes("LIMPEZA") || upper.includes("SPORE")) return "Facilities";
  if (upper.includes("DELOITTE") || upper.includes("ASSESSORIA")) return "Juridico";
  return areas[index % areas.length];
};

const sommosByPerson: Record<string, { role: string; sommos: string }> = {
  "BRUNA FERREIRA": { role: "Analista Pl.", sommos: "Dentro do esperado" },
  DENIS: { role: "Analista Sr.", sommos: "Dentro do esperado" },
  "GABRIEL MENEZES": { role: "Consultor I", sommos: "Dentro do esperado" },
  "ISABELLA DA SILVA": { role: "Estagiário", sommos: "Dentro do esperado" },
  "JOÃO VICTOR": { role: "Analista Sr.", sommos: "Acima do esperado" },
  "PEDRO ESCOBAR": { role: "Analista Sr.", sommos: "Acima do esperado" },
  "RAFAEL IURY": { role: "Analista Pl.", sommos: "Dentro do esperado" },
  "RHENAN CAETANO": { role: "Analista Sr.", sommos: "Acima do esperado" },
  "THAIS GOIS": { role: "Consultor I", sommos: "Abaixo do esperado" }
};

export const portfolioCategoryNamesByPerson: Record<string, string[]> = {
  "GABRIEL MENEZES": ["FORNECIM ALIM-FLORT", "FORNECIM ALIM-INDL", "SERV DESPACHANTE", "SERV MAO OBRA TERC"],
  "JOÃO VICTOR": ["FROTA LEVE", "SERV LOC IMOVEL", "SERV LOC VEICULO LEV", "SERV VIG/MON CFTV"],
  "BRUNA FERREIRA": ["SERV AGENC PROPAGAND", "SERV CARTAO BENEFIC", "SERV PESQ QUAL OPER", "SERV TRADE MARKETING", "SERV TRANSP MUDANCA"],
  "THAIS GOIS": ["SERV CONTROLE PRAGAS", "SERV JARDINAGEM", "SERV LIMPEZA/VIGILANCIA", "SERV LIMPEZA/VIGILANCIA CD"],
  "PEDRO ESCOBAR": ["SERV FRET AEREO", "SERV FRETAM FLORT", "SERV FRETAM INDL", "SERV TAXI", "TRANSP ALIMENTAÇAO"],
  DENIS: ["SERV CONS TECN", "SERV CONS TI", "SERV GERENC SERVIDOR", "SERV LIC DIREIT C/TI", "SERV LIC DIREIT S/TI", "SERV LINK DADOS SAT", "SERV MOVEL ESP RADIO", "SERV TELEMETRIA", "SERV TI-SUPORTE TECN"],
  "RAFAEL IURY": ["Hardware/Compra de equipamento", "SERV CONS TECN", "SERV CONS TI", "SERV GERENC SERVIDOR", "SERV LIC DIREIT C/TI", "SERV LIC DIREIT S/TI", "SERV LOC EQUIP INFOR", "SERV OUTSOURC IMPRES", "SERV SIST AUTOMAC TI", "SERV TI-SUPORTE TECN"],
  "RHENAN CAETANO": ["SERV CONS TECN", "SERV CONS TI", "SERV GERENC SERVIDOR", "SERV LIC DIREIT C/TI", "SERV LIC DIREIT S/TI", "SERV LIC DIREIT SAP", "SERV TI-SUPORTE TECN"]
};

export const peopleSeed: Person[] = [
  ["Juliana Cardoso Gomes", "Coordenadora"],
  ["João Victor", "Analista Sr"],
  ["Thais Gois", "Consultora"],
  ["Pedro Escobar", "Analista Sr"],
  ["Bruna Ferreira", "Analista Pl"],
  ["Gabriel Menezes", "Consultor"],
  ["Keyze", "Consultora Sr"],
  ["Denis", "Analista Sr"],
  ["Rhenan Caetano", "Analista Sr"],
  ["Rafael Iury", "Analista Pl"],
  ["Isabella da Silva", "Estagiária"]
].map(([name, role], index) => ({
  id: id("person", index),
  name,
  role: sommosByPerson[name.toUpperCase()]?.role || role,
  cluster: index === 0 ? "Lideranca" : "A definir",
  portfolios: "",
  categoryIds: [],
  firstOneOnOne: "",
  nextConversation: "",
  agendaStatus: "Agendar 1:1",
  sommos: sommosByPerson[name.toUpperCase()]?.sommos || "",
  sommosScore: 0,
  performance: 3,
  potential: 3,
  potentialNotes: "",
  hardSkills: "",
  softSkills: "",
  hardSkillsScore: 3,
  softSkillsScore: 3,
  currentCapabilities: "",
  futureCapabilities: "",
  capabilityGaps: "",
  pdiOriented: "",
  capabilityNotes: "",
  strengths: "",
  attentionPoints: "",
  risks: "",
  succession: "",
  development: "",
  notes: "",
  strategicAnswers: "",
  leadershipChecklist: [],
  futureLeadershipMatch: "",
  futureLeadershipGap: "",
  futureLeadershipDecision: ""
}));

export const stakeholdersSeed: Stakeholder[] = [
  ["Diretoria de Suprimentos", "Lideranca", "Sponsor"],
  ["RH", "Pessoas", "Parceiro"],
  ["TI", "Tecnologia", "Parceiro"],
  ["Facilities", "Cliente interno", "Stakeholder"],
  ["Marketing", "Cliente interno", "Stakeholder"],
  ["Juridico", "Governanca", "Parceiro"],
  ["Financas", "Financeiro", "Parceiro"]
].map(([name, area, role], index) => ({
  id: id("stakeholder", index),
  name,
  area,
  role,
  influence: index === 0 ? "Alta" : "Media",
  criticality: index === 0 ? "Alta" : "Media",
  relationship: "Media",
  firstConversation: "",
  conversationDate: "",
  nextConversation: "",
  interactionStatus: "Nao iniciado",
  expectations: "",
  pains: "",
  opportunities: "",
  nextSteps: "Agendar conversa inicial",
  learnings: "",
  notes: "",
  showOnDashboard: false
}));

export const suppliersInitial: Supplier[] = suppliersSeed.map((item, index) => ({
  id: id("supplier", index),
  name: item.name,
  category: item.category,
  spend: item.spend,
  relatedArea: inferArea(item.name, index),
  criticality: item.criticality as Supplier["criticality"],
  contact: item.contact,
  phone: "",
  email: "",
  firstInteraction: "",
  nextInteraction: "",
  relationshipStatus: index < 20 ? "Priorizar primeiro contato" : "Mapear",
  meetings: item.meetings,
  opportunities: item.opportunities,
  risks: item.risks,
  actionPlan: item.action_plan,
  conversationDate: "",
  interactionStatus: "Nao iniciado",
  nextSteps: "",
  notes: "",
  showOnDashboard: false
}));

export const categoriesInitial: Category[] = categoriesSeed.map((item, index) => ({
  id: id("category", index),
  name: item.name,
  strategy: item.strategy,
  owner: item.owner,
  opportunities: item.opportunities,
  risks: item.risks,
  savings: item.savings,
  status: item.status as Category["status"],
  spend: item.spend
}));

const pillarDetails = [
  ["Match Strategy to Situation", "Diagnosticar se a situacao pede turnaround, realignment, sustaining success ou startup.", "Definir a leitura da situacao e adaptar prioridades, tom e ritmo."],
  ["Accelerate Learning", "Aprender rapido sobre negocio, pessoas, contratos, fornecedores e governanca.", "Registrar hipoteses, evidencias e aprendizados antes de decidir."],
  ["Build Coalitions", "Construir apoio com stakeholders criticos e patrocinadores.", "Mapear aliados, resistencias e compromissos."],
  ["Secure Early Wins", "Escolher vitorias iniciais criveis e visiveis.", "Criar tracao sem dispersar energia do plano principal."],
  ["Align Structure", "Ajustar desenho organizacional, rotinas e responsabilidades.", "Propor estrutura coerente com categorias, spend e capacidades."],
  ["Build Your Team", "Avaliar o time, potenciais, riscos, sucessao e desenvolvimento.", "Ter plano claro por pessoa e por carteira."],
  ["Create a Vision", "Consolidar narrativa e direcao pos-100 dias.", "Preparar mensagem para diretoria e plano de continuidade."]
];

export const methodologyPillarsSeed: MethodologyPillar[] = pillarDetails.map(([name, explanation, expected], index) => ({
  id: id("pillar", index),
  name,
  status: "Nao iniciado",
  decision: "",
  decisionDate: "",
  evidence: "",
  comments: "",
  explanation,
  expected,
  nextSteps: "",
  updatedAt: ""
}));

export const handoverChecklistSeed: HandoverItem[] = [
  ["Distribuicao atual das carteiras", "Pessoas e responsabilidades"],
  ["Principais contratos criticos", "Contratos e fornecedores"],
  ["Principais fornecedores", "Contratos e fornecedores"],
  ["Stakeholders mais sensiveis", "Stakeholders"],
  ["Rotinas da area", "Governanca e rotinas"],
  ["Reunioes recorrentes", "Governanca e rotinas"],
  ["Pipeline de sourcing", "Sourcing e valor"],
  ["Oportunidades financeiras", "Gestao financeira da area"],
  ["Riscos atuais", "Riscos e governanca"],
  ["Performance de cada pessoa do time", "Pessoas"],
  ["Potenciais e sucessao", "Pessoas"],
  ["Pontos de atencao do time", "Pessoas"],
  ["Historico de decisoes relevantes", "Governanca e rotinas"],
  ["Temas pendentes de SAP/S4", "Tecnologia e SAP"],
  ["Quick wins ja mapeados", "Sourcing e valor"],
  ["Pontos politicos sensiveis", "Stakeholders"],
  ["Recomendacoes da Thais", "Transicao"],
  ["Acessos e cartoes corporativos", "Acessos e onboarding"],
  ["Programa de estagio e sua conducao", "Pessoas"]
].map(([item, cluster], index) => ({
  id: id("handover", index),
  item,
  status: "Nao iniciado",
  comment: "",
  cluster,
  owner: "Wagner / Thais",
  dueDate: "",
  links: "",
  attachments: [],
  section: "administrativo",
  updatedAt: ""
}));

export const administrativeHandoverSeed: HandoverItem[] = [
  "Cartao Corporativo",
  "Acessos SAP",
  "Acessos S4",
  "Celular Corporativo",
  "Notebook",
  "OneDrive",
  "Pastas Compartilhadas",
  "Teams",
  "Power BI",
  "Coupa",
  "Alcadas",
  "Assinaturas Eletronicas",
  "Listas de Distribuicao",
  "Agenda de Stakeholders",
  "Outros"
].map((item, index) => ({
  id: id("admin-handover", index),
  item,
  status: "Nao iniciado",
  comment: "",
  cluster: "Handover administrativo",
  owner: "Wagner / Thais",
  dueDate: "",
  links: "",
  attachments: [],
  section: "administrativo",
  updatedAt: ""
}));

export const coachingSessionsSeed: CoachingSession[] = Array.from({ length: 6 }, (_, index) => ({
  id: id("coaching", index),
  sessionNumber: index + 1,
  sessionDate: "",
  topics: "",
  insights: "",
  agreedActions: "",
  actionStatus: "Aberta",
  prepThemes: "",
  prepDoubts: "",
  prepChallenges: "",
  prepSituations: "",
  updatedAt: ""
}));

export const emptyClientRoutine: ClientRoutine = {
  id: "routine-template",
  area: "Tecnologia",
  name: "Nova rotina",
  objective: "",
  frequency: "",
  currentOwner: "",
  participants: "",
  status: "Ativa",
  perceptions: "",
  improvements: "",
  futureAdjustments: "",
  updatedAt: ""
};

export const marketBenchmarkSeed: MarketBenchmark[] = Array.from({ length: 5 }, (_, index) => ({
  id: id("market-benchmark", index),
  companyName: `Empresa ${index + 1}`,
  contactName: "",
  contactRole: "",
  contactEmail: "",
  contactPhone: "",
  conversationDate: "",
  status: "Nao iniciado",
  scopeArea: "",
  managedSpend: "",
  orgStructure: "",
  categoryClassification: "",
  rolesResponsibilities: "",
  contractManagement: "",
  serviceModel: "",
  governance: "",
  kpis: "",
  digitalAnalytics: "",
  strategicAgenda: "",
  learnings: "",
  nextSteps: "",
  updatedAt: ""
}));

export const criticalProcessesSeed: CriticalProcess[] = [
  "Estrategia Google",
  "Negociacao Radio",
  "Incendio CD Aruja BC + Multa Movida/ LM",
  "Gocil",
  "Consultorias (Delegacao - Subcategorizacao) + Descentralizacao/ Delegacao",
  "BID Limpeza",
  "BID - Alimentacao",
  "JSL - Jacarei"
].map((name, index) => ({
  id: id("critical-process", index),
  name,
  categoryIds: [],
  handoverDate: "",
  description: "",
  scrumActions: "",
  notes: "",
  scrumActionsDone: false,
  showOnDashboard: true,
  updatedAt: ""
}));

export const emptyCriticalProcess: CriticalProcess = {
  id: "critical-process-template",
  name: "Novo processo critico",
  categoryIds: [],
  handoverDate: "",
  description: "",
  scrumActions: "",
  notes: "",
  scrumActionsDone: false,
  showOnDashboard: true,
  updatedAt: ""
};

export const guardiansSeed: Guardian[] = [
  {
    id: "guardian-001",
    processName: "Guardiao do Orcamento Financeiro",
    processDescription: "Acompanhar disciplina orcamentaria, compromissos financeiros e conexao com Financas.",
    guardianPerson: "",
    routineId: "",
    followUpFrequency: "Mensal",
    notes: "",
    updatedAt: ""
  },
  {
    id: "guardian-002",
    processName: "Guardiao do Matricial da Area",
    processDescription: "Garantir governanca do matricial, responsabilidades e ritos de acompanhamento.",
    guardianPerson: "",
    routineId: "",
    followUpFrequency: "Mensal",
    notes: "",
    updatedAt: ""
  },
  {
    id: "guardian-003",
    processName: "Guardiao de Conformidade Juridica",
    processDescription: "Zelar por contratos, pareceres, riscos juridicos e aderencia aos fluxos de conformidade.",
    guardianPerson: "",
    routineId: "",
    followUpFrequency: "Mensal",
    notes: "",
    updatedAt: ""
  }
];

export const emptyGuardian: Guardian = {
  id: "guardian-template",
  processName: "Novo processo",
  processDescription: "",
  guardianPerson: "",
  routineId: "",
  followUpFrequency: "Mensal",
  notes: "",
  updatedAt: ""
};

export const deliveryGuideSeed: DeliveryGuideItem[] = [];

export const emptyDeliveryGuideItem: DeliveryGuideItem = {
  id: "delivery-template",
  name: "Nova entrega",
  description: "",
  milestone: "30 dias",
  category: "",
  priority: "Media",
  plannedDate: "",
  completedDate: "",
  status: "Nao iniciado",
  expectedResult: "",
  achievedResult: "",
  comments: "",
  updatedAt: ""
};

export const successIndicatorsSeed: SuccessIndicator[] = [
  "Definir estrutura organizacional",
  "Fechar posicoes criticas",
  "Engajamento do time",
  "Captura financeira",
  "Roadmap da area aprovado",
  "Governanca implantada"
].map((indicator, index) => ({
  id: id("success-indicator", index),
  indicator,
  expectedResult: "",
  currentResult: "",
  status: "Nao iniciado",
  targetDate: "",
  owner: "Wagner",
  notes: "",
  updatedAt: ""
}));

export const emptySuccessIndicator: SuccessIndicator = {
  id: "success-template",
  indicator: "Novo indicador",
  expectedResult: "",
  currentResult: "",
  status: "Nao iniciado",
  targetDate: "",
  owner: "",
  notes: "",
  updatedAt: ""
};

export const orgScenariosSeed: OrgScenario[] = [
  {
    id: "scenario-001",
    name: "Estrutura atual",
    description: "Visao base para comparar cenarios futuros.",
    rationale: "Registrar desenho inicial antes de propor ajustes.",
    risks: "",
    recommendedDecision: "",
    status: "Mapear"
  }
];

export const orgScenarioItemsSeed: OrgScenarioItem[] = peopleSeed.map((person, index) => ({
  id: id("scenario-item", index),
  scenarioId: "scenario-001",
  personName: person.name,
  role: person.role,
  cluster: person.cluster,
  manager: "Thais Gois",
  categoryIds: [],
  spendResponsibility: 0,
  notes: ""
}));

export const initialData: AppData = {
  people: peopleSeed,
  stakeholders: stakeholdersSeed,
  suppliers: suppliersInitial,
  categories: categoriesInitial,
  methodologyPillars: methodologyPillarsSeed,
  handoverChecklist: [...handoverChecklistSeed, ...administrativeHandoverSeed],
  coachingSessions: coachingSessionsSeed,
  clientRoutines: [],
  marketBenchmarks: marketBenchmarkSeed,
  criticalProcesses: criticalProcessesSeed,
  guardians: guardiansSeed,
  deliveryGuideItems: deliveryGuideSeed,
  successIndicators: successIndicatorsSeed,
  orgScenarios: orgScenariosSeed,
  orgScenarioItems: orgScenarioItemsSeed,
  userPreferences: {
    id: "preferences-local",
    theme: "light",
    accessCount: 0,
    mutationCount: 0,
    lastAccessedAt: "",
    previousAccessedAt: ""
  },
  diagnosis: {
    id: "diagnosis-001",
    situation: "Turnaround leve / Realignment",
    challenges:
      "Pessoas e performance; org design; stakeholders criticos; fornecedores estrategicos; captura de valor; SAP S/4HANA; comunicacao e governanca.",
    hypotheses:
      "Existe valor capturavel com foco nas maiores categorias, maior cadencia de governanca e redefinicao clara das carteiras.",
    risks:
      "Perda de foco nos primeiros 30 dias, ruido com stakeholders, baixa clareza de papeis e dependencia de dados dispersos.",
    opportunities:
      "Priorizacao por spend, early wins em contratos de alto impacto, melhoria da rotina financeira e fortalecimento do time.",
    learnings: ""
  }
};
