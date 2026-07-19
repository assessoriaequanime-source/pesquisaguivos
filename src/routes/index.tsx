import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, Settings } from "lucide-react";
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
        if (t?.tagName === "TEXTAREA" || t?.tagName === "INPUT") return;
        e.preventDefault(); next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const begin = () => { startedAt.current = Date.now(); setStage("survey"); };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <TopBar progress={progress} />
      <main className="relative z-10 mx-auto max-w-5xl px-5 pt-24 pb-32 sm:px-6 md:px-8">
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
            contact={contact}
            setContact={setContact}
            onBack={back}
            onNext={next}
            canAdvance={canAdvance}
            index={i}
            total={total}
          />
        )}
        {stage === "done" && <Done />}
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- TOP BAR ---------------- */

function TopBar({ progress }: { progress: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-foreground">Guivos</span>
        </Link>
        <Link
          to="/admin"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-grape hover:text-grape"
          title="Painel de gestão"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>
      {/* Discrete, modern progress: soft gradient bar with an animated glossy stripe */}
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

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-8 text-center md:pt-16">
      <div className="relative">
        <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.98] tracking-tight text-foreground">
          Construindo <br />
          <span className="relative inline-block">
            <span className="relative z-10">a Guivos.</span>
            <span className="absolute inset-x-0 -bottom-1 h-3 rounded-full bg-lemon/70" />
          </span>
        </h1>

        <div className="mx-auto mt-10 max-w-2xl space-y-5 text-left text-[15px] leading-relaxed text-foreground/85 sm:text-[16px]">
          <p>
            Ajude a construir uma plataforma pensada para acompanhar a evolução das
            pessoas ao longo da vida.
          </p>
          <p>
            Não existem respostas certas ou erradas. Respostas críticas ou negativas
            são tão importantes quanto respostas positivas. O objetivo não é convencer
            você, mas compreender o que realmente faz sentido para sua vida.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 rounded-full bg-grape px-10 py-5 text-base font-semibold text-white shadow-[0_16px_40px_-12px_var(--grape)] transition-all hover:scale-[1.03] hover:bg-ink sm:px-12 sm:py-6 sm:text-lg"
          >
            Iniciar
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </button>
          <div className="text-xs font-medium text-muted-foreground">
            Tempo estimado: 5 a 7 minutos
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <CornerDownLeft className="h-3 w-3" strokeWidth={1.75} />
            Enter para avançar
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROPOSAL ---------------- */

function Proposal({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="anim-fade-up relative mx-auto max-w-3xl pt-4">
      
      <div className="relative">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-grape">
          Interlúdio · A proposta
        </span>
        <h2 className="font-display mt-4 text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight">
          Antes de <span className="text-grape">continuarmos.</span>
        </h2>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-foreground/85 sm:text-[16px]">
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

          <div className="pt-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Por exemplo:
            </div>
            <div className="mt-3 space-y-3">
              <ExampleCard color="mint" label="Saúde" text="Grupos de corrida, pedal, esportes, profissionais, eventos e experiências relacionadas ao seu objetivo." />
              <ExampleCard color="bubble" label="Espiritualidade" text="Grupos, movimentos, encontros, conteúdos, projetos e pessoas que contribuam para esse caminho." />
            </div>
          </div>

          <p>
            O mesmo princípio poderá ser aplicado a outras áreas da vida, conectando
            você a cursos, vagas, projetos, viagens, serviços, benefícios, pessoas e
            organizações.
          </p>

          <p>
            Em vez de apresentar muitas opções, a Guivos buscará destacar o que faz
            mais sentido para o seu momento — e ajudar você a transformar oportunidades
            em ações concretas.
          </p>
          <p>
            Ainda estamos construindo — e queremos entender se essa proposta realmente
            poderia contribuir para sua vida.
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
  const dot = { mint: "bg-mint", bubble: "bg-bubble", sky: "bg-sky", lemon: "bg-lemon" }[color];
  return (
    <div className={`rounded-2xl border border-border ${bg} px-5 py-4`}>
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
  q, answers, setAnswers, extras, setExtras, contact, setContact, onBack, onNext, canAdvance, index, total,
}: {
  q: Question;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  extras: Record<string, string>;
  setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  contact: { name: string; contact: string };
  setContact: (v: { name: string; contact: string }) => void;
  onBack: () => void; onNext: () => void; canAdvance: boolean; index: number; total: number;
}) {
  const set = (v: unknown) => setAnswers((a) => ({ ...a, [q.id]: v }));

  const showContact = q.id === 19 && (answers[19] === "19.1" || answers[19] === "19.2");

  return (
    <section className="anim-fade-up mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-semibold text-grape">{q.code}</span>
        {q.optional && (
          <span className="inline-flex rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Opcional
          </span>
        )}
      </div>

      <h2 className="font-display mt-3 text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.15] tracking-tight text-foreground">
        {q.title}
      </h2>
      {q.helper && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {q.helper}
        </p>
      )}

      <div className="mt-8">
        {q.type === "single" && q.asDropdown && (
          <Dropdown q={q} value={answers[q.id] as string | undefined} onChange={set} extras={extras} setExtras={setExtras} />
        )}
        {q.type === "single" && !q.asDropdown && (
          <SingleList q={q} value={answers[q.id] as string | undefined} onChange={set} />
        )}
        {q.type === "multi" && (
          <MultiList q={q} value={(answers[q.id] as string[]) || []} onChange={set} />
        )}
        {q.type === "scale" && (
          <ScalePicker q={q} value={answers[q.id] as number | undefined} onChange={set} />
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

      <NavBar onBack={onBack} onNext={onNext} canAdvance={canAdvance} last={index === total - 1} />
    </section>
  );
}

/* ---------------- INPUTS ---------------- */

function SingleList({ q, value, onChange }: { q: Extract<Question, { type: "single" }>; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {q.options.map((o, idx) => {
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
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all",
                selected ? "border-white/70 bg-white text-grape" : "border-border bg-secondary text-muted-foreground",
              ].join(" ")}>
                {String.fromCharCode(65 + idx)}
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
                "relative flex aspect-square items-center justify-center rounded-lg border-2 font-display text-sm font-semibold transition-all sm:rounded-xl sm:text-base",
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
        <span>0 · {q.minLabel}</span>
        <span className="text-right">{q.maxLabel} · 10</span>
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
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
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

function Done() {
  return (
    <section className="anim-fade-up relative mx-auto max-w-2xl pt-4 text-center">
      
      <div className="relative">
        <h2 className="font-display text-[clamp(2rem,5.5vw,4rem)] leading-[1] tracking-tight">
          Você acabou de <br />
          <span className="text-grape">ajudar a construir</span> a Guivos.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          Obrigado por dedicar alguns minutos do seu tempo. Cada resposta será
          analisada com cuidado e poderá influenciar decisões importantes antes
          do lançamento.
        </p>
        <p className="mt-12 font-display text-lg italic text-muted-foreground sm:text-xl">
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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 text-xs text-muted-foreground sm:px-6 md:px-8">
        <span>Guivos · Pesquisa Conceitual B2C</span>
        <Link to="/admin" className="hover:text-grape">Painel de gestão</Link>
      </div>
    </footer>
  );
}
