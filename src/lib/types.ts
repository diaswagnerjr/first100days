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
  hardSkillsScore: number;
  softSkillsScore: number;
  currentCapabilities: string;
  futureCapabilities: string;
  capabilityGaps: string;
  pdiOriented: string;
  capabilityNotes: string;
  strengths: string;
  attentionPoints: string;
  risks: string;
  succession: string;
  development: string;
  notes: string;
  strategicAnswers: string;
  leadershipChecklist: string[];
  futureLeadershipMatch: string;
  futureLeadershipGap: string;
  futureLeadershipDecision: string;
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
  cluster: string;
  owner: string;
  dueDate: string;
  links: string;
  attachments: Attachment[];
  section: "handover" | "administrativo";
  updatedAt: string;
};

export type CoachingSession = {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  topics: string;
  insights: string;
  agreedActions: string;
  actionStatus: "Aberta" | "Em andamento" | "Concluida";
  prepThemes: string;
  prepDoubts: string;
  prepChallenges: string;
  prepSituations: string;
  updatedAt: string;
};

export type ClientRoutine = {
  id: string;
  area: "Tecnologia" | "Facilities / SSQV" | "Marketing" | "Rotinas Internas" | "Outras";
  name: string;
  objective: string;
  frequency: string;
  currentOwner: string;
  participants: string;
  status: "Ativa" | "Revisar" | "Descontinuar";
  perceptions: string;
  improvements: string;
  futureAdjustments: string;
  updatedAt: string;
};

export type Guardian = {
  id: string;
  processName: string;
  processDescription: string;
  guardianPerson: string;
  routineId: string;
  followUpFrequency: string;
  notes: string;
  updatedAt: string;
};

export type DeliveryGuideItem = {
  id: string;
  name: string;
  description: string;
  milestone: "30 dias" | "60 dias" | "90 dias" | "120 dias";
  category: string;
  priority: Priority;
  plannedDate: string;
  completedDate: string;
  status: "Nao iniciado" | "Em andamento" | "Concluido";
  expectedResult: string;
  achievedResult: string;
  comments: string;
  updatedAt: string;
};

export type SuccessIndicator = {
  id: string;
  indicator: string;
  expectedResult: string;
  currentResult: string;
  status: "Nao iniciado" | "Em andamento" | "Concluido" | "Em risco";
  targetDate: string;
  owner: string;
  notes: string;
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
  coachingSessions: CoachingSession[];
  clientRoutines: ClientRoutine[];
  guardians: Guardian[];
  deliveryGuideItems: DeliveryGuideItem[];
  successIndicators: SuccessIndicator[];
  orgScenarios: OrgScenario[];
  orgScenarioItems: OrgScenarioItem[];
  userPreferences: UserPreference;
};
