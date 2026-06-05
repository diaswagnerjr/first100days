export type Priority = "Alta" | "Media" | "Baixa";
export type Status = "Nao iniciado" | "Mapear" | "Em andamento" | "Em risco" | "Concluido";

export type Person = {
  id: string;
  name: string;
  role: string;
  cluster: string;
  portfolios: string;
  firstOneOnOne: string;
  sommos: string;
  performance: number;
  potential: number;
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
  relationship: Priority;
  expectations: string;
  learnings: string;
  nextAction: string;
  nextMeeting: string;
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  spend: number;
  criticality: Priority;
  contact: string;
  meetings: number;
  opportunities: string;
  risks: string;
  actionPlan: string;
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

export type AppData = {
  people: Person[];
  stakeholders: Stakeholder[];
  suppliers: Supplier[];
  categories: Category[];
  diagnosis: Diagnosis;
};
