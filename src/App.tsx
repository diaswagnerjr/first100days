import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldAlert,
  Target,
  Users,
  UserSquare2
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { initialData } from "./data/initial";
import { money, percent } from "./lib/format";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { AppData, Category, Diagnosis, Person, Stakeholder, Supplier } from "./lib/types";

type TabKey = "dashboard" | "diagnosis" | "people" | "stakeholders" | "suppliers" | "categories";
type CollectionKey = "people" | "stakeholders" | "suppliers" | "categories";

const tabs: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "diagnosis", label: "Diagnostico", icon: Target },
  { key: "people", label: "Pessoas", icon: Users },
  { key: "stakeholders", label: "Stakeholders", icon: UserSquare2 },
  { key: "suppliers", label: "Fornecedores", icon: BriefcaseBusiness },
  { key: "categories", label: "Categorias", icon: BarChart3 }
];

const tableNames: Record<CollectionKey | "diagnosis", string> = {
  people: "people",
  stakeholders: "stakeholders",
  suppliers: "suppliers",
  categories: "categories",
  diagnosis: "diagnosis"
};

const firstDay = new Date(import.meta.env.VITE_FIRST_DAY || "2026-06-05");

const emptyRows = {
  people: {
    name: "Nova pessoa",
    role: "",
    cluster: "",
    portfolios: "",
    firstOneOnOne: "",
    sommos: "",
    performance: 3,
    potential: 3,
    succession: "",
    development: "",
    notes: ""
  },
  stakeholders: {
    name: "Novo stakeholder",
    area: "",
    role: "",
    influence: "Media",
    relationship: "Media",
    expectations: "",
    learnings: "",
    nextAction: "",
    nextMeeting: ""
  },
  suppliers: {
    name: "Novo fornecedor",
    category: "",
    spend: 0,
    criticality: "Media",
    contact: "",
    meetings: 0,
    opportunities: "",
    risks: "",
    actionPlan: ""
  },
  categories: {
    name: "Nova categoria",
    strategy: "",
    owner: "",
    opportunities: "",
    risks: "",
    savings: 0,
    status: "Mapear",
    spend: 0
  }
} as const;

const toSnake = (row: Record<string, unknown>, userId: string) => {
  const mapped: Record<string, unknown> = { user_id: userId };
  Object.entries(row).forEach(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    mapped[snake] = ["first_one_on_one", "next_meeting"].includes(snake) && value === "" ? null : value;
  });
  delete mapped.id;
  return mapped;
};

const fromSnake = <T extends Record<string, unknown>>(row: Record<string, unknown>) => {
  const mapped: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key === "user_id" || key === "created_at" || key === "updated_at") return;
    const camel = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    mapped[camel] = value;
  });
  return mapped as T;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

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
    return { elapsed, phase, progress: elapsed / 100 };
  }, []);

  const metrics = useMemo(() => {
    const supplierSpend = data.suppliers.reduce((sum, item) => sum + Number(item.spend || 0), 0);
    const categorySpend = data.categories.reduce((sum, item) => sum + Number(item.spend || 0), 0);
    const savings = data.categories.reduce((sum, item) => sum + Number(item.savings || 0), 0);
    const highRiskSuppliers = data.suppliers.filter((item) => item.criticality === "Alta").length;
    const peopleMapped = data.people.filter((item) => item.notes || item.firstOneOnOne || item.sommos).length;
    return { supplierSpend, categorySpend, savings, highRiskSuppliers, peopleMapped };
  }, [data]);

  async function loadCloudData(userId: string) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const [people, stakeholders, suppliers, categories, diagnosis] = await Promise.all([
        supabase.from(tableNames.people).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.stakeholders).select("*").eq("user_id", userId).order("name"),
        supabase.from(tableNames.suppliers).select("*").eq("user_id", userId).order("spend", { ascending: false }),
        supabase.from(tableNames.categories).select("*").eq("user_id", userId).order("spend", { ascending: false }),
        supabase.from(tableNames.diagnosis).select("*").eq("user_id", userId).maybeSingle()
      ]);

      const failures = [people.error, stakeholders.error, suppliers.error, categories.error, diagnosis.error].filter(Boolean);
      if (failures.length) throw failures[0];

      setData({
        people: people.data?.map((row) => fromSnake<Person>(row)) ?? initialData.people,
        stakeholders: stakeholders.data?.map((row) => fromSnake<Stakeholder>(row)) ?? initialData.stakeholders,
        suppliers: suppliers.data?.map((row) => fromSnake<Supplier>(row)) ?? initialData.suppliers,
        categories: categories.data?.map((row) => fromSnake<Category>(row)) ?? initialData.categories,
        diagnosis: diagnosis.data ? fromSnake<Diagnosis>(diagnosis.data) : initialData.diagnosis
      });
    } catch (cloudError) {
      setError(cloudError instanceof Error ? cloudError.message : "Nao foi possivel carregar os dados do Supabase.");
    } finally {
      setLoading(false);
    }
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
    const row = {
      id: crypto.randomUUID(),
      ...emptyRows[collection]
    } as Person | Stakeholder | Supplier | Category;
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

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
  }

  if (loading) return <Shell><div className="p-6">Carregando...</div></Shell>;

  if (isSupabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <Shell>
      <header className="border-b border-line bg-paper/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-leaf">Suzano | Gerencia de Suprimentos</p>
            <h1 className="text-2xl font-semibold text-ink">First 100 Days</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isSupabaseConfigured && (
              <span className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-ink">
                Modo demo local
              </span>
            )}
            {session && (
              <button onClick={signOut} className="focus-ring inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <LogOut size={16} /> Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`focus-ring flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                  active ? "bg-ink text-white" : "border border-line bg-white text-ink"
                }`}
              >
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0">
          {error && <div className="mb-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm">{error}</div>}

          {activeTab === "dashboard" && (
            <Dashboard dayState={dayState} data={data} metrics={metrics} />
          )}
          {activeTab === "diagnosis" && (
            <DiagnosisPanel diagnosis={data.diagnosis} onChange={updateDiagnosis} />
          )}
          {activeTab !== "dashboard" && activeTab !== "diagnosis" && (
            <DataPanel
              activeTab={activeTab}
              query={query}
              setQuery={setQuery}
              data={data}
              addRow={addRow}
              upsertRow={upsertRow}
            />
          )}
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-paper text-ink">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;
    const signup = await supabase.auth.signUp({ email, password });
    setMessage(signup.error ? signup.error.message : "Usuario criado. Confirme o e-mail se o projeto exigir confirmacao.");
  }

  return (
    <Shell>
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-leaf">First 100 Days</p>
          <h1 className="mt-1 text-2xl font-semibold">Acesso executivo</h1>
          <div className="mt-6 space-y-3">
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="focus-ring w-full rounded-md bg-leaf px-4 py-2 font-semibold text-white">Entrar</button>
          </div>
          {message && <p className="mt-4 text-sm text-coral">{message}</p>}
        </form>
      </div>
    </Shell>
  );
}

function Dashboard({
  dayState,
  data,
  metrics
}: {
  dayState: { elapsed: number; phase: string; progress: number };
  data: AppData;
  metrics: { supplierSpend: number; categorySpend: number; savings: number; highRiskSuppliers: number; peopleMapped: number };
}) {
  const topSuppliers = data.suppliers.slice(0, 6);
  const topCategories = data.categories.slice(0, 6);
  const pillars = [
    "Match Strategy to Situation",
    "Accelerate Learning",
    "Build Coalitions",
    "Secure Early Wins",
    "Align Structure",
    "Build Your Team",
    "Create Vision"
  ];
  const priorityCards: Array<{ label: string; value: string; icon: typeof Users }> = [
    { label: "Pessoas mapeadas", value: `${metrics.peopleMapped}/${data.people.length}`, icon: Users },
    { label: "Fornecedores criticos", value: String(metrics.highRiskSuppliers), icon: ShieldAlert },
    { label: "Savings registrados", value: money(metrics.savings), icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric title="Dia atual" value={`${dayState.elapsed}/100`} note={dayState.phase} />
        <Metric title="Progresso" value={percent(dayState.progress)} note="Plano de transicao" />
        <Metric title="Spend categorias" value={money(metrics.categorySpend)} note={`${data.categories.length} categorias`} />
        <Metric title="Spend fornecedores" value={money(metrics.supplierSpend)} note={`${data.suppliers.length} fornecedores`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Prioridades executivas">
          <div className="space-y-3">
            {priorityCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-line p-3">
                <span className="flex items-center gap-2 text-sm"><Icon size={17} /> {label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Pilares">
          <div className="grid gap-2">
            {pillars.map((pillar) => (
              <div key={pillar} className="rounded-md border border-line bg-paper px-3 py-2 text-sm">{pillar}</div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RankedList title="Top fornecedores" items={topSuppliers.map((item) => [item.name, money(item.spend)])} />
        <RankedList title="Top categorias" items={topCategories.map((item) => [item.name, money(item.spend)])} />
      </section>
    </div>
  );
}

function DiagnosisPanel({ diagnosis, onChange }: { diagnosis: Diagnosis; onChange: (diagnosis: Diagnosis) => void }) {
  return (
    <Panel title="Diagnostico inicial">
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(diagnosis)
          .filter(([key]) => key !== "id")
          .map(([key, value]) => (
            <label key={key} className={key === "challenges" ? "md:col-span-2" : ""}>
              <span className="mb-1 block text-sm font-medium capitalize text-ink">{key}</span>
              <textarea
                className="focus-ring min-h-28 w-full rounded-md border border-line px-3 py-2"
                value={String(value)}
                onChange={(event) => onChange({ ...diagnosis, [key]: event.target.value })}
              />
            </label>
          ))}
      </div>
    </Panel>
  );
}

function DataPanel({
  activeTab,
  query,
  setQuery,
  data,
  addRow,
  upsertRow
}: {
  activeTab: CollectionKey;
  query: string;
  setQuery: (value: string) => void;
  data: AppData;
  addRow: (collection: CollectionKey) => void;
  upsertRow: <T extends { id: string }>(collection: CollectionKey, row: T) => void;
}) {
  const rows = data[activeTab].filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const titles: Record<CollectionKey, string> = {
    people: "Pessoas",
    stakeholders: "Stakeholders",
    suppliers: "Fornecedores estrategicos",
    categories: "Categorias"
  };

  return (
    <Panel
      title={titles[activeTab]}
      action={
        <button onClick={() => addRow(activeTab)} className="focus-ring rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white">
          Novo
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
        <Search size={17} />
        <input className="w-full bg-transparent outline-none" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {activeTab === "people" && <PeopleTable rows={rows as Person[]} onChange={(row) => upsertRow("people", row)} />}
      {activeTab === "stakeholders" && <StakeholderTable rows={rows as Stakeholder[]} onChange={(row) => upsertRow("stakeholders", row)} />}
      {activeTab === "suppliers" && <SupplierTable rows={rows as Supplier[]} onChange={(row) => upsertRow("suppliers", row)} />}
      {activeTab === "categories" && <CategoryTable rows={rows as Category[]} onChange={(row) => upsertRow("categories", row)} />}
    </Panel>
  );
}

function PeopleTable({ rows, onChange }: { rows: Person[]; onChange: (row: Person) => void }) {
  return <Cards rows={rows} render={(row) => (
    <>
      <Editable value={row.name} onChange={(value) => onChange({ ...row, name: value })} strong />
      <Editable value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
      <Editable value={row.cluster} onChange={(value) => onChange({ ...row, cluster: value })} />
      <Score label="Performance" value={row.performance} onChange={(value) => onChange({ ...row, performance: value })} />
      <Score label="Potencial" value={row.potential} onChange={(value) => onChange({ ...row, potential: value })} />
      <Editable value={row.notes} placeholder="Notas" onChange={(value) => onChange({ ...row, notes: value })} area />
    </>
  )} />;
}

function StakeholderTable({ rows, onChange }: { rows: Stakeholder[]; onChange: (row: Stakeholder) => void }) {
  return <Cards rows={rows} render={(row) => (
    <>
      <Editable value={row.name} onChange={(value) => onChange({ ...row, name: value })} strong />
      <Editable value={row.area} onChange={(value) => onChange({ ...row, area: value })} />
      <Editable value={row.role} onChange={(value) => onChange({ ...row, role: value })} />
      <Editable value={row.expectations} placeholder="Expectativas" onChange={(value) => onChange({ ...row, expectations: value })} area />
      <Editable value={row.nextAction} placeholder="Proxima acao" onChange={(value) => onChange({ ...row, nextAction: value })} />
    </>
  )} />;
}

function SupplierTable({ rows, onChange }: { rows: Supplier[]; onChange: (row: Supplier) => void }) {
  return <Cards rows={rows.slice(0, 120)} render={(row) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <Editable value={row.name} onChange={(value) => onChange({ ...row, name: value })} strong />
        <span className="whitespace-nowrap text-sm font-semibold text-leaf">{money(row.spend)}</span>
      </div>
      <Editable value={row.category} onChange={(value) => onChange({ ...row, category: value })} />
      <Editable value={row.contact} placeholder="Contato" onChange={(value) => onChange({ ...row, contact: value })} />
      <Editable value={row.opportunities} placeholder="Oportunidades" onChange={(value) => onChange({ ...row, opportunities: value })} area />
      <Editable value={row.risks} placeholder="Riscos" onChange={(value) => onChange({ ...row, risks: value })} area />
    </>
  )} />;
}

function CategoryTable({ rows, onChange }: { rows: Category[]; onChange: (row: Category) => void }) {
  return <Cards rows={rows} render={(row) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <Editable value={row.name} onChange={(value) => onChange({ ...row, name: value })} strong />
        <span className="whitespace-nowrap text-sm font-semibold text-leaf">{money(row.spend)}</span>
      </div>
      <Editable value={row.strategy} placeholder="Estrategia" onChange={(value) => onChange({ ...row, strategy: value })} area />
      <Editable value={row.owner} placeholder="Responsavel" onChange={(value) => onChange({ ...row, owner: value })} />
      <Editable value={String(row.savings)} placeholder="Savings" onChange={(value) => onChange({ ...row, savings: Number(value) || 0 })} />
      <Editable value={row.risks} placeholder="Riscos" onChange={(value) => onChange({ ...row, risks: value })} area />
    </>
  )} />;
}

function Cards<T extends { id: string }>({ rows, render }: { rows: T[]; render: (row: T) => ReactNode }) {
  return <div className="grid gap-3 xl:grid-cols-2">{rows.map((row) => <article key={row.id} className="rounded-md border border-line bg-white p-4">{render(row)}</article>)}</div>;
}

function Editable({ value, onChange, placeholder, strong, area }: { value: string; onChange: (value: string) => void; placeholder?: string; strong?: boolean; area?: boolean }) {
  const className = `focus-ring mb-2 w-full rounded-md border border-transparent bg-paper px-2 py-1 ${strong ? "font-semibold" : "text-sm"}`;
  if (area) return <textarea className={`${className} min-h-20`} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
  return <input className={className} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function Score({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mb-2 flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input className="accent-leaf" type="range" min="1" max="5" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <strong>{value}</strong>
    </label>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-soft">
      <p className="text-sm text-ink/70">{title}</p>
      <strong className="mt-2 block text-2xl">{value}</strong>
      <span className="mt-1 block text-sm text-leaf">{note}</span>
    </div>
  );
}

function RankedList({ title, items }: { title: string; items: string[][] }) {
  return (
    <Panel title={title}>
      <div className="space-y-2">
        {items.map(([name, value], index) => (
          <div key={name} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm">
            <span className="font-semibold text-leaf">{index + 1}</span>
            <span className="truncate">{name}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default App;
