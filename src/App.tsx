import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Copy,
  GitBranch,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Paperclip,
  Plus,
  Search,
  ShieldAlert,
  Sun,
  Target,
  Trash2,
  Users,
  UserSquare2
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  categoriesInitial,
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

type TabKey = "dashboard" | "pillars" | "people" | "handover" | "org" | "stakeholders" | "suppliers" | "diagnosis";
type CollectionKey =
  | "people"
  | "stakeholders"
  | "suppliers"
  | "categories"
  | "methodologyPillars"
  | "handoverChecklist"
  | "orgScenarios"
  | "orgScenarioItems";

const firstDay = new Date(import.meta.env.VITE_FIRST_DAY || "2026-06-05");

const tabs: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "pillars", label: "Pilares 100 dias", icon: Target },
  { key: "people", label: "Pessoas", icon: Users },
  { key: "handover", label: "Handover Thais", icon: Handshake },
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
  orgScenarios: orgScenariosSeed[0],
  orgScenarioItems: orgScenarioItemsSeed[0]
};

const toSnake = (row: Record<string, unknown>, userId: string) => {
  const mapped: Record<string, unknown> = { user_id: userId };
  Object.entries(row).forEach(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
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

const normalizePerson = (row: Person): Person => ({ ...peopleSeed[0], ...row, categoryIds: asArray(row.categoryIds), potentialNotes: row.potentialNotes || "", hardSkills: row.hardSkills || "", softSkills: row.softSkills || "" });
const normalizeStakeholder = (row: Stakeholder): Stakeholder => ({ ...stakeholdersSeed[0], ...row, conversationDate: row.conversationDate || row.firstConversation || "", interactionStatus: row.interactionStatus || "Nao iniciado" });
const normalizeSupplier = (row: Supplier): Supplier => ({ ...suppliersInitial[0], ...row, conversationDate: row.conversationDate || row.firstInteraction || "", interactionStatus: row.interactionStatus || row.relationshipStatus || "Nao iniciado", nextSteps: row.nextSteps || row.actionPlan || "" });
const normalizePillar = (row: MethodologyPillar): MethodologyPillar => ({ ...(methodologyPillarsSeed.find((item) => item.name === row.name) ?? methodologyPillarsSeed[0]), ...row });
const normalizeHandover = (row: HandoverItem): HandoverItem => ({ ...handoverChecklistSeed[0], ...row, attachments: Array.isArray(row.attachments) ? row.attachments : [] });
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
    const elapsed = Math.max(1, Math.min(100, Math.floor((today.getTime() - firstDay.getTime()) / 86400000) + 1));
    const phase = elapsed <= 30 ? "Dias 1-30" : elapsed <= 60 ? "Dias 31-60" : "Dias 61-100";
    return { elapsed, phase };
  }, []);

  const metrics = useMemo(() => calculateMetrics(data), [data]);

  async function loadCloudData(userId: string) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const [people, stakeholders, suppliers, categories, diagnosis, pillars, handover, scenarios, scenarioItems, preferences] = await Promise.all([
        supabase.from(tableNames.people).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.stakeholders).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.suppliers).select("*").eq("user_id", userId).order("spend", { ascending: false }),
        supabase.from(tableNames.categories).select("*").eq("user_id", userId).order("spend", { ascending: false }),
        supabase.from(tableNames.diagnosis).select("*").eq("user_id", userId).maybeSingle(),
        supabase.from(tableNames.methodologyPillars).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.handoverChecklist).select("*").eq("user_id", userId).order("item"),
        supabase.from(tableNames.orgScenarios).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.orgScenarioItems).select("*").eq("user_id", userId).order("person_name"),
        supabase.from(tableNames.userPreferences).select("*").eq("user_id", userId).maybeSingle()
      ]);
      const failures = [people.error, stakeholders.error, suppliers.error, categories.error, diagnosis.error, pillars.error, handover.error, scenarios.error, scenarioItems.error, preferences.error].filter(Boolean);
      if (failures.length) throw failures[0];
      if (!people.data?.length || !pillars.data?.length || !handover.data?.length || !scenarios.data?.length) {
        await ensureInitialData(userId);
        return loadCloudData(userId);
      }
      const pref = normalizePreferences(preferences.data ? fromSnake<UserPreference>(preferences.data) : initialData.userPreferences);
      const nextPref = await recordAccess(userId, pref);
      setData({
        people: people.data.map((row) => normalizePerson(fromSnake<Person>(row))),
        stakeholders: stakeholders.data?.map((row) => normalizeStakeholder(fromSnake<Stakeholder>(row))) ?? initialData.stakeholders,
        suppliers: suppliers.data?.map((row) => normalizeSupplier(fromSnake<Supplier>(row))) ?? initialData.suppliers,
        categories: categories.data?.map((row) => fromSnake<Category>(row)) ?? initialData.categories,
        diagnosis: diagnosis.data ? fromSnake<Diagnosis>(diagnosis.data) : initialData.diagnosis,
        methodologyPillars: pillars.data?.map((row) => normalizePillar(fromSnake<MethodologyPillar>(row))) ?? initialData.methodologyPillars,
        handoverChecklist: handover.data?.map((row) => normalizeHandover(fromSnake<HandoverItem>(row))) ?? initialData.handoverChecklist,
        orgScenarios: scenarios.data?.map((row) => fromSnake<OrgScenario>(row)) ?? initialData.orgScenarios,
        orgScenarioItems: scenarioItems.data?.map((row) => normalizeScenarioItem(fromSnake<OrgScenarioItem>(row))) ?? initialData.orgScenarioItems,
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
      insertMany("orgScenarios", orgScenariosSeed),
      insertMany("orgScenarioItems", orgScenarioItemsSeed),
      client.from(tableNames.diagnosis).insert(toSnake(initialData.diagnosis as unknown as Record<string, unknown>, userId)),
      client.from(tableNames.userPreferences).upsert({ user_id: userId, theme: data.userPreferences.theme }, { onConflict: "user_id" })
    ]);
  }

  async function upsertRow<T extends { id: string }>(collection: CollectionKey, row: T) {
    const stamped = ["methodologyPillars", "handoverChecklist"].includes(collection) ? { ...row, updatedAt: todayIso() } as T : row;
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
    const base = emptyRows[collection];
    const row = { ...base, ...overrides, id: crypto.randomUUID(), name: "name" in base ? `Novo ${base.name}` : overrides.name } as unknown as { id: string };
    if (collection === "orgScenarioItems" && !("scenarioId" in overrides)) (row as OrgScenarioItem).scenarioId = data.orgScenarios[0]?.id || "";
    setData((current) => ({ ...current, [collection]: [row, ...current[collection]] } as AppData));
    if (!supabase || !session?.user.id) return row.id;
    const { error: saveError } = await supabase.from(tableNames[collection]).insert(toSnake(row as unknown as Record<string, unknown>, session.user.id));
    if (saveError) setError(saveError.message);
    else await bumpMutation();
    return row.id;
  }

  async function deleteRow(collection: CollectionKey, id: string) {
    setData((current) => ({ ...current, [collection]: (current[collection] as Array<{ id: string }>).filter((item) => item.id !== id) } as AppData));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase.from(tableNames[collection]).delete().eq("id", id).eq("user_id", session.user.id);
    if (saveError) setError(saveError.message);
    else await bumpMutation();
  }

  async function updateDiagnosis(next: Diagnosis) {
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
          {activeTab === "pillars" && <PillarsPanel rows={data.methodologyPillars} onChange={(row) => upsertRow("methodologyPillars", row)} />}
          {activeTab === "people" && <PeoplePanel rows={data.people} categories={data.categories} onChange={(row) => upsertRow("people", row)} />}
          {activeTab === "handover" && <HandoverPanel rows={data.handoverChecklist} onChange={(row) => upsertRow("handoverChecklist", row)} />}
          {activeTab === "org" && (
            <OrgPanel
              scenarios={data.orgScenarios}
              items={data.orgScenarioItems}
              categories={data.categories}
              addScenario={() => addRow("orgScenarios", { name: "Novo cenario", description: "", rationale: "", risks: "", recommendedDecision: "", status: "Mapear" })}
              duplicateScenario={duplicateScenario}
              deleteScenario={(id) => deleteRow("orgScenarios", id)}
              addItem={(scenarioId) => addRow("orgScenarioItems", { scenarioId, personName: "Nova posicao", role: "", cluster: "", manager: "", categoryIds: [], spendResponsibility: 0, notes: "" })}
              deleteItem={(id) => deleteRow("orgScenarioItems", id)}
              onScenario={(row) => upsertRow("orgScenarios", row)}
              onItem={(row) => upsertRow("orgScenarioItems", row)}
            />
          )}
          {activeTab === "stakeholders" && <StakeholderPanel rows={data.stakeholders} addRow={() => addRow("stakeholders", { name: "Novo stakeholder", area: "", role: "", criticality: "Media", influence: "Media", interactionStatus: "Nao iniciado" })} deleteRow={(id) => deleteRow("stakeholders", id)} onChange={(row) => upsertRow("stakeholders", row)} />}
          {activeTab === "suppliers" && <SupplierPanel rows={data.suppliers} onChange={(row) => upsertRow("suppliers", row)} />}
          {activeTab === "diagnosis" && <DiagnosisPanel diagnosis={data.diagnosis} onChange={updateDiagnosis} />}
        </main>
      </div>
    </Shell>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setMessage(result.error ? result.error.message : mode === "login" ? "Login realizado." : "Conta criada. Confirme o e-mail se solicitado.");
  }
  return (
    <Shell>
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md rounded-md border border-line bg-card p-6 shadow-soft">
          <p className="text-sm font-medium text-leaf">Suzano</p>
          <h1 className="mt-1 text-2xl font-semibold">Plano Gerencia de Suprimentos Corporativo Onboarding</h1>
          <div className="mt-5 grid grid-cols-2 rounded-md border border-line p-1">
            <button type="button" onClick={() => setMode("login")} className={`rounded px-3 py-2 text-sm ${mode === "login" ? "bg-ink text-white" : ""}`}>Login</button>
            <button type="button" onClick={() => setMode("signup")} className={`rounded px-3 py-2 text-sm ${mode === "signup" ? "bg-ink text-white" : ""}`}>Registrar</button>
          </div>
          <div className="mt-5 space-y-3">
            <input className="field" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="focus-ring w-full rounded-md bg-leaf px-4 py-2 font-semibold text-white">{mode === "login" ? "Entrar" : "Criar conta"}</button>
          </div>
          {message && <p className="mt-4 text-sm text-coral">{message}</p>}
        </form>
      </div>
    </Shell>
  );
}

function Dashboard({ dayState, data, metrics }: { dayState: { elapsed: number; phase: string }; data: AppData; metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric title="Dia atual" value={`${dayState.elapsed}/100`} note={dayState.phase} />
        <Metric title="Progresso geral" value={percent(metrics.overall)} note="5 frentes" />
        <Metric title="Pessoas" value={`${metrics.peopleDone}/${data.people.length}`} note="pessoas conversadas" />
        <Metric title="Handover Thais" value={`${metrics.handoverDone}/${data.handoverChecklist.length}`} note="pontos concluidos" />
        <Metric title="Stakeholders" value={`${metrics.stakeholdersDone}/${data.stakeholders.length}`} note="conversados" />
        <Metric title="Fornecedores" value={`${metrics.suppliersDone}/${metrics.supplierGoal}`} note="interacoes" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Panel title="Calculo de progresso">
          <ProgressRow label={`Pessoas do time (${metrics.peopleDone}/${data.people.length})`} value={metrics.peopleProgress} />
          <ProgressRow label={`Handover Thais (${metrics.handoverDone}/${data.handoverChecklist.length})`} value={metrics.handoverProgress} />
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

function PillarsPanel({ rows, onChange }: { rows: MethodologyPillar[]; onChange: (row: MethodologyPillar) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <Panel title="Pilares dos 100 dias">
      <CardLayout
        rows={rows}
        selected={row.id}
        onSelect={setSelected}
        renderCard={(item) => <Summary title={item.name} subtitle={item.status} meta={item.decision || "Sem decisao registrada"} />}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ReadOnly label="O que e" value={row.explanation} />
          <ReadOnly label="Esperado na etapa" value={row.expected} />
          <Select label="Status" value={row.status} onChange={(value) => onChange({ ...row, status: value as MethodologyPillar["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Em risco", "Concluido"]} />
          <Field label="Data da decisao" type="date" value={row.decisionDate} onChange={(value) => onChange({ ...row, decisionDate: value })} />
          <Field label="Principais decisoes" area value={row.decision} onChange={(value) => onChange({ ...row, decision: value })} />
          <Field label="Evidencias" area value={row.evidence} onChange={(value) => onChange({ ...row, evidence: value })} />
          <Field label="Proximos passos" area value={row.nextSteps} onChange={(value) => onChange({ ...row, nextSteps: value })} />
          <Field label="Comentarios" area value={row.comments} onChange={(value) => onChange({ ...row, comments: value })} />
        </div>
        <SaveBar updatedAt={row.updatedAt} onSave={() => onChange(row)} />
      </CardLayout>
    </Panel>
  );
}

function PeoplePanel({ rows, categories, onChange }: { rows: Person[]; categories: Category[]; onChange: (row: Person) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <Panel title="Pessoas do time">
      <CardLayout rows={rows} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.name} subtitle={item.role} meta={item.firstOneOnOne ? "1:1 realizada" : "0/1 conversa"} />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Nome" value={row.name} onChange={(value) => onChange({ ...row, name: value })} />
          <Field label="Cargo" value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
          <Field label="Data da 1:1" type="date" value={row.firstOneOnOne} onChange={(value) => onChange({ ...row, firstOneOnOne: value })} />
          <MultiSelect label="Categorias atendidas" value={row.categoryIds} options={categories} onChange={(value) => onChange({ ...row, categoryIds: value, portfolios: labelsFor(categories, value).join(", ") })} />
          <Select label="Avaliacao Sommos" value={row.sommos} onChange={(value) => onChange({ ...row, sommos: value })} options={["", "Abaixo do esperado", "Em desenvolvimento", "Dentro do esperado", "Acima do esperado", "Referencia"]} />
          <Field label="Potencial" value={row.potentialNotes} onChange={(value) => onChange({ ...row, potentialNotes: value })} />
          <Field label="Hard skills" area value={row.hardSkills} onChange={(value) => onChange({ ...row, hardSkills: value })} />
          <Field label="Soft skills" area value={row.softSkills} onChange={(value) => onChange({ ...row, softSkills: value })} />
          <Field label="Pontos fortes" area value={row.strengths} onChange={(value) => onChange({ ...row, strengths: value })} />
          <Field label="Pontos de atencao" area value={row.attentionPoints} onChange={(value) => onChange({ ...row, attentionPoints: value })} />
          <Field label="Riscos" area value={row.risks} onChange={(value) => onChange({ ...row, risks: value })} />
          <Field label="Plano de desenvolvimento" area value={row.development} onChange={(value) => onChange({ ...row, development: value })} />
          <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
        </div>
        <ActionBar>
          <button className="btn" onClick={() => onChange(row)}>Salvar</button>
          <button className="btn" onClick={() => downloadIcs(`1:1 - ${row.name}`, row.firstOneOnOne, row.notes)}><CalendarPlus size={16} /> Exportar .ics</button>
        </ActionBar>
      </CardLayout>
    </Panel>
  );
}

function HandoverPanel({ rows, onChange }: { rows: HandoverItem[]; onChange: (row: HandoverItem) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <Panel title="Handover Thais">
      <CardLayout rows={rows} selected={row.id} onSelect={setSelected} renderCard={(item) => <Summary title={item.item} subtitle={item.status} meta={item.owner || "Sem responsavel"} />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <ReadOnly label="Tema" value={row.item} />
          <Select label="Status" value={row.status} onChange={(value) => onChange({ ...row, status: value as HandoverItem["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Em risco", "Concluido"]} />
          <Field label="Responsaveis" value={row.owner} onChange={(value) => onChange({ ...row, owner: value })} />
          <Field label="Prazo" type="date" value={row.dueDate} onChange={(value) => onChange({ ...row, dueDate: value })} />
          <Field label="Comentarios" area value={row.comment} onChange={(value) => onChange({ ...row, comment: value })} />
          <Field label="Links" area value={row.links} onChange={(value) => onChange({ ...row, links: value })} />
        </div>
        <AttachmentBox row={row} onChange={onChange} />
        <SaveBar updatedAt={row.updatedAt} onSave={() => onChange(row)} />
      </CardLayout>
    </Panel>
  );
}

function OrgPanel({
  scenarios,
  items,
  categories,
  addScenario,
  duplicateScenario,
  deleteScenario,
  addItem,
  deleteItem,
  onScenario,
  onItem
}: {
  scenarios: OrgScenario[];
  items: OrgScenarioItem[];
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
  if (!scenario) return null;
  const byPerson = scenarioItems.map((item) => ({ ...item, spendResponsibility: spendFor(categories, item.categoryIds), categoryCount: item.categoryIds.length }));
  const byCluster = Array.from(byPerson.reduce((map, item) => map.set(item.cluster || "Sem cluster", (map.get(item.cluster || "Sem cluster") || 0) + item.spendResponsibility), new Map<string, number>()).entries());
  return (
    <Panel title="Estrutura organizacional e simulacao">
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn" onClick={addScenario}><Plus size={16} /> Novo cenario</button>
        <button className="btn" onClick={() => duplicateScenario(scenario)}><Copy size={16} /> Duplicar</button>
        <button className="btn" onClick={() => deleteScenario(scenario.id)}><Trash2 size={16} /> Excluir</button>
      </div>
      <Select label="Cenario" value={scenario.id} onChange={setSelected} options={scenarios.map((item) => item.id)} labels={Object.fromEntries(scenarios.map((item) => [item.id, item.name]))} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Field label="Nome do cenario" value={scenario.name} onChange={(value) => onScenario({ ...scenario, name: value })} />
        <Select label="Status" value={scenario.status} onChange={(value) => onScenario({ ...scenario, status: value as OrgScenario["status"] })} options={["Mapear", "Iniciado", "Em andamento", "Concluido"]} />
        <Field label="Racional da mudanca" area value={scenario.rationale} onChange={(value) => onScenario({ ...scenario, rationale: value })} />
        <Field label="Riscos" area value={scenario.risks} onChange={(value) => onScenario({ ...scenario, risks: value })} />
        <Field label="Decisao recomendada" area value={scenario.recommendedDecision} onChange={(value) => onScenario({ ...scenario, recommendedDecision: value })} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric title="Spend no cenario" value={money(byPerson.reduce((sum, item) => sum + item.spendResponsibility, 0))} note="soma por pessoa" />
        <Metric title="Categorias alocadas" value={String(byPerson.reduce((sum, item) => sum + item.categoryCount, 0))} note="responsabilidades" />
        <Metric title="Clusters" value={String(byCluster.length)} note="distribuicao ativa" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Spend por cluster"><RankedRows items={byCluster.map(([name, spend]) => [name, money(spend)])} /></Panel>
        <Panel title="Comparacao de cenarios">
          <RankedRows items={scenarios.map((item) => {
            const total = items.filter((pos) => pos.scenarioId === item.id).reduce((sum, pos) => sum + spendFor(categories, pos.categoryIds), 0);
            return [item.name, money(total)];
          })} />
        </Panel>
      </div>
      <div className="mt-5 flex justify-between">
        <h3 className="font-semibold">Posicoes, clusters e categorias</h3>
        <button className="btn" onClick={() => addItem(scenario.id)}>Adicionar posicao</button>
      </div>
      <div className="mt-3 grid gap-3">
        {byPerson.map((item) => (
          <Card key={item.id}>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Nome da pessoa" value={item.personName} onChange={(value) => onItem({ ...item, personName: value })} />
              <Field label="Cargo" value={item.role} onChange={(value) => onItem({ ...item, role: value })} />
              <Field label="Cluster" value={item.cluster} onChange={(value) => onItem({ ...item, cluster: value })} />
              <Field label="Reporte direto" value={item.manager} onChange={(value) => onItem({ ...item, manager: value })} />
              <MultiSelect label="Categorias sob responsabilidade" value={item.categoryIds} options={categories} onChange={(value) => onItem({ ...item, categoryIds: value, spendResponsibility: spendFor(categories, value) })} />
              <ReadOnly label="Spend sob responsabilidade" value={`${money(item.spendResponsibility)} | ${item.categoryCount} categorias`} />
              <Field label="Observacoes" area value={item.notes} onChange={(value) => onItem({ ...item, notes: value })} />
            </div>
            <ActionBar>
              <button className="btn" onClick={() => onItem(item)}>Salvar posicao</button>
              <button className="btn" onClick={() => deleteItem(item.id)}><Trash2 size={16} /> Excluir posicao</button>
            </ActionBar>
          </Card>
        ))}
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

function SupplierPanel({ rows, onChange }: { rows: Supplier[]; onChange: (row: Supplier) => void }) {
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.relatedArea.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || visible[0] || rows[0];
  if (!row) return null;
  return (
    <Panel title="Fornecedores">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar fornecedor ou area" />
          <Select label="Selecionar fornecedor" value={row.id} onChange={setSelected} options={visible.map((item) => item.id)} labels={Object.fromEntries(visible.map((item) => [item.id, `${item.name} | ${money(item.spend)}`]))} />
          <Panel title="Top 20 fornecedores">
            <RankedRows items={rows.slice(0, 20).map((item) => [item.name, money(item.spend)])} />
          </Panel>
        </div>
        <Card>
          <div className="grid gap-3 lg:grid-cols-2">
            <ReadOnly label="Fornecedor" value={row.name} />
            <ReadOnly label="Spend" value={money(row.spend)} />
            <Select label="Area relacionada" value={row.relatedArea} onChange={(value) => onChange({ ...row, relatedArea: value })} options={["RH", "TI", "Juridico", "Marketing", "Financas", "Facilities", "Operacoes"]} />
            <Select label="Criticidade" value={row.criticality} onChange={(value) => onChange({ ...row, criticality: value as Supplier["criticality"] })} options={["Alta", "Media", "Baixa"]} />
            <Field label="Data da conversa" type="date" value={row.conversationDate} onChange={(value) => onChange({ ...row, conversationDate: value, firstInteraction: value })} />
            <Field label="Status da interacao" value={row.interactionStatus} onChange={(value) => onChange({ ...row, interactionStatus: value, relationshipStatus: value })} />
            <Field label="Contato principal" value={row.contact} onChange={(value) => onChange({ ...row, contact: value })} />
            <Field label="Telefone" value={row.phone} onChange={(value) => onChange({ ...row, phone: value })} />
            <Field label="E-mail" value={row.email} onChange={(value) => onChange({ ...row, email: value })} />
            <Field label="Oportunidades" area value={row.opportunities} onChange={(value) => onChange({ ...row, opportunities: value })} />
            <Field label="Riscos" area value={row.risks} onChange={(value) => onChange({ ...row, risks: value })} />
            <Field label="Proximos passos" area value={row.nextSteps} onChange={(value) => onChange({ ...row, nextSteps: value, actionPlan: value })} />
            <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
          </div>
          <ActionBar>
            <button className="btn" onClick={() => onChange(row)}>Salvar</button>
            <button className="btn" onClick={() => openWhatsApp(row.phone, `Ola, aqui e Wagner da Suzano. Podemos falar sobre ${row.name}?`)}>WhatsApp</button>
            <button className="btn" onClick={() => downloadIcs(`Fornecedor - ${row.name}`, row.conversationDate, row.nextSteps || row.notes)}><CalendarPlus size={16} /> Exportar .ics</button>
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

function AttachmentBox({ row, onChange }: { row: HandoverItem; onChange: (row: HandoverItem) => void }) {
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    const nextFiles = await Promise.all(Array.from(files).map(readFileAttachment));
    onChange({ ...row, attachments: [...row.attachments, ...nextFiles] });
  }
  return (
    <div className="mt-4 rounded-md border border-line bg-card p-3">
      <label className="btn cursor-pointer">
        <Paperclip size={16} /> Anexar arquivos
        <input className="hidden" type="file" multiple onChange={(event) => attach(event.target.files)} />
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

function Field({ label, value, onChange, area, type = "text" }: { label?: string; value: string; onChange: (value: string) => void; area?: boolean; type?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      {area ? <textarea className="field min-h-24" value={value || ""} onChange={(event) => onChange(event.target.value)} /> : <input className="field" type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function Select({ label, value, onChange, options, labels }: { label?: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      <select className="field" value={value || options[0] || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] || option}</option>)}
      </select>
    </label>
  );
}

function MultiSelect({ label, value, options, onChange }: { label: string; value: string[]; options: Category[]; onChange: (value: string[]) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select className="field min-h-32" multiple value={value} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name} | {money(option.spend)}</option>)}
      </select>
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
      <button className="btn" onClick={onSave}>Salvar</button>
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

function Badge({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "warn" }) {
  return <span className={`rounded-md border px-3 py-2 text-sm ${tone === "warn" ? "border-coral/30 bg-coral/10" : "border-leaf/30 bg-leaf/10"}`}>{children}</span>;
}

function calculateMetrics(data: AppData) {
  const peopleDone = data.people.filter((item) => item.firstOneOnOne).length;
  const handoverDone = data.handoverChecklist.filter((item) => item.status === "Concluido").length;
  const stakeholdersDone = data.stakeholders.filter((item) => item.conversationDate || item.firstConversation).length;
  const prioritySuppliers = data.suppliers.slice(0, 20);
  const selectedSuppliers = data.suppliers.filter((item, index) => index < 20 || item.conversationDate || item.firstInteraction || item.contact || item.notes);
  const suppliersDone = selectedSuppliers.filter((item) => item.conversationDate || item.firstInteraction).length;
  const pillarsDone = data.methodologyPillars.filter((item) => item.status === "Concluido" || (item.decision && item.evidence)).length;
  const peopleProgress = data.people.length ? peopleDone / data.people.length : 0;
  const handoverProgress = data.handoverChecklist.length ? handoverDone / data.handoverChecklist.length : 0;
  const stakeholderProgress = data.stakeholders.length ? stakeholdersDone / data.stakeholders.length : 0;
  const supplierGoal = Math.max(1, selectedSuppliers.length || prioritySuppliers.length);
  const supplierProgress = suppliersDone / supplierGoal;
  const pillarProgress = data.methodologyPillars.length ? pillarsDone / data.methodologyPillars.length : 0;
  return {
    peopleDone,
    handoverDone,
    stakeholdersDone,
    suppliersDone,
    supplierGoal,
    pillarsDone,
    peopleProgress,
    handoverProgress,
    stakeholderProgress,
    supplierProgress,
    pillarProgress,
    overall: (peopleProgress + handoverProgress + stakeholderProgress + supplierProgress + pillarProgress) / 5,
    supplierSpend: data.suppliers.reduce((sum, item) => sum + Number(item.spend || 0), 0),
    categorySpend: data.categories.reduce((sum, item) => sum + Number(item.spend || 0), 0)
  };
}

function labelsFor(categories: Category[], ids: string[]) {
  return ids.map((id) => categories.find((item) => item.id === id)?.name).filter(Boolean) as string[];
}

function spendFor(categories: Category[], ids: string[]) {
  return ids.reduce((sum, id) => sum + Number(categories.find((item) => item.id === id)?.spend || 0), 0);
}

function formatDateTime(value: string) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
