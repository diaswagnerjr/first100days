import type {
  AppData,
  Category,
  HandoverItem,
  MethodologyPillar,
  OrgScenario,
  OrgScenarioItem,
  Person,
  Stakeholder,
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
  role,
  cluster: index === 0 ? "Lideranca" : "A definir",
  portfolios: "",
  categoryIds: [],
  firstOneOnOne: "",
  nextConversation: "",
  agendaStatus: "Agendar 1:1",
  sommos: "",
  sommosScore: 0,
  performance: 3,
  potential: 3,
  potentialNotes: "",
  hardSkills: "",
  softSkills: "",
  hardSkillsScore: 3,
  softSkillsScore: 3,
  strengths: "",
  attentionPoints: "",
  risks: "",
  succession: "",
  development: "",
  notes: ""
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
  notes: ""
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
  notes: ""
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
  ["Recomendacoes da Thais", "Transicao"]
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
  updatedAt: ""
}));

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
  handoverChecklist: handoverChecklistSeed,
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
