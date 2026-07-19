import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  MessageSquareQuote,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Lock } from "lucide-react";
import {
  DEFAULT_QUESTIONS,
  clearResponses,
  deleteResponse,
  getQuestions,
  getResponses,
  resetQuestions,
  saveQuestions,
  type Question,
  type ResponseRecord,
} from "@/lib/survey-store";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Painel · Guivos VAL-002" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ADMIN_PASSWORD = "guivos2026";
const AUTH_KEY = "guivos-admin-auth";

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"overview" | "responses" | "questions">("overview");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(AUTH_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setQuestions(getQuestions());
    setResponses(getResponses());
  }, [authed]);

  const reloadResponses = () => setResponses(getResponses());
  const reloadQuestions = () => setQuestions(getQuestions());

  if (!authed) return <AuthGate onSuccess={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="font-display text-xl font-bold tracking-tight">Guivos</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Painel
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-grape hover:text-grape"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Voltar à pesquisa
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-5 md:px-8">
          {(
            [
              { k: "overview", label: "Visão geral", icon: Eye },
              { k: "responses", label: `Respostas (${responses.length})`, icon: MessageSquareQuote },
              { k: "questions", label: `Perguntas (${questions.length})`, icon: FileText },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={[
                  "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
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

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {tab === "overview" && <Overview responses={responses} questions={questions} />}
        {tab === "responses" && (
          <ResponsesTab
            responses={responses}
            questions={questions}
            onReload={reloadResponses}
          />
        )}
        {tab === "questions" && (
          <QuestionsTab
            questions={questions}
            setQuestions={setQuestions}
            onReloaded={reloadQuestions}
          />
        )}
      </main>
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
    const targets = [10, 11, 13, 17];
    return targets.map((id) => {
      const q = questions.find((x) => x.id === id);
      const values = responses.map((r) => r.answers[id]).filter((v) => typeof v === "number") as number[];
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { id, title: q?.title ?? `Q${id}`, avg, count: values.length };
    });
  }, [responses, questions]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard color="grape" label="Respostas totais" value={totals.totalR} icon={<Users className="h-5 w-5" />} />
        <StatCard color="tangerine" label="Duração média" value={`${totals.avgDuration}s`} />
        <StatCard color="mint" label="Intenção alta (18.4/18.5)" value={totals.intent} />
        <StatCard color="bubble" label="Quer participar (19.1)" value={totals.wantsExperience} />
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Médias das escalas</h3>
          <span className="text-xs text-muted-foreground">0 = mínimo · 10 = máximo</span>
        </div>
        <div className="space-y-4">
          {scaleAverages.map((s) => (
            <div key={s.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">Q{s.id} · {s.title}</span>
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

      {totals.totalR === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center">
          <h3 className="font-display text-2xl font-semibold">Ainda sem respostas</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compartilhe o link da pesquisa para começar a coletar. As respostas são
            armazenadas localmente neste navegador.
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
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full bg-${color}`} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="font-display text-3xl font-bold">{value}</div>
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
      r.id,
      r.at,
      r.durationSec,
      ...questions.map((q) => {
        const v = r.answers[q.id];
        return Array.isArray(v) ? (v as string[]).join("|") : (v ?? "");
      }),
      r.contact.name,
      r.contact.contact,
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
        <h2 className="font-display text-2xl font-semibold">Respostas coletadas</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-grape">
            <Download className="h-4 w-4" strokeWidth={2} /> CSV
          </button>
          <button onClick={exportJSON} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-grape">
            <Download className="h-4 w-4" strokeWidth={2} /> JSON
          </button>
          <button
            onClick={() => {
              if (confirm("Apagar todas as respostas? Esta ação não pode ser desfeita.")) {
                clearResponses(); onReload();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-card px-4 py-2 text-sm text-destructive hover:bg-destructive hover:text-white"
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
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
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
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="font-display text-lg font-semibold">Resposta</div>
            <div className="text-xs text-muted-foreground">
              {new Date(record.at).toLocaleString("pt-BR")} · {record.durationSec}s
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-6 py-5">
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
            {questions.map((q) => {
              const v = record.answers[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Q{q.code} · Seção {q.section}
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

  const update = (idx: number, patch: Partial<Question>) => {
    const copy = [...questions];
    copy[idx] = { ...copy[idx], ...patch } as Question;
    setQuestions(copy);
    setDirty(true);
  };
  const updateOption = (idx: number, optIdx: number, label: string) => {
    const q = questions[idx];
    if (q.type !== "single" && q.type !== "multi") return;
    const options = q.options.map((o, i) => (i === optIdx ? { ...o, label } : o));
    update(idx, { options } as Partial<Question>);
  };

  const save = () => { saveQuestions(questions); setDirty(false); };
  const reset = () => {
    if (!confirm("Restaurar todas as perguntas ao padrão original?")) return;
    resetQuestions(); setQuestions(DEFAULT_QUESTIONS); onReloaded(); setDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Perguntas</h2>
          <p className="text-sm text-muted-foreground">Edite título, texto de ajuda, obrigatoriedade e rótulos das opções.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-grape">
            <RotateCcw className="h-4 w-4" strokeWidth={2} /> Restaurar padrão
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className={[
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all",
              dirty ? "bg-grape shadow-[0_8px_20px_-10px_var(--grape)] hover:bg-ink" : "cursor-not-allowed bg-secondary text-muted-foreground",
            ].join(" ")}
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
            {dirty ? "Salvar alterações" : "Sem alterações"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <details key={q.id} className="group rounded-2xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold text-grape">{q.code}</span>
                <div>
                  <div className="text-sm font-semibold">{q.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Seção {q.section} · {q.type}
                    {"options" in q ? ` · ${q.options.length} opções` : ""}
                    {q.optional ? " · opcional" : ""}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground group-open:hidden">Editar ▾</div>
              <div className="hidden text-xs text-muted-foreground group-open:block">Fechar ▴</div>
            </summary>
            <div className="space-y-4 border-t border-border px-5 py-5">
              <Field label="Título">
                <input
                  value={q.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                />
              </Field>
              <Field label="Texto de ajuda (opcional)">
                <textarea
                  value={q.helper || ""}
                  onChange={(e) => update(idx, { helper: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!q.optional}
                  onChange={(e) => update(idx, { optional: e.target.checked })}
                  className="h-4 w-4 accent-grape"
                />
                Resposta opcional
              </label>

              {(q.type === "single" || q.type === "multi") && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opções</div>
                  <div className="space-y-2">
                    {q.options.map((o, i) => (
                      <div key={o.code} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground w-12">{o.code}</span>
                        <input
                          value={o.label}
                          onChange={(e) => updateOption(idx, i, e.target.value)}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {q.type === "scale" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rótulo do 0">
                    <input
                      value={q.minLabel}
                      onChange={(e) => update(idx, { minLabel: e.target.value } as Partial<Question>)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                    />
                  </Field>
                  <Field label="Rótulo do 10">
                    <input
                      value={q.maxLabel}
                      onChange={(e) => update(idx, { maxLabel: e.target.value } as Partial<Question>)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                    />
                  </Field>
                </div>
              )}
              {q.type === "open" && (
                <Field label="Placeholder">
                  <input
                    value={q.placeholder}
                    onChange={(e) => update(idx, { placeholder: e.target.value } as Partial<Question>)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-grape focus:outline-none focus:ring-2 focus:ring-grape/20"
                  />
                </Field>
              )}
            </div>
          </details>
        ))}
      </div>
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

/* ---------------- helpers ---------------- */

function downloadFile(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
