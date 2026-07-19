/* localStorage-backed store for Guivos VAL-002 survey */

export type Option = { code: string; label: string };

export type TitleStyle = "display" | "section" | "quote";
export type Frame = "plain" | "card" | "accent";
export type QType = "single" | "multi" | "scale" | "open";

export type Base = {
  id: number;
  code: string;
  section: string;
  sectionLabel: string;
  title: string;
  helper?: string;
  optional?: boolean;
  hidden?: boolean;
  titleStyle?: TitleStyle;
  frame?: Frame;
};

export type Question =
  | (Base & {
      type: "single";
      options: Option[];
      asDropdown?: boolean;
      extra?: { key: string; placeholder: string };
    })
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

export const DEFAULT_QUESTIONS: Question[] = [
  { id: 1, code: "01", section: S.A.key, sectionLabel: S.A.label, type: "single",
    title: "Qual é sua faixa etária?",
    options: ["Até 17 anos","18 a 24 anos","25 a 34 anos","35 a 44 anos","45 a 54 anos","55 a 64 anos","65 anos ou mais","Prefiro não responder"].map((l, i) => ({ code: `1.${i+1}`, label: l })) },
  { id: 2, code: "02", section: S.A.key, sectionLabel: S.A.label, type: "single", asDropdown: true,
    title: "Em qual estado você mora?",
    helper: "Escolha na lista. Você poderá informar sua cidade em seguida.",
    options: estados.map((l, i) => ({ code: `2.${i+1}`, label: l })),
    extra: { key: "cidade", placeholder: "Cidade ou município (opcional)" } },
  { id: 3, code: "03", section: S.A.key, sectionLabel: S.A.label, type: "single",
    title: "Qual opção melhor descreve sua situação principal hoje?",
    options: ["Estudante","Empregado(a) no setor privado","Servidor(a) público(a)","Autônomo(a) ou profissional liberal","Empreendedor(a) ou empresário(a)","Procurando trabalho","Aposentado(a)","Cuidador(a), responsável pelo lar ou sem atividade remunerada no momento","Outra situação","Prefiro não responder"].map((l, i) => ({ code: `3.${i+1}`, label: l })) },
  { id: 4, code: "04", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos próximos 12 meses, em qual área da sua vida você mais gostaria de avançar?",
    helper: "Escolha apenas uma.",
    options: ["Saúde e qualidade de vida","Carreira ou trabalho","Situação financeira","Estudos e desenvolvimento de competências","Empreendedorismo ou projetos pessoais","Relacionamentos e vida social","Espiritualidade e propósito","Viagens e novas experiências","Participação em causas ou voluntariado","Organização geral da vida","Ainda estou tentando descobrir meu caminho","Outra área"].map((l, i) => ({ code: `4.${i+1}`, label: l })) },
  { id: 5, code: "05", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Qual resultado você mais gostaria de alcançar nessa área?",
    options: ["Entender melhor o que devo fazer","Identificar meu próximo passo","Começar algo que venho adiando","Encontrar uma oportunidade adequada","Desenvolver uma habilidade ou capacidade","Resolver um problema específico","Tomar uma decisão importante","Criar ou manter um hábito","Encontrar pessoas ou organizações que possam contribuir","Acompanhar melhor meu progresso","Ainda não sei exatamente o que desejo alcançar","Outro resultado"].map((l, i) => ({ code: `5.${i+1}`, label: l })) },
  { id: 6, code: "06", section: S.B.key, sectionLabel: S.B.label, type: "multi", max: 3,
    title: "O que mais dificulta seu avanço nessa direção?",
    helper: "Escolha até três opções.",
    options: ["Falta de dinheiro ou recursos","Falta de tempo","Falta de informação confiável","Não saber por onde começar","Dificuldade para encontrar oportunidades adequadas","Falta de pessoas, contatos ou apoio","Dificuldade para manter disciplina ou constância","Medo, insegurança ou baixa confiança","Limitações de saúde ou mobilidade","Responsabilidades familiares","Excesso de opções e dificuldade para escolher","Não encontro grandes dificuldades hoje","Outro motivo"].map((l, i) => ({ code: `6.${i+1}`, label: l })) },
  { id: 7, code: "07", section: S.B.key, sectionLabel: S.B.label, type: "multi",
    title: "Como você costuma procurar caminhos ou oportunidades para avançar nessa área?",
    helper: "Marque todas as opções aplicáveis.",
    options: ["Pesquiso no Google","Procuro em redes sociais","Assisto a vídeos, leio conteúdos ou acompanho especialistas","Pergunto a amigos, familiares ou conhecidos","Converso com profissionais, mentores ou especialistas","Utilizo sites ou aplicativos especializados","Participo de eventos, grupos ou comunidades","Procuro cursos, instituições ou organizações","Tento descobrir sozinho, sem um caminho estruturado","Não procuro ativamente no momento","Outro meio"].map((l, i) => ({ code: `7.${i+1}`, label: l })) },
  { id: 8, code: "08", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos últimos 12 meses, com que frequência você descobriu tarde demais uma oportunidade que poderia ter sido útil?",
    helper: "Uma vaga, curso, evento, projeto, benefício, grupo ou experiência que você conheceu depois do prazo.",
    options: ["Nunca","Raramente","Algumas vezes","Frequentemente","Muito frequentemente","Não me recordo"].map((l, i) => ({ code: `8.${i+1}`, label: l })) },
  { id: 9, code: "09", section: S.B.key, sectionLabel: S.B.label, type: "single",
    title: "Nos últimos 12 meses, procurou possibilidades mas não encontrou nada que fizesse sentido para o seu momento?",
    helper: "Considere oportunidades incompatíveis com objetivos, disponibilidade, localização, condições financeiras ou necessidades atuais.",
    options: ["Nunca","Raramente","Algumas vezes","Frequentemente","Muito frequentemente","Não procurei oportunidades nesse período","Não me recordo"].map((l, i) => ({ code: `9.${i+1}`, label: l })) },
  { id: 10, code: "10", section: S.B.key, sectionLabel: S.B.label, type: "scale", min: 0, max: 10,
    title: "Quanto esforço você precisa fazer hoje para encontrar algo realmente relevante para seus objetivos?",
    minLabel: "Praticamente nenhum", maxLabel: "Extremamente alto" },
  { id: 11, code: "11", section: S.C.key, sectionLabel: S.C.label, type: "scale", min: 0, max: 10,
    title: "Quanto você sente que compreendeu a proposta da Guivos?",
    minLabel: "Não compreendi", maxLabel: "Compreendi completamente" },
  { id: 12, code: "12", section: S.C.key, sectionLabel: S.C.label, type: "open", multiline: true,
    title: "Em poucas palavras, como você explicaria a Guivos para outra pessoa?",
    helper: "Resposta obrigatória. Escreva com suas próprias palavras.",
    placeholder: "Eu diria que a Guivos é..." },
  { id: 13, code: "13", section: S.D.key, sectionLabel: S.D.label, type: "scale", min: 0, max: 10,
    title: "Pensando na área que você escolheu antes, quanto a proposta da Guivos parece relevante para você?",
    minLabel: "Nada relevante", maxLabel: "Extremamente relevante" },
  { id: 14, code: "14", section: S.D.key, sectionLabel: S.D.label, type: "single",
    title: "Em qual situação você provavelmente procuraria a Guivos pela primeira vez?",
    options: ["Sei o que desejo alcançar, mas não sei qual deve ser meu próximo passo","Sei o que preciso fazer, mas não encontro uma oportunidade adequada","Estou vivendo uma mudança e preciso reorganizar meus caminhos","Quero descobrir possibilidades que ainda não conheço","Tenho muitas opções e preciso identificar o que faz mais sentido","Quero organizar objetivos e acompanhar meu progresso","Quero encontrar pessoas, grupos ou organizações que possam contribuir","Procuraria apenas diante de uma necessidade específica","Não consigo imaginar uma situação em que procuraria a Guivos","Outra situação"].map((l, i) => ({ code: `14.${i+1}`, label: l })) },
  { id: 15, code: "15", section: S.D.key, sectionLabel: S.D.label, type: "multi", max: 3,
    title: "O que você mais esperaria encontrar ou conseguir fazer dentro da Guivos?",
    helper: "Escolha até três opções.",
    options: ["Compreender melhor meu momento atual","Organizar meus objetivos e prioridades","Identificar próximos passos mais claros","Encontrar oportunidades relacionadas aos meus objetivos","Encontrar cursos, vagas, projetos, eventos ou experiências","Encontrar pessoas, grupos ou organizações relevantes","Receber orientações relacionadas ao meu momento","Acompanhar mudanças e avanços ao longo do tempo","Acessar conteúdos e conhecimentos úteis","Encontrar benefícios, produtos ou serviços adequados à minha realidade","Nenhuma dessas possibilidades teria valor relevante para mim","Outra possibilidade"].map((l, i) => ({ code: `15.${i+1}`, label: l })) },
  { id: 16, code: "16", section: S.D.key, sectionLabel: S.D.label, type: "single",
    title: "Qual resultado faria você considerar a Guivos realmente útil para sua vida?",
    options: ["Descobrir uma oportunidade que dificilmente encontraria sozinho","Saber com mais clareza qual deve ser meu próximo passo","Economizar tempo procurando informações e possibilidades","Tomar uma decisão melhor","Começar a agir em direção a um objetivo","Desenvolver uma habilidade ou capacidade","Encontrar pessoas ou organizações que possam contribuir","Manter mais constância em um objetivo","Perceber e acompanhar meu progresso","Nenhum desses resultados seria suficientemente relevante","Outro resultado"].map((l, i) => ({ code: `16.${i+1}`, label: l })) },
  { id: 17, code: "17", section: S.D.key, sectionLabel: S.D.label, type: "scale", min: 0, max: 10,
    title: "Quanto você acredita que a Guivos poderia contribuir para você avançar nos próximos 12 meses?",
    minLabel: "Não contribuiria", maxLabel: "Muito significativamente" },
  { id: 18, code: "18", section: S.E.key, sectionLabel: S.E.label, type: "single",
    title: "Qual seria sua intenção de experimentar uma primeira versão da Guivos?",
    options: ["Certamente não experimentaria","Provavelmente não experimentaria","Talvez experimentasse","Provavelmente experimentaria","Certamente experimentaria"].map((l, i) => ({ code: `18.${i+1}`, label: l })) },
  { id: 19, code: "19", section: S.E.key, sectionLabel: S.E.label, type: "single",
    title: "Você teria interesse em participar de uma primeira experiência da Guivos?",
    helper: "Ajudaria a avaliar se ela realmente gera valor.",
    options: ["Sim, gostaria de participar","Talvez, gostaria de conhecer melhor antes","Não tenho interesse neste momento"].map((l, i) => ({ code: `19.${i+1}`, label: l })) },
  { id: 20, code: "20", section: S.F.key, sectionLabel: S.F.label, type: "single",
    title: "Qual seria hoje a principal razão para você não experimentar a Guivos?",
    options: ["Não percebo uma necessidade real","A proposta ainda parece genérica ou difícil de entender","Não acredito que as oportunidades seriam realmente adequadas para mim","Não acredito que a Guivos conseguiria compreender bem meu momento","Teria preocupação com o uso das minhas informações","Já utilizo outras soluções que considero suficientes","Não teria tempo ou interesse para utilizar","Não gostaria de acompanhar objetivos ou informações pessoais em uma plataforma","O preço poderia se tornar uma barreira","Eu experimentaria; não identifico hoje uma barreira principal","Outro motivo"].map((l, i) => ({ code: `20.${i+1}`, label: l })) },
  { id: 21, code: "21", section: S.F.key, sectionLabel: S.F.label, type: "single",
    title: "Se a Guivos entregasse resultados reais, você consideraria pagar por recursos adicionais?",
    options: ["Não consideraria pagar","Talvez, dependendo dos resultados entregues","Sim, até R$ 19,90 por mês","Sim, entre R$ 20,00 e R$ 39,90 por mês","Sim, entre R$ 40,00 e R$ 69,90 por mês","Sim, acima de R$ 70,00 por mês","Ainda é muito cedo para avaliar","Prefiro não responder"].map((l, i) => ({ code: `21.${i+1}`, label: l })) },
  { id: 22, code: "22", section: S.F.key, sectionLabel: S.F.label, type: "open", optional: true, multiline: true,
    title: "Existe algo essencial que deveríamos compreender antes de construir a Guivos?",
    helper: "Opcional. Suas críticas são tão valiosas quanto elogios.",
    placeholder: "Se pudesse dizer uma coisa ao time da Guivos, seria..." },
];

/* ---------------- Page content ---------------- */

export type PageContent = {
  intro: {
    titleTop: string;
    titleAccent: string;
    paragraphs: string[];
    ctaLabel: string;
    timeHint: string;
  };
  proposal: {
    eyebrow: string;
    titleTop: string;
    titleAccent: string;
    paragraphs: string[];
    examples: { color: "mint" | "bubble" | "sky" | "lemon"; label: string; text: string }[];
    closing: string[];
    ctaLabel: string;
    triggerBeforeId?: number;
  };
  done: {
    titleTop: string;
    titleAccent: string;
    tail: string;
    paragraphs: string[];
    signature: string;
  };
};

export const DEFAULT_CONTENT: PageContent = {
  intro: {
    titleTop: "Construindo",
    titleAccent: "a Guivos",
    paragraphs: [
      "A Guivos é uma nova plataforma pensada para conectar cada pessoa aos caminhos e possibilidades certas para o seu momento — em qualquer área da vida.",
      "Estamos ouvindo pessoas antes de construir. Sua percepção sincera vai ajudar a moldar a experiência.",
      "Não existem respostas certas ou erradas. Responda com o que sentir hoje.",
    ],
    ctaLabel: "Iniciar pesquisa",
    timeHint: "Tempo estimado: 5 a 7 minutos",
  },
  proposal: {
    eyebrow: "Interlúdio · A proposta",
    titleTop: "Antes de continuarmos,",
    titleAccent: "conheça a Guivos",
    paragraphs: [
      "A Guivos é uma plataforma que ajuda cada pessoa a compreender melhor o próprio momento e a encontrar caminhos e possibilidades adequadas à sua realidade.",
      "Ela conecta pessoas a oportunidades — de estudo, trabalho, relacionamentos, saúde, espiritualidade, projetos, viagens, benefícios e muito mais — respeitando o tempo, o contexto e os objetivos de cada um.",
    ],
    examples: [
      {
        color: "mint",
        label: "Saúde",
        text: "Se você quer cuidar melhor da saúde, a Guivos pode sugerir profissionais adequados, hábitos possíveis, exames relevantes, grupos de apoio ou conteúdos confiáveis — respeitando sua rotina e condições.",
      },
      {
        color: "bubble",
        label: "Espiritualidade",
        text: "Se você busca sentido ou conexão espiritual, a Guivos pode indicar leituras, encontros, comunidades, práticas ou orientadores compatíveis com sua fé, valores e momento de vida.",
      },
    ],
    closing: [
      "O mesmo princípio poderá ser aplicado a outras áreas da vida, conectando você a cursos, vagas, projetos, viagens, serviços, benefícios, pessoas e organizações.",
    ],
    ctaLabel: "Continuar a pesquisa",
    triggerBeforeId: 11,
  },
  done: {
    titleTop: "Obrigado por",
    titleAccent: "compartilhar",
    tail: "sua percepção",
    paragraphs: [
      "Sua contribuição ajuda a definir como a Guivos deve funcionar — para as pessoas certas, do jeito certo.",
      "Se você deixou seu contato, entraremos em contato para a primeira experiência assim que ela estiver disponível.",
    ],
    signature: "— Time Guivos",
  },
};

/* ---------------- storage ---------------- */

const Q_KEY = "guivos.val002.questions.v2";
const R_KEY = "guivos.val002.responses.v1";
const C_KEY = "guivos.val002.content.v1";

export function getQuestions(): Question[] {
  if (typeof window === "undefined") return DEFAULT_QUESTIONS;
  try {
    const raw = localStorage.getItem(Q_KEY);
    if (!raw) return DEFAULT_QUESTIONS;
    return JSON.parse(raw) as Question[];
  } catch {
    return DEFAULT_QUESTIONS;
  }
}
export function saveQuestions(qs: Question[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(Q_KEY, JSON.stringify(qs));
}
export function resetQuestions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(Q_KEY);
}

export function getContent(): PageContent {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = localStorage.getItem(C_KEY);
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw) as PageContent;
    return { ...DEFAULT_CONTENT, ...parsed };
  } catch {
    return DEFAULT_CONTENT;
  }
}
export function saveContent(c: PageContent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(C_KEY, JSON.stringify(c));
}
export function resetContent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(C_KEY);
}

/* ---------------- helpers ---------------- */

export function visibleQuestions(qs: Question[]): Question[] {
  return qs.filter((q) => !q.hidden);
}

export function displayCode(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function nextId(qs: Question[] = getQuestions()): number {
  return (qs.reduce((max, q) => Math.max(max, q.id), 0) || 0) + 1;
}

export function newQuestion(type: QType): Question {
  const id = nextId();
  const base: Base = {
    id,
    code: String(id),
    section: "A",
    sectionLabel: "Perfil",
    title: "Nova pergunta",
    titleStyle: "display",
    frame: "plain",
  };
  if (type === "single")
    return { ...base, type, options: [1, 2, 3].map((n) => ({ code: `${id}.${n}`, label: `Opção ${n}` })) };
  if (type === "multi")
    return { ...base, type, options: [1, 2, 3].map((n) => ({ code: `${id}.${n}`, label: `Opção ${n}` })) };
  if (type === "scale")
    return { ...base, type, min: 0, max: 10, minLabel: "Mínimo", maxLabel: "Máximo" };
  return { ...base, type: "open", placeholder: "Escreva aqui...", multiline: true };
}

export function nextOptionCode(q: Question): string {
  if (q.type !== "single" && q.type !== "multi") return `${q.id}.1`;
  const used = new Set(q.options.map((o) => o.code));
  let n = q.options.length + 1;
  while (used.has(`${q.id}.${n}`)) n++;
  return `${q.id}.${n}`;
}

export function convertQuestion(q: Question, next: QType): Question {
  if (q.type === next) return q;
  const base: Base = {
    id: q.id,
    code: q.code,
    section: q.section,
    sectionLabel: q.sectionLabel,
    title: q.title,
    helper: q.helper,
    optional: q.optional,
    hidden: q.hidden,
    titleStyle: q.titleStyle,
    frame: q.frame,
  };
  const carriedOptions =
    q.type === "single" || q.type === "multi"
      ? q.options
      : [1, 2, 3].map((n) => ({ code: `${q.id}.${n}`, label: `Opção ${n}` }));
  if (next === "single") return { ...base, type: "single", options: carriedOptions };
  if (next === "multi") return { ...base, type: "multi", options: carriedOptions };
  if (next === "scale") return { ...base, type: "scale", min: 0, max: 10, minLabel: "Mínimo", maxLabel: "Máximo" };
  return { ...base, type: "open", placeholder: "Escreva aqui...", multiline: true };
}

/* ---------------- responses ---------------- */

export type ResponseRecord = {
  id: string;
  at: string;
  durationSec: number;
  answers: Record<string, unknown>;
  extras: Record<string, string>;
  contact: { name: string; contact: string };
};

export function getResponses(): ResponseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(R_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ResponseRecord[];
  } catch { return []; }
}

export function saveResponse(r: Omit<ResponseRecord, "id" | "at">) {
  if (typeof window === "undefined") return;
  const list = getResponses();
  const record: ResponseRecord = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...r,
  };
  list.unshift(record);
  localStorage.setItem(R_KEY, JSON.stringify(list));
}

export function deleteResponse(id: string) {
  const list = getResponses().filter((r) => r.id !== id);
  localStorage.setItem(R_KEY, JSON.stringify(list));
}

export function clearResponses() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(R_KEY);
}
