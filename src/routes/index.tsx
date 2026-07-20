import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, HelpCircle, Share2, X } from "lucide-react";
import { StateCityPicker } from "@/components/StateCityPicker";
import { SuccessCheck } from "@/components/SuccessCheck";
import {
  getContent,
  getQuestions,
  saveResponse,
  visibleQuestions,
  displayCode,
  type PageContent,
  type Question,
} from "@/lib/survey-store";

export const Route = createFileRoute("/")({
  component: Survey,
});

type Answers = Record<string, unknown>;

function Survey() {
  const navigate = useNavigate();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [content, setContent] = useState<PageContent | null>(null);
  const [stage, setStage] = useState<"intro" | "survey" | "proposal" | "done">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ name: "", contact: "" });
  const startedAt = useRef<number>(0);
  const savedRef = useRef(false);
  const returnAfterProposalRef = useRef<number>(0);


  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        navigate({ to: "/admin" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [navigate]);

  useEffect(() => {
    setAllQuestions(getQuestions());
    setContent(getContent());
  }, []);

  const questions = useMemo(() => visibleQuestions(allQuestions), [allQuestions]);
  const total = questions.length;
  const currentQ = questions[i];
  const triggerBeforeId = content?.proposal.triggerBeforeId ?? 11;


  useEffect(() => {
    if (stage === "done" && !savedRef.current) {
      savedRef.current = true;
      saveResponse({
        durationSec: Math.round((Date.now() - startedAt.current) / 1000),
        answers,
        extras,
        contact,
      });
    }
  }, [stage, answers, extras, contact]);

  const progress = stage === "done" ? 1 : stage === "intro" || total === 0 ? 0 : Math.min(1, i / total);

  const answered = (q: Question): boolean => {
    const v = answers[q.id];
    if (q.optional) return true;
    if (v === undefined || v === null) return false;
    if (q.type === "multi") return Array.isArray(v) && (v as string[]).length > 0;
    if (q.type === "open") return typeof v === "string" && (v as string).trim().length >= 3;
    if (q.type === "scale") return typeof v === "number";
    return typeof v === "string" && (v as string).length > 0;
  };
  const canAdvance = currentQ ? answered(currentQ) : true;

  const next = () => {
    if (!canAdvance) return;
    // Trigger proposal when crossing forward across the trigger question.
    const nextIdx = i + 1;
    const nextQ = questions[nextIdx];
    if (nextQ && nextQ.id === triggerBeforeId) {
      returnAfterProposalRef.current = nextIdx;
      setI(nextIdx);
      setStage("proposal");
      return;
    }
    if (i === total - 1) { setStage("done"); return; }
    setI(nextIdx);
  };
  const back = () => {
    if (stage === "proposal") {
      // From the proposal, go back to the question that preceded it.
      const backIdx = Math.max(0, (returnAfterProposalRef.current || 0) - 1);
      setI(backIdx);
      setStage("survey");
      return;
    }
    if (stage === "done") {
      setStage("survey");
      setI(total - 1);
      return;
    }
    if (i === 0) { setStage("intro"); return; }
    setI((n) => n - 1);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (stage !== "survey") return;
      if (e.key === "Enter" && !e.shiftKey) {
        const t = e.target as HTMLElement;
        if (t?.tagName === "TEXTAREA" || t?.tagName === "INPUT") return;
        e.preventDefault(); next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const begin = () => { startedAt.current = Date.now(); setStage("survey"); };

  if (!content) return null;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <TopBar progress={progress} />
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20 md:px-8">
        {stage === "intro" && <Intro content={content} onStart={begin} />}
        {stage === "proposal" && (
          <Proposal
            content={content}
            onBack={back}
            onContinue={() => setStage("survey")}
          />
        )}
        {stage === "survey" && currentQ && (
          <QuestionView
            key={currentQ.id}
            q={currentQ}
            displayIndex={i}
            answers={answers}
            setAnswers={setAnswers}
            extras={extras}
            setExtras={setExtras}
            contact={contact}
            setContact={setContact}
            onBack={back}
            onNext={next}
            canAdvance={canAdvance}
            index={i}
            total={total}
          />
        )}
        {stage === "done" && <Done content={content} />}
      </main>
      <Footer />
    </div>
  );
}


/* ---------------- TOP BAR ---------------- */

function TopBar({ progress }: { progress: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">Guivos</span>
        </Link>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-grape via-bubble to-tangerine transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 opacity-70 mix-blend-screen"
          style={{
            width: `${progress * 100}%`,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.6s linear infinite",
          }}
        />
      </div>
    </header>
  );
}

/* ---------------- INTRO ---------------- */

function Intro({ content, onStart }: { content: PageContent; onStart: () => void }) {
  const c = content.intro;
  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-4 text-center sm:pt-8 md:pt-16">
      <div className="relative">
        <h1 className="font-display text-[clamp(2.25rem,7vw,5rem)] leading-[0.98] tracking-tight text-foreground">
          {c.titleTop} <br />
          <span className="relative inline-block">
            <span className="relative z-10">{c.titleAccent}</span>
            <span className="absolute inset-x-0 -bottom-1 h-3 rounded-full bg-lemon/70" />
          </span>
        </h1>

        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-left text-[15px] leading-relaxed text-foreground/85 sm:mt-10 sm:text-[16px]">
          {c.paragraphs.map((p, i) => (<p key={i}>{p}</p>))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:mt-12">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 rounded-full bg-grape px-8 py-4 text-base font-semibold text-white shadow-[0_16px_40px_-12px_var(--grape)] transition-all hover:scale-[1.03] hover:bg-ink sm:px-12 sm:py-6 sm:text-lg"
          >
            {c.ctaLabel}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </button>
          <div className="text-xs font-medium text-muted-foreground">{c.timeHint}</div>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground/70 sm:flex">
            <CornerDownLeft className="h-3 w-3" strokeWidth={1.75} />
            Enter para avançar
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROPOSAL ---------------- */

function Proposal({ content, onBack, onContinue }: { content: PageContent; onBack: () => void; onContinue: () => void }) {
  const c = content.proposal;
  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-2 sm:pt-4">
      <div className="relative">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-grape">
          {c.eyebrow}
        </span>
        <h2 className="font-display mt-3 text-[clamp(1.75rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight sm:mt-4">
          {c.titleTop} <span className="text-grape">{c.titleAccent}</span>
        </h2>

        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-foreground/85 sm:mt-8 sm:text-[16px]">
          {c.paragraphs.map((p, i) => (<p key={i}>{p}</p>))}

          <div className="pt-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Por exemplo:
            </div>
            <div className="mt-3 space-y-3">
              {c.examples.map((ex, i) => (
                <ExampleCard key={i} color={ex.color} label={ex.label} text={ex.text} />
              ))}
            </div>
          </div>

          {c.closing.map((p, i) => (<p key={i}>{p}</p>))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6 sm:mt-10">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
            Anterior
          </button>
          <button
            onClick={onContinue}
            className="group inline-flex items-center gap-3 rounded-full bg-grape px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_var(--grape)] transition-all hover:scale-[1.02] hover:bg-ink sm:px-7 sm:py-4"
          >
            {c.ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  );
}


function ExampleCard({ color, label, text }: { color: "mint" | "bubble" | "sky" | "lemon"; label: string; text: string }) {
  const bg = { mint: "bg-mint/15", bubble: "bg-bubble/15", sky: "bg-sky/15", lemon: "bg-lemon/25" }[color];
  const dot = { mint: "bg-mint", bubble: "bg-bubble", sky: "bg-sky", lemon: "bg-lemon" }[color];
  return (
    <div className={`rounded-2xl border border-border ${bg} px-4 py-4 sm:px-5`}>
      <div className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="font-display text-base font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{text}</p>
    </div>
  );
}

/* ---------------- QUESTION VIEW ---------------- */

function QuestionView({
  q, displayIndex, answers, setAnswers, extras, setExtras, contact, setContact, onBack, onNext, canAdvance, index, total,
}: {
  q: Question;
  displayIndex: number;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  extras: Record<string, string>;
  setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  contact: { name: string; contact: string };
  setContact: (v: { name: string; contact: string }) => void;
  onBack: () => void; onNext: () => void; canAdvance: boolean; index: number; total: number;
}) {
  const set = (v: unknown) => setAnswers((a) => ({ ...a, [q.id]: v }));

  // Contact block: show on the "intention/participation" question (default id 19)
  // when the first or second option is picked (positive intent).
  const showContact = useMemo(() => {
    if (q.id !== 19) return false;
    if (q.type !== "single") return false;
    const v = answers[q.id];
    const positive = q.options.slice(0, 2).map((o) => o.code);
    return typeof v === "string" && positive.includes(v);
  }, [q, answers]);

  const titleClass = (() => {
    switch (q.titleStyle) {
      case "section":
        return "font-display text-[clamp(1.25rem,3vw,1.75rem)] font-semibold leading-[1.2] tracking-tight text-foreground";
      case "quote":
        return "font-display text-[clamp(1.35rem,3.2vw,2rem)] italic font-medium leading-[1.25] tracking-tight text-foreground";
      default:
        return "font-display text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.15] tracking-tight text-foreground";
    }
  })();

  const frameClass = (() => {
    switch (q.frame) {
      case "card":
        return "rounded-3xl border border-border bg-card p-5 sm:p-8";
      case "accent":
        return "rounded-3xl border-2 border-grape/30 bg-gradient-to-br from-grape/5 to-bubble/5 p-5 sm:p-8";
      default:
        return "";
    }
  })();

  const nextBtnRef = useRef<HTMLDivElement>(null);
  const scrollToNext = () => {
    // Wait a tick so the DOM (e.g. contact block) can render before scrolling.
    setTimeout(() => {
      nextBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
  };

  return (
    <section className="anim-fade-up mx-auto max-w-2xl">
      <div className={frameClass}>
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-semibold text-grape">{displayCode(displayIndex)}</span>
          {q.optional && (
            <span className="inline-flex rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Opcional
            </span>
          )}
          {q.showInfo && q.info && q.info.trim().length > 0 && (
            <InfoBubble content={q.info} />
          )}
        </div>

        <h2 className={`mt-3 ${titleClass}`}>{q.title}</h2>
        {q.helper && (
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            {q.helper}
          </p>
        )}

        <div className="mt-7 sm:mt-8">
          {q.type === "single" && q.asDropdown && (
            <Dropdown q={q} value={answers[q.id] as string | undefined} onChange={set} extras={extras} setExtras={setExtras} />
          )}
          {q.type === "single" && !q.asDropdown && (
            <SingleList
              q={q}
              value={answers[q.id] as string | undefined}
              onChange={(v) => { set(v); scrollToNext(); }}
            />
          )}
          {q.type === "multi" && (
            <MultiList q={q} value={(answers[q.id] as string[]) || []} onChange={set} />
          )}
          {q.type === "scale" && (
            <ScalePicker
              q={q}
              value={answers[q.id] as number | undefined}
              onChange={(v) => { set(v); scrollToNext(); }}
            />
          )}
          {q.type === "open" && (
            <OpenInput q={q} value={(answers[q.id] as string) || ""} onChange={set} />
          )}
        </div>

        {showContact && (
          <div className="anim-fade-up mt-8 rounded-2xl border-2 border-grape/20 bg-gradient-to-br from-grape/5 to-bubble/5 p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-grape">
              Deixe seu contato — é opcional
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Usaremos apenas para convidar você para a primeira experiência.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                placeholder="Nome"
                className="rounded-xl border-2 border-border bg-card px-4 py-3 text-sm focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
              />
              <input
                value={contact.contact}
                onChange={(e) => setContact({ ...contact, contact: e.target.value })}
                placeholder="E-mail ou telefone"
                className="rounded-xl border-2 border-border bg-card px-4 py-3 text-sm focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
              />
            </div>
          </div>
        )}

        <div ref={nextBtnRef}>
          <NavBar onBack={onBack} onNext={onNext} canAdvance={canAdvance} last={index === total - 1} />
        </div>
      </div>
    </section>
  );
}

/* ---------------- INFO BUBBLE (help popover) ---------------- */

function InfoBubble({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Informação de ajuda"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-grape hover:text-grape"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="anim-fade-up absolute left-0 top-8 z-20 w-[min(320px,80vw)] rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-grape">Ajuda</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-foreground/85">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}


/* ---------------- INPUTS ---------------- */

function SingleList({ q, value, onChange }: { q: Extract<Question, { type: "single" }>; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {q.options.map((o) => {
        const selected = value === o.code;
        return (
          <button
            key={o.code}
            onClick={() => onChange(o.code)}
            className={[
              "group relative w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-all sm:px-5",
              selected
                ? "border-grape bg-grape text-white shadow-[0_10px_30px_-14px_var(--grape)]"
                : "border-border bg-card hover:-translate-y-0.5 hover:border-grape/60 hover:shadow-sm",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <span className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                selected ? "border-white bg-white" : "border-border bg-secondary",
              ].join(" ")}>
                {selected ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-grape" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug sm:text-[15px]">{o.label}</span>
              {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MultiList({ q, value, onChange }: { q: Extract<Question, { type: "multi" }>; value: string[]; onChange: (v: string[]) => void }) {
  const max = q.max;
  const toggle = (code: string) => {
    if (value.includes(code)) return onChange(value.filter((c) => c !== code));
    if (max && value.length >= max) return;
    onChange([...value, code]);
  };
  return (
    <>
      {max && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          {value.length}/{max} selecionadas
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {q.options.map((o) => {
          const selected = value.includes(o.code);
          const disabled = !selected && !!max && value.length >= max;
          return (
            <button
              key={o.code}
              onClick={() => toggle(o.code)}
              disabled={disabled}
              className={[
                "group relative w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-all sm:px-5",
                selected
                  ? "border-tangerine bg-tangerine text-white shadow-[0_10px_30px_-14px_var(--tangerine)]"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-tangerine/60 hover:shadow-sm",
                disabled ? "opacity-40 hover:translate-y-0" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <span className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  selected ? "border-white bg-white" : "border-border bg-secondary",
                ].join(" ")}>
                  {selected && <Check className="h-3.5 w-3.5 text-tangerine" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug sm:text-[15px]">{o.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function ScalePicker({ q, value, onChange }: { q: Extract<Question, { type: "scale" }>; value?: number; onChange: (v: number) => void }) {
  const nums = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []);
  const colorFor = (n: number) => {
    if (n <= 3) return "bg-sky text-white border-sky";
    if (n <= 6) return "bg-lemon text-ink border-lemon";
    if (n <= 8) return "bg-tangerine text-white border-tangerine";
    return "bg-grape text-white border-grape";
  };
  return (
    <div>
      <div className="grid grid-cols-11 gap-1 sm:gap-2">
        {nums.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={[
                "relative flex aspect-square items-center justify-center rounded-lg border-2 font-display text-xs font-semibold transition-all sm:rounded-xl sm:text-base",
                active
                  ? `${colorFor(n)} scale-110 shadow-lg`
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-grape/60",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground sm:text-xs">
        <span className="max-w-[45%]">0 · {q.minLabel}</span>
        <span className="max-w-[45%] text-right">{q.maxLabel} · 10</span>
      </div>
      {value !== undefined && (
        <div className="anim-pop mt-6 flex items-center gap-4 rounded-2xl bg-secondary p-4 sm:p-5">
          <div className="font-display text-4xl font-bold text-grape sm:text-5xl">{value}</div>
          <div>
            <div className="text-sm font-semibold">Você selecionou {value}/10</div>
            <div className="text-xs text-muted-foreground">
              {value <= 3 ? q.minLabel : value >= 8 ? q.maxLabel : "Intermediário"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OpenInput({ q, value, onChange }: { q: Extract<Question, { type: "open" }>; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder}
        rows={5}
        className="w-full resize-none rounded-2xl border-2 border-border bg-card p-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15 sm:p-5 sm:text-lg"
      />
      <div className="mt-2 text-xs text-muted-foreground">
        {value.length} caracteres {q.optional ? "· opcional" : "· mínimo 3"}
      </div>
    </div>
  );
}

function Dropdown({ q, value, onChange, extras, setExtras }: {
  q: Extract<Question, { type: "single" }>;
  value?: string; onChange: (v: string) => void;
  extras: Record<string, string>;
  setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const selected = q.options.find((o) => o.code === value);
  return (
    <div className="space-y-5">
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border-2 border-border bg-card px-4 py-3.5 pr-12 font-display text-base font-semibold text-foreground focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15 sm:px-5 sm:py-4 sm:text-xl"
        >
          <option value="" disabled>Selecione uma opção</option>
          {q.options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
        <ArrowRight className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" strokeWidth={2} />
      </div>
      {selected && q.extra && q.id === 2 && (
        <StateCityPicker
          stateLabel={selected.label}
          value={extras[q.extra.key] || ""}
          onChange={(city) => {
            const key = q.extra!.key;
            setExtras((x) => ({ ...x, [key]: city }));
          }}
        />
      )}
      {selected && q.extra && q.id !== 2 && (
        <div className="anim-fade-up">
          <label className="text-xs font-medium text-muted-foreground">
            {q.extra.placeholder}
          </label>
          <input
            value={extras[q.extra.key] || ""}
            onChange={(e) => {
              const key = q.extra!.key;
              setExtras((x) => ({ ...x, [key]: e.target.value }));
            }}
            className="mt-1.5 w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
            placeholder="Ex.: São Paulo"
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- NAV ---------------- */

function NavBar({ onBack, onNext, canAdvance, last }: { onBack: () => void; onNext: () => void; canAdvance: boolean; last: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6 sm:mt-10">
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
        Anterior
      </button>
      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={[
          "group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all sm:gap-3 sm:px-6 sm:py-3.5",
          canAdvance
            ? "bg-grape text-white shadow-[0_10px_30px_-14px_var(--grape)] hover:scale-[1.03] hover:bg-ink"
            : "cursor-not-allowed bg-secondary text-muted-foreground",
        ].join(" ")}
      >
        {last ? "Finalizar" : "Próxima"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ---------------- DONE ---------------- */

function Done({ content }: { content: PageContent }) {
  const c = content.done;
  return (
    <section className="anim-fade-up relative mx-auto max-w-2xl pt-4 text-center">
      <div className="relative">
        <div className="mb-8 flex justify-center sm:mb-10">
          <SuccessCheck size={96} />
        </div>
        <h2 className="font-display text-[clamp(1.75rem,5.5vw,4rem)] leading-[1] tracking-tight">
          {c.titleTop} <br />
          <span className="text-grape">{c.titleAccent}</span> {c.tail}
        </h2>
        {c.paragraphs.map((p, i) => (
          <p key={i} className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            {p}
          </p>
        ))}
        <p className="mt-10 font-display text-base italic text-muted-foreground sm:mt-12 sm:text-xl">
          {c.signature}
        </p>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.origin + "/" : "";
    const shareData = { title: "Pesquisa Oficial Guivos", text: "Contribua com a pesquisa da Guivos.", url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  };
  return (
    <footer className="relative z-10 mt-auto border-t border-border py-5">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 text-[11px] text-muted-foreground sm:px-6 sm:text-xs md:px-8">
        <span className="min-w-0 truncate">Pesquisa Oficial Guivos</span>
        <button
          type="button"
          onClick={share}
          aria-label="Compartilhar a pesquisa"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-grape hover:text-grape sm:text-xs"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copied ? "Link copiado" : "Compartilhar"}
        </button>
        <a
          href="https://rodrigo.run"
          target="_blank"
          rel="noopener noreferrer"
          className="justify-self-end tracking-wide text-muted-foreground/70 transition-colors hover:text-grape"
        >
          DEV — rodrigo.run
        </a>
      </div>
    </footer>
  );
}
