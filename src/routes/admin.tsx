import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Lock,
  MessageSquareQuote,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Type,
  Users,
  X,
} from "lucide-react";
import {
  DEFAULT_QUESTIONS,
  DEFAULT_CONTENT,
  clearResponses,
  convertQuestion,
  deleteResponse,
  displayCode,
  getContent,
  getQuestions,
  getResponses,
  newQuestion,
  nextOptionCode,
  resetContent,
  resetQuestions,
  saveContent,
  saveQuestions,
  visibleQuestions,
  type Frame,
  type PageContent,
  type Question,
  type QType,
  type ResponseRecord,
  type TitleStyle,
} from "@/lib/survey-store";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Painel · Guivos" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ADMIN_PASSWORD = "guivos2026";
const AUTH_KEY = "guivos-admin-auth";

type Tab = "overview" | "responses" | "questions" | "content";

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(AUTH_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setQuestions(getQuestions());
    setContent(getContent());
    setResponses(getResponses());
  }, [authed]);

  const reloadResponses = () => setResponses(getResponses());
  const reloadQuestions = () => setQuestions(getQuestions());

  if (!authed) return <AuthGate onSuccess={() => setAuthed(true)} />;

  const visibleCount = visibleQuestions(questions).length;

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">Guivos</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Painel
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-grape hover:text-grape sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Voltar à pesquisa</span>
            <span className="sm:hidden">Voltar</span>
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 md:px-8">
          {(
            [
              { k: "overview", label: "Visão geral", icon: Eye },
              { k: "responses", label: `Respostas (${responses.length})`, icon: MessageSquareQuote },
              { k: "questions", label: `Perguntas (${visibleCount}/${questions.length})`, icon: FileText },
              { k: "content", label: "Textos das páginas", icon: Type },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={[
                  "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                  active ? "border-grape text-grape" : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {tab === "overview" && <Overview responses={responses} questions={questions} />}
        {tab === "responses" && (
          <ResponsesTab responses={responses} questions={questions} onReload={reloadResponses} />
        )}
        {tab === "questions" && (
          <QuestionsTab
            questions={questions}
            setQuestions={setQuestions}
            onReloaded={reloadQuestions}
          />
        )}
        {tab === "content" && (
          <ContentTab content={content} setContent={setContent} />
        )}
      </main>
    </div>
  );
}

/* ---------------- AUTH GATE ---------------- */

function AuthGate({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      onSuccess();
    } else {
      setErr(true);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 sm:px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="flex items-center gap-2 text-grape">
          <Lock className="h-5 w-5" strokeWidth={2} />
          <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Acesso restrito</span>
        </div>
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">Painel Guivos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe a senha do gestor para continuar.
        </p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          placeholder="Senha"
          className="mt-5 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
        />
        {err && (
          <div className="mt-2 text-xs font-medium text-destructive">Senha incorreta.</div>
        )}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-grape px-5 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-ink"
        >
          Entrar
        </button>
        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground hover:text-grape">
          Voltar à pesquisa
        </Link>
      </form>
    </div>
  );
}

/* ---------------- OVERVIEW ---------------- */

function Overview({ responses, questions }: { responses: ResponseRecord[]; questions: Question[] }) {
  const totals = useMemo(() => {
    const totalR = responses.length;
    const avgDuration = totalR ? Math.round(responses.reduce((s, r) => s + r.durationSec, 0) / totalR) : 0;
    const intent = responses.filter((r) => ["18.4", "18.5"].includes(r.answers[18] as string)).length;
    const wantsExperience = responses.filter((r) => r.answers[19] === "19.1").length;
    return { totalR, avgDuration, intent, wantsExperience };
  }, [responses]);

  const scaleAverages = useMemo(() => {
    return questions
      .filter((q) => q.type === "scale" && !q.hidden)
      .map((q) => {
        const values = responses.map((r) => r.answers[q.id]).filter((v) => typeof v === "number") as number[];
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        return { id: q.id, title: q.title, avg, count: values.length };
      });
  }, [responses, questions]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
        <StatCard color="grape" label="Respostas totais" value={totals.totalR} icon={<Users className="h-5 w-5" />} />
        <StatCard color="tangerine" label="Duração média" value={`${totals.avgDuration}s`} />
        <StatCard color="mint" label="Intenção alta (18.4/18.5)" value={totals.intent} />
        <StatCard color="bubble" label="Quer participar (19.1)" value={totals.wantsExperience} />
      </div>

      {scaleAverages.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold sm:text-xl">Médias das escalas</h3>
            <span className="text-xs text-muted-foreground">0–10</span>
          </div>
          <div className="space-y-4">
            {scaleAverages.map((s) => (
              <div key={s.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">Q{s.id} · {s.title}</span>
                  <span className="font-display font-semibold text-grape">
                    {s.avg.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">({s.count})</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky via-lemon to-grape"
                    style={{ width: `${(s.avg / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {totals.totalR === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center sm:p-10">
          <h3 className="font-display text-xl font-semibold sm:text-2xl">Ainda sem respostas</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compartilhe o link da pesquisa para começar a coletar.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-grape px-5 py-3 text-sm font-semibold text-white hover:bg-ink"
          >
            Abrir pesquisa
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ color, label, value, icon }: { color: string; label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full bg-${color}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="font-display text-2xl font-bold sm:text-3xl">{value}</div>
        {icon && <div className={`text-${color}`}>{icon}</div>}
      </div>
    </div>
  );
}

/* ---------------- RESPONSES ---------------- */

function ResponsesTab({ responses, questions, onReload }: {
  responses: ResponseRecord[]; questions: Question[]; onReload: () => void;
}) {
  const [selected, setSelected] = useState<ResponseRecord | null>(null);

  const exportCSV = () => {
    const cols = ["id", "at", "durationSec", ...questions.map((q) => `q${q.id}`), "contato_nome", "contato"];
    const rows = responses.map((r) => [
      r.id, r.at, r.durationSec,
      ...questions.map((q) => {
        const v = r.answers[q.id];
        return Array.isArray(v) ? (v as string[]).join("|") : (v ?? "");
      }),
      r.contact.name, r.contact.contact,
    ]);
    const csv = [cols, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, `guivos-respostas-${Date.now()}.csv`, "text/csv");
  };

  const exportJSON = () => {
    downloadFile(JSON.stringify(responses, null, 2), `guivos-respostas-${Date.now()}.json`, "application/json");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Respostas coletadas</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs hover:border-grape sm:px-4 sm:text-sm">
            <Download className="h-4 w-4" strokeWidth={2} /> CSV
          </button>
          <button onClick={exportJSON} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs hover:border-grape sm:px-4 sm:text-sm">
            <Download className="h-4 w-4" strokeWidth={2} /> JSON
          </button>
          <button
            onClick={() => {
              if (confirm("Apagar todas as respostas? Esta ação não pode ser desfeita.")) {
                clearResponses(); onReload();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-card px-3 py-2 text-xs text-destructive hover:bg-destructive hover:text-white sm:px-4 sm:text-sm"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} /> Limpar
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma resposta ainda.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-3xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Quando</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Área (Q4)</th>
                  <th className="px-5 py-3 text-left">Intenção (Q18)</th>
                  <th className="px-5 py-3 text-left">Duração</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3 whitespace-nowrap">{new Date(r.at).toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3">{labelFor(questions, 2, r.answers[2]) ?? "—"}</td>
                    <td className="px-5 py-3">{labelFor(questions, 4, r.answers[4]) ?? "—"}</td>
                    <td className="px-5 py-3">{labelFor(questions, 18, r.answers[18]) ?? "—"}</td>
                    <td className="px-5 py-3">{r.durationSec}s</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelected(r)}
                        className="mr-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-grape hover:text-grape"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={2} /> Ver
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remover esta resposta?")) { deleteResponse(r.id); onReload(); }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {responses.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString("pt-BR")} · {r.durationSec}s</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Estado:</span> {labelFor(questions, 2, r.answers[2]) ?? "—"}</div>
                  <div><span className="text-muted-foreground">Área:</span> {labelFor(questions, 4, r.answers[4]) ?? "—"}</div>
                  <div><span className="text-muted-foreground">Intenção:</span> {labelFor(questions, 18, r.answers[18]) ?? "—"}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setSelected(r)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs hover:border-grape hover:text-grape">
                    <Eye className="h-3.5 w-3.5" strokeWidth={2} /> Ver
                  </button>
                  <button
                    onClick={() => { if (confirm("Remover esta resposta?")) { deleteResponse(r.id); onReload(); } }}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-2 text-xs text-destructive hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ResponseDetail record={selected} questions={questions} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function labelFor(questions: Question[], id: number, code: unknown) {
  if (typeof code !== "string") return null;
  const q = questions.find((x) => x.id === id);
  if (!q || (q.type !== "single" && q.type !== "multi")) return code;
  return q.options.find((o) => o.code === code)?.label ?? code;
}

function ResponseDetail({ record, questions, onClose }: { record: ResponseRecord; questions: Question[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="anim-fade-up relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-3xl bg-background md:rounded-3xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <div className="font-display text-base font-semibold sm:text-lg">Resposta</div>
            <div className="truncate text-xs text-muted-foreground">
              {new Date(record.at).toLocaleString("pt-BR")} · {record.durationSec}s
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-2 hover:bg-secondary">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5 sm:px-6">
          {(record.contact.name || record.contact.contact) && (
            <div className="mb-5 rounded-2xl bg-grape/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-grape">Contato</div>
              <div className="mt-1 text-sm">
                <div><b>Nome:</b> {record.contact.name || "—"}</div>
                <div><b>Contato:</b> {record.contact.contact || "—"}</div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {questions.filter((q) => !q.hidden).map((q, idx) => {
              const v = record.answers[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {displayCode(idx)} · Seção {q.section}
                  </div>
                  <div className="mt-1 text-sm font-medium">{q.title}</div>
                  <div className="mt-2 text-sm text-foreground/90">
                    {renderAnswer(q, v)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderAnswer(q: Question, v: unknown) {
  if (v === undefined || v === null || v === "") return <span className="text-muted-foreground">— sem resposta</span>;
  if (q.type === "scale") return <span className="font-display text-2xl font-bold text-grape">{v as number}<span className="text-sm text-muted-foreground">/10</span></span>;
  if (q.type === "open") return <span className="italic">"{v as string}"</span>;
  if (q.type === "multi") {
    const arr = v as string[];
    return (
      <div className="flex flex-wrap gap-1.5">
        {arr.map((code) => (
          <span key={code} className="inline-flex rounded-full bg-tangerine/15 px-2.5 py-1 text-xs text-tangerine">
            {q.options.find((o) => o.code === code)?.label ?? code}
          </span>
        ))}
      </div>
    );
  }
  const label = q.type === "single" ? q.options.find((o) => o.code === v)?.label : String(v);
  return <span className="inline-flex rounded-full bg-grape/10 px-3 py-1 text-xs font-medium text-grape">{label}</span>;
}

/* ---------------- QUESTIONS EDITOR ---------------- */

function QuestionsTab({ questions, setQuestions, onReloaded }: {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  onReloaded: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  // Compute display index (only visible questions get numbers)
  const displayIndexById = useMemo(() => {
    const map = new Map<number, number>();
    let n = 0;
    for (const q of questions) {
      if (!q.hidden) map.set(q.id, n++);
    }
    return map;
  }, [questions]);

  const patch = (id: number, p: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? ({ ...q, ...p } as Question) : q)));
    setDirty(true);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= questions.length) return;
    const copy = [...questions];
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    setQuestions(copy);
    setDirty(true);
  };

  const toggleHidden = (id: number) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    patch(id, { hidden: !q.hidden });
  };

  const remove = (id: number) => {
    if (!confirm("Excluir esta pergunta? Esta ação não pode ser desfeita.")) return;
    setQuestions(questions.filter((q) => q.id !== id));
    setDirty(true);
  };

  const duplicate = (id: number) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    const clone = JSON.parse(JSON.stringify(q)) as Question;
    const nq = newQuestion(q.type);
    clone.id = nq.id;
    clone.code = String(nq.id);
    if ("options" in clone) {
      clone.options = clone.options.map((o, i) => ({ code: `${clone.id}.${i + 1}`, label: o.label }));
    }
    clone.title = `${q.title} (cópia)`;
    const idx = questions.findIndex((x) => x.id === id);
    const copy = [...questions];
    copy.splice(idx + 1, 0, clone);
    setQuestions(copy);
    setDirty(true);
  };

  const addQ = (type: QType) => {
    const nq = newQuestion(type);
    setQuestions([...questions, nq]);
    setOpenId(nq.id);
    setDirty(true);
  };

  const changeType = (id: number, next: QType) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    const converted = convertQuestion(q, next);
    setQuestions(questions.map((x) => (x.id === id ? converted : x)));
    setDirty(true);
  };

  const save = () => { saveQuestions(questions); setDirty(false); };
  const reset = () => {
    if (!confirm("Restaurar todas as perguntas ao padrão original?")) return;
    resetQuestions(); setQuestions(DEFAULT_QUESTIONS); onReloaded(); setDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Perguntas</h2>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar. Ocultas não aparecem para o usuário e a numeração é recalculada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs hover:border-grape sm:px-4 sm:text-sm">
            <RotateCcw className="h-4 w-4" strokeWidth={2} /> Restaurar padrão
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-all sm:px-5 sm:text-sm",
              dirty ? "bg-grape shadow-[0_8px_20px_-10px_var(--grape)] hover:bg-ink" : "cursor-not-allowed bg-secondary text-muted-foreground",
            ].join(" ")}
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {dirty ? "Salvar alterações" : "Sem alterações"}
          </button>
        </div>
      </div>

      <AddQuestionBar onAdd={addQ} />

      <DragList
        items={questions}
        onMove={move}
        render={(q, idx) => {
          const dcode = displayIndexById.has(q.id) ? displayCode(displayIndexById.get(q.id)!) : "—";
          const open = openId === q.id;
          return (
            <div className={[
              "rounded-2xl border bg-card transition-all",
              q.hidden ? "border-dashed border-border/70 opacity-70" : "border-border",
            ].join(" ")}>
              <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                <span className="drag-handle cursor-grab touch-none text-muted-foreground hover:text-foreground" title="Arrastar">
                  <GripVertical className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-grape/10 font-mono text-xs font-bold text-grape sm:w-11 sm:text-sm">
                  {dcode}
                </span>
                <button
                  onClick={() => setOpenId(open ? null : q.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-semibold">{q.title || "(sem título)"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {typeLabel(q.type)}
                    {"options" in q ? ` · ${q.options.length} opções` : ""}
                    {q.optional ? " · opcional" : ""}
                    {q.hidden ? " · oculta" : ""}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn title={q.hidden ? "Exibir" : "Ocultar"} onClick={() => toggleHidden(q.id)}>
                    {q.hidden ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                  </IconBtn>
                  <IconBtn title="Duplicar" onClick={() => duplicate(q.id)}>
                    <Copy className="h-4 w-4" strokeWidth={2} />
                  </IconBtn>
                  <IconBtn title="Excluir" onClick={() => remove(q.id)} destructive>
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </IconBtn>
                </div>
              </div>
              {open && (
                <QuestionEditor
                  q={q}
                  onPatch={(p) => patch(q.id, p)}
                  onChangeType={(t) => changeType(q.id, t)}
                />
              )}
            </div>
          );
        }}
      />

      {questions.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma pergunta. Adicione uma acima.
        </div>
      )}
    </div>
  );
}

function typeLabel(t: QType) {
  return t === "single" ? "Escolha única" : t === "multi" ? "Múltipla escolha" : t === "scale" ? "Escala 0–10" : "Texto aberto";
}

function AddQuestionBar({ onAdd }: { onAdd: (t: QType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-3 sm:p-4">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adicionar</span>
      {(["single", "multi", "scale", "open"] as QType[]).map((t) => (
        <button
          key={t}
          onClick={() => onAdd(t)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-grape hover:text-grape"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {typeLabel(t)}
        </button>
      ))}
    </div>
  );
}

function IconBtn({ children, onClick, title, destructive }: { children: React.ReactNode; onClick: () => void; title: string; destructive?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors",
        destructive ? "text-muted-foreground hover:border-destructive hover:text-destructive" : "text-muted-foreground hover:border-grape hover:text-grape",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ---- Drag list (HTML5 native) ---- */

function DragList<T extends { id: number }>({
  items, onMove, render,
}: {
  items: T[]; onMove: (from: number, to: number) => void;
  render: (item: T, idx: number) => React.ReactNode;
}) {
  const dragIdx = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="space-y-2.5">
      {items.map((it, idx) => (
        <div
          key={it.id}
          draggable
          onDragStart={(e) => {
            dragIdx.current = idx;
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => { e.preventDefault(); if (over !== idx) setOver(idx); }}
          onDragLeave={() => setOver((o) => (o === idx ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            const from = dragIdx.current;
            if (from !== null) onMove(from, idx);
            dragIdx.current = null; setOver(null);
          }}
          onDragEnd={() => { dragIdx.current = null; setOver(null); }}
          className={over === idx ? "ring-2 ring-grape/50 rounded-2xl" : ""}
        >
          {render(it, idx)}
        </div>
      ))}
    </div>
  );
}

/* ---- Per-question editor ---- */

function QuestionEditor({
  q, onPatch, onChangeType,
}: {
  q: Question;
  onPatch: (p: Partial<Question>) => void;
  onChangeType: (t: QType) => void;
}) {
  const updateOption = (i: number, label: string) => {
    if (q.type !== "single" && q.type !== "multi") return;
    const options = q.options.map((o, k) => (k === i ? { ...o, label } : o));
    onPatch({ options } as Partial<Question>);
  };
  const addOption = () => {
    if (q.type !== "single" && q.type !== "multi") return;
    const code = nextOptionCode(q);
    onPatch({ options: [...q.options, { code, label: `Opção ${q.options.length + 1}` }] } as Partial<Question>);
  };
  const removeOption = (i: number) => {
    if (q.type !== "single" && q.type !== "multi") return;
    onPatch({ options: q.options.filter((_, k) => k !== i) } as Partial<Question>);
  };
  const moveOption = (from: number, to: number) => {
    if (q.type !== "single" && q.type !== "multi") return;
    if (from === to || to < 0 || to >= q.options.length) return;
    const opts = [...q.options];
    const [it] = opts.splice(from, 1);
    opts.splice(to, 0, it);
    onPatch({ options: opts } as Partial<Question>);
  };

  return (
    <div className="space-y-5 border-t border-border px-4 py-5 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de resposta">
          <select
            value={q.type}
            onChange={(e) => onChangeType(e.target.value as QType)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
          >
            <option value="single">Escolha única (marcação)</option>
            <option value="multi">Múltipla escolha (caixa de seleção)</option>
            <option value="scale">Escala 0–10</option>
            <option value="open">Texto aberto</option>
          </select>
        </Field>
        <Field label="Estilo do título">
          <select
            value={q.titleStyle || "display"}
            onChange={(e) => onPatch({ titleStyle: e.target.value as TitleStyle })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
          >
            <option value="display">Display (grande)</option>
            <option value="section">Seção (médio)</option>
            <option value="quote">Citação (itálico)</option>
          </select>
        </Field>
        <Field label="Moldura">
          <select
            value={q.frame || "plain"}
            onChange={(e) => onPatch({ frame: e.target.value as Frame })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
          >
            <option value="plain">Plana (sem quadro)</option>
            <option value="card">Card</option>
            <option value="accent">Destaque</option>
          </select>
        </Field>
        <Field label="Seção">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
            <input
              value={q.section}
              onChange={(e) => onPatch({ section: e.target.value })}
              placeholder="A"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
            />
            <input
              value={q.sectionLabel}
              onChange={(e) => onPatch({ sectionLabel: e.target.value })}
              placeholder="Perfil"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
            />
          </div>
        </Field>
      </div>

      <Field label="Título da pergunta">
        <textarea
          value={q.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
        />
      </Field>
      <Field label="Texto de ajuda (opcional)">
        <textarea
          value={q.helper || ""}
          onChange={(e) => onPatch({ helper: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
        />
      </Field>

      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={!!q.showInfo}
            onChange={(e) => onPatch({ showInfo: e.target.checked })}
            className="h-4 w-4 accent-grape"
          />
          Exibir ícone de ajuda com informação complementar
        </label>
        <textarea
          value={q.info || ""}
          onChange={(e) => onPatch({ info: e.target.value })}
          rows={3}
          disabled={!q.showInfo}
          placeholder="Informação complementar exibida ao clicar no ícone de ajuda desta pergunta."
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20 disabled:opacity-50"
        />
      </div>


      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!q.optional}
            onChange={(e) => onPatch({ optional: e.target.checked })}
            className="h-4 w-4 accent-grape"
          />
          Resposta opcional
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!q.hidden}
            onChange={(e) => onPatch({ hidden: e.target.checked })}
            className="h-4 w-4 accent-grape"
          />
          Ocultar do usuário
        </label>
        {q.type === "single" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!(q as Extract<Question, { type: "single" }>).asDropdown}
              onChange={(e) => onPatch({ asDropdown: e.target.checked } as Partial<Question>)}
              className="h-4 w-4 accent-grape"
            />
            Apresentar como dropdown
          </label>
        )}
        {q.type === "multi" && (
          <label className="flex items-center gap-2 text-sm">
            Máx. escolhas:
            <input
              type="number"
              min={0}
              value={(q as Extract<Question, { type: "multi" }>).max ?? ""}
              onChange={(e) => onPatch({ max: e.target.value ? Number(e.target.value) : undefined } as Partial<Question>)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
        )}
      </div>

      {(q.type === "single" || q.type === "multi") && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opções</div>
            <button
              onClick={addOption}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-grape hover:text-grape"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Adicionar opção
            </button>
          </div>
          <OptionsDragList
            options={q.options}
            onMove={moveOption}
            onLabel={updateOption}
            onRemove={removeOption}
          />
        </div>
      )}

      {q.type === "scale" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rótulo do 0">
            <input
              value={q.minLabel}
              onChange={(e) => onPatch({ minLabel: e.target.value } as Partial<Question>)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
            />
          </Field>
          <Field label="Rótulo do 10">
            <input
              value={q.maxLabel}
              onChange={(e) => onPatch({ maxLabel: e.target.value } as Partial<Question>)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
            />
          </Field>
        </div>
      )}

      {q.type === "open" && (
        <Field label="Placeholder">
          <input
            value={q.placeholder}
            onChange={(e) => onPatch({ placeholder: e.target.value } as Partial<Question>)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
          />
        </Field>
      )}
    </div>
  );
}

function OptionsDragList({
  options, onMove, onLabel, onRemove,
}: {
  options: { code: string; label: string }[];
  onMove: (from: number, to: number) => void;
  onLabel: (i: number, l: string) => void;
  onRemove: (i: number) => void;
}) {
  const dragIdx = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div
          key={o.code}
          draggable
          onDragStart={(e) => { dragIdx.current = i; e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i); }}
          onDragLeave={() => setOver((v) => (v === i ? null : v))}
          onDrop={(e) => { e.preventDefault(); const from = dragIdx.current; if (from !== null) onMove(from, i); dragIdx.current = null; setOver(null); }}
          onDragEnd={() => { dragIdx.current = null; setOver(null); }}
          className={[
            "flex items-center gap-2 rounded-xl border bg-background p-2",
            over === i ? "border-grape" : "border-border",
          ].join(" ")}
        >
          <span className="cursor-grab text-muted-foreground" title="Arrastar">
            <GripVertical className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="grid h-7 w-8 shrink-0 place-items-center rounded-md bg-secondary font-mono text-[10px] font-semibold text-muted-foreground">
            {String.fromCharCode(65 + i)}
          </span>
          <input
            value={o.label}
            onChange={(e) => onLabel(i, e.target.value)}
            className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-grape/20"
          />
          <button
            onClick={() => onRemove(i)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Remover opção"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

/* ---------------- CONTENT (PAGES) EDITOR ---------------- */

function ContentTab({ content, setContent }: { content: PageContent; setContent: (c: PageContent) => void }) {
  const [dirty, setDirty] = useState(false);
  const patch = (p: Partial<PageContent>) => { setContent({ ...content, ...p }); setDirty(true); };
  const save = () => { saveContent(content); setDirty(false); };
  const reset = () => {
    if (!confirm("Restaurar todos os textos ao padrão?")) return;
    resetContent(); setContent(DEFAULT_CONTENT); setDirty(false);
  };

  const updIntro = (p: Partial<PageContent["intro"]>) => patch({ intro: { ...content.intro, ...p } });
  const updProp = (p: Partial<PageContent["proposal"]>) => patch({ proposal: { ...content.proposal, ...p } });
  const updDone = (p: Partial<PageContent["done"]>) => patch({ done: { ...content.done, ...p } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Textos das páginas</h2>
          <p className="text-sm text-muted-foreground">Edite intro, proposta e finalização.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs hover:border-grape sm:px-4 sm:text-sm">
            <RotateCcw className="h-4 w-4" strokeWidth={2} /> Restaurar
          </button>
          <button
            onClick={save} disabled={!dirty}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white sm:px-5 sm:text-sm",
              dirty ? "bg-grape hover:bg-ink" : "cursor-not-allowed bg-secondary text-muted-foreground",
            ].join(" ")}
          >
            <Save className="h-4 w-4" strokeWidth={2} /> {dirty ? "Salvar" : "Sem alterações"}
          </button>
        </div>
      </div>

      {/* Intro */}
      <Section title="Intro">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título — linha 1"><TxtIn value={content.intro.titleTop} onChange={(v) => updIntro({ titleTop: v })} /></Field>
          <Field label="Título — destaque"><TxtIn value={content.intro.titleAccent} onChange={(v) => updIntro({ titleAccent: v })} /></Field>
        </div>
        <Field label="Parágrafos (um por linha)">
          <TxtArea rows={5} value={content.intro.paragraphs.join("\n\n")} onChange={(v) => updIntro({ paragraphs: v.split(/\n\s*\n/).filter(Boolean) })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rótulo do botão"><TxtIn value={content.intro.ctaLabel} onChange={(v) => updIntro({ ctaLabel: v })} /></Field>
          <Field label="Tempo estimado"><TxtIn value={content.intro.timeHint} onChange={(v) => updIntro({ timeHint: v })} /></Field>
        </div>
      </Section>

      {/* Proposal */}
      <Section title="Proposta (interlúdio)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Eyebrow"><TxtIn value={content.proposal.eyebrow} onChange={(v) => updProp({ eyebrow: v })} /></Field>
          <Field label="Aparecer antes da pergunta ID">
            <input type="number" value={content.proposal.triggerBeforeId ?? ""} onChange={(e) => updProp({ triggerBeforeId: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Título — linha 1"><TxtIn value={content.proposal.titleTop} onChange={(v) => updProp({ titleTop: v })} /></Field>
          <Field label="Título — destaque"><TxtIn value={content.proposal.titleAccent} onChange={(v) => updProp({ titleAccent: v })} /></Field>
        </div>
        <Field label="Parágrafos de abertura (separe por linha em branco)">
          <TxtArea rows={4} value={content.proposal.paragraphs.join("\n\n")} onChange={(v) => updProp({ paragraphs: v.split(/\n\s*\n/).filter(Boolean) })} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exemplos (cards)</div>
            <button
              onClick={() => updProp({ examples: [...content.proposal.examples, { color: "sky", label: "Novo exemplo", text: "" }] })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-grape hover:text-grape"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {content.proposal.examples.map((ex, i) => (
              <div key={i} className="space-y-2 rounded-2xl border border-border bg-background p-3">
                <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                  <select
                    value={ex.color}
                    onChange={(e) => {
                      const arr = [...content.proposal.examples];
                      arr[i] = { ...ex, color: e.target.value as PageContent["proposal"]["examples"][number]["color"] };
                      updProp({ examples: arr });
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="mint">Verde (mint)</option>
                    <option value="bubble">Rosa (bubble)</option>
                    <option value="sky">Azul (sky)</option>
                    <option value="lemon">Amarelo (lemon)</option>
                  </select>
                  <TxtIn value={ex.label} onChange={(v) => { const arr = [...content.proposal.examples]; arr[i] = { ...ex, label: v }; updProp({ examples: arr }); }} />
                  <button
                    onClick={() => { const arr = content.proposal.examples.filter((_, k) => k !== i); updProp({ examples: arr }); }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <TxtArea rows={3} value={ex.text} onChange={(v) => { const arr = [...content.proposal.examples]; arr[i] = { ...ex, text: v }; updProp({ examples: arr }); }} />
              </div>
            ))}
          </div>
        </div>
        <Field label="Parágrafos de fechamento">
          <TxtArea rows={4} value={content.proposal.closing.join("\n\n")} onChange={(v) => updProp({ closing: v.split(/\n\s*\n/).filter(Boolean) })} />
        </Field>
        <Field label="Rótulo do botão"><TxtIn value={content.proposal.ctaLabel} onChange={(v) => updProp({ ctaLabel: v })} /></Field>
      </Section>

      {/* Done */}
      <Section title="Página final">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Título — linha 1"><TxtIn value={content.done.titleTop} onChange={(v) => updDone({ titleTop: v })} /></Field>
          <Field label="Título — destaque"><TxtIn value={content.done.titleAccent} onChange={(v) => updDone({ titleAccent: v })} /></Field>
          <Field label="Título — final"><TxtIn value={content.done.tail} onChange={(v) => updDone({ tail: v })} /></Field>
        </div>
        <Field label="Parágrafos"><TxtArea rows={4} value={content.done.paragraphs.join("\n\n")} onChange={(v) => updDone({ paragraphs: v.split(/\n\s*\n/).filter(Boolean) })} /></Field>
        <Field label="Assinatura"><TxtArea rows={3} value={content.done.signature} onChange={(v) => updDone({ signature: v })} /></Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-grape" strokeWidth={2} />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TxtIn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20" />
  );
}
function TxtArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20" />
  );
}

/* ---------------- helpers ---------------- */

function downloadFile(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
