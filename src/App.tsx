import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarPlus,
  GitBranch,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  Target,
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

type TabKey =
  | "dashboard"
  | "pillars"
  | "people"
  | "org"
  | "stakeholders"
  | "suppliers"
  | "categories"
  | "handover"
  | "diagnosis";
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
  { key: "org", label: "Estrutura", icon: GitBranch },
  { key: "stakeholders", label: "Stakeholders", icon: UserSquare2 },
  { key: "suppliers", label: "Fornecedores", icon: BriefcaseBusiness },
  { key: "categories", label: "Categorias", icon: BarChart3 },
  { key: "handover", label: "Handover Juliana", icon: Handshake },
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
  "next_meeting",
  "first_interaction",
  "next_interaction",
  "decision_date",
  "due_date"
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
    if (key === "scenarioId") mapped.scenario_id = value;
    else mapped[snake] = dateFields.has(snake) && value === "" ? null : value;
  });
  delete mapped.id;
  return mapped;
};

const fromSnake = <T,>(row: Record<string, unknown>) => {
  const mapped: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key === "user_id" || key === "created_at" || key === "updated_at") return;
    const camel = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    mapped[camel] = value ?? "";
  });
  return mapped as T;
};

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
    return { elapsed, phase, calendarProgress: elapsed / 100 };
  }, []);

  const metrics = useMemo(() => calculateMetrics(data), [data]);

  async function loadCloudData(userId: string) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const [
        people,
        stakeholders,
        suppliers,
        categories,
        diagnosis,
        pillars,
        handover,
        scenarios,
        scenarioItems,
        preferences
      ] = await Promise.all([
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

      const failures = [
        people.error,
        stakeholders.error,
        suppliers.error,
        categories.error,
        diagnosis.error,
        pillars.error,
        handover.error,
        scenarios.error,
        scenarioItems.error,
        preferences.error
      ].filter(Boolean);
      if (failures.length) throw failures[0];

      if (!people.data?.length || !pillars.data?.length || !handover.data?.length || !scenarios.data?.length) {
        await ensureInitialData(userId);
        return loadCloudData(userId);
      }

      setData({
        people: people.data.map((row) => fromSnake<Person>(row)),
        stakeholders: stakeholders.data?.map((row) => fromSnake<Stakeholder>(row)) ?? initialData.stakeholders,
        suppliers: suppliers.data?.map((row) => fromSnake<Supplier>(row)) ?? initialData.suppliers,
        categories: categories.data?.map((row) => fromSnake<Category>(row)) ?? initialData.categories,
        diagnosis: diagnosis.data ? fromSnake<Diagnosis>(diagnosis.data) : initialData.diagnosis,
        methodologyPillars: pillars.data?.map((row) => fromSnake<MethodologyPillar>(row)) ?? initialData.methodologyPillars,
        handoverChecklist: handover.data?.map((row) => fromSnake<HandoverItem>(row)) ?? initialData.handoverChecklist,
        orgScenarios: scenarios.data?.map((row) => fromSnake<OrgScenario>(row)) ?? initialData.orgScenarios,
        orgScenarioItems: scenarioItems.data?.map((row) => fromSnake<OrgScenarioItem>(row)) ?? initialData.orgScenarioItems,
        userPreferences: preferences.data
          ? fromSnake<UserPreference>(preferences.data)
          : { ...initialData.userPreferences, theme: data.userPreferences.theme }
      });
    } catch (cloudError) {
      setError(cloudError instanceof Error ? cloudError.message : "Nao foi possivel carregar os dados do Supabase.");
    } finally {
      setLoading(false);
    }
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
      client.from(tableNames.userPreferences).insert({ user_id: userId, theme: data.userPreferences.theme })
    ]);
  }

  async function upsertRow<T extends { id: string }>(collection: CollectionKey, row: T) {
    setData((current) => {
      const nextRows = (current[collection] as Array<{ id: string }>).map((item) => (item.id === row.id ? row : item));
      return { ...current, [collection]: nextRows } as AppData;
    });
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase
      .from(tableNames[collection])
      .upsert({ ...toSnake(row as unknown as Record<string, unknown>, session.user.id), id: row.id });
    if (saveError) setError(saveError.message);
  }

  async function addRow(collection: CollectionKey) {
    const base = emptyRows[collection];
    const row = { ...base, id: crypto.randomUUID(), name: "name" in base ? `Novo ${base.name}` : undefined } as unknown as { id: string };
    if (collection === "orgScenarioItems") {
      (row as OrgScenarioItem).scenarioId = data.orgScenarios[0]?.id || "";
      (row as OrgScenarioItem).personName = "Nova posicao";
    }
    setData((current) => ({ ...current, [collection]: [row, ...current[collection]] } as AppData));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase
      .from(tableNames[collection])
      .insert(toSnake(row as unknown as Record<string, unknown>, session.user.id));
    if (saveError) setError(saveError.message);
  }

  async function updateDiagnosis(next: Diagnosis) {
    setData((current) => ({ ...current, diagnosis: next }));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase
      .from(tableNames.diagnosis)
      .upsert({ ...toSnake(next as unknown as Record<string, unknown>, session.user.id), id: next.id });
    if (saveError) setError(saveError.message);
  }

  async function updatePreference(theme: "light" | "dark") {
    const next = { ...data.userPreferences, theme };
    setData((current) => ({ ...current, userPreferences: next }));
    if (!supabase || !session?.user.id) return;
    const { error: saveError } = await supabase
      .from(tableNames.userPreferences)
      .upsert({ user_id: session.user.id, theme });
    if (saveError) setError(saveError.message);
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
            <button
              onClick={() => updatePreference(data.userPreferences.theme === "light" ? "dark" : "light")}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
            >
              {data.userPreferences.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              {data.userPreferences.theme === "light" ? "Escuro" : "Claro"}
            </button>
            {session && (
              <button onClick={signOut} className="focus-ring inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <LogOut size={16} /> Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`focus-ring flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                  active ? "bg-ink text-white" : "border border-line bg-card text-ink"
                }`}
              >
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0">
          {error && <div className="mb-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm">{error}</div>}
          {activeTab === "dashboard" && <Dashboard dayState={dayState} data={data} metrics={metrics} />}
          {activeTab === "pillars" && <PillarsPanel rows={data.methodologyPillars} onChange={(row) => upsertRow("methodologyPillars", row)} />}
          {activeTab === "people" && <PeoplePanel rows={data.people} onChange={(row) => upsertRow("people", row)} />}
          {activeTab === "org" && (
            <OrgPanel
              scenarios={data.orgScenarios}
              items={data.orgScenarioItems}
              addScenario={() => addRow("orgScenarios")}
              addItem={() => addRow("orgScenarioItems")}
              onScenario={(row) => upsertRow("orgScenarios", row)}
              onItem={(row) => upsertRow("orgScenarioItems", row)}
            />
          )}
          {activeTab === "stakeholders" && <StakeholderPanel rows={data.stakeholders} onChange={(row) => upsertRow("stakeholders", row)} />}
          {activeTab === "suppliers" && <SupplierPanel rows={data.suppliers} onChange={(row) => upsertRow("suppliers", row)} />}
          {activeTab === "categories" && <CategoryPanel rows={data.categories} onChange={(row) => upsertRow("categories", row)} />}
          {activeTab === "handover" && <HandoverPanel rows={data.handoverChecklist} onChange={(row) => upsertRow("handoverChecklist", row)} />}
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
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
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

function Dashboard({ dayState, data, metrics }: { dayState: { elapsed: number; phase: string; calendarProgress: number }; data: AppData; metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-5">
        <Metric title="Dia atual" value={`${dayState.elapsed}/100`} note={dayState.phase} />
        <Metric title="Progresso geral" value={percent(metrics.overall)} note="4 dimensoes" />
        <Metric title="Pessoas" value={percent(metrics.peopleProgress)} note={`${metrics.peopleDone}/${data.people.length} interacoes`} />
        <Metric title="Stakeholders" value={percent(metrics.stakeholderProgress)} note={`${metrics.stakeholdersDone}/${data.stakeholders.length} conversas`} />
        <Metric title="Fornecedores" value={percent(metrics.supplierProgress)} note={`${metrics.suppliersDone}/${Math.min(20, data.suppliers.length)} prioritarios`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Dimensoes do progresso">
          <ProgressRow label="Pessoas do time" value={metrics.peopleProgress} />
          <ProgressRow label="Stakeholders selecionados" value={metrics.stakeholderProgress} />
          <ProgressRow label="Fornecedores selecionados" value={metrics.supplierProgress} />
          <ProgressRow label="Pilares metodologicos" value={metrics.pillarProgress} />
        </Panel>
        <Panel title="Referencias de spend">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric title="Spend Categorias - PB'26" value={money(metrics.categorySpend)} note={`${data.categories.length} categorias`} />
            <Metric title="Spend Fornecedores - Desembolso 2025 + 2026 YTD" value={money(metrics.supplierSpend)} note={`${data.suppliers.length} fornecedores`} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RankedList title="Top fornecedores priorizados" items={data.suppliers.slice(0, 8).map((item) => [item.name, `${item.relatedArea} | ${money(item.spend)}`])} />
        <RankedList title="Top categorias PB'26" items={data.categories.slice(0, 8).map((item) => [item.name, money(item.spend)])} />
      </section>
    </div>
  );
}

function PillarsPanel({ rows, onChange }: { rows: MethodologyPillar[]; onChange: (row: MethodologyPillar) => void }) {
  return (
    <Panel title="Pilares metodologicos dos 100 dias">
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_170px]">
              <strong>{row.name}</strong>
              <Select value={row.status} onChange={(value) => onChange({ ...row, status: value as MethodologyPillar["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Concluido"]} />
              <Field type="date" value={row.decisionDate} onChange={(value) => onChange({ ...row, decisionDate: value })} />
            </div>
            <Field label="Principal decisao" value={row.decision} onChange={(value) => onChange({ ...row, decision: value })} />
            <Field label="Evidencias ou comentarios" area value={`${row.evidence}${row.comments ? `\n${row.comments}` : ""}`} onChange={(value) => onChange({ ...row, evidence: value })} />
          </Card>
        ))}
      </div>
    </Panel>
  );
}

function PeoplePanel({ rows, onChange }: { rows: Person[]; onChange: (row: Person) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <EditorPanel title="Pessoas do time" rows={rows} selected={row.id} onSelect={setSelected} getLabel={(item) => `${item.name} - ${item.role}`}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Nome" value={row.name} onChange={(value) => onChange({ ...row, name: value })} />
        <Field label="Cargo" value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
        <Field label="Data da 1:1" type="date" value={row.firstOneOnOne} onChange={(value) => onChange({ ...row, firstOneOnOne: value })} />
        <Field label="Proxima conversa" type="date" value={row.nextConversation} onChange={(value) => onChange({ ...row, nextConversation: value })} />
        <Field label="Status da agenda" value={row.agendaStatus} onChange={(value) => onChange({ ...row, agendaStatus: value })} />
        <Field label="Carteira/categorias atendidas" value={row.portfolios} onChange={(value) => onChange({ ...row, portfolios: value })} />
        <Field label="Avaliacao Sommos" value={row.sommos} onChange={(value) => onChange({ ...row, sommos: value })} />
        <Field label="Nota Sommos" type="number" value={String(row.sommosScore || 0)} onChange={(value) => onChange({ ...row, sommosScore: Number(value) || 0 })} />
        <Score label="Performance percebida" value={row.performance} onChange={(value) => onChange({ ...row, performance: value })} />
        <Score label="Potencial" value={row.potential} onChange={(value) => onChange({ ...row, potential: value })} />
        <Field label="Pontos fortes" area value={row.strengths} onChange={(value) => onChange({ ...row, strengths: value })} />
        <Field label="Pontos de atencao" area value={row.attentionPoints} onChange={(value) => onChange({ ...row, attentionPoints: value })} />
        <Field label="Riscos" area value={row.risks} onChange={(value) => onChange({ ...row, risks: value })} />
        <Field label="Plano de desenvolvimento" area value={row.development} onChange={(value) => onChange({ ...row, development: value })} />
        <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
      </div>
      <ActionBar>
        <button className="btn" onClick={() => downloadIcs(`1:1 - ${row.name}`, row.nextConversation || row.firstOneOnOne, row.notes)}>
          <CalendarPlus size={16} /> Exportar .ics
        </button>
      </ActionBar>
    </EditorPanel>
  );
}

function StakeholderPanel({ rows, onChange }: { rows: Stakeholder[]; onChange: (row: Stakeholder) => void }) {
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || rows[0];
  if (!row) return null;
  return (
    <EditorPanel title="Stakeholders" rows={rows} selected={row.id} onSelect={setSelected} getLabel={(item) => `${item.name} - ${item.area}`}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Nome" value={row.name} onChange={(value) => onChange({ ...row, name: value })} />
        <Field label="Area" value={row.area} onChange={(value) => onChange({ ...row, area: value })} />
        <Field label="Cargo" value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
        <Select label="Nivel de influencia" value={row.influence} onChange={(value) => onChange({ ...row, influence: value as Stakeholder["influence"] })} options={["Alta", "Media", "Baixa"]} />
        <Select label="Criticidade" value={row.criticality} onChange={(value) => onChange({ ...row, criticality: value as Stakeholder["criticality"] })} options={["Alta", "Media", "Baixa"]} />
        <Field label="Primeira conversa" type="date" value={row.firstConversation} onChange={(value) => onChange({ ...row, firstConversation: value })} />
        <Field label="Proxima conversa" type="date" value={row.nextConversation} onChange={(value) => onChange({ ...row, nextConversation: value })} />
        <Field label="Expectativas" area value={row.expectations} onChange={(value) => onChange({ ...row, expectations: value })} />
        <Field label="Dores" area value={row.pains} onChange={(value) => onChange({ ...row, pains: value })} />
        <Field label="Oportunidades" area value={row.opportunities} onChange={(value) => onChange({ ...row, opportunities: value })} />
        <Field label="Proximos passos" area value={row.nextSteps} onChange={(value) => onChange({ ...row, nextSteps: value })} />
        <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
      </div>
      <ActionBar>
        <button className="btn" onClick={() => downloadIcs(`Conversa stakeholder - ${row.name}`, row.nextConversation || row.firstConversation, row.nextSteps)}>
          <CalendarPlus size={16} /> Exportar .ics
        </button>
      </ActionBar>
    </EditorPanel>
  );
}

function SupplierPanel({ rows, onChange }: { rows: Supplier[]; onChange: (row: Supplier) => void }) {
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.relatedArea.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState(rows[0]?.id || "");
  const row = rows.find((item) => item.id === selected) || visible[0] || rows[0];
  if (!row) return null;
  return (
    <EditorPanel
      title="Fornecedores - Spend Fornecedores - Desembolso 2025 + 2026 YTD"
      rows={visible.slice(0, 150)}
      selected={row.id}
      onSelect={setSelected}
      getLabel={(item) => `${item.name} | ${money(item.spend)}`}
      search={<SearchBox value={query} onChange={setQuery} placeholder="Buscar fornecedor ou area" />}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Metric title="Spend" value={money(row.spend)} note={row.category || "Categoria a classificar"} />
        <Select label="Area relacionada" value={row.relatedArea} onChange={(value) => onChange({ ...row, relatedArea: value })} options={["RH", "TI", "Juridico", "Marketing", "Financas", "Facilities", "Operacoes"]} />
        <Select label="Criticidade" value={row.criticality} onChange={(value) => onChange({ ...row, criticality: value as Supplier["criticality"] })} options={["Alta", "Media", "Baixa"]} />
        <Field label="Contato principal" value={row.contact} onChange={(value) => onChange({ ...row, contact: value })} />
        <Field label="Telefone" value={row.phone} onChange={(value) => onChange({ ...row, phone: value })} />
        <Field label="E-mail" value={row.email} onChange={(value) => onChange({ ...row, email: value })} />
        <Field label="Data da primeira interacao" type="date" value={row.firstInteraction} onChange={(value) => onChange({ ...row, firstInteraction: value })} />
        <Field label="Proxima interacao" type="date" value={row.nextInteraction} onChange={(value) => onChange({ ...row, nextInteraction: value })} />
        <Field label="Status do relacionamento" value={row.relationshipStatus} onChange={(value) => onChange({ ...row, relationshipStatus: value })} />
        <Field label="Oportunidades" area value={row.opportunities} onChange={(value) => onChange({ ...row, opportunities: value })} />
        <Field label="Riscos" area value={row.risks} onChange={(value) => onChange({ ...row, risks: value })} />
        <Field label="Anotacoes" area value={row.notes} onChange={(value) => onChange({ ...row, notes: value })} />
      </div>
      <ActionBar>
        <button className="btn" onClick={() => openWhatsApp(row.phone, `Ola, aqui e Wagner da Suzano. Podemos falar sobre ${row.name}?`)}>
          WhatsApp
        </button>
        <button className="btn" onClick={() => downloadIcs(`Fornecedor - ${row.name}`, row.nextInteraction || row.firstInteraction, row.actionPlan || row.notes)}>
          <CalendarPlus size={16} /> Exportar .ics
        </button>
      </ActionBar>
    </EditorPanel>
  );
}

function CategoryPanel({ rows, onChange }: { rows: Category[]; onChange: (row: Category) => void }) {
  return (
    <Panel title="Categorias - Spend Categorias - PB'26">
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <strong>{row.name}</strong>
              <span className="font-semibold text-leaf">{money(row.spend)}</span>
              <Select value={row.status} onChange={(value) => onChange({ ...row, status: value as Category["status"] })} options={["Mapear", "Iniciado", "Em andamento", "Em risco", "Concluido"]} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Estrategia" area value={row.strategy} onChange={(value) => onChange({ ...row, strategy: value })} />
              <Field label="Responsavel" value={row.owner} onChange={(value) => onChange({ ...row, owner: value })} />
              <Field label="Oportunidades" area value={row.opportunities} onChange={(value) => onChange({ ...row, opportunities: value })} />
              <Field label="Riscos" area value={row.risks} onChange={(value) => onChange({ ...row, risks: value })} />
              <Field label="Savings" type="number" value={String(row.savings || 0)} onChange={(value) => onChange({ ...row, savings: Number(value) || 0 })} />
            </div>
          </Card>
        ))}
      </div>
    </Panel>
  );
}

function HandoverPanel({ rows, onChange }: { rows: HandoverItem[]; onChange: (row: HandoverItem) => void }) {
  return (
    <Panel title="Handover Juliana">
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_180px_160px]">
              <strong>{row.item}</strong>
              <Select value={row.status} onChange={(value) => onChange({ ...row, status: value as HandoverItem["status"] })} options={["Nao iniciado", "Iniciado", "Em andamento", "Concluido"]} />
              <Field value={row.owner} onChange={(value) => onChange({ ...row, owner: value })} />
              <Field type="date" value={row.dueDate} onChange={(value) => onChange({ ...row, dueDate: value })} />
            </div>
            <Field label="Comentario" area value={row.comment} onChange={(value) => onChange({ ...row, comment: value })} />
            <Field label="Anexos/links" value={row.links} onChange={(value) => onChange({ ...row, links: value })} />
          </Card>
        ))}
      </div>
    </Panel>
  );
}

function OrgPanel({
  scenarios,
  items,
  addScenario,
  addItem,
  onScenario,
  onItem
}: {
  scenarios: OrgScenario[];
  items: OrgScenarioItem[];
  addScenario: () => void;
  addItem: () => void;
  onScenario: (row: OrgScenario) => void;
  onItem: (row: OrgScenarioItem) => void;
}) {
  const [selected, setSelected] = useState(scenarios[0]?.id || "");
  const scenario = scenarios.find((item) => item.id === selected) || scenarios[0];
  const scenarioItems = items.filter((item) => item.scenarioId === scenario?.id);
  if (!scenario) return null;
  return (
    <Panel title="Simulacao de estrutura organizacional" action={<button className="btn" onClick={addScenario}>Novo cenario</button>}>
      <Select label="Cenario" value={scenario.id} onChange={setSelected} options={scenarios.map((item) => item.id)} labels={Object.fromEntries(scenarios.map((item) => [item.id, item.name]))} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Nome do cenario" value={scenario.name} onChange={(value) => onScenario({ ...scenario, name: value })} />
        <Select label="Status" value={scenario.status} onChange={(value) => onScenario({ ...scenario, status: value as OrgScenario["status"] })} options={["Mapear", "Iniciado", "Em andamento", "Concluido"]} />
        <Field label="Racional da mudanca" area value={scenario.rationale} onChange={(value) => onScenario({ ...scenario, rationale: value })} />
        <Field label="Riscos" area value={scenario.risks} onChange={(value) => onScenario({ ...scenario, risks: value })} />
        <Field label="Decisao recomendada" area value={scenario.recommendedDecision} onChange={(value) => onScenario({ ...scenario, recommendedDecision: value })} />
      </div>
      <div className="mt-4 flex justify-between">
        <h3 className="font-semibold">Posicoes e clusters</h3>
        <button className="btn" onClick={addItem}>Adicionar posicao</button>
      </div>
      <div className="mt-3 grid gap-3">
        {scenarioItems.map((item) => (
          <Card key={item.id}>
            <div className="grid gap-3 lg:grid-cols-5">
              <Field value={item.personName} onChange={(value) => onItem({ ...item, personName: value })} />
              <Field value={item.role} onChange={(value) => onItem({ ...item, role: value })} />
              <Field value={item.cluster} onChange={(value) => onItem({ ...item, cluster: value })} />
              <Field value={item.manager} onChange={(value) => onItem({ ...item, manager: value })} />
              <Field value={item.notes} onChange={(value) => onItem({ ...item, notes: value })} />
            </div>
          </Card>
        ))}
      </div>
    </Panel>
  );
}

function DiagnosisPanel({ diagnosis, onChange }: { diagnosis: Diagnosis; onChange: (diagnosis: Diagnosis) => void }) {
  return (
    <Panel title="Diagnostico inicial - Match Strategy to Situation">
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(diagnosis)
          .filter(([key]) => key !== "id")
          .map(([key, value]) => (
            <Field key={key} label={key} area value={String(value)} onChange={(next) => onChange({ ...diagnosis, [key]: next })} />
          ))}
      </div>
    </Panel>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-paper text-ink">{children}</div>;
}

function EditorPanel<T extends { id: string }>({
  title,
  rows,
  selected,
  onSelect,
  getLabel,
  search,
  children
}: {
  title: string;
  rows: T[];
  selected: string;
  onSelect: (id: string) => void;
  getLabel: (row: T) => string;
  search?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel title={title}>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Select value={selected} onChange={onSelect} options={rows.map((row) => row.id)} labels={Object.fromEntries(rows.map((row) => [row.id, getLabel(row)]))} />
        {search}
      </div>
      <Card>{children}</Card>
    </Panel>
  );
}

function Field({ label, value, onChange, area, type = "text" }: { label?: string; value: string; onChange: (value: string) => void; area?: boolean; type?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      {area ? (
        <textarea className="field min-h-24" value={value || ""} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field" type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function Select({ label, value, onChange, options, labels }: { label?: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>}
      <select className="field" value={value || options[0] || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{labels?.[option] || option}</option>
        ))}
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

function Score({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}: {value}</span>
      <input className="w-full accent-leaf" type="range" min="1" max="5" value={value || 3} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
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

function RankedList({ title, items }: { title: string; items: string[][] }) {
  return (
    <Panel title={title}>
      <div className="space-y-2">
        {items.map(([name, value], index) => (
          <div key={`${name}-${index}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm">
            <span className="font-semibold text-leaf">{index + 1}</span>
            <span className="truncate">{name}</span>
            <strong className="text-right">{value}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Badge({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "warn" }) {
  return <span className={`rounded-md border px-3 py-2 text-sm ${tone === "warn" ? "border-coral/30 bg-coral/10" : "border-leaf/30 bg-leaf/10"}`}>{children}</span>;
}

function calculateMetrics(data: AppData) {
  const peopleDone = data.people.filter((item) => item.firstOneOnOne).length;
  const stakeholdersDone = data.stakeholders.filter((item) => item.firstConversation).length;
  const prioritySuppliers = data.suppliers.slice(0, 20);
  const suppliersDone = prioritySuppliers.filter((item) => item.firstInteraction).length;
  const pillarsDone = data.methodologyPillars.filter((item) => item.status === "Concluido").length;
  const peopleProgress = data.people.length ? peopleDone / data.people.length : 0;
  const stakeholderProgress = data.stakeholders.length ? stakeholdersDone / data.stakeholders.length : 0;
  const supplierProgress = prioritySuppliers.length ? suppliersDone / prioritySuppliers.length : 0;
  const pillarProgress = data.methodologyPillars.length ? pillarsDone / data.methodologyPillars.length : 0;
  return {
    peopleDone,
    stakeholdersDone,
    suppliersDone,
    pillarsDone,
    peopleProgress,
    stakeholderProgress,
    supplierProgress,
    pillarProgress,
    overall: (peopleProgress + stakeholderProgress + supplierProgress + pillarProgress) / 4,
    supplierSpend: data.suppliers.reduce((sum, item) => sum + Number(item.spend || 0), 0),
    categorySpend: data.categories.reduce((sum, item) => sum + Number(item.spend || 0), 0)
  };
}

function downloadIcs(title: string, date: string, description: string) {
  if (!date) {
    window.alert("Preencha uma data antes de exportar.");
    return;
  }
  const start = date.replace(/-/g, "") + "T120000Z";
  const end = date.replace(/-/g, "") + "T130000Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//First100Days//PT-BR",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@first100days`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description || "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
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
  window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export default App;
