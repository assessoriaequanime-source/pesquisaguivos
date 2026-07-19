import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Survey,
});

type Option = { code: string; label: string };
type Base = {
  id: number;
  code: string;
  section: string;
  sectionLabel: string;
  title: string;
  helper?: string;
  optional?: boolean;
};
type Question =
  | (Base & { type: "single"; options: Option[]; asDropdown?: boolean; extra?: { key: string; placeholder: string } })
  | (Base & { type: "multi"; options: Option[]; max?: number })
  | (Base & { type: "scale"; min: 0; max: 10; minLabel: string; maxLabel: string })
  | (Base & { type: "open"; placeholder: string; multiline?: boolean });

const S = {
  A: { key: "A", label: "Perfil" },
  B: { key: "B", label: "Momento & comportamento" },
  C: { key: "C", label: "Compreensão" },
  D: { key: "D", label: "Aplicação & valor" },
  E: { key: "E", label: "Intenção" },
  F: { key: "F", label: "Barreiras & monetização" },
};

const estados = [
  "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins","Moro fora do Brasil","Prefiro não responder",
];

const questions: Question[] = [
  {
    id: 1, code: "01", section: S.A.key, sectionLabel: S.A.label, type: "single",
    title: "Qual é sua faixa etária?",
    options: [
      "Até 17 anos","18 a 24 anos","25 a 34 anos","35 a 44 anos","45 a 54 anos","55 a 64 anos","65 anos ou mais","Prefiro não responder",
    ].map((l, i) => ({ code: `1.${i+1}`, label: l })),
  },
  {
    id: 2, code: "02", section: S.A.key, sectionLabel: S.A.label, type: "single", asDropdown: true,
    title: "Em qual estado você mora?",
    helper: "Escolha na lista. Você poderá informar sua cidade em seguida.",
    options: estados.map((l, i) => ({ code: `2.${i+1}`, label: l })),
    extra: { key: "cidade", placeholder: "Cidade ou município (opcional)" },
  },
  {
    id: 3, code: "03", section: S.A.key, sectionLabel: S.A.label, type: "single",
    title: "Qual opção melhor descreve sua situação principal hoje?",
    options: [
      "Estudante","Empregado(a) no setor privado","Servidor(a) público(a)","Autônomo(a) ou profissional liberal","Empreendedor(a) ou empresário(a)","Procurando trabalho","Aposentado(a)","Cuidador(a), responsável pelo lar ou sem atividade remunerada no momento","Outra situação","Prefiro não responder",
    ].map((l, i) => ({ code: `3.${i+1}`, label: l })),
  },
  {
    id: 4, code: "04", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos próximos 12 meses, em qual área da sua vida você mais gostaria de avançar?",
    helper: "Escolha apenas uma.",
    options: [
      "Saúde e qualidade de vida","Carreira ou trabalho","Situação financeira","Estudos e desenvolvimento de competências","Empreendedorismo ou projetos pessoais","Relacionamentos e vida social","Espiritualidade e propósito","Viagens e novas experiências","Participação em causas ou voluntariado","Organização geral da vida","Ainda estou tentando descobrir meu caminho","Outra área",
    ].map((l, i) => ({ code: `4.${i+1}`, label: l })),
  },
  {
    id: 5, code: "05", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Qual resultado você mais gostaria de alcançar nessa área?",
    options: [
      "Entender melhor o que devo fazer","Identificar meu próximo passo","Começar algo que venho adiando","Encontrar uma oportunidade adequada","Desenvolver uma habilidade ou capacidade","Resolver um problema específico","Tomar uma decisão importante","Criar ou manter um hábito","Encontrar pessoas ou organizações que possam contribuir","Acompanhar melhor meu progresso","Ainda não sei exatamente o que desejo alcançar","Outro resultado",
    ].map((l, i) => ({ code: `5.${i+1}`, label: l })),
  },
  {
    id: 6, code: "06", section: S.B.key, sectionLabel: S.B.label, type: "multi", max: 3,
    title: "O que mais dificulta seu avanço nessa direção?",
    helper: "Escolha até três opções.",
    options: [
      "Falta de dinheiro ou recursos","Falta de tempo","Falta de informação confiável","Não saber por onde começar","Dificuldade para encontrar oportunidades adequadas","Falta de pessoas, contatos ou apoio","Dificuldade para manter disciplina ou constância","Medo, insegurança ou baixa confiança","Limitações de saúde ou mobilidade","Responsabilidades familiares","Excesso de opções e dificuldade para escolher","Não encontro grandes dificuldades hoje","Outro motivo",
    ].map((l, i) => ({ code: `6.${i+1}`, label: l })),
  },
  {
    id: 7, code: "07", section: S.B.key, sectionLabel: S.B.label, type: "multi",
    title: "Como você costuma procurar caminhos ou oportunidades para avançar nessa área?",
    helper: "Marque todas as opções aplicáveis.",
    options: [
      "Pesquiso no Google","Procuro em redes sociais","Assisto a vídeos, leio conteúdos ou acompanho especialistas","Pergunto a amigos, familiares ou conhecidos","Converso com profissionais, mentores ou especialistas","Utilizo sites ou aplicativos especializados","Participo de eventos, grupos ou comunidades","Procuro cursos, instituições ou organizações","Tento descobrir sozinho, sem um caminho estruturado","Não procuro ativamente no momento","Outro meio",
    ].map((l, i) => ({ code: `7.${i+1}`, label: l })),
  },
  {
    id: 8, code: "08", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos últimos 12 meses, com que frequência você descobriu tarde demais uma oportunidade que poderia ter sido útil?",
    helper: "Uma vaga, curso, evento, projeto, benefício, grupo ou experiência que você conheceu depois do prazo.",
    options: ["Nunca","Raramente","Algumas vezes","Frequentemente","Muito frequentemente","Não me recordo"].map((l, i) => ({ code: `8.${i+1}`, label: l })),
  },
  {
    id: 9, code: "09", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos últimos 12 meses, procurou possibilidades mas não encontrou nada que fizesse sentido para o seu momento?",
    helper: "Considere oportunidades incompatíveis com objetivos, disponibilidade, localização, condições financeiras ou necessidades atuais.",
    options: ["Nunca","Raramente","Algumas vezes","Frequentemente","Muito frequentemente","Não procurei oportunidades nesse período","Não me recordo"].map((l, i) => ({ code: `9.${i+1}`, label: l })),
  },
  {
    id: 10, code: "10", section: S.B.key, sectionLabel: S.B.label, type: "scale", min: 0, max: 10,
    title: "Quanto esforço você precisa fazer hoje para encontrar algo realmente relevante para seus objetivos?",
    minLabel: "Praticamente nenhum",
    maxLabel: "Extremamente alto",
  },
  {
    id: 11, code: "11", section: S.C.key, sectionLabel: S.C.label, type: "scale", min: 0, max: 10,
    title: "Quanto você sente que compreendeu a proposta da Guivos?",
    minLabel: "Não compreendi",
    maxLabel: "Compreendi completamente",
  },
  {
    id: 12, code: "12", section: S.C.key, sectionLabel: S.C.label, type: "open", multiline: true,
    title: "Em poucas palavras, como você explicaria a Guivos para outra pessoa?",
    helper: "Resposta obrigatória. Escreva com suas próprias palavras.",
    placeholder: "Eu diria que a Guivos é...",
  },
  {
    id: 13, code: "13", section: S.D.key, sectionLabel: S.D.label, type: "scale", min: 0, max: 10,
    title: "Pensando na área que você escolheu antes, quanto a proposta da Guivos parece relevante para você?",
    minLabel: "Nada relevante",
    maxLabel: "Extremamente relevante",
  },
  {
    id: 14, code: "14", section: S.D.key, sectionLabel: S.D.label, type: "single",
    title: "Em qual situação você provavelmente procuraria a Guivos pela primeira vez?",
    options: [
      "Sei o que desejo alcançar, mas não sei qual deve ser meu próximo passo","Sei o que preciso fazer, mas não encontro uma oportunidade adequada","Estou vivendo uma mudança e preciso reorganizar meus caminhos","Quero descobrir possibilidades que ainda não conheço","Tenho muitas opções e preciso identificar o que faz mais sentido","Quero organizar objetivos e acompanhar meu progresso","Quero encontrar pessoas, grupos ou organizações que possam contribuir","Procuraria apenas diante de uma necessidade específica","Não consigo imaginar uma situação em que procuraria a Guivos","Outra situação",
    ].map((l, i) => ({ code: `14.${i+1}`, label: l })),
  },
  {
    id: 15, code: "15", section: S.D.key, sectionLabel: S.D.label, type: "multi", max: 3,
    title: "O que você mais esperaria encontrar ou conseguir fazer dentro da Guivos?",
    helper: "Escolha até três opções.",
    options: [
      "Compreender melhor meu momento atual","Organizar meus objetivos e prioridades","Identificar próximos passos mais claros","Encontrar oportunidades relacionadas aos meus objetivos","Encontrar cursos, vagas, projetos, eventos ou experiências","Encontrar pessoas, grupos ou organizações relevantes","Receber orientações relacionadas ao meu momento","Acompanhar mudanças e avanços ao longo do tempo","Acessar conteúdos e conhecimentos úteis","Encontrar benefícios, produtos ou serviços adequados à minha realidade","Nenhuma dessas possibilidades teria valor relevante para mim","Outra possibilidade",
    ].map((l, i) => ({ code: `15.${i+1}`, label: l })),
  },
  {
    id: 16, code: "16", section: S.D.key, sectionLabel: S.D.label, type: "single",
    title: "Qual resultado faria você considerar a Guivos realmente útil para sua vida?",
    options: [
      "Descobrir uma oportunidade que dificilmente encontraria sozinho","Saber com mais clareza qual deve ser meu próximo passo","Economizar tempo procurando informações e possibilidades","Tomar uma decisão melhor","Começar a agir em direção a um objetivo","Desenvolver uma habilidade ou capacidade","Encontrar pessoas ou organizações que possam contribuir","Manter mais constância em um objetivo","Perceber e acompanhar meu progresso","Nenhum desses resultados seria suficientemente relevante","Outro resultado",
    ].map((l, i) => ({ code: `16.${i+1}`, label: l })),
  },
  {
    id: 17, code: "17", section: S.D.key, sectionLabel: S.D.label, type: "scale", min: 0, max: 10,
    title: "Quanto você acredita que a Guivos poderia contribuir para você avançar nos próximos 12 meses?",
    minLabel: "Não contribuiria",
    maxLabel: "Muito significativamente",
  },
  {
    id: 18, code: "18", section: S.E.key, sectionLabel: S.E.label, type: "single",
    title: "Qual seria sua intenção de experimentar uma primeira versão da Guivos?",
    options: [
      "Certamente não experimentaria","Provavelmente não experimentaria","Talvez experimentasse","Provavelmente experimentaria","Certamente experimentaria",
    ].map((l, i) => ({ code: `18.${i+1}`, label: l })),
  },
  {
    id: 19, code: "19", section: S.E.key, sectionLabel: S.E.label, type: "single",
    title: "Você teria interesse em participar de uma primeira experiência da Guivos?",
    helper: "Ajudaria a avaliar se ela realmente gera valor.",
    options: [
      "Sim, gostaria de participar","Talvez, gostaria de conhecer melhor antes","Não tenho interesse neste momento",
    ].map((l, i) => ({ code: `19.${i+1}`, label: l })),
  },
  {
    id: 20, code: "20", section: S.F.key, sectionLabel: S.F.label, type: "single",
    title: "Qual seria hoje a principal razão para você não experimentar a Guivos?",
    options: [
      "Não percebo uma necessidade real","A proposta ainda parece genérica ou difícil de entender","Não acredito que as oportunidades seriam realmente adequadas para mim","Não acredito que a Guivos conseguiria compreender bem meu momento","Teria preocupação com o uso das minhas informações","Já utilizo outras soluções que considero suficientes","Não teria tempo ou interesse para utilizar","Não gostaria de acompanhar objetivos ou informações pessoais em uma plataforma","O preço poderia se tornar uma barreira","Eu experimentaria; não identifico hoje uma barreira principal","Outro motivo",
    ].map((l, i) => ({ code: `20.${i+1}`, label: l })),
  },
  {
    id: 21, code: "21", section: S.F.key, sectionLabel: S.F.label, type: "single",
    title: "Se a Guivos entregasse resultados reais, você consideraria pagar por recursos adicionais?",
    options: [
      "Não consideraria pagar","Talvez, dependendo dos resultados entregues","Sim, até R$ 19,90 por mês","Sim, entre R$ 20,00 e R$ 39,90 por mês","Sim, entre R$ 40,00 e R$ 69,90 por mês","Sim, acima de R$ 70,00 por mês","Ainda é muito cedo para avaliar","Prefiro não responder",
    ].map((l, i) => ({ code: `21.${i+1}`, label: l })),
  },
  {
    id: 22, code: "22", section: S.F.key, sectionLabel: S.F.label, type: "open", optional: true, multiline: true,
    title: "Existe algo essencial que deveríamos compreender antes de construir a Guivos?",
    helper: "Opcional. Suas críticas são tão valiosas quanto elogios.",
    placeholder: "Se pudesse dizer uma coisa ao time da Guivos, seria...",
  },
];

type Answers = Record<string, unknown>;

function Survey() {
  const [stage, setStage] = useState<"intro" | "survey" | "proposal" | "done">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ name: "", contact: "" });
  const [proposalSeen, setProposalSeen] = useState(false);
  const startedAt = useRef<number>(0);

  const currentQ = questions[i];

  // Show proposal right before question 11
  useEffect(() => {
    if (stage === "survey" && currentQ?.id === 11 && !proposalSeen) {
      setStage("proposal");
    }
  }, [stage, currentQ, proposalSeen]);

  const total = questions.length;
  const progress = stage === "done" ? 1 : (stage === "intro" ? 0 : Math.min(1, i / total));

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
        const target = e.target as HTMLElement;
        if (target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const beginSurvey = () => {
    startedAt.current = Date.now();
    setStage("survey");
  };

  return (
    <div className="grain relative min-h-screen bg-background text-foreground">
      <TopBar progress={progress} stage={stage} step={i + 1} total={total} />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-32 md:px-10">
        {stage === "intro" && <Intro onStart={beginSurvey} />}
        {stage === "proposal" && (
          <Proposal onContinue={() => { setProposalSeen(true); setStage("survey"); }} />
        )}
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
        {stage === "done" && (
          <Done answers={answers} contact={contact} setContact={setContact} extras={extras} />
        )}
      </main>

      <Footer stage={stage} />
    </div>
  );
}

/* ---------------- TOP BAR ---------------- */

function TopBar({ progress, stage, step, total }: { progress: number; stage: string; step: number; total: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-hairline/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className="ember-dot inline-block h-1.5 w-1.5 rounded-full bg-ember" />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            VAL-002 · Guivos
          </span>
        </div>
        <div className="hidden font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground md:block">
          {stage === "survey" ? `${String(step).padStart(2, "0")} / ${String(total).padStart(2, "0")}` :
           stage === "done" ? "Concluído" :
           stage === "proposal" ? "A proposta" :
           "Pesquisa conceitual"}
        </div>
      </div>
      <div className="h-px w-full bg-hairline/50">
        <div
          className="h-full bg-ember transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </header>
  );
}

/* ---------------- INTRO ---------------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="anim-fade grid grid-cols-1 gap-16 pt-8 md:grid-cols-12 md:gap-10 md:pt-16">
      <div className="md:col-span-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ember">
          Uma pesquisa conceitual · 2026
        </p>
        <h1 className="font-display mt-8 text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-tight">
          Construindo <br />
          <em className="italic text-ember">a Guivos.</em>
        </h1>
        <p className="mt-10 max-w-xl text-lg leading-relaxed text-foreground/80">
          Uma plataforma pensada para acompanhar a evolução das pessoas ao longo da vida.
          Antes de construir, precisamos escutar. Suas respostas — inclusive as críticas —
          desenharão o que a Guivos poderá se tornar.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-6">
          <button
            onClick={onStart}
            className="group relative inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-sm font-medium text-paper transition-all hover:bg-ember hover:pl-8"
          >
            Começar a pesquisa
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" strokeWidth={1.5} /> Pressione Enter para avançar
          </div>
        </div>
      </div>

      <aside className="md:col-span-5 md:pt-24">
        <div className="border-t border-hairline pt-8">
          <ul className="space-y-6 text-sm">
            {[
              ["01", "Tempo estimado", "5 a 7 minutos"],
              ["02", "Formato", "22 perguntas, uma por vez"],
              ["03", "Objetivo", "Compreender, não convencer"],
              ["04", "Privacidade", "Contato é opcional e separado"],
            ].map(([n, k, v]) => (
              <li key={n} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-b border-hairline/60 pb-6">
                <span className="font-mono text-[11px] tracking-[0.2em] text-ember">{n}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{k}</span>
                <span className="font-display text-xl italic">{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
            Não existem respostas certas ou erradas. Respostas críticas ou negativas são
            tão importantes quanto respostas positivas.
          </p>
        </div>
      </aside>
    </section>
  );
}

/* ---------------- PROPOSAL ---------------- */

function Proposal({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="anim-fade mx-auto max-w-3xl pt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ember">
        Interlúdio · A proposta
      </p>
      <h2 className="font-display mt-6 text-[clamp(2.25rem,4.5vw,4rem)] leading-[1] tracking-tight">
        Antes de <em className="italic text-ember">continuarmos.</em>
      </h2>

      <div className="mt-10 space-y-6 text-[17px] leading-relaxed text-foreground/85">
        <p>
          A Guivos está sendo criada para ajudar pessoas a avançar em áreas como
          carreira, saúde, finanças, estudos, relacionamentos, espiritualidade e
          projetos pessoais.
        </p>
        <p>
          A partir da compreensão do momento que você está vivendo e do que deseja
          alcançar, a Guivos poderá ajudar a organizar objetivos, identificar próximos
          passos e encontrar oportunidades mais adequadas para você.
        </p>

        <div className="my-10 grid gap-6 border-y border-hairline py-10 md:grid-cols-2">
          <Example
            label="Saúde"
            text="Grupos de corrida, pedal, esportes, profissionais, eventos e experiências relacionadas ao seu objetivo."
          />
          <Example
            label="Espiritualidade"
            text="Grupos, movimentos, encontros, conteúdos, projetos e pessoas que contribuam para esse caminho."
          />
        </div>

        <p>
          Em vez de apenas apresentar muitas opções, a Guivos buscará destacar o que
          pode fazer mais sentido para o seu momento — e ajudar você a transformar
          oportunidades em ações concretas.
        </p>
        <p className="font-display text-2xl italic text-ember">
          A Guivos não decidirá por você.
        </p>
        <p>
          Seu papel será ajudar você a enxergar possibilidades, escolher caminhos e
          acompanhar sua evolução ao longo do tempo. Ainda estamos construindo — e
          queremos entender se essa proposta realmente poderia contribuir para sua vida.
        </p>
      </div>

      <div className="mt-12 flex items-center gap-6">
        <button
          onClick={onContinue}
          className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-sm font-medium text-paper transition-all hover:bg-ember hover:pl-8"
        >
          Continuar a pesquisa
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}

function Example({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ember">{label}</div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{text}</p>
    </div>
  );
}

/* ---------------- QUESTION VIEW ---------------- */

function QuestionView({
  q, answers, setAnswers, extras, setExtras, onBack, onNext, canAdvance, index, total,
}: {
  q: Question; answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  extras: Record<string, string>; setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void; onNext: () => void; canAdvance: boolean; index: number; total: number;
}) {
  const set = (v: unknown) => setAnswers((a) => ({ ...a, [q.id]: v }));

  return (
    <section className="anim-slide-up grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
      <aside className="md:col-span-4 md:pt-4">
        <div className="sticky top-28">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ember">
              Seção {q.section}
            </span>
            <span className="h-px w-8 bg-hairline" />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {q.sectionLabel}
            </span>
          </div>
          <div className="font-display mt-10 text-[clamp(5rem,10vw,9rem)] leading-none tracking-tight text-ember/90">
            {q.code}
          </div>
          <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} de {String(total).padStart(2, "0")}
          </div>
          {q.optional && (
            <div className="mt-6 inline-flex rounded-full border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Opcional
            </div>
          )}
        </div>
      </aside>

      <div className="md:col-span-8">
        <h2 className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.05] tracking-tight text-foreground">
          {q.title}
        </h2>
        {q.helper && (
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {q.helper}
          </p>
        )}

        <div className="mt-10">
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

/* ---------------- INPUTS ---------------- */

function SingleGrid({ q, value, onChange }: { q: Extract<Question, { type: "single" }>; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {q.options.map((o, idx) => {
        const selected = value === o.code;
        return (
          <button
            key={o.code}
            onClick={() => onChange(o.code)}
            className={[
              "group relative overflow-hidden rounded-lg border px-5 py-4 text-left transition-all",
              selected
                ? "border-ember bg-ink text-paper"
                : "border-hairline bg-card hover:border-ink",
            ].join(" ")}
          >
            <div className="flex items-center gap-4">
              <span className={[
                "font-mono text-[10px] uppercase tracking-[0.24em]",
                selected ? "text-ember-soft" : "text-muted-foreground",
              ].join(" ")}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 text-[15px] leading-snug">{o.label}</span>
              <span className={[
                "flex h-6 w-6 items-center justify-center rounded-full border transition-all",
                selected ? "border-ember-soft bg-ember" : "border-hairline",
              ].join(" ")}>
                {selected && <Check className="h-3.5 w-3.5 text-paper" strokeWidth={2} />}
              </span>
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
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {value.length}/{max} selecionadas
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {q.options.map((o, idx) => {
          const selected = value.includes(o.code);
          const disabled = !selected && !!max && value.length >= max;
          return (
            <button
              key={o.code}
              onClick={() => toggle(o.code)}
              disabled={disabled}
              className={[
                "group relative rounded-lg border px-5 py-4 text-left transition-all",
                selected ? "border-ember bg-ink text-paper" : "border-hairline bg-card hover:border-ink",
                disabled ? "opacity-40" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-4">
                <span className={[
                  "font-mono text-[10px] uppercase tracking-[0.24em]",
                  selected ? "text-ember-soft" : "text-muted-foreground",
                ].join(" ")}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[15px] leading-snug">{o.label}</span>
                <span className={[
                  "flex h-6 w-6 items-center justify-center border transition-all",
                  selected ? "border-ember-soft bg-ember" : "border-hairline",
                ].join(" ")}>
                  {selected && <Check className="h-3.5 w-3.5 text-paper" strokeWidth={2} />}
                </span>
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
  return (
    <div>
      <div className="grid grid-cols-11 gap-1.5">
        {nums.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={[
                "group relative flex aspect-square items-center justify-center rounded-md border font-mono text-sm transition-all",
                active
                  ? "border-ember bg-ink text-paper scale-105"
                  : "border-hairline bg-card hover:border-ink",
              ].join(" ")}
            >
              {n}
              {active && <span className="absolute inset-x-3 bottom-1 h-0.5 bg-ember" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>0 · {q.minLabel}</span>
        <span>{q.maxLabel} · 10</span>
      </div>
      {value !== undefined && (
        <div className="mt-8 flex items-baseline gap-4">
          <span className="font-display text-6xl italic text-ember">{value}</span>
          <span className="text-sm text-muted-foreground">Você selecionou {value}/10</span>
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
        className="w-full resize-none border-b-2 border-hairline bg-transparent pb-4 font-display text-2xl italic leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-ember focus:outline-none"
      />
      <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {value.length} caracteres {q.optional ? "· opcional" : "· mínimo 3"}
      </div>
    </div>
  );
}

function Dropdown({ q, value, onChange, extras, setExtras }: {
  q: Extract<Question, { type: "single" }>;
  value?: string; onChange: (v: string) => void;
  extras: Record<string, string>; setExtras: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const selected = q.options.find((o) => o.code === value);
  return (
    <div className="space-y-6">
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-hairline bg-card px-5 py-5 pr-12 font-display text-2xl italic text-foreground focus:border-ember focus:outline-none"
        >
          <option value="" disabled>Selecione seu estado</option>
          {q.options.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <ArrowRight className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" strokeWidth={1.5} />
      </div>
      {selected && q.extra && (
        <div className="anim-fade">
          <label className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {q.extra.placeholder}
          </label>
          <input
            value={extras[q.extra.key] || ""}
            onChange={(e) => {
              const key = q.extra!.key;
              setExtras((x) => ({ ...x, [key]: e.target.value }));
            }}
            className="mt-2 w-full border-b border-hairline bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:border-ember focus:outline-none"
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
    <div className="mt-14 flex items-center justify-between border-t border-hairline pt-6">
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
        Anterior
      </button>
      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={[
          "group inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium transition-all",
          canAdvance
            ? "bg-ink text-paper hover:bg-ember hover:pl-7"
            : "bg-secondary text-muted-foreground cursor-not-allowed",
        ].join(" ")}
      >
        {last ? "Finalizar" : "Próxima"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/* ---------------- DONE ---------------- */

function Done({ answers, contact, setContact, extras }: {
  answers: Answers; contact: { name: string; contact: string };
  setContact: (v: { name: string; contact: string }) => void;
  extras: Record<string, string>;
}) {
  const wantsContact = answers[19] === "19.1" || answers[19] === "19.2";
  const [sent, setSent] = useState(false);

  const download = () => {
    const payload = { instrument: "VAL-002", version: "1.2.1", answers, extras, contact, at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `guivos-val002-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="anim-fade mx-auto max-w-3xl pt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ember">Fim da pesquisa</p>
      <h2 className="font-display mt-8 text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95] tracking-tight">
        Você acabou de <br /><em className="italic text-ember">ajudar a construir</em> a Guivos.
      </h2>
      <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/80">
        Obrigado por dedicar alguns minutos do seu tempo. Cada resposta será analisada
        com cuidado e poderá influenciar decisões importantes antes do lançamento.
      </p>

      {wantsContact && !sent && (
        <div className="mt-14 rounded-2xl border border-hairline bg-card p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ember">
            Você indicou interesse em participar
          </div>
          <h3 className="font-display mt-3 text-3xl italic">Deixe seu contato — é opcional.</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Não integra os KPIs da pesquisa. Usaremos apenas para convidar você para a primeira experiência.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              placeholder="Nome"
              className="border-b border-hairline bg-transparent py-3 text-lg focus:border-ember focus:outline-none"
            />
            <input
              value={contact.contact}
              onChange={(e) => setContact({ ...contact, contact: e.target.value })}
              placeholder="E-mail ou telefone"
              className="border-b border-hairline bg-transparent py-3 text-lg focus:border-ember focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSent(true)}
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ember"
          >
            Enviar contato <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="mt-14 flex flex-wrap gap-4">
        <button
          onClick={download}
          className="inline-flex items-center gap-3 rounded-full border border-ink px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-ink hover:text-paper"
        >
          Baixar minhas respostas (JSON)
        </button>
      </div>

      <div className="hairline my-16" />
      <p className="font-display text-2xl italic text-muted-foreground">
        Esperamos que, no futuro, a Guivos possa contribuir para que mais pessoas
        encontrem próximos passos e oportunidades capazes de transformar suas vidas.
      </p>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer({ stage }: { stage: string }) {
  return (
    <footer className="relative z-10 border-t border-hairline/60 py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:px-10">
        <span>Guivos · Pesquisa Conceitual B2C</span>
        <span>v 1.2.1 · {stage === "done" ? "Encerrada" : "Em campo"}</span>
      </div>
    </footer>
  );
}
