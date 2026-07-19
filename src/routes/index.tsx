import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, Sparkle, Settings } from "lucide-react";
import { BrandBackdrop, Mascot } from "@/components/BrandBackdrop";
import {
  getQuestions,
  saveResponse,
  type Question,
} from "@/lib/survey-store";

export const Route = createFileRoute("/")({
  component: Survey,
});

type Answers = Record<string, unknown>;

function Survey() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<"intro" | "survey" | "proposal" | "done">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ name: "", contact: "" });
  const [proposalSeen, setProposalSeen] = useState(false);
  const startedAt = useRef<number>(0);
  const savedRef = useRef(false);

  useEffect(() => { setQuestions(getQuestions()); }, []);

  const total = questions.length;
  const currentQ = questions[i];

  useEffect(() => {
    if (stage === "survey" && currentQ?.id === 11 && !proposalSeen) setStage("proposal");
  }, [stage, currentQ, proposalSeen]);

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
    if (i === total - 1) { setStage("done"); return; }
    setI((n) => n + 1);
  };
  const back = () => {
    if (i === 0) { setStage("intro"); return; }
    setI((n) => n - 1);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (stage !== "survey") return;
      if (e.key === "Enter" && !e.shiftKey) {
        const t = e.target as HTMLElement;
        if (t?.tagName === "TEXTAREA") return;
        e.preventDefault(); next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const begin = () => { startedAt.current = Date.now(); setStage("survey"); };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <TopBar progress={progress} stage={stage} step={i + 1} total={total} />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pt-24 pb-32 md:px-8">
        {stage === "intro" && <Intro onStart={begin} />}
        {stage === "proposal" && <Proposal onContinue={() => { setProposalSeen(true); setStage("survey"); }} />}
        {stage === "survey" && currentQ && (
          <QuestionView
            key={currentQ.id}
            q={currentQ}
            answers={answers}
            setAnswers={setAnswers}
            extras={extras}
            setExtras={setExtras}
            onBack={back}
            onNext={next}
            canAdvance={canAdvance}
            index={i}
            total={total}
          />
        )}
        {stage === "done" && <Done answers={answers} contact={contact} setContact={setContact} extras={extras} />}
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- TOP BAR ---------------- */

function TopBar({ progress, stage, step, total }: { progress: number; stage: string; step: number; total: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <Mascot color="grape" size={34} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold text-foreground">guivos</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">VAL-002</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:block">
            {stage === "survey" ? `${String(step).padStart(2, "0")} / ${String(total).padStart(2, "0")}` :
             stage === "done" ? "Concluído" :
             stage === "proposal" ? "A proposta" : "Pesquisa"}
          </div>
          <Link
            to="/admin"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-grape hover:text-grape"
            title="Painel de gestão"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-grape via-bubble to-tangerine transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </header>
  );
}

/* ---------------- INTRO ---------------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="anim-fade-up relative grid grid-cols-1 gap-14 pt-8 md:grid-cols-12 md:gap-10 md:pt-14">
      <BrandBackdrop variant="hero" />
      <div className="relative md:col-span-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkle className="h-3.5 w-3.5 fill-tangerine stroke-tangerine" />
          Pesquisa conceitual · 2026
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.95] tracking-tight text-foreground">
          Construindo <br />
          <span className="relative inline-block">
            <span className="relative z-10">a Guivos.</span>
            <span className="absolute inset-x-0 -bottom-1 h-3 rounded-full bg-lemon/70" />
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Uma plataforma pensada para acompanhar a evolução das pessoas ao longo da vida.
          Antes de construir, precisamos escutar — inclusive as respostas críticas.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 rounded-full bg-grape px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_var(--grape)] transition-all hover:scale-[1.02] hover:bg-ink"
          >
            Começar a pesquisa
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Enter para avançar
          </div>
        </div>
      </div>

      <aside className="relative md:col-span-5 md:pt-6">
        <div className="relative flex justify-center md:justify-end">
          <div className="anim-pop absolute -left-6 top-8 md:left-auto md:-right-6 md:top-0">
            <Mascot color="tangerine" size={90} wave />
          </div>
          <div className="anim-pop [animation-delay:120ms] absolute right-4 top-32 md:right-32 md:top-40">
            <Mascot color="mint" size={64} />
          </div>
          <div className="anim-pop [animation-delay:240ms] absolute -bottom-6 left-10 md:left-0">
            <Mascot color="bubble" size={54} />
          </div>
        </div>
        <div className="relative mt-40 rounded-3xl border border-border bg-card p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)] md:mt-56">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-grape">
            Sobre a pesquisa
          </div>
          <ul className="mt-4 space-y-3.5 text-sm">
            {[
              ["Tempo estimado", "5 a 7 minutos"],
              ["Formato", "22 perguntas, uma por vez"],
              ["Objetivo", "Compreender, não convencer"],
              ["Privacidade", "Contato é opcional"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-baseline justify-between gap-4 border-b border-dashed border-border pb-3 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-display font-semibold text-foreground">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}

/* ---------------- PROPOSAL ---------------- */

function Proposal({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-4">
      <BrandBackdrop variant="quiet" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Mascot color="sky" size={54} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-grape">
            Interlúdio · A proposta
          </span>
        </div>
        <h2 className="font-display mt-6 text-[clamp(2rem,4.5vw,3.75rem)] leading-[1] tracking-tight">
          Antes de <span className="text-grape">continuarmos.</span>
        </h2>

        <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-foreground/85">
          <p>
            A Guivos está sendo criada para ajudar pessoas a avançar em áreas como
            carreira, saúde, finanças, estudos, relacionamentos, espiritualidade e
            projetos pessoais.
          </p>
          <p>
            A partir da compreensão do momento que você está vivendo e do que deseja
            alcançar, poderá ajudar a organizar objetivos, identificar próximos passos
            e encontrar oportunidades mais adequadas para você.
          </p>

          <div className="my-8 grid gap-3 md:grid-cols-2">
            <ExampleCard color="mint" label="Saúde" text="Grupos de corrida, pedal, esportes, profissionais, eventos e experiências relacionadas ao seu objetivo." />
            <ExampleCard color="bubble" label="Espiritualidade" text="Grupos, movimentos, encontros, conteúdos, projetos e pessoas que contribuam para esse caminho." />
          </div>

          <p>
            Em vez de apresentar muitas opções, a Guivos buscará destacar o que faz mais sentido para o seu momento — e ajudar você a transformar oportunidades em ações concretas.
          </p>
          <p className="rounded-2xl bg-grape/10 px-5 py-4 font-display text-xl font-semibold text-grape">
            A Guivos não decidirá por você.
          </p>
          <p>
            Seu papel será ajudar você a enxergar possibilidades, escolher caminhos
            e acompanhar sua evolução. Ainda estamos construindo — e queremos entender
            se essa proposta realmente poderia contribuir para sua vida.
          </p>
        </div>

        <button
          onClick={onContinue}
          className="group mt-10 inline-flex items-center gap-3 rounded-full bg-grape px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_var(--grape)] transition-all hover:scale-[1.02] hover:bg-ink"
        >
          Continuar a pesquisa
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}

function ExampleCard({ color, label, text }: { color: "mint" | "bubble" | "sky" | "lemon"; label: string; text: string }) {
  const bg = { mint: "bg-mint/15", bubble: "bg-bubble/15", sky: "bg-sky/15", lemon: "bg-lemon/25" }[color];
  return (
    <div className={`rounded-2xl border border-border ${bg} p-5`}>
      <div className="flex items-center gap-2.5">
        <Mascot color={color} size={40} />
        <span className="font-display text-lg font-semibold">{label}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{text}</p>
    </div>
  );
}

/* ---------------- QUESTION VIEW ---------------- */

function QuestionView({
  q, answers, setAnswers, extras, setExtras, onBack, onNext, canAdvance, index, total,
}: {
  q: Question;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  extras: Record<string, string>;
  setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void; onNext: () => void; canAdvance: boolean; index: number; total: number;
}) {
  const set = (v: unknown) => setAnswers((a) => ({ ...a, [q.id]: v }));
  const accent = SECTION_ACCENT[q.section] ?? "grape";

  return (
    <section className="anim-fade-up grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-14">
      <aside className="md:col-span-4 md:pt-2">
        <div className="sticky top-24">
          <div className={`inline-flex items-center gap-2 rounded-full bg-${accent}/15 px-3 py-1.5`}>
            <span className={`h-2 w-2 rounded-full bg-${accent}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
              Seção {q.section} · {q.sectionLabel}
            </span>
          </div>
          <div className="font-display mt-6 text-[clamp(4.5rem,10vw,8rem)] leading-none tracking-tight text-foreground">
            {q.code}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} de {String(total).padStart(2, "0")}
          </div>
          {q.optional && (
            <div className="mt-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              Opcional
            </div>
          )}
          <div className="mt-8 hidden md:block">
            <Mascot color={accent as never} size={70} />
          </div>
        </div>
      </aside>

      <div className="md:col-span-8">
        <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.08] tracking-tight text-foreground">
          {q.title}
        </h2>
        {q.helper && (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {q.helper}
          </p>
        )}

        <div className="mt-8">
          {q.type === "single" && q.asDropdown && (
            <Dropdown q={q} value={answers[q.id] as string | undefined} onChange={set} extras={extras} setExtras={setExtras} />
          )}
          {q.type === "single" && !q.asDropdown && (
            <SingleGrid q={q} value={answers[q.id] as string | undefined} onChange={set} />
          )}
          {q.type === "multi" && (
            <MultiGrid q={q} value={(answers[q.id] as string[]) || []} onChange={set} />
          )}
          {q.type === "scale" && (
            <ScalePicker q={q} value={answers[q.id] as number | undefined} onChange={set} />
          )}
          {q.type === "open" && (
            <OpenInput q={q} value={(answers[q.id] as string) || ""} onChange={set} />
          )}
        </div>

        <NavBar onBack={onBack} onNext={onNext} canAdvance={canAdvance} last={index === total - 1} />
      </div>
    </section>
  );
}

const SECTION_ACCENT: Record<string, string> = {
  A: "grape",
  B: "tangerine",
  C: "sky",
  D: "mint",
  E: "bubble",
  F: "lemon",
};

/* ---------------- INPUTS ---------------- */

function SingleGrid({ q, value, onChange }: { q: Extract<Question, { type: "single" }>; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {q.options.map((o, idx) => {
        const selected = value === o.code;
        return (
          <button
            key={o.code}
            onClick={() => onChange(o.code)}
            className={[
              "group relative rounded-2xl border-2 px-5 py-4 text-left transition-all",
              selected
                ? "border-grape bg-grape text-white shadow-[0_10px_30px_-14px_var(--grape)]"
                : "border-border bg-card hover:-translate-y-0.5 hover:border-grape/60 hover:shadow-sm",
            ].join(" ")}
          >
            <div className="flex items-center gap-3.5">
              <span className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all",
                selected ? "border-white/70 bg-white text-grape" : "border-border bg-secondary text-muted-foreground",
              ].join(" ")}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 text-[15px] font-medium leading-snug">{o.label}</span>
              {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MultiGrid({ q, value, onChange }: { q: Extract<Question, { type: "multi" }>; value: string[]; onChange: (v: string[]) => void }) {
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
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {q.options.map((o) => {
          const selected = value.includes(o.code);
          const disabled = !selected && !!max && value.length >= max;
          return (
            <button
              key={o.code}
              onClick={() => toggle(o.code)}
              disabled={disabled}
              className={[
                "group relative rounded-2xl border-2 px-5 py-4 text-left transition-all",
                selected
                  ? "border-tangerine bg-tangerine text-white shadow-[0_10px_30px_-14px_var(--tangerine)]"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-tangerine/60 hover:shadow-sm",
                disabled ? "opacity-40 hover:translate-y-0" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3.5">
                <span className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  selected ? "border-white bg-white" : "border-border bg-secondary",
                ].join(" ")}>
                  {selected && <Check className="h-3.5 w-3.5 text-tangerine" strokeWidth={3} />}
                </span>
                <span className="flex-1 text-[15px] font-medium leading-snug">{o.label}</span>
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
      <div className="grid grid-cols-11 gap-1.5 sm:gap-2">
        {nums.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={[
                "relative flex aspect-square items-center justify-center rounded-xl border-2 font-display text-base font-semibold transition-all",
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
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>0 · {q.minLabel}</span>
        <span>{q.maxLabel} · 10</span>
      </div>
      {value !== undefined && (
        <div className="anim-pop mt-8 flex items-center gap-4 rounded-2xl bg-secondary p-5">
          <div className="font-display text-5xl font-bold text-grape">{value}</div>
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
        className="w-full resize-none rounded-2xl border-2 border-border bg-card p-5 text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
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
          className="w-full appearance-none rounded-2xl border-2 border-border bg-card px-5 py-4 pr-12 font-display text-xl font-semibold text-foreground focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
        >
          <option value="" disabled>Selecione seu estado</option>
          {q.options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
        <ArrowRight className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" strokeWidth={2} />
      </div>
      {selected && q.extra && (
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
    <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
        Anterior
      </button>
      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={[
          "group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition-all",
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

function Done({ answers, contact, setContact }: {
  answers: Answers;
  contact: { name: string; contact: string };
  setContact: (v: { name: string; contact: string }) => void;
  extras: Record<string, string>;
}) {
  const wantsContact = answers[19] === "19.1" || answers[19] === "19.2";
  const [sent, setSent] = useState(false);

  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-4">
      <BrandBackdrop variant="hero" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Mascot color="tangerine" size={64} wave />
          <Mascot color="mint" size={48} />
          <Mascot color="bubble" size={40} />
        </div>
        <h2 className="font-display mt-8 text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-tight">
          Você acabou de <br />
          <span className="text-grape">ajudar a construir</span> a Guivos.
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Obrigado por dedicar alguns minutos do seu tempo. Cada resposta será
          analisada com cuidado e poderá influenciar decisões importantes antes
          do lançamento.
        </p>

        {wantsContact && !sent && (
          <div className="mt-12 rounded-3xl border-2 border-grape/20 bg-gradient-to-br from-grape/5 to-bubble/5 p-7">
            <div className="text-xs font-semibold uppercase tracking-wider text-grape">
              Você indicou interesse em participar
            </div>
            <h3 className="font-display mt-2 text-2xl font-semibold">Deixe seu contato — é opcional.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Não integra os KPIs. Usaremos apenas para convidar você para a primeira experiência.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                placeholder="Nome"
                className="rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
              />
              <input
                value={contact.contact}
                onChange={(e) => setContact({ ...contact, contact: e.target.value })}
                placeholder="E-mail ou telefone"
                className="rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/15"
              />
            </div>
            <button
              onClick={() => setSent(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-grape px-6 py-3 text-sm font-semibold text-white hover:bg-ink"
            >
              Enviar contato <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}

        <p className="mt-14 font-display text-xl italic text-muted-foreground">
          Esperamos que, no futuro, a Guivos possa contribuir para que mais pessoas
          encontrem próximos passos e oportunidades capazes de transformar suas vidas.
        </p>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer() {
  return (
    <footer className="relative z-10 border-t border-border py-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 text-xs text-muted-foreground md:px-8">
        <span>Guivos · Pesquisa Conceitual B2C</span>
        <Link to="/admin" className="hover:text-grape">Painel de gestão</Link>
      </div>
    </footer>
  );
}
