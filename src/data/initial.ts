import type { AppData, Category, Person, Stakeholder, Supplier } from "../lib/types";
import { categoriesSeed, suppliersSeed } from "./seedSpend";

const id = (prefix: string, index: number) => `${prefix}-${String(index + 1).padStart(3, "0")}`;

export const peopleSeed: Person[] = [
  ["Juliana Cardoso Gomes", "Coordenadora"],
  ["Joao Victor", "Analista Sr"],
  ["Thais Gois", "Consultora"],
  ["Pedro Escobar", "Analista Sr"],
  ["Bruna Ferreira", "Analista Pl"],
  ["Gabriel Menezes", "Consultor"],
  ["Keyze", "Consultora Sr"],
  ["Denis", "Analista Sr"],
  ["Rhenan Caetano", "Analista Sr"],
  ["Rafael Iury", "Analista Pl"],
  ["Isabella da Silva", "Estagiaria"]
].map(([name, role], index) => ({
  id: id("person", index),
  name,
  role,
  cluster: index === 0 ? "Lideranca" : "A definir",
  portfolios: "",
  firstOneOnOne: "",
  sommos: "",
  performance: 3,
  potential: 3,
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
  relationship: "Media",
  expectations: "",
  learnings: "",
  nextAction: "Agendar conversa inicial",
  nextMeeting: ""
}));

export const suppliersInitial: Supplier[] = suppliersSeed.map((item, index) => ({
  id: id("supplier", index),
  name: item.name,
  category: item.category,
  spend: item.spend,
  criticality: item.criticality as Supplier["criticality"],
  contact: item.contact,
  meetings: item.meetings,
  opportunities: item.opportunities,
  risks: item.risks,
  actionPlan: item.action_plan
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

export const initialData: AppData = {
  people: peopleSeed,
  stakeholders: stakeholdersSeed,
  suppliers: suppliersInitial,
  categories: categoriesInitial,
  diagnosis: {
    id: "diagnosis-001",
    situation: "Turnaround leve / Realignment",
    challenges:
      "Pessoas e performance; org design; stakeholders criticos; fornecedores estrategicos; captura de valor; SAP S/4HANA; comunicacao e governanca.",
    hypotheses:
      "Existe valor capturavel com foco nas maiores categorias, maior cadencia de governanca e redefinicao clara das carteiras.",
    risks:
      "Perda de foco nos primeiros 30 dias, ruído com stakeholders, baixa clareza de papeis e dependencia de dados dispersos.",
    opportunities:
      "Priorizacao por spend, early wins em contratos de alto impacto, melhoria da rotina financeira e fortalecimento do time.",
    learnings: ""
  }
};
