import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarPlus,
  CalendarRange,
  Copy,
  Edit3,
  GitBranch,
  Handshake,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Moon,
  NotebookPen,
  Paperclip,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Sun,
  Target,
  Trash2,
  Users,
  UserSquare2,
  Waypoints
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  categoriesInitial,
  coachingSessionsSeed,
  emptyClientRoutine,
  handoverChecklistSeed,
  initialData,
  methodologyPillarsSeed,
  orgScenarioItemsSeed,
  orgScenariosSeed,
  peopleSeed,
  stakeholdersSeed,
  suppliersInitial
} from "./data/initial";
import { money, percent } from "./lib/format";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  AppData,
  Attachment,
  Category,
  ClientRoutine,
  CoachingSession,
  Diagnosis,
  HandoverItem,
  MethodologyPillar,
  OrgScenario,
  OrgScenarioItem,
  Person,
  Stakeholder,
  Supplier,
  UserPreference
} from "./lib/types";

type TabKey = "dashboard" | "pillars" | "people" | "coaching" | "handover" | "clientRoutines" | "org" | "stakeholders" | "suppliers" | "diagnosis";
type CollectionKey =
  | "people"
  | "stakeholders"
  | "suppliers"
  | "categories"
  | "methodologyPillars"
  | "handoverChecklist"
  | "coachingSessions"
  | "clientRoutines"
  | "orgScenarios"
  | "orgScenarioItems";

const firstDayValue = import.meta.env.VITE_FIRST_DAY || "2026-06-22";
const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const firstDay = parseLocalDate(firstDayValue);
const OWNER_EMAIL = "diaswagnerjr@gmail.com";
const VIEWER_EMAIL = "wagnerdj@suzano.com.br";

const tabs: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "pillars", label: "Pilares 100 dias", icon: Target },
  { key: "people", label: "Pessoas", icon: Users },
  { key: "coaching", label: "Coaching", icon: NotebookPen },
  { key: "handover", label: "Handover Thais", icon: Handshake },
  { key: "clientRoutines", label: "Rotinas areas clientes", icon: Waypoints },
  { key: "org", label: "Estrutura", icon: GitBranch },
  { key: "stakeholders", label: "Stakeholders", icon: UserSquare2 },
  { key: "suppliers", label: "Fornecedores", icon: BriefcaseBusiness },
  { key: "diagnosis", label: "Diagnostico", icon: ShieldAlert }
];

const tableNames: Record<CollectionKey | "diagnosis" | "userPreferences", string> = {
  people: "people",
  stakeholders: "stakeholders",
  suppliers: "suppliers",
  categories: "categories",
  methodologyPillars: "methodology_pillars",
  handoverChecklist: "handover_checklist",
  coachingSessions: "coaching_sessions",
  clientRoutines: "client_routines",
  orgScenarios: "org_scenarios",
  orgScenarioItems: "org_scenario_items",
  diagnosis: "diagnosis",
  userPreferences: "user_preferences"
};

const dateFields = new Set([
  "first_one_on_one",
  "next_conversation",
  "first_conversation",
  "conversation_date",
  "next_meeting",
  "first_interaction",
  "next_interaction",
  "decision_date",
  "due_date",
  "session_date",
  "last_accessed_at",
  "previous_accessed_at"
]);

const emptyRows = {
  people: peopleSeed[0],
  stakeholders: stakeholdersSeed[0],
  suppliers: suppliersInitial[0],
  categories: categoriesInitial[0],
  methodologyPillars: methodologyPillarsSeed[0],
  handoverChecklist: handoverChecklistSeed[0],
  coachingSessions: coachingSessionsSeed[0],
  clientRoutines: emptyClientRoutine,
  orgScenarios: orgScenariosSeed[0],
  orgScenarioItems: orgScenarioItemsSeed[0]
};

const toSnake = (row: Record<string, unknown>, userId: string) => {
  const mapped: Record<string, unknown> = { user_id: userId };
  Object.entries(row).forEach(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (snake === "updated_at" && !value) return;
    mapped[snake] = dateFields.has(snake) && value === "" ? null : value;
  });
  delete mapped.id;
  return mapped;
};

const fromSnake = <T,>(row: Record<string, unknown>) => {
  const mapped: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key === "user_id" || key === "created_at") return;
    const camel = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    mapped[camel] = value ?? "";
  });
  return mapped as T;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? value.split(",").map((item) => item.trim()) : []);
const todayIso = () => new Date().toISOString();

const normalizePerson = (row: Person): Person => ({
  ...peopleSeed[0],
  ...row,
  categoryIds: asArray(row.categoryIds),
  potentialNotes: row.potentialNotes || "",
  hardSkills: row.hardSkills || "",
  softSkills: row.softSkills || "",
  hardSkillsScore: Number(row.hardSkillsScore || 3),
  softSkillsScore: Number(row.softSkillsScore || 3)
});
const normalizeStakeholder = (row: Stakeholder): Stakeholder => ({ ...stakeholdersSeed[0], ...row, conversationDate: row.conversationDate || row.firstConversation || "", interactionStatus: row.interactionStatus || "Nao iniciado" });
const normalizeSupplier = (row: Supplier): Supplier => ({ ...suppliersInitial[0], ...row, conversationDate: row.conversationDate || row.firstInteraction || "", interactionStatus: row.interactionStatus || row.relationshipStatus || "Nao iniciado", nextSteps: row.nextSteps || row.actionPlan || "" });
const normalizePillar = (row: MethodologyPillar): MethodologyPillar => ({ ...(methodologyPillarsSeed.find((item) => item.name === row.name) ?? methodologyPillarsSeed[0]), ...row });
const normalizeHandover = (row: HandoverItem): HandoverItem => ({ ...handoverChecklistSeed[0], ...row, cluster: row.cluster || handoverCluster(row.item), attachments: Array.isArray(row.attachments) ? row.attachments : [] });
const normalizeCoaching = (row: CoachingSession): CoachingSession => ({ ...coachingSessionsSeed[0], ...row, sessionNumber: Number(row.sessionNumber || 1), actionStatus: row.actionStatus || "Aberta" });
const normalizeClientRoutine = (row: ClientRoutine): ClientRoutine => ({ ...emptyClientRoutine, ...row, status: row.status || "Ativa", area: row.area || "Outras" });
const normalizeScenarioItem = (row: OrgScenarioItem): OrgScenarioItem => ({ ...orgScenarioItemsSeed[0], ...row, categoryIds: asArray(row.categoryIds), spendResponsibility: Number(row.spendResponsibility || 0) });
const normalizePreferences = (row: UserPreference): UserPreference => ({ ...initialData.userPreferences, ...row, accessCount: Number(row.accessCount || 0), mutationCount: Number(row.mutationCount || 0) });

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [data, setData] = useState<AppData>(() => {
    const theme = (localStorage.getItem("first100days-theme") as "light" | "dark" | null) || "light";
    return { ...initialData, userPreferences: { ...initialData.userPreferences, theme } };
  });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = data.userPreferences.theme;
    localStorage.setItem("first100days-theme", data.userPreferences.theme);
  }, [data.userPreferences.theme]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    loadCloudData(session.user.id);
  }, [session?.user.id]);

  const dayState = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - firstDay.getTime()) / 86400000);
    const elapsed = diffDays < 0 ? 0 : Math.min(100, diffDays + 1);
    const daysToStart = Math.max(0, -diffDays);
    const phase = elapsed === 0
      ? `Inicia em ${daysToStart} ${daysToStart === 1 ? "dia" : "dias"}`
      : elapsed <= 30
        ? "Dias 1-30"
        : elapsed <= 60
          ? "Dias 31-60"
          : "Dias 61-100";
    const addDays = (days: number) => new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + days);
    return {
      elapsed,
      phase,
      timeProgress: elapsed / 100,
      startDate: firstDay,
      endDate: addDays(99),
      checkpoints: [
        { label: "Inicio", day: 1, date: addDays(0) },
        { label: "Checkpoint 30 dias", day: 30, date: addDays(29) },
        { label: "Checkpoint 60 dias", day: 60, date: addDays(59) },
        { label: "Fechamento 100 dias", day: 100, date: addDays(99) }
      ]
    };
  }, []);

  const metrics = useMemo(() => calculateMetrics(data), [data]);
  const currentEmail = session?.user.email?.toLowerCase() || "";
  const canEdit = !isSupabaseConfigured || currentEmail === OWNER_EMAIL;

  async function loadCloudData(userId: string) {
    if (!supabase) return;
    const isViewer = session?.user.email?.toLowerCase() === VIEWER_EMAIL;
    setLoading(true);
    setError("");
    try {
      const withUser = (query: any) => isViewer ? query : query.eq("user_id", userId);
      const [people, stakeholders, suppliers, categories, diagnosis, pillars, handover, coaching, routines, scenarios, scenarioItems, preferences] = await Promise.all([
        withUser(supabase.from(tableNames.people).select("*")).order("name"),
        withUser(supabase.from(tableNames.stakeholders).select("*")).order("name"),
        withUser(supabase.from(tableNames.suppliers).select("*")).order("spend", { ascending: false }),
        withUser(supabase.from(tableNames.categories).select("*")).order("spend", { ascending: false }),
        withUser(supabase.from(tableNames.diagnosis).select("*")).maybeSingle(),
        withUser(supabase.from(tableNames.methodologyPillars).select("*")).order("name"),
        withUser(supabase.from(tableNames.handoverChecklist).select("*")).order("item"),
        withUser(supabase.from(tableNames.coachingSessions).select("*")).order("session_number"),
        withUser(supabase.from(tableNames.clientRoutines).select("*")).order("area").order("name"),
        withUser(supabase.from(tableNames.orgScenarios).select("*")).order("name"),
        withUser(supabase.from(tableNames.orgScenarioItems).select("*")).order("person_name"),
        withUser(supabase.from(tableNames.userPreferences).select("*")).maybeSingle()
      ]);
      const failures = [people.error, stakeholders.error, suppliers.error, categories.error, diagnosis.error, pillars.error, handover.error, coaching.error, routines.error, scenarios.error, scenarioItems.error, preferences.error].filter(Boolean);
      if (failures.length) throw failures[0];
      if (!people.data?.length || !pillars.data?.length || !handover.data?.length || !scenarios.data?.length) {
        await ensureInitialData(userId);
        return loadCloudData(userId);
      }
      if (!isViewer && needsSeedReconcile(people.data, stakeholders.data, suppliers.data, categories.data, handover.data, coaching.data)) {
        await reconcileSeedData(userId, {
          people: people.data?.map((row: Record<string, unknown>) => normalizePerson(fromSnake<Person>(row))) ?? [],
          stakeholders: stakeholders.data?.map((row: Record<string, unknown>) => normalizeStakeholder(fromSnake<Stakeholder>(row))) ?? [],
          suppliers: suppliers.data?.map((row: Record<string, unknown>) => normalizeSupplier(fromSnake<Supplier>(row))) ?? [],
          categories: categories.data?.map((row: Record<string, unknown>) => fromSnake<Category>(row)) ?? [],
          handover: handover.data?.map((row: Record<string, unknown>) => normalizeHandover(fromSnake<HandoverItem>(row))) ?? [],
          coaching: coaching.data?.map((row: Record<string, unknown>) => normalizeCoaching(fromSnake<CoachingSession>(row))) ?? []
        });
        return loadCloudData(userId);
      }
      const pref = normalizePreferences(preferences.data ? fromSnake<UserPreference>(preferences.data) : initialData.userPreferences);
      const nextPref = isViewer ? pref : await recordAccess(userId, pref);
      setData({
        people: people.data.map((row: Record<string, unknown>) => normalizePerson(fromSnake<Person>(row))),
        stakeholders: stakeholders.data?.map((row: Record<string, unknown>) => normalizeStakeholder(fromSnake<Stakeholder>(row))) ?? initialData.stakeholders,
        suppliers: suppliers.data?.length ? suppliers.data.map((row: Record<string, unknown>) => normalizeSupplier(fromSnake<Supplier>(row))) : suppliersInitial,
        categories: categories.data?.length ? categories.data.map((row: Record<string, unknown>) => fromSnake<Category>(row)) : categoriesInitial,
        diagnosis: diagnosis.data ? fromSnake<Diagnosis>(diagnosis.data) : initialData.diagnosis,
        methodologyPillars: pillars.data?.map((row: Record<string, unknown>) => normalizePillar(fromSnake<MethodologyPillar>(row))) ?? initialData.methodologyPillars,
        handoverChecklist: handover.data?.map((row: Record<string, unknown>) => normalizeHandover(fromSnake<HandoverItem>(row))) ?? initialData.handoverChecklist,
        coachingSessions: coaching.data?.map((row: Record<string, unknown>) => normalizeCoaching(fromSnake<CoachingSession>(row))) ?? initialData.coachingSessions,
        clientRoutines: routines.data?.map((row: Record<string, unknown>) => normalizeClientRoutine(fromSnake<ClientRoutine>(row))) ?? [],
        orgScenarios: scenarios.data?.map((row: Record<string, unknown>) => fromSnake<OrgScenario>(row)) ?? initialData.orgScenarios,
        orgScenarioItems: scenarioItems.data?.map((row: Record<string, unknown>) => normalizeScenarioItem(fromSnake<OrgScenarioItem>(row))) ?? initialData.orgScenarioItems,
        userPreferences: nextPref
      });
    } catch (cloudError) {
      setError(cloudError instanceof Error ? cloudError.message : "Nao foi possivel carregar os dados do Supabase.");
    } finally {
      setLoading(false);
    }
  }

  async function recordAccess(userId: string, pref: UserPreference) {
    const next = {
      ...pref,
      accessCount: Number(pref.accessCount || 0) + 1,
      previousAccessedAt: pref.lastAccessedAt || pref.previousAccessedAt || "",
      lastAccessedAt: todayIso()
    };
    if (supabase) {
      await supabase.from(tableNames.userPreferences).upsert(toSnake(next as unknown as Record<string, unknown>, userId), { onConflict: "user_id" });
    }
    return next;
  }

  async function bumpMutation() {
    if (!supabase || !session?.user.id) return;
    const next = { ...data.userPreferences, mutationCount: Number(data.userPreferences.mutationCount || 0) + 1 };
    setData((current) => ({ ...current, userPreferences: next }));
    await supabase.from(tableNames.userPreferences).upsert(toSnake(next as unknown as Record<string, unknown>, session.user.id), { onConflict: "user_id" });
  }

  async function ensureInitialData(userId: string) {
    if (!supabase) return;
    const client = supabase;
    const insertMany = async (collection: CollectionKey, rows: Array<{ id: string }>) => {
      await client.from(tableNames[collection]).insert(rows.map((row) => toSnake(row as unknown as Record<string, unknown>, userId)));
    };
    await Promise.all([
      insertMany("people", peopleSeed),
      insertMany("stakeholders", stakeholdersSeed),
      insertMany("suppliers", suppliersInitial),
      insertMany("categories", categoriesInitial),
      insertMany("methodologyPillars", methodologyPillarsSeed),
      insertMany("handoverChecklist", handoverChecklistSeed),
      insertMany("coachingSessions", coachingSessionsSeed),
      insertMany("orgScenarios", orgScenariosSeed),
      insertMany("orgScenarioItems", orgScenarioItemsSeed),
      client.from(tableNames.diagnosis).insert(toSnake(initialData.diagnosis as unknown as Record<string, unknown>, userId)),
      client.from(tableNames.userPreferences).upsert({ user_id: userId, theme: data.userPreferences.theme }, { onConflict: "user_id" })
    ]);
  }

  function needsSeedReconcile(people: unknown[] | null, stakeholders: unknown[] | null, suppliers: unknown[] | null, categories: unknown[] | null, handover: unknown[] | null, coaching: unknown[] | null) {
    return (people?.length || 0) < peopleSeed.length
      || (stakeholders?.length || 0) < stakeholdersSeed.length
      || (suppliers?.length || 0) < 20
      || (categories?.length || 0) < categoriesInitial.length
      || (handover?.length || 0) < handoverChecklistSeed.length
      || (coaching?.length || 0) < coachingSessionsSeed.length;
  }

  async function reconcileSeedData(
    userId: string,
    current: { people: Person[]; stakeholders: Stakeholder[]; suppliers: Supplier[]; categories: Category[]; handover: HandoverItem[]; coaching: CoachingSession[] }
  ) {
    if (!supabase) return;
    const client = supabase;
    const insertMissing = async <T extends { id: string; name: string }>(collection: CollectionKey, seedRows: T[], existingRows: T[]) => {
      const existingNames = new Set(existingRows.map((row) => row.name.toLowerCase()));
      const missing = seedRows.filter((row) => !existingNames.has(row.name.toLowerCase()));
      if (missing.length) await client.from(tableNames[collection]).insert(missing.map((row) => toSnake(row as unknown as Record<string, unknown>, userId)));
    };
    await insertMissing("people", peopleSeed, current.people);
    await insertMissing("stakeholders", stakeholdersSeed, current.stakeholders);
    await insertMissing("suppliers", suppliersInitial, current.suppliers);
    await insertMissing("categories", categoriesInitial, current.categories);
    const existingHandover = new Set(current.handover.map((row) => row.item.toLowerCase()));
    const missingHandover = handoverChecklistSeed.filter((row) => !existingHandover.has(row.item.toLowerCase()));
    if (missingHandover.length) await client.from(tableNames.handoverChecklist).insert(missingHandover.map((row) => toSnake(row as unknown as Record<string, unknown>, userId)));
    const existingSessions = new Set(current.coaching.map((row) => row.sessionNumber));
    const missingSessions = coachingSessionsSeed.filter((row) => !existingSessions.has(row.sessionNumber));
    if (missingSessions.length) await client.from(tableNames.coachingSessions).insert(missingSessions.map((row) => toSnake(row as unknown as Record<string, unknown>, userId)));
  }

  async function upsertRow<T extends { id: string }>(collection: CollectionKey, row: T) {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode salvar alteracoes.");
      return;
    }
    const stamped = ["methodologyPillars", "handoverChecklist", "coachingSessions", "clientRoutines"].includes(collection) ? { ...row, updatedAt: todayIso() } as T : row;
    setData((current) => {
      const nextRows = (current[collection] as Array<{ id: string }>).map((item) => (item.id === row.id ? stamped : item));
      return { ...current, [collection]: nextRows } as AppData;
    });
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase.from(tableNames[collection]).upsert({ ...toSnake(stamped as unknown as Record<string, unknown>, session.user.id), id: row.id });
    if (saveError) setError(saveError.message);
    else await bumpMutation();
  }

  async function addRow(collection: CollectionKey, overrides: Record<string, unknown> = {}) {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode criar registros.");
      return "";
    }
    const base = emptyRows[collection];
    const row = { ...base, ...overrides, id: crypto.randomUUID(), name: "name" in base ? String(overrides.name || `Novo ${base.name}`) : overrides.name } as unknown as { id: string };
    if (collection === "orgScenarioItems" && !("scenarioId" in overrides)) (row as OrgScenarioItem).scenarioId = data.orgScenarios[0]?.id || "";
    setData((current) => ({ ...current, [collection]: [row, ...current[collection]] } as AppData));
    if (!supabase || !session?.user.id) return row.id;
    const { error: saveError } = await supabase.from(tableNames[collection]).insert({ ...toSnake(row as unknown as Record<string, unknown>, session.user.id), id: row.id });
    if (saveError) setError(saveError.message);
    else await bumpMutation();
    return row.id;
  }

  async function deleteRow(collection: CollectionKey, id: string) {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode excluir registros.");
      return;
    }
    setData((current) => ({ ...current, [collection]: (current[collection] as Array<{ id: string }>).filter((item) => item.id !== id) } as AppData));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase.from(tableNames[collection]).delete().eq("id", id).eq("user_id", session.user.id);
    if (saveError) setError(saveError.message);
    else await bumpMutation();
  }

  async function updateDiagnosis(next: Diagnosis) {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode salvar alteracoes.");
      return;
    }
    setData((current) => ({ ...current, diagnosis: next }));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase.from(tableNames.diagnosis).upsert({ ...toSnake(next as unknown as Record<string, unknown>, session.user.id), id: next.id });
    if (saveError) setError(saveError.message);
    else await bumpMutation();
  }

  async function updatePreference(theme: "light" | "dark") {
    const next = { ...data.userPreferences, theme };
    setData((current) => ({ ...current, userPreferences: next }));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase.from(tableNames.userPreferences).upsert(toSnake(next as unknown as Record<string, unknown>, session.user.id), { onConflict: "user_id" });
    if (saveError) setError(saveError.message);
  }

  async function duplicateScenario(scenario: OrgScenario) {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode criar cenarios.");
      return;
    }
    const newId = crypto.randomUUID();
    const clone = { ...scenario, id: newId, name: `${scenario.name} - copia`, status: "Mapear" as OrgScenario["status"] };
    const clonedItems = data.orgScenarioItems
      .filter((item) => item.scenarioId === scenario.id)
      .map((item) => ({ ...item, id: crypto.randomUUID(), scenarioId: newId }));
    setData((current) => ({ ...current, orgScenarios: [clone, ...current.orgScenarios], orgScenarioItems: [...clonedItems, ...current.orgScenarioItems] }));
    if (!supabase || !session?.user.id) return;
    await supabase.from(tableNames.orgScenarios).insert(toSnake(clone as unknown as Record<string, unknown>, session.user.id));
    await supabase.from(tableNames.orgScenarioItems).insert(clonedItems.map((item) => toSnake(item as unknown as Record<string, unknown>, session.user.id)));
    await bumpMutation();
  }

  async function addScenarioWithPeople() {
    if (isSupabaseConfigured && !canEdit) {
      setError("Usuario visualizador nao pode criar cenarios.");
      return;
    }
    const newId = crypto.randomUUID();
    const scenario: OrgScenario = {
      id: newId,
      name: "Novo cenario",
      description: "",
      rationale: "",
      risks: "",
      recommendedDecision: "",
      status: "Mapear"
    };
    const scenarioPeople = (data.people.length ? data.people : peopleSeed).map((person) => ({
      id: crypto.randomUUID(),
      scenarioId: newId,
      personName: person.name,
      role: person.role,
      cluster: person.cluster || "A definir",
      manager: person.name === "Juliana Cardoso Gomes" ? "" : "Juliana Cardoso Gomes",
      categoryIds: person.categoryIds || [],
      spendResponsibility: spendFor(data.categories, person.categoryIds || []),
      notes: ""
    }));
    setData((current) => ({ ...current, orgScenarios: [scenario, ...current.orgScenarios], orgScenarioItems: [...scenarioPeople, ...current.orgScenarioItems] }));
    if (!supabase || !session?.user.id) return;
    await supabase.from(tableNames.orgScenarios).insert(toSnake(scenario as unknown as Record<string, unknown>, session.user.id));
    await supabase.from(tableNames.orgScenarioItems).insert(scenarioPeople.map((item) => toSnake(item as unknown as Record<string, unknown>, session.user.id)));
    await bumpMutation();
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
  }

  if (loading) return <Shell><div className="p-6">Carregando...</div></Shell>;
  if (isSupabaseConfigured && !session) return <Login />;

  return (
    <Shell>
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-leaf">Suzano</p>
            <h1 className="text-2xl font-semibold text-ink">Suzano | Plano Gerencia de Suprimentos Corporativo Onboarding</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isSupabaseConfigured && <Badge tone="warn">Modo demo local</Badge>}
            <button onClick={() => updatePreference(data.userPreferences.theme === "light" ? "dark" : "light")} className="btn">
              {data.userPreferences.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              {data.userPreferences.theme === "light" ? "Escuro" : "Claro"}
            </button>
            {session && <button onClick={signOut} className="btn"><LogOut size={16} /> Sair</button>}
            {session && <Badge tone={canEdit ? "ok" : "warn"}>{canEdit ? "Editor" : "Visualizador"}</Badge>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`focus-ring flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${active ? "bg-ink text-white" : "border border-line bg-card text-ink"}`}>
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0">
          {error && <div className="mb-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm">{error}</div>}
          {activeTab === "dashboard" && <Dashboard dayState={dayState} data={data} metrics={metrics} />}
          {activeTab === "pillars" && <PillarsPanel canEdit={canEdit} rows={data.methodologyPillars} onChange={(row) => upsertRow("methodologyPillars", row)} />}
          {activeTab === "people" && <PeoplePanel canEdit={canEdit} rows={data.people} categories={data.categories} onChange={(row) => upsertRow("people", row)} />}
          {activeTab === "coaching" && <CoachingPanel canEdit={canEdit} rows={data.coachingSessions} onChange={(row) => upsertRow("coachingSessions", row)} />}
          {activeTab === "handover" && <HandoverPanel canEdit={canEdit} rows={data.handoverChecklist} onChange={(row) => upsertRow("handoverChecklist", row)} />}
          {activeTab === "clientRoutines" && (
            <ClientRoutinesPanel
              canEdit={canEdit}
              rows={data.clientRoutines}
              addRoutine={(area) => addRow("clientRoutines", { ...emptyClientRoutine, area, name: "Nova rotina" })}
              deleteRoutine={(id) => deleteRow("clientRoutines", id)}
              onChange={(row) => upsertRow("clientRoutines", row)}
            />
          )}
          {activeTab === "org" && (
            <OrgPanel
              canEdit={canEdit}
              scenarios={data.orgScenarios}
              items={data.orgScenarioItems}
              people={data.people}
              categories={data.categories}
              addScenario={addScenarioWithPeople}
              duplicateScenario={duplicateScenario}
              deleteScenario={(id) => deleteRow("orgScenarios", id)}
              addItem={(scenarioId) => addRow("orgScenarioItems", { scenarioId, personName: "Nova posicao", role: "", cluster: "", manager: "", categoryIds: [], spendResponsibility: 0, notes: "" })}
              deleteItem={(id) => deleteRow("orgScenarioItems", id)}
              onScenario={(row) => upsertRow("orgScenarios", row)}
              onItem={(row) => upsertRow("orgScenarioItems", row)}
            />
          )}
          {activeTab === "stakeholders" && <StakeholderPanel rows={data.stakeholders} addRow={() => addRow("stakeholders", { name: "Novo stakeholder", area: "", role: "", criticality: "Media", influence: "Media", interactionStatus: "Nao iniciado" })} deleteRow={(id) => deleteRow("stakeholders", id)} onChange={(row) => upsertRow("stakeholders", row)} />}
          {activeTab === "suppliers" && <SupplierPanel canEdit={canEdit} rows={data.suppliers} onChange={(row) => upsertRow("suppliers", row)} />}
          {activeTab === "diagnosis" && <DiagnosisPanel diagnosis={data.diagnosis} onChange={updateDiagnosis} />}
        </main>
      </div>
    </Shell>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent, override?: { email: string; password: string }) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const credentials = override || { email, password };
    if (![OWNER_EMAIL, VIEWER_EMAIL].includes(credentials.email.toLowerCase())) {
      setMessage("Acesso restrito ao usuario principal e ao visualizador autorizado.");
      return;
    }
    const result = await supabase.auth.signInWithPassword(credentials);
    setMessage(result.error ? result.error.message : "Login realizado.");
  }
  const enterViewer = async () => {
    if (!supabase) return;
    setMessage("");
    const result = await supabase.auth.signInWithPassword({ email: VIEWER_EMAIL, password: "123456!" });
    setMessage(result.error ? result.error.message : "Login realizado.");
  };
  return (
    <Shell>
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md rounded-md border border-line bg-card p-6 shadow-soft">
          <p className="text-sm font-medium text-leaf">Suzano</p>
          <h1 className="mt-1 text-2xl font-semibold">Plano Gerencia de Suprimentos Corporativo Onboarding</h1>
          <div className="mt-5 grid gap-2 rounded-md border border-line p-2">
            <button type="button" className="rounded bg-ink px-3 py-2 text-sm text-white">Editor Wagner</button>
            <button type="button" onClick={enterViewer} className="rounded border border-line px-3 py-2 text-sm">Entrar como visualizador</button>
          </div>
          <div className="mt-5 space-y-3">
            <input className="field" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="focus-ring w-full rounded-md bg-leaf px-4 py-2 font-semibold text-white">Entrar como editor</button>
          </div>
          {message && <p className="mt-4 text-sm text-coral">{message}</p>}
        </form>
      </div>
    </Shell>
  );
}

function Dashboard({ dayState, data, metrics }: {
  dayState: {
    elapsed: number;
    phase: string;
    timeProgress: number;
    startDate: Date;
    endDate: Date;
    checkpoints: Array<{ label: string; day: number; date: Date }>;
  };
  data: AppData;
  metrics: ReturnType<typeof calculateMetrics>;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Metric title="Dia atual" value={`${dayState.elapsed}/100`} note={dayState.phase} />
        <Metric title="Progresso do tempo" value={percent(dayState.timeProgress)} note={`${formatDate(dayState.startDate)} a ${formatDate(dayState.endDate)}`} />
        <Metric title="Progresso geral" value={percent(metrics.overall)} note="6 frentes" />
        <Metric title="Pessoas" value={`${metrics.peopleDone}/${data.people.length}`} note="pessoas conversadas" />
        <Metric title="Handover Thais" value={`${metrics.handoverDone}/${data.handoverChecklist.length}`} note="pontos concluidos" />
        <Metric title="Sessoes de Coaching" value={`${metrics.coachingDone}/6`} note="sessoes realizadas" />
        <Metric title="Stakeholders" value={`${metrics.stakeholdersDone}/${data.stakeholders.length}`} note="conversados" />
        <Metric title="Fornecedores" value={`${metrics.suppliersDone}/${metrics.supplierGoal}`} note="fichas preenchidas" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <Panel title="Countdown dos 100 dias">
          <ProgressRow label={`Tempo decorrido (${dayState.elapsed}/100 dias)`} value={dayState.timeProgress} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ReadOnly label="Data de inicio" value={formatDate(dayState.startDate)} />
            <ReadOnly label="Data de encerramento" value={formatDate(dayState.endDate)} />
          </div>
        </Panel>
        <Panel title="Marcos e checkpoints">
          <div className="grid gap-2 sm:grid-cols-2">
            {dayState.checkpoints.map((checkpoint) => (
              <div key={checkpoint.day} className={`rounded-md border p-3 ${dayState.elapsed >= checkpoint.day ? "border-leaf/40 bg-leaf/10" : "border-line bg-surface"}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{checkpoint.label}</strong>
                  <Badge tone={dayState.elapsed >= checkpoint.day ? "ok" : "warn"}>Dia {checkpoint.day}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{formatDate(checkpoint.date)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric title="Spend PB'26 categorias" value={money(metrics.categorySpend)} note={`${data.categories.length} categorias carregadas`} />
        <Metric title="Spend fornecedores" value={money(metrics.supplierSpend)} note={`${data.suppliers.length} fornecedores carregados`} />
        <Metric title="Top 20 fornecedores" value={money(metrics.topSupplierSpend)} note="maiores da planilha" />
        <Metric title="Categorias sem dono" value={String(metrics.unassignedCategories)} note="controle de cobertura do time" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Panel title="Calculo de progresso">
          <ProgressRow label={`Pessoas do time (${metrics.peopleDone}/${data.people.length})`} value={metrics.peopleProgress} />
          <ProgressRow label={`Handover Thais (${metrics.handoverDone}/${data.handoverChecklist.length})`} value={metrics.handoverProgress} />
          <ProgressRow label={`Coaching (${metrics.coachingDone}/6)`} value={metrics.coachingProgress} />
          <ProgressRow label={`Stakeholders (${metrics.stakeholdersDone}/${data.stakeholders.length})`} value={metrics.stakeholderProgress} />
          <ProgressRow label={`Fornecedores (${metrics.suppliersDone}/${metrics.supplierGoal})`} value={metrics.supplierProgress} />
          <ProgressRow label={`Pilares (${metrics.pillarsDone}/${data.methodologyPillars.length})`} value={metrics.pillarProgress} />
        </Panel>
        <Panel title="Uso do sistema">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric title="Acessos" value={String(data.userPreferences.accessCount || 0)} note="contador de acessos" />
            <Metric title="Alteracoes" value={String(data.userPreferences.mutationCount || 0)} note="vezes que mexeu" />
          </div>
          <p className="mt-3 text-sm text-muted">Ultimo acesso: {formatDateTime(data.userPreferences.lastAccessedAt)}</p>
          <p className="text-sm text-muted">Acesso anterior: {formatDateTime(data.userPreferences.previousAccessedAt)}</p>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Categorias ainda nao atribuidas">
          <div className="flex flex-wrap gap-2">
            {metrics.unassignedCategoryNames.slice(0, 45).map((name) => <span key={name} className="rounded border border-line bg-surface px-2 py-1 text-xs">{name}</span>)}
          </div>
        </Panel>
        <Panel title="Pessoas x quantidade de categorias">
          <RankedRows items={data.people.map((person) => [person.name, `${person.categoryIds.length} categorias`])} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Spend Categorias - referencia PB'26">
          <Metric title="Total PB'26" value={money(metrics.categorySpend)} note={`${data.categories.length} categorias`} />
          <RankedRows items={data.categories.slice(0, 20).map((item) => [item.name, money(item.spend)])} />
        </Panel>
        <Panel title="Spend Fornecedores - desembolso 2025 + 2026 YTD">
          <Metric title="Total fornecedores" value={money(metrics.supplierSpend)} note={`${data.suppliers.length} fornecedores`} />
          <RankedRows items={data.suppliers.slice(0, 20).map((item) => [item.name, money(item.spend)])} />
        </Panel>
      </section>
    </div>
  );
}

function PillarsPanel({ rows, onChange, canEdit }: { rows: MethodologyPillar[]; onChange: (row: MethodologyPillar) => void; canEdit: boolean }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) {
      setDraft(row);
      setEditing(false);
      setSaved(false);
    }
  }, [row?.id]);
  if (!row) return null;
  const current = draft || row;
  const save = () => {
    onChange(current);
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!window.confirm("Tem certeza que deseja limpar tudo deste pilar?")) return;
    setDraft({ ...current, status: "Nao iniciado", decision: "", decisionDate: "", evidence: "", comments: "", nextSteps: "" });
    setSaved(false);
  };
  return (
    <Panel title="Pilares dos 100 dias">
      <CardLayout
        rows={rows}
        selected={row.id}
        onSelect={setSelected}
        renderCard={(item) => <Summary title={item.name} subtitle={item.status} meta={item.decision || "Sem decisao registrada"} />}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ReadOnly label="O que e" value={current.explanation} />
          <ReadOnly label="Esperado na etapa" value={current.expected} />
          <Select disabled={!editing} label="Status" value={current.status} onChange={(value) => setDraft({ ...current, status: value as MethodologyPillar["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Em risco", "Concluido"]} />
          <Field disabled={!editing} label="Data da decisao" type="date" value={current.decisionDate} onChange={(value) => setDraft({ ...current, decisionDate: value })} />
          <Field disabled={!editing} label="Principais decisoes" area value={current.decision} onChange={(value) => setDraft({ ...current, decision: value })} />
          <Field disabled={!editing} label="Evidencias" area value={current.evidence} onChange={(value) => setDraft({ ...current, evidence: value })} />
          <Field disabled={!editing} label="Proximos passos" area value={current.nextSteps} onChange={(value) => setDraft({ ...current, nextSteps: value })} />
          <Field disabled={!editing} label="Comentarios" area value={current.comments} onChange={(value) => setDraft({ ...current, comments: value })} />
        </div>
        <EditActions canEdit={canEdit} editing={editing} saved={saved} updatedAt={row.updatedAt} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
      </CardLayout>
    </Panel>
  );
}

function PeoplePanel({ rows, categories, onChange, canEdit }: { rows: Person[]; categories: Category[]; onChange: (row: Person) => void; canEdit: boolean }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) {
      setDraft(row);
      setEditing(false);
      setSaved(false);
    }
  }, [row?.id]);
  if (!row) return null;
  const current = draft || row;
  const assigned = new Set(rows.flatMap((person) => person.id === current.id ? current.categoryIds : person.categoryIds));
  const unassigned = categories.filter((category) => !assigned.has(category.id));
  const matrixRows = rows.map((person) => {
    const categoryIds = person.id === current.id ? current.categoryIds : person.categoryIds;
    return [person.name, String(categoryIds.length), money(spendFor(categories, categoryIds))];
  });
  const save = () => {
    onChange({ ...current, portfolios: labelsFor(categories, current.categoryIds).join(", ") });
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!window.confirm("Tem certeza que deseja limpar tudo desta pessoa? Nome e cargo serao preservados.")) return;
    setDraft({
      ...current,
      cluster: "A definir",
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
    });
    setSaved(false);
  };
  return (
    <Panel title="Pessoas do time">
      <CardLayout rows={rows} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.name} subtitle={item.role} meta={item.firstOneOnOne ? "1:1 realizada" : "0/1 conversa"} />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field disabled={!editing} label="Nome" value={current.name} onChange={(value) => setDraft({ ...current, name: value })} />
          <Field disabled={!editing} label="Cargo" value={current.role} onChange={(value) => setDraft({ ...current, role: value })} />
          <Field disabled={!editing} label="Data da 1:1" type="date" value={current.firstOneOnOne} onChange={(value) => setDraft({ ...current, firstOneOnOne: value })} />
          <MultiSelect disabled={!editing} label="Categorias atendidas" value={current.categoryIds} options={categories} onChange={(value) => setDraft({ ...current, categoryIds: value, portfolios: labelsFor(categories, value).join(", ") })} />
          <Select disabled={!editing} label="Avaliacao Sommos" value={current.sommos} onChange={(value) => setDraft({ ...current, sommos: value })} options={["", "Abaixo do esperado", "Em desenvolvimento", "Dentro do esperado", "Acima do esperado", "Referencia"]} />
          <Field disabled={!editing} label="Potencial" value={current.potentialNotes} onChange={(value) => setDraft({ ...current, potentialNotes: value })} />
          <Slider disabled={!editing} label="Hard skills para a cadeira" value={current.hardSkillsScore} onChange={(value) => setDraft({ ...current, hardSkillsScore: value })} />
          <Slider disabled={!editing} label="Soft skills para a cadeira" value={current.softSkillsScore} onChange={(value) => setDraft({ ...current, softSkillsScore: value })} />
          <Field disabled={!editing} label="Notas de hard skills" area value={current.hardSkills} onChange={(value) => setDraft({ ...current, hardSkills: value })} />
          <Field disabled={!editing} label="Notas de soft skills" area value={current.softSkills} onChange={(value) => setDraft({ ...current, softSkills: value })} />
          <Field disabled={!editing} label="Pontos fortes" area value={current.strengths} onChange={(value) => setDraft({ ...current, strengths: value })} />
          <Field disabled={!editing} label="Pontos de atencao" area value={current.attentionPoints} onChange={(value) => setDraft({ ...current, attentionPoints: value })} />
          <Field disabled={!editing} label="Riscos" area value={current.risks} onChange={(value) => setDraft({ ...current, risks: value })} />
          <Field disabled={!editing} label="Plano de desenvolvimento" area value={current.development} onChange={(value) => setDraft({ ...current, development: value })} />
          <Field disabled={!editing} label="Anotacoes" area value={current.notes} onChange={(value) => setDraft({ ...current, notes: value })} />
        </div>
        <EditActions canEdit={canEdit} editing={editing} saved={saved} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
        <ActionBar>
          <button className="btn" onClick={() => downloadIcs(`1:1 - ${current.name}`, current.firstOneOnOne, current.notes)}><CalendarPlus size={16} /> Exportar .ics</button>
        </ActionBar>
      </CardLayout>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Panel title="Categorias sem responsavel">
          <Metric title="Nao atribuidas" value={String(unassigned.length)} note={`${categories.length} categorias na base`} />
          <div className="mt-3 flex flex-wrap gap-2">
            {unassigned.slice(0, 60).map((category) => <span key={category.id} className="rounded border border-line bg-surface px-2 py-1 text-xs">{category.name}</span>)}
          </div>
        </Panel>
        <Panel title="Matriz pessoa x categorias">
          <RankedRows items={matrixRows} />
        </Panel>
      </div>
    </Panel>
  );
}

function CoachingPanel({ rows, onChange, canEdit }: { rows: CoachingSession[]; onChange: (row: CoachingSession) => void; canEdit: boolean }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) {
      setDraft(row);
      setEditing(false);
      setSaved(false);
    }
  }, [row?.id]);
  if (!row) return null;
  const current = draft || row;
  const save = () => {
    onChange(current);
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!window.confirm("Tem certeza que deseja limpar todos os registros desta sessao de coaching?")) return;
    setDraft({
      ...current,
      sessionDate: "",
      topics: "",
      insights: "",
      agreedActions: "",
      actionStatus: "Aberta",
      prepThemes: "",
      prepDoubts: "",
      prepChallenges: "",
      prepSituations: ""
    });
    setSaved(false);
  };
  return (
    <Panel title="Coaching" action={<Badge>{rows.filter((item) => item.sessionDate).length}/6 sessoes realizadas</Badge>}>
      <CardLayout
        rows={rows}
        selected={row.id}
        onSelect={setSelected}
        renderCard={(item) => (
          <Summary
            title={`Sessao ${item.sessionNumber}`}
            subtitle={item.sessionDate ? formatDate(parseLocalDate(item.sessionDate)) : "Data ainda nao registrada"}
            meta={item.sessionDate ? item.actionStatus : "Preparacao aberta"}
          />
        )}
      >
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
              <CalendarRange size={18} className="text-leaf" />
              <h3 className="font-semibold">A. Sessao realizada</h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <ReadOnly label="Sessao" value={`${current.sessionNumber} de 6`} />
              <Field disabled={!editing} label="Data" type="date" value={current.sessionDate} onChange={(value) => setDraft({ ...current, sessionDate: value })} />
              <Field disabled={!editing} label="Principais temas debatidos" area value={current.topics} onChange={(value) => setDraft({ ...current, topics: value })} />
              <Field disabled={!editing} label="Insights e aprendizados" area value={current.insights} onChange={(value) => setDraft({ ...current, insights: value })} />
              <Field disabled={!editing} label="Acoes acordadas" area value={current.agreedActions} onChange={(value) => setDraft({ ...current, agreedActions: value })} />
              <Select disabled={!editing} label="Status das acoes" value={current.actionStatus} onChange={(value) => setDraft({ ...current, actionStatus: value as CoachingSession["actionStatus"] })} options={["Aberta", "Em andamento", "Concluida"]} />
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
              <NotebookPen size={18} className="text-leaf" />
              <h3 className="font-semibold">B. Preparacao para a proxima sessao</h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field disabled={!editing} label="Temas para levar a coach" area value={current.prepThemes} onChange={(value) => setDraft({ ...current, prepThemes: value })} />
              <Field disabled={!editing} label="Duvidas" area value={current.prepDoubts} onChange={(value) => setDraft({ ...current, prepDoubts: value })} />
              <Field disabled={!editing} label="Desafios atuais" area value={current.prepChallenges} onChange={(value) => setDraft({ ...current, prepChallenges: value })} />
              <Field disabled={!editing} label="Situacoes especificas para discutir" area value={current.prepSituations} onChange={(value) => setDraft({ ...current, prepSituations: value })} />
            </div>
          </section>
        </div>
        <EditActions canEdit={canEdit} editing={editing} saved={saved} updatedAt={row.updatedAt} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
        <ActionBar>
          <button className="btn" onClick={() => downloadIcs(`Coaching - Sessao ${current.sessionNumber}`, current.sessionDate, current.topics || current.prepThemes)}><CalendarPlus size={16} /> Exportar .ics</button>
        </ActionBar>
      </CardLayout>
    </Panel>
  );
}

const clientRoutineAreas: ClientRoutine["area"][] = ["Tecnologia", "Facilities / SSQV", "Marketing", "Rotinas Internas", "Outras"];

function ClientRoutinesPanel({
  rows,
  addRoutine,
  deleteRoutine,
  onChange,
  canEdit
}: {
  rows: ClientRoutine[];
  addRoutine: (area: ClientRoutine["area"]) => Promise<string>;
  deleteRoutine: (id: string) => void;
  onChange: (row: ClientRoutine) => void;
  canEdit: boolean;
}) {
  const [area, setArea] = useState<ClientRoutine["area"]>("Tecnologia");
  const filtered = rows.filter((item) => item.area === area);
  const [selected, setSelected] = useState(filtered[0]?.id || "");
  const row = filtered.find((item) => item.id === selected) || filtered[0];
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const next = rows.filter((item) => item.area === area);
    if (!next.some((item) => item.id === selected)) setSelected(next[0]?.id || "");
  }, [area, rows, selected]);
  useEffect(() => {
    setDraft(row);
    setEditing(false);
    setSaved(false);
  }, [row?.id]);
  const createRoutine = async () => {
    const id = await addRoutine(area);
    if (id) setSelected(id);
  };
  const save = () => {
    if (!draft) return;
    onChange(draft);
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!draft || !window.confirm("Tem certeza que deseja limpar os detalhes desta rotina? Nome e area serao preservados.")) return;
    setDraft({ ...draft, objective: "", frequency: "", currentOwner: "", participants: "", status: "Ativa", perceptions: "", improvements: "", futureAdjustments: "" });
    setSaved(false);
  };
  return (
    <Panel title="Rotinas com Areas Clientes" action={canEdit ? <button className="btn" onClick={createRoutine}><Plus size={16} /> Nova rotina</button> : <Badge tone="warn">Somente leitura</Badge>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {clientRoutineAreas.map((item) => (
          <button key={item} onClick={() => setArea(item)} className={`rounded-md border px-3 py-2 text-sm ${area === item ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
            {item} <span className="ml-1 opacity-70">({rows.filter((rowItem) => rowItem.area === item).length})</span>
          </button>
        ))}
      </div>
      {!row || !draft ? (
        <div className="rounded-md border border-dashed border-line bg-surface p-8 text-center">
          <Waypoints className="mx-auto text-muted" size={30} />
          <h3 className="mt-3 font-semibold">Nenhuma rotina cadastrada em {area}</h3>
          <p className="mt-1 text-sm text-muted">Use o botao Nova rotina para iniciar o mapeamento desta area.</p>
        </div>
      ) : (
        <CardLayout rows={filtered} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.name} subtitle={`${item.frequency || "Frequencia a definir"} | ${item.status}`} meta={item.currentOwner || "Responsavel a definir"} />}>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field disabled={!editing} label="Nome da rotina" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            <Select disabled={!editing} label="Subsecao" value={draft.area} onChange={(value) => setDraft({ ...draft, area: value as ClientRoutine["area"] })} options={clientRoutineAreas} />
            <Field disabled={!editing} label="Objetivo da rotina" area value={draft.objective} onChange={(value) => setDraft({ ...draft, objective: value })} />
            <Field disabled={!editing} label="Frequencia" value={draft.frequency} onChange={(value) => setDraft({ ...draft, frequency: value })} />
            <Field disabled={!editing} label="Responsavel atual" value={draft.currentOwner} onChange={(value) => setDraft({ ...draft, currentOwner: value })} />
            <Field disabled={!editing} label="Participantes" area value={draft.participants} onChange={(value) => setDraft({ ...draft, participants: value })} />
            <Select disabled={!editing} label="Status" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value as ClientRoutine["status"] })} options={["Ativa", "Revisar", "Descontinuar"]} />
            <Field disabled={!editing} label="Minhas percepcoes" area value={draft.perceptions} onChange={(value) => setDraft({ ...draft, perceptions: value })} />
            <Field disabled={!editing} label="Pontos de melhoria identificados" area value={draft.improvements} onChange={(value) => setDraft({ ...draft, improvements: value })} />
            <Field disabled={!editing} label="Ajustes que pretendo implementar" area value={draft.futureAdjustments} onChange={(value) => setDraft({ ...draft, futureAdjustments: value })} />
          </div>
          <EditActions canEdit={canEdit} editing={editing} saved={saved} updatedAt={row.updatedAt} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
          {canEdit && <ActionBar><button className="btn" onClick={() => { if (window.confirm("Excluir esta rotina permanentemente?")) deleteRoutine(row.id); }}><Trash2 size={16} /> Excluir rotina</button></ActionBar>}
        </CardLayout>
      )}
    </Panel>
  );
}

function HandoverPanel({ rows, onChange, canEdit }: { rows: HandoverItem[]; onChange: (row: HandoverItem) => void; canEdit: boolean }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const [sortByCluster, setSortByCluster] = useState(false);
  const sortedRows = sortByCluster ? [...rows].sort((a, b) => `${a.cluster || handoverCluster(a.item)}-${a.item}`.localeCompare(`${b.cluster || handoverCluster(b.item)}-${b.item}`)) : rows;
  const row = rows.find((item) => item.id === selected) || sortedRows[0];
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) {
      setDraft(row);
      setEditing(false);
      setSaved(false);
    }
  }, [row?.id]);
  if (!row) return null;
  const current = draft || row;
  const clusters = Array.from(new Set(rows.map((item) => item.cluster || handoverCluster(item.item)))).sort();
  const save = () => {
    onChange(current);
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!window.confirm("Tem certeza que deseja limpar tudo deste ponto de handover? Tema e cluster serao preservados.")) return;
    setDraft({ ...current, status: "Nao iniciado", comment: "", owner: "Wagner / Thais", dueDate: "", links: "", attachments: [] });
    setSaved(false);
  };
  return (
    <Panel title="Handover Thais" action={<button className="btn" onClick={() => setSortByCluster((value) => !value)}><ListFilter size={16} /> {sortByCluster ? "Ordem original" : "Ordenar por cluster"}</button>}>
      <CardLayout rows={sortedRows} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.item} subtitle={item.status} meta={item.cluster || handoverCluster(item.item)} />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <ReadOnly label="Tema" value={current.item} />
          <Select disabled={!editing} label="Cluster" value={current.cluster || handoverCluster(current.item)} onChange={(value) => setDraft({ ...current, cluster: value })} options={clusters} />
          <Select disabled={!editing} label="Status" value={current.status} onChange={(value) => setDraft({ ...current, status: value as HandoverItem["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Em risco", "Concluido"]} />
          <Field disabled={!editing} label="Responsaveis" value={current.owner} onChange={(value) => setDraft({ ...current, owner: value })} />
          <Field disabled={!editing} label="Prazo" type="date" value={current.dueDate} onChange={(value) => setDraft({ ...current, dueDate: value })} />
          <Field disabled={!editing} label="Comentarios" area value={current.comment} onChange={(value) => setDraft({ ...current, comment: value })} />
          <Field disabled={!editing} label="Links" area value={current.links} onChange={(value) => setDraft({ ...current, links: value })} />
        </div>
        <AttachmentBox disabled={!editing} row={current} onChange={setDraft} />
        <EditActions canEdit={canEdit} editing={editing} saved={saved} updatedAt={row.updatedAt} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
      </CardLayout>
    </Panel>
  );
}

function OrgPanel({
  canEdit,
  scenarios,
  items,
  people,
  categories,
  addScenario,
  duplicateScenario,
  deleteScenario,
  addItem,
  deleteItem,
  onScenario,
  onItem
}: {
  canEdit: boolean;
  scenarios: OrgScenario[];
  items: OrgScenarioItem[];
  people: Person[];
  categories: Category[];
  addScenario: () => void;
  duplicateScenario: (scenario: OrgScenario) => void;
  deleteScenario: (id: string) => void;
  addItem: (scenarioId: string) => void;
  deleteItem: (id: string) => void;
  onScenario: (row: OrgScenario) => void;
  onItem: (row: OrgScenarioItem) => void;
}) {
  const [selected, setSelected] = useState(scenarios[0]?.id || "");
  const scenario = scenarios.find((item) => item.id === selected) || scenarios[0];
  const scenarioItems = items.filter((item) => item.scenarioId === scenario?.id);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (scenario) {
      setEditing(false);
      setSaved(false);
    }
  }, [scenario?.id]);
  if (!scenario) return null;
  const peopleOptions = people.length ? people : peopleSeed;
  const byPerson = scenarioItems.map((item) => ({ ...item, spendResponsibility: spendFor(categories, item.categoryIds), categoryCount: item.categoryIds.length }));
  const byCluster = Array.from(byPerson.reduce((map, item) => {
    const cluster = item.cluster || "Sem cluster";
    map.set(cluster, [...(map.get(cluster) || []), item]);
    return map;
  }, new Map<string, OrgScenarioItem[]>()).entries());
  const managers = Array.from(new Set(["", ...byPerson.map((item) => item.personName), ...peopleOptions.map((person) => person.name)])).filter((item, index, all) => all.indexOf(item) === index);
  const saveScenario = () => {
    onScenario(scenario);
    setEditing(false);
    setSaved(true);
  };
  const clearScenario = () => {
    if (!window.confirm("Tem certeza que deseja limpar o racional, riscos e decisoes deste cenario? As pessoas serao preservadas.")) return;
    onScenario({ ...scenario, description: "", rationale: "", risks: "", recommendedDecision: "", status: "Mapear" });
    setSaved(true);
  };
  return (
    <Panel title="Estrutura organizacional e simulacao">
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn" onClick={addScenario}><Plus size={16} /> Novo cenario</button>
        <button className="btn" onClick={() => duplicateScenario(scenario)}><Copy size={16} /> Duplicar</button>
        <button className="btn" onClick={() => deleteScenario(scenario.id)}><Trash2 size={16} /> Excluir</button>
      </div>
      <Select label="Cenario" value={scenario.id} onChange={setSelected} options={scenarios.map((item) => item.id)} labels={Object.fromEntries(scenarios.map((item) => [item.id, item.name]))} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Field disabled={!editing} label="Nome do cenario" value={scenario.name} onChange={(value) => onScenario({ ...scenario, name: value })} />
        <Select disabled={!editing} label="Status" value={scenario.status} onChange={(value) => onScenario({ ...scenario, status: value as OrgScenario["status"] })} options={["Mapear", "Iniciado", "Em andamento", "Concluido"]} />
        <Field disabled={!editing} label="Racional da mudanca" area value={scenario.rationale} onChange={(value) => onScenario({ ...scenario, rationale: value })} />
        <Field disabled={!editing} label="Riscos" area value={scenario.risks} onChange={(value) => onScenario({ ...scenario, risks: value })} />
        <Field disabled={!editing} label="Decisoes" area value={scenario.recommendedDecision} onChange={(value) => onScenario({ ...scenario, recommendedDecision: value })} />
      </div>
      <EditActions canEdit={canEdit} editing={editing} saved={saved} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={saveScenario} onClear={clearScenario} />
      <div className="mt-5 flex justify-between">
        <h3 className="font-semibold">Pessoas, reportes, clusters e categorias</h3>
        <button className="btn" onClick={() => addItem(scenario.id)}>Adicionar posicao</button>
      </div>
      <div className="mt-3 grid gap-3">
        {byPerson.map((item) => (
          <Card key={item.id}>
            <div className="grid gap-3 lg:grid-cols-2">
              <Select label="Pessoa" value={item.personName} onChange={(value) => {
                const person = peopleOptions.find((option) => option.name === value);
                onItem({ ...item, personName: value, role: person?.role || item.role });
              }} options={peopleOptions.map((person) => person.name)} />
              <Field label="Cargo" value={item.role} onChange={(value) => onItem({ ...item, role: value })} />
              <Field label="Cluster" value={item.cluster} onChange={(value) => onItem({ ...item, cluster: value })} />
              <Select label="Reporte direto" value={item.manager} onChange={(value) => onItem({ ...item, manager: value })} options={managers} />
              <MultiSelect label="Categorias sob responsabilidade" value={item.categoryIds} options={categories} onChange={(value) => onItem({ ...item, categoryIds: value, spendResponsibility: spendFor(categories, value) })} />
              <ReadOnly label="Resumo da carteira" value={`${item.categoryCount} categorias atribuidas`} />
              <Field label="Observacoes" area value={item.notes} onChange={(value) => onItem({ ...item, notes: value })} />
            </div>
            <ActionBar>
              <button className="btn" onClick={() => onItem(item)}><Save size={16} /> Salvar posicao</button>
              <button className="btn" onClick={() => deleteItem(item.id)}><Trash2 size={16} /> Excluir posicao</button>
            </ActionBar>
          </Card>
        ))}
      </div>
      <div className="mt-5">
        <Panel title="Organograma do cenario">
          <div className="grid gap-3 lg:grid-cols-2">
            {byCluster.map(([cluster, clusterItems]) => (
              <div key={cluster} className="rounded-md border border-line bg-surface p-3">
                <h3 className="font-semibold">{cluster}</h3>
                <div className="mt-3 grid gap-2">
                  {clusterItems.map((item) => (
                    <div key={item.id} className="rounded-md border border-line bg-card px-3 py-2 text-sm">
                      <strong className="block">{item.personName}</strong>
                      <span className="text-muted">{item.role || "Cargo a definir"} | Reporte: {item.manager || "A definir"}</span>
                      <span className="mt-1 block text-leaf">{item.categoryIds.length} categorias</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Panel>
  );
}

function StakeholderPanel({ rows, addRow, deleteRow, onChange }: { rows: Stakeholder[]; addRow: () => void; deleteRow: (id: string) => void; onChange: (row: Stakeholder) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <Panel title="Stakeholders" action={<button className="btn" onClick={addRow}><Plus size={16} /> Novo stakeholder</button>}>
      <CardLayout rows={rows} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.name} subtitle={`${item.area} | ${item.criticality}`} meta={item.conversationDate ? "Conversa registrada" : "Pendente"} />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Nome" value={row.name} onChange={(value) => onChange({ ...row, name: value })} />
          <Field label="Area" value={row.area} onChange={(value) => onChange({ ...row, area: value })} />
          <Field label="Cargo" value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
          <Select label="Criticidade" value={row.criticality} onChange={(value) => onChange({ ...row, criticality: value as Stakeholder["criticality"] })} options={["Alta", "Media", "Baixa"]} />
          <Select label="Influencia" value={row.influence} onChange={(value) => onChange({ ...row, influence: value as Stakeholder["influence"] })} options={["Alta", "Media", "Baixa"]} />
          <Field label="Data da conversa" type="date" value={row.conversationDate} onChange={(value) => onChange({ ...row, conversationDate: value, firstConversation: value })} />
          <Field label="Status da interacao" value={row.interactionStatus} onChange={(value) => onChange({ ...row, interactionStatus: value })} />
          <Field label="Principais dores" area value={row.pains} onChange={(value) => onChange({ ...row, pains: value })} />
          <Field label="Expectativas" area value={row.expectations} onChange={(value) => onChange({ ...row, expectations: value })} />
          <Field label="Oportunidades" area value={row.opportunities} onChange={(value) => onChange({ ...row, opportunities: value })} />
          <Field label="Proximos passos" area value={row.nextSteps} onChange={(value) => onChange({ ...row, nextSteps: value })} />
          <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
        </div>
        <ActionBar>
          <button className="btn" onClick={() => onChange(row)}>Salvar</button>
          <button className="btn" onClick={() => downloadIcs(`Stakeholder - ${row.name}`, row.conversationDate, row.nextSteps)}><CalendarPlus size={16} /> Exportar .ics</button>
          <button className="btn" onClick={() => deleteRow(row.id)}><Trash2 size={16} /> Excluir</button>
        </ActionBar>
      </CardLayout>
    </Panel>
  );
}

function SupplierPanel({ rows, onChange, canEdit }: { rows: Supplier[]; onChange: (row: Supplier) => void; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const sourceRows = rows.length ? rows : suppliersInitial;
  const visible = sourceRows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.relatedArea.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState(sourceRows[0]?.id || "");
  const row = sourceRows.find((item) => item.id === selected) || visible[0] || sourceRows[0];
  const touchedSuppliers = sourceRows.filter(isSupplierScoped);
  const [draft, setDraft] = useState(row);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) {
      setDraft(row);
      setEditing(false);
      setSaved(false);
    }
  }, [row?.id]);
  if (!row) return null;
  const current = draft || row;
  const save = () => {
    onChange(current);
    setEditing(false);
    setSaved(true);
  };
  const clear = () => {
    if (!window.confirm("Tem certeza que deseja limpar tudo desta ficha de fornecedor? Nome, categoria e spend serao preservados.")) return;
    setDraft({ ...current, relatedArea: "", criticality: "Media", contact: "", phone: "", email: "", firstInteraction: "", nextInteraction: "", relationshipStatus: "Mapear", meetings: 0, opportunities: "", risks: "", actionPlan: "", conversationDate: "", interactionStatus: "Nao iniciado", nextSteps: "", notes: "" });
    setSaved(false);
  };
  return (
    <Panel title="Fornecedores">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar fornecedor ou area" />
          <Select label="Selecionar fornecedor" value={row.id} onChange={setSelected} options={visible.map((item) => item.id)} labels={Object.fromEntries(visible.map((item) => [item.id, `${item.name} | ${money(item.spend)}`]))} />
          <Panel title="Top 20 fornecedores">
            <SupplierRows rows={sourceRows.slice(0, 20)} onSelect={setSelected} selected={row.id} />
          </Panel>
          <Panel title="Fornecedores preenchidos para falar">
            {touchedSuppliers.length ? <SupplierRows rows={touchedSuppliers} onSelect={setSelected} selected={row.id} /> : <p className="text-sm text-muted">Nenhum fornecedor preenchido ainda.</p>}
          </Panel>
        </div>
        <Card>
          <div className="grid gap-3 lg:grid-cols-2">
            <ReadOnly label="Fornecedor" value={current.name} />
            <ReadOnly label="Spend" value={money(current.spend)} />
            <Select disabled={!editing} label="Area relacionada" value={current.relatedArea} onChange={(value) => setDraft({ ...current, relatedArea: value })} options={["", "RH", "TI", "Juridico", "Marketing", "Financas", "Facilities", "Operacoes"]} />
            <Select disabled={!editing} label="Criticidade" value={current.criticality} onChange={(value) => setDraft({ ...current, criticality: value as Supplier["criticality"] })} options={["Alta", "Media", "Baixa"]} />
            <Field disabled={!editing} label="Data da conversa" type="date" value={current.conversationDate} onChange={(value) => setDraft({ ...current, conversationDate: value, firstInteraction: value })} />
            <Field disabled={!editing} label="Status da interacao" value={current.interactionStatus} onChange={(value) => setDraft({ ...current, interactionStatus: value, relationshipStatus: value })} />
            <Field disabled={!editing} label="Contato principal" value={current.contact} onChange={(value) => setDraft({ ...current, contact: value })} />
            <Field disabled={!editing} label="Telefone" value={current.phone} onChange={(value) => setDraft({ ...current, phone: value })} />
            <Field disabled={!editing} label="E-mail" value={current.email} onChange={(value) => setDraft({ ...current, email: value })} />
            <Field disabled={!editing} label="Oportunidades" area value={current.opportunities} onChange={(value) => setDraft({ ...current, opportunities: value })} />
            <Field disabled={!editing} label="Riscos" area value={current.risks} onChange={(value) => setDraft({ ...current, risks: value })} />
            <Field disabled={!editing} label="Proximos passos" area value={current.nextSteps} onChange={(value) => setDraft({ ...current, nextSteps: value, actionPlan: value })} />
            <Field disabled={!editing} label="Anotacoes" area value={current.notes} onChange={(value) => setDraft({ ...current, notes: value })} />
          </div>
          <EditActions canEdit={canEdit} editing={editing} saved={saved} onEdit={() => setEditing(true)} onCancel={() => { setDraft(row); setEditing(false); }} onSave={save} onClear={clear} />
          <ActionBar>
            <button className="btn" onClick={() => openWhatsApp(current.phone, `Ola, aqui e Wagner da Suzano. Podemos falar sobre ${current.name}?`)}>WhatsApp</button>
            <button className="btn" onClick={() => downloadIcs(`Fornecedor - ${current.name}`, current.conversationDate, current.nextSteps || current.notes)}><CalendarPlus size={16} /> Exportar .ics</button>
          </ActionBar>
        </Card>
      </div>
    </Panel>
  );
}

function DiagnosisPanel({ diagnosis, onChange }: { diagnosis: Diagnosis; onChange: (diagnosis: Diagnosis) => void }) {
  const updatedAt = (diagnosis as unknown as { updatedAt?: string }).updatedAt || "";
  return (
    <Panel title="Diagnostico inicial">
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(diagnosis).filter(([key]) => key !== "id" && key !== "updatedAt").map(([key, value]) => (
          <Field key={key} label={key} area value={String(value)} onChange={(next) => onChange({ ...diagnosis, [key]: next })} />
        ))}
      </div>
      <SaveBar updatedAt={updatedAt} onSave={() => onChange(diagnosis)} />
    </Panel>
  );
}

function CardLayout<T extends { id: string }>({ rows, selected, onSelect, renderCard, children }: { rows: T[]; selected: string; onSelect: (id: string) => void; renderCard: (row: T) => ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[310px_1fr]">
      <div className="grid max-h-[72vh] gap-2 overflow-auto pr-1">
        {rows.map((row) => (
          <button key={row.id} className={`rounded-md border p-3 text-left ${selected === row.id ? "border-leaf bg-leaf/10" : "border-line bg-surface"}`} onClick={() => onSelect(row.id)}>
            {renderCard(row)}
          </button>
        ))}
      </div>
      <Card>{children}</Card>
    </div>
  );
}

function Summary({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
  return (
    <div>
      <strong className="block text-sm">{title}</strong>
      <span className="mt-1 block text-xs text-muted">{subtitle}</span>
      <span className="mt-2 inline-block rounded border border-line px-2 py-1 text-xs">{meta}</span>
    </div>
  );
}

function AttachmentBox({ row, onChange, disabled }: { row: HandoverItem; onChange: (row: HandoverItem) => void; disabled?: boolean }) {
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    const nextFiles = await Promise.all(Array.from(files).map(readFileAttachment));
    onChange({ ...row, attachments: [...row.attachments, ...nextFiles] });
  }
  return (
    <div className="mt-4 rounded-md border border-line bg-card p-3">
      <label className="btn cursor-pointer">
        <Paperclip size={16} /> Anexar arquivos
        <input className="hidden" disabled={disabled} type="file" multiple onChange={(event) => attach(event.target.files)} />
      </label>
      <div className="mt-3 grid gap-2">
        {row.attachments.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm">
            <span>{file.name}</span>
            <button className="btn" onClick={() => downloadAttachment(file)}>Baixar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, area, type = "text", disabled }: { label?: string; value: string; onChange: (value: string) => void; area?: boolean; type?: string; disabled?: boolean }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      {area ? <textarea className="field min-h-24 disabled:opacity-70" disabled={disabled} value={value || ""} onChange={(event) => onChange(event.target.value)} /> : <input className="field disabled:opacity-70" disabled={disabled} type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function Select({ label, value, onChange, options, labels, disabled }: { label?: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string>; disabled?: boolean }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      <select className="field disabled:opacity-70" disabled={disabled} value={value || options[0] || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] || option}</option>)}
      </select>
    </label>
  );
}

function MultiSelect({ label, value, options, onChange, disabled }: { label: string; value: string[]; options: Category[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select className="field min-h-32 disabled:opacity-70" disabled={disabled} multiple value={value} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name} | {money(option.spend)}</option>)}
      </select>
    </label>
  );
}

function Slider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="rounded-md border border-line bg-paper px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">1 baixa aderencia</span>
          <strong className="rounded border border-line px-2 py-1">{value || 3}</strong>
          <span className="text-right text-muted">5 supera esperado</span>
        </div>
        <input className="w-full accent-leaf disabled:opacity-70" disabled={disabled} type="range" min="1" max="5" step="1" value={value || 3} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </label>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-card px-3 py-2">
      <Search size={17} />
      <input className="w-full bg-transparent outline-none" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SaveBar({ updatedAt, onSave }: { updatedAt?: string; onSave: () => void }) {
  return (
    <ActionBar>
      <button className="btn" onClick={onSave}><Save size={16} /> Salvar</button>
      <span className="self-center text-sm text-muted">Ultima atualizacao: {formatDateTime(updatedAt || "")}</span>
    </ActionBar>
  );
}

function EditActions({
  canEdit = true,
  editing,
  saved,
  updatedAt,
  onEdit,
  onCancel,
  onSave,
  onClear
}: {
  canEdit?: boolean;
  editing: boolean;
  saved: boolean;
  updatedAt?: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onClear: () => void;
}) {
  if (!canEdit) {
    return (
      <ActionBar>
        <Badge tone="warn">Somente leitura</Badge>
        <span className="self-center text-sm text-muted">Ultima atualizacao: {formatDateTime(updatedAt || "")}</span>
      </ActionBar>
    );
  }
  return (
    <ActionBar>
      {!editing ? (
        <button className="btn" onClick={onEdit}><Edit3 size={16} /> Editar</button>
      ) : (
        <>
          <button className="btn" onClick={onSave}><Save size={16} /> Salvar</button>
          <button className="btn" onClick={onClear}><Trash2 size={16} /> Limpar tudo</button>
          <button className="btn" onClick={onCancel}>Cancelar</button>
        </>
      )}
      {saved && <Badge>Salvo</Badge>}
      <span className="self-center text-sm text-muted">Ultima atualizacao: {formatDateTime(updatedAt || "")}</span>
    </ActionBar>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm">{value || "A preencher"}</div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-paper text-ink">{children}</div>;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-card p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <article className="rounded-md border border-line bg-surface p-4">{children}</article>;
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-line bg-card p-4">
      <p className="text-sm text-muted">{title}</p>
      <strong className="mt-2 block text-2xl">{value}</strong>
      <span className="mt-1 block text-sm text-leaf">{note}</span>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><strong>{percent(value)}</strong></div>
      <div className="h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-leaf" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}

function RankedRows({ items }: { items: string[][] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map(([name, value], index) => (
        <div key={`${name}-${index}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm">
          <span className="font-semibold text-leaf">{index + 1}</span>
          <span className="truncate">{name}</span>
          <strong className="text-right">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function SupplierRows({ rows, selected, onSelect }: { rows: Supplier[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="mt-3 space-y-2">
      {rows.map((item, index) => {
        const touched = isSupplierScoped(item);
        return (
          <button
            key={item.id}
            className={`grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
              selected === item.id
                ? "border-leaf bg-leaf/15"
                : touched
                  ? "border-leaf/40 bg-leaf/10"
                  : "border-line bg-surface"
            }`}
            onClick={() => onSelect(item.id)}
          >
            <span className="font-semibold text-leaf">{index + 1}</span>
            <span className="truncate">{item.name}</span>
            <strong className="text-right">{touched ? "Preenchido" : money(item.spend)}</strong>
          </button>
        );
      })}
    </div>
  );
}

function Badge({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "warn" }) {
  return <span className={`rounded-md border px-3 py-2 text-sm ${tone === "warn" ? "border-coral/30 bg-coral/10" : "border-leaf/30 bg-leaf/10"}`}>{children}</span>;
}

function calculateMetrics(data: AppData) {
  const peopleDone = data.people.filter((item) => item.firstOneOnOne).length;
  const handoverDone = data.handoverChecklist.filter((item) => item.status === "Concluido").length;
  const coachingDone = data.coachingSessions.filter((item) => item.sessionDate).length;
  const stakeholdersDone = data.stakeholders.filter((item) => item.conversationDate || item.firstConversation).length;
  const scopedSuppliers = data.suppliers.filter(isSupplierScoped);
  const supplierGoal = Math.max(1, scopedSuppliers.length || Math.min(20, data.suppliers.length));
  const suppliersDone = (scopedSuppliers.length ? scopedSuppliers : data.suppliers.slice(0, supplierGoal)).filter(isSupplierDone).length;
  const pillarsDone = data.methodologyPillars.filter((item) => item.status === "Concluido" || (item.decision && item.evidence)).length;
  const peopleProgress = data.people.length ? peopleDone / data.people.length : 0;
  const handoverProgress = data.handoverChecklist.length ? handoverDone / data.handoverChecklist.length : 0;
  const coachingProgress = coachingDone / 6;
  const stakeholderProgress = data.stakeholders.length ? stakeholdersDone / data.stakeholders.length : 0;
  const supplierProgress = suppliersDone / supplierGoal;
  const pillarProgress = data.methodologyPillars.length ? pillarsDone / data.methodologyPillars.length : 0;
  const assignedCategories = new Set(data.people.flatMap((person) => person.categoryIds || []));
  const unassignedCategoryNames = data.categories.filter((category) => !assignedCategories.has(category.id)).map((category) => category.name);
  return {
    peopleDone,
    handoverDone,
    coachingDone,
    stakeholdersDone,
    suppliersDone,
    supplierGoal,
    pillarsDone,
    peopleProgress,
    handoverProgress,
    coachingProgress,
    stakeholderProgress,
    supplierProgress,
    pillarProgress,
    overall: (peopleProgress + handoverProgress + coachingProgress + stakeholderProgress + supplierProgress + pillarProgress) / 6,
    supplierSpend: data.suppliers.reduce((sum, item) => sum + Number(item.spend || 0), 0),
    topSupplierSpend: data.suppliers.slice(0, 20).reduce((sum, item) => sum + Number(item.spend || 0), 0),
    categorySpend: data.categories.reduce((sum, item) => sum + Number(item.spend || 0), 0),
    unassignedCategories: unassignedCategoryNames.length,
    unassignedCategoryNames
  };
}

function isSupplierScoped(item: Supplier) {
  return Boolean(
    item.contact
      || item.phone
      || item.email
      || item.notes
      || item.nextSteps
      || item.opportunities
      || item.risks
      || (item.interactionStatus && item.interactionStatus !== "Nao iniciado")
  );
}

function isSupplierDone(item: Supplier) {
  return Boolean(item.conversationDate || item.firstInteraction);
}

function labelsFor(categories: Category[], ids: string[]) {
  return ids.map((id) => categories.find((item) => item.id === id)?.name).filter(Boolean) as string[];
}

function handoverCluster(item: string) {
  const seed = handoverChecklistSeed.find((row) => row.item === item);
  if (seed?.cluster) return seed.cluster;
  const lower = item.toLowerCase();
  if (lower.includes("pessoa") || lower.includes("time") || lower.includes("sucessao")) return "Pessoas";
  if (lower.includes("financeira") || lower.includes("quick wins")) return "Gestao financeira da area";
  if (lower.includes("sap")) return "Tecnologia e SAP";
  if (lower.includes("fornecedor") || lower.includes("contrato")) return "Contratos e fornecedores";
  if (lower.includes("stakeholder") || lower.includes("politico")) return "Stakeholders";
  return "Governanca e rotinas";
}

function spendFor(categories: Category[], ids: string[]) {
  return ids.reduce((sum, id) => sum + Number(categories.find((item) => item.id === id)?.spend || 0), 0);
}

function formatDateTime(value: string) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(value);
}

function downloadIcs(title: string, date: string, description: string) {
  if (!date) {
    window.alert("Preencha uma data antes de exportar.");
    return;
  }
  const start = date.replace(/-/g, "") + "T120000Z";
  const end = date.replace(/-/g, "") + "T130000Z";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//First100Days//PT-BR", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@first100days`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description || "")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function openWhatsApp(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    window.alert("Preencha o telefone do fornecedor.");
    return;
  }
  window.open(`https://wa.me/55${digits.startsWith("55") ? digits : `55${digits}`}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function readFileAttachment(file: File) {
  return new Promise<Attachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result), uploadedAt: todayIso() });
    reader.readAsDataURL(file);
  });
}

function downloadAttachment(file: Attachment) {
  const link = document.createElement("a");
  link.href = file.dataUrl;
  link.download = file.name;
  link.click();
}

export default App;
