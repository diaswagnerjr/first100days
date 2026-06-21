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
    const stamped = ["methodologyPillars", "handoverChecklist", "coachingSessions", "clientRoutines"].includes(collection) ? { ...row, updatedAt: …14095 tokens truncated…nChange={(value) => setDraft({ ...current, contact: value })} />
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
