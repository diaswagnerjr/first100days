export type Priority = "Alta" | "Media" | "Baixa";
export type Status = "Nao iniciado" | "Mapear" | "Iniciado" | "Em andamento" | "Em risco" | "Concluido";

export type Person = {
  id: string;
  name: string;
  role: string;
  cluster: string;
  portfolios: string;
  categoryIds: string[];
  firstOneOnOne: string;
  nextConversation: string;
  agendaStatus: string;
  sommos: string;
  sommosScore: number;
  performance: number;
  potential: number;
  potentialNotes: string;
  hardSkills: string;
  softSkills: string;
  strengths: string;
  attentionPoints: string;
  risks: string;
  succession: string;
  development: string;
  notes: string;
};

export type Stakeholder = {
  id: string;
  name: string;
  area: string;
  role: string;
  influence: Priority;
  criticality: Priority;
  relationship: Priority;
  firstConversation: string;
  conversationDate: string;
  nextConversation: string;
  interactionStatus: string;
  expectations: string;
  pains: string;
  opportunities: string;
  nextSteps: string;
  learnings: string;
  notes: string;
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  spend: number;
  relatedArea: string;
  criticality: Priority;
  contact: string;
  phone: string;
  email: string;
  firstInteraction: string;
  nextInteraction: string;
  relationshipStatus: string;
  meetings: number;
  opportunities: string;
  risks: string;
  actionPlan: string;
  conversationDate: string;
  interactionStatus: string;
  nextSteps: string;
  notes: string;
};

export type Category = {
  id: string;
  name: string;
  strategy: string;
  owner: string;
  opportunities: string;
  risks: string;
  savings: number;
  status: Status;
  spend: number;
};

export type Diagnosis = {
  id: string;
  situation: string;
  challenges: string;
  hypotheses: string;
  risks: string;
  opportunities: string;
  learnings: string;
};

export type MethodologyPillar = {
  id: string;
  name: string;
  status: Status;
  decision: string;
  decisionDate: string;
  evidence: string;
  comments: string;
  explanation: string;
  expected: string;
  nextSteps: string;
  updatedAt: string;
};

export type HandoverItem = {
  id: string;
  item: string;
  status: Status;
  comment: string;
  owner: string;
  dueDate: string;
  links: string;
  attachments: Attachment[];
  updatedAt: string;
};

export type OrgScenario = {
  id: string;
  name: string;
  description: string;
  rationale: string;
  risks: string;
  recommendedDecision: string;
  status: Status;
};

export type OrgScenarioItem = {
  id: string;
  scenarioId: string;
  personName: string;
  role: string;
  cluster: string;
  manager: string;
  categoryIds: string[];
  spendResponsibility: number;
  notes: string;
};

export type UserPreference = {
  id: string;
  theme: "light" | "dark";
  accessCount: number;
  mutationCount: number;
  lastAccessedAt: string;
  previousAccessedAt: string;
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

export type AppData = {
  people: Person[];
  stakeholders: Stakeholder[];
  suppliers: Supplier[];
  categories: Category[];
  diagnosis: Diagnosis;
  methodologyPillars: MethodologyPillar[];
  handoverChecklist: HandoverItem[];
  orgScenarios: OrgScenario[];
  orgScenarioItems: OrgScenarioItem[];
  userPreferences: UserPreference;
};
