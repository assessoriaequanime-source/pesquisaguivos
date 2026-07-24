import type { Question, ResponseRecord } from "./survey-store";
import * as XLSX from "xlsx";

export const QUESTIONNAIRE_CODE = "VAL-002";
/**
 * Instrument version source of truth.
 * Derived from the persisted storage namespace already in use:
 *   guivos.val002.responses.v1
 */
export const QUESTIONNAIRE_VERSION = "v1";
const EXPECTED_QUESTION_IDS = Array.from({ length: 22 }, (_, idx) => idx + 1);

type ExportInput = {
  responses: ResponseRecord[];
  questions: Question[];
  fallbackQuestions?: Question[];
  exportedAt?: string;
};

type CanonicalContact = {
  nome: string;
  email: string;
  telefone: string;
  original: string | null;
};

type CanonicalQuestionSchema = {
  key: string;
  numero: number;
  texto: string;
  tipo: Question["type"];
  alternativas: Record<string, string>;
  extraKey: string | null;
  supportsOutroText: boolean;
};

type CanonicalSingleAnswer = {
  numero: number;
  codigo: string | null;
  resposta: string | number | null;
  outro_texto?: string | null;
};

type CanonicalMultiAnswer = {
  numero: number;
  codigos: string[] | null;
  respostas: string[] | null;
  outro_texto?: string | null;
};

type CanonicalAnswer = CanonicalSingleAnswer | CanonicalMultiAnswer;

type CanonicalResponse = {
  response_id: string;
  questionario_codigo: string;
  questionario_versao: string;
  iniciado_em: string;
  enviado_em: string;
  duracao_segundos: number;
  total_perguntas: number;
  total_respondidas: number;
  percentual_respondido: number;
  contato: CanonicalContact;
  extras: Record<string, string>;
  perguntas: Record<string, CanonicalAnswer>;
};

type CanonicalDataset = {
  questionario_codigo: string;
  questionario_versao: string;
  exportado_em: string;
  extraKeys: string[];
  hasContatoOriginal: boolean;
  outroColumns: string[];
  schemaQuestions: CanonicalQuestionSchema[];
  questionario: Record<
    string,
    {
      numero: number;
      texto: string;
      tipo: Question["type"];
      alternativas: Record<string, string>;
      extra_key: string | null;
      suporta_outro_texto: boolean;
    }
  >;
  respostas: CanonicalResponse[];
};

export function normalizeSurveyExportData({
  responses,
  questions,
  fallbackQuestions = [],
  exportedAt,
}: ExportInput): CanonicalDataset {
  const resolvedQuestions = resolveSchemaQuestions(questions, fallbackQuestions);
  validateQuestionSet(resolvedQuestions);

  // Collect question IDs present in responses but absent from schema (orphan answers).
  // These are created as synthetic "open" entries so historical data is not lost.
  const schemaIdSet = new Set(resolvedQuestions.map((q) => q.id));
  const orphanIdSet = new Set<number>();
  for (const record of responses) {
    for (const key of Object.keys(record.answers ?? {})) {
      const id = parseInt(key, 10);
      const val = record.answers[key];
      if (
        Number.isInteger(id) &&
        id > 0 &&
        !schemaIdSet.has(id) &&
        val !== undefined &&
        val !== null &&
        val !== ""
      ) {
        orphanIdSet.add(id);
      }
    }
  }

  // Merge schema questions with synthetic entries for orphan IDs, then sort by ID
  // for a deterministic column order regardless of how the admin reordered questions.
  const allQuestions: Question[] = [...resolvedQuestions];
  for (const id of [...orphanIdSet].sort((a, b) => a - b)) {
    console.warn(`[survey-export] Orphan answer for question ${id} — adding synthetic open entry`);
    allQuestions.push(makeSyntheticQuestion(id));
  }
  allQuestions.sort((a, b) => a.id - b.id);

  const schemaQuestions = allQuestions.map(toCanonicalSchema);
  const questionMap = new Map<number, Question>(allQuestions.map((q) => [q.id, q] as const));
  const questionario = Object.fromEntries(
    schemaQuestions.map((item) => [
      item.key,
      {
        numero: item.numero,
        texto: item.texto,
        tipo: item.tipo,
        alternativas: item.alternativas,
        extra_key: item.extraKey,
        suporta_outro_texto: item.supportsOutroText,
      },
    ]),
  );
  const extraKeys = collectExtraKeys(schemaQuestions, responses);
  const outroColumns = schemaQuestions
    .filter((item) => item.supportsOutroText)
    .map((item) => `${item.key}_outro`);
  const normalizedResponses = responses.map((record) =>
    normalizeSurveyResponse(record, schemaQuestions, questionMap),
  );
  const hasContatoOriginal = normalizedResponses.some((item) => !!item.contato.original);

  return {
    questionario_codigo: QUESTIONNAIRE_CODE,
    questionario_versao: QUESTIONNAIRE_VERSION,
    exportado_em: toIsoString(exportedAt ?? new Date().toISOString()),
    extraKeys,
    hasContatoOriginal,
    outroColumns,
    schemaQuestions,
    questionario,
    respostas: normalizedResponses,
  };
}

export function buildSurveyCsvExport(input: ExportInput): {
  headers: string[];
  rows: string[][];
  csv: string;
} {
  const dataset = normalizeSurveyExportData(input);
  const headers = buildCsvHeaders(dataset);
  const rows = dataset.respostas.map((record) => buildCsvRow(record, dataset));
  return { headers, rows, csv: stringifyCsv(headers, rows) };
}

export function buildSurveyJsonExport(input: ExportInput): {
  document: {
    schema: {
      questionario_codigo: string;
      questionario_versao: string;
      exportado_em: string;
      total_registros: number;
    };
    questionario: CanonicalDataset["questionario"];
    respostas: CanonicalResponse[];
  };
  json: string;
} {
  const dataset = normalizeSurveyExportData(input);
  const document = {
    schema: {
      questionario_codigo: dataset.questionario_codigo,
      questionario_versao: dataset.questionario_versao,
      exportado_em: dataset.exportado_em,
      total_registros: dataset.respostas.length,
    },
    questionario: dataset.questionario,
    respostas: dataset.respostas,
  };
  return { document, json: JSON.stringify(document, null, 2) };
}

export function buildSurveyXlsxExport(input: ExportInput): {
  workbook: XLSX.WorkBook;
  bytes: Uint8Array;
} {
  const dataset = normalizeSurveyExportData(input);
  const workbook = XLSX.utils.book_new();

  const responsesHeaders = buildCsvHeaders(dataset);
  const responsesRows = dataset.respostas.map((record) => buildXlsxResponseRow(record, dataset));
  const responsesSheet = XLSX.utils.aoa_to_sheet([responsesHeaders, ...responsesRows]);
  if (responsesSheet["!ref"]) responsesSheet["!autofilter"] = { ref: responsesSheet["!ref"] };
  responsesSheet["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
  responsesSheet["!cols"] = responsesHeaders.map((header) => ({
    wch: inferXlsxColumnWidth(header),
  }));
  XLSX.utils.book_append_sheet(workbook, responsesSheet, "Respostas");

  const questionnaireRows = buildQuestionarioRows(dataset);
  const questionarioSheet = XLSX.utils.aoa_to_sheet(questionnaireRows);
  if (questionarioSheet["!ref"])
    questionarioSheet["!autofilter"] = { ref: questionarioSheet["!ref"] };
  questionarioSheet["!cols"] = questionnaireRows[0].map((_, idx) => {
    const widths = [12, 10, 52, 10, 16, 40, 18, 18];
    return { wch: widths[idx] ?? 18 };
  });
  XLSX.utils.book_append_sheet(workbook, questionarioSheet, "Questionário");

  const metadataRows = buildMetadataRows(dataset);
  const metadataSheet = XLSX.utils.aoa_to_sheet(metadataRows);
  metadataSheet["!cols"] = [{ wch: 26 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadados");

  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return {
    workbook,
    bytes: new Uint8Array(arrayBuffer),
  };
}

export function buildSurveyExportFilePrefix(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `guivos-${QUESTIONNAIRE_CODE}-respostas-${yyyy}-${mm}-${dd}`;
}

function makeSyntheticQuestion(id: number): Question {
  return {
    id,
    code: String(id),
    section: "Z",
    sectionLabel: "Legado",
    type: "open",
    optional: true,
    placeholder: "",
  } as Question & { type: "open" };
}

function resolveSchemaQuestions(questions: Question[], fallbackQuestions: Question[]): Question[] {
  if (questions.length > 0) return questions;
  return fallbackQuestions;
}

function validateQuestionSet(questions: Question[]): void {
  if (questions.length === 0) throw new Error("Question schema is empty");
  const ids = questions.map((question) => question.id);
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid official question id: ${id}`);
    }
  }
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error("Duplicate official question id detected");
  }
  // Canonical P01..P22 check is now a warning so that admin-modified schemas
  // (questions added, removed or reordered via the panel) do not block exports.
  const missing = EXPECTED_QUESTION_IDS.filter((id) => !uniqueIds.has(id));
  const extra = [...uniqueIds]
    .sort((a, b) => a - b)
    .filter((id) => !EXPECTED_QUESTION_IDS.includes(id));
  if (missing.length > 0) {
    console.warn(
      `[survey-export] Schema is missing official questions: ${missing.map((id) => `P${String(id).padStart(2, "0")}`).join(", ")}`,
    );
  }
  if (extra.length > 0) {
    console.warn(
      `[survey-export] Schema has extra questions beyond P01..P22: ${extra.map((id) => `P${String(id).padStart(2, "0")}`).join(", ")}`,
    );
  }
  // Option code format: warn but never throw — codes may differ in modified schemas.
  for (const question of questions) {
    if (question.type === "single" || question.type === "multi") {
      for (const option of question.options) {
        const match = /^(\d+)\.(\d+)$/.exec(option.code);
        if (!match) {
          console.warn(
            `[survey-export] Non-standard option code on Q${question.id}: "${option.code}"`,
          );
          continue;
        }
        if (Number(match[1]) !== question.id) {
          console.warn(
            `[survey-export] Option code prefix mismatch on Q${question.id}: "${option.code}"`,
          );
        }
      }
    }
  }
}

function toCanonicalSchema(question: Question): CanonicalQuestionSchema {
  const key = questionKey(question.id);
  const alternatives: Record<string, string> = {};
  if (question.type === "single" || question.type === "multi") {
    for (const option of question.options) {
      alternatives[option.code] = option.label;
    }
  }
  const supportsOutroText =
    (question.type === "single" || question.type === "multi") &&
    (question.options.some((option) => /\boutro\b|\boutra\b/i.test(option.label)) ?? false) &&
    question.type === "single" &&
    !!question.extra?.key;
  return {
    key,
    numero: question.id,
    texto: question.title,
    tipo: question.type,
    alternativas: alternatives,
    extraKey: question.type === "single" && question.extra?.key ? question.extra.key : null,
    supportsOutroText,
  };
}

function collectExtraKeys(
  schemaQuestions: CanonicalQuestionSchema[],
  responses: ResponseRecord[],
): string[] {
  const keys = new Set<string>();
  for (const question of schemaQuestions) {
    if (question.extraKey) keys.add(question.extraKey);
  }
  for (const record of responses) {
    for (const key of Object.keys(record.extras || {})) keys.add(key);
  }
  return Array.from(keys).sort();
}

function normalizeSurveyResponse(
  record: ResponseRecord,
  schemaQuestions: CanonicalQuestionSchema[],
  questionMap: Map<number, Question>,
): CanonicalResponse {
  const sentAt = toIsoString(record.at);
  const startedAt = sentAt
    ? toIsoString(new Date(sentAt).getTime() - Math.max(0, record.durationSec) * 1000)
    : "";
  const extras = normalizeExtras(record.extras);
  const contato = normalizeContact(record.contact.name, record.contact.contact);
  const perguntas: Record<string, CanonicalAnswer> = {};

  for (const schemaQuestion of schemaQuestions) {
    const question = questionMap.get(schemaQuestion.numero);
    if (!question) {
      // Defensive: should never happen since questionMap includes synthetic questions.
      console.warn(
        `[survey-export] Missing question definition for ${schemaQuestion.key} — skipping`,
      );
      perguntas[schemaQuestion.key] = {
        numero: schemaQuestion.numero,
        codigo: null,
        resposta: null,
      };
      continue;
    }
    const rawAnswer = answerFor(record, schemaQuestion.numero);
    perguntas[schemaQuestion.key] = normalizeQuestionAnswer(question, rawAnswer, extras);
  }

  const totalPerguntas = schemaQuestions.length;
  const totalRespondidas = Object.values(perguntas).reduce((count, item) => {
    return count + (isAnswered(item) ? 1 : 0);
  }, 0);
  const percentualRespondido =
    totalPerguntas === 0 ? 0 : Number(((totalRespondidas / totalPerguntas) * 100).toFixed(1));

  return {
    response_id: sanitizeText(record.id),
    questionario_codigo: QUESTIONNAIRE_CODE,
    questionario_versao: QUESTIONNAIRE_VERSION,
    iniciado_em: startedAt,
    enviado_em: sentAt,
    duracao_segundos: Number.isFinite(record.durationSec) ? record.durationSec : 0,
    total_perguntas: totalPerguntas,
    total_respondidas: totalRespondidas,
    percentual_respondido: percentualRespondido,
    contato,
    extras,
    perguntas,
  };
}

function normalizeQuestionAnswer(
  question: Question,
  rawAnswer: unknown,
  extras: Record<string, string>,
): CanonicalAnswer {
  if (question.type === "open") {
    // Coerce any raw type to string for open and synthetic questions.
    let text: string;
    if (typeof rawAnswer === "string") {
      text = rawAnswer.trim();
    } else if (Array.isArray(rawAnswer)) {
      text = rawAnswer.filter(Boolean).join("|");
    } else if (rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== "") {
      text = String(rawAnswer);
    } else {
      text = "";
    }
    return {
      numero: question.id,
      codigo: text ? "ABERTA" : null,
      resposta: text || null,
    };
  }

  if (question.type === "scale") {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
      return { numero: question.id, codigo: null, resposta: null };
    }
    const asNum = typeof rawAnswer === "number" ? rawAnswer : Number(rawAnswer);
    if (!Number.isFinite(asNum)) {
      console.warn(
        `[survey-export] Non-numeric scale answer for question ${question.id}: ${String(rawAnswer)}`,
      );
      return { numero: question.id, codigo: null, resposta: null };
    }
    if (asNum < question.min || asNum > question.max) {
      console.warn(
        `[survey-export] Out-of-range scale answer for question ${question.id}: ${asNum}`,
      );
      const clamped = Math.max(question.min, Math.min(question.max, asNum));
      return { numero: question.id, codigo: `${question.id}.${clamped}`, resposta: clamped };
    }
    return {
      numero: question.id,
      codigo: `${question.id}.${asNum}`,
      resposta: asNum,
    };
  }

  if (question.type === "single") {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
      return { numero: question.id, codigo: null, resposta: null };
    }
    if (typeof rawAnswer !== "string") {
      console.warn(`[survey-export] Unexpected single answer type for question ${question.id}`);
      return { numero: question.id, codigo: String(rawAnswer), resposta: String(rawAnswer) };
    }
    const selected = question.options.find((option) => option.code === rawAnswer);
    if (!selected) {
      // Option may have been removed from schema after response was recorded — export code as-is.
      console.warn(
        `[survey-export] Option code not in current schema for Q${question.id}: "${rawAnswer}"`,
      );
      return { numero: question.id, codigo: rawAnswer, resposta: rawAnswer };
    }
    // Warn (not throw) on code prefix mismatch
    const match = /^(\d+)\.(\d+)$/.exec(selected.code);
    if (match && Number(match[1]) !== question.id) {
      console.warn(
        `[survey-export] Option code prefix mismatch for Q${question.id}: "${selected.code}"`,
      );
    }
    const outroTexto = question.extra?.key
      ? normalizeFreeText(extras[question.extra.key] ?? "")
      : null;
    const includesOutro = /\boutro\b|\boutra\b/i.test(selected.label);
    return {
      numero: question.id,
      codigo: selected.code,
      resposta: selected.label,
      ...(includesOutro ? { outro_texto: outroTexto || null } : {}),
    };
  }

  // multi
  if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
    return { numero: question.id, codigos: null, respostas: null };
  }
  if (!Array.isArray(rawAnswer)) {
    console.warn(`[survey-export] Unexpected multi answer type for question ${question.id}`);
    return { numero: question.id, codigos: null, respostas: null };
  }
  if (rawAnswer.length === 0) {
    return { numero: question.id, codigos: null, respostas: null };
  }

  const codigos = rawAnswer
    .filter((item) => typeof item === "string" && (item as string).length > 0)
    .map((item) => {
      const code = item as string;
      // Warn on prefix mismatch but don't throw
      const match = /^(\d+)\.(\d+)$/.exec(code);
      if (match && Number(match[1]) !== question.id) {
        console.warn(
          `[survey-export] Multi option code prefix mismatch for Q${question.id}: "${code}"`,
        );
      }
      return code;
    });
  const respostas = codigos.map((codigo) => {
    const option = question.options.find((entry) => entry.code === codigo);
    if (!option) {
      console.warn(
        `[survey-export] Multi option code not in current schema for Q${question.id}: "${codigo}"`,
      );
      return codigo;
    }
    return option.label;
  });
  return {
    numero: question.id,
    codigos,
    respostas,
  };
}

// Kept for potential future use; now only warns instead of throwing.
function ensureOptionBelongsToQuestion(questionId: number, code: string): void {
  const match = /^(\d+)\.(\d+)$/.exec(code);
  if (!match) {
    console.warn(`[survey-export] Non-standard option code format: "${code}"`);
    return;
  }
  if (Number(match[1]) !== questionId) {
    console.warn(
      `[survey-export] Option code prefix mismatch for question ${questionId}: "${code}"`,
    );
  }
}

function normalizeExtras(extras: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(extras || {})) {
    output[key] = typeof value === "string" ? value : "";
  }
  return output;
}

function normalizeContact(name: string, rawContact: string): CanonicalContact {
  const nome = sanitizeText(name);
  const original = sanitizeText(rawContact);
  if (!original) return { nome, email: "", telefone: "", original: null };

  const emailMatch = original.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : "";
  const withoutEmail = email ? original.replace(email, " ") : original;
  const cleanedPhone = withoutEmail
    .replace(/[|,;/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const telefone = /\d/.test(cleanedPhone) ? cleanedPhone : "";
  const unresolved = !email || !telefone;
  return {
    nome,
    email,
    telefone,
    original: unresolved ? original : null,
  };
}

function normalizeOpenAnswer(answer: unknown): string {
  if (typeof answer !== "string") return "";
  return answer.trim().length > 0 ? answer : "";
}

function normalizeFreeText(value: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : "";
}

function answerFor(record: ResponseRecord, questionId: number): unknown {
  return record.answers[String(questionId)] ?? record.answers[questionId];
}

function isAnswered(answer: CanonicalAnswer): boolean {
  if ("codigos" in answer) return Array.isArray(answer.codigos) && answer.codigos.length > 0;
  if (answer.codigo === null) return false;
  if (typeof answer.resposta === "string") return answer.resposta.trim().length > 0;
  return answer.resposta !== null;
}

function buildCsvHeaders(dataset: CanonicalDataset): string[] {
  const headers = [
    "response_id",
    "questionario_codigo",
    "questionario_versao",
    "iniciado_em",
    "enviado_em",
    "duracao_segundos",
    "total_perguntas",
    "total_respondidas",
    "percentual_respondido",
    "contato_nome",
    "contato_email",
    "contato_telefone",
  ];
  if (dataset.hasContatoOriginal) headers.push("contato_original");
  headers.push(...dataset.extraKeys.map((key) => `extra_${key}`));
  for (const question of dataset.schemaQuestions) {
    headers.push(`${question.key}_codigo`);
    headers.push(`${question.key}_resposta`);
    if (question.supportsOutroText) headers.push(`${question.key}_outro`);
  }
  return headers;
}

function buildCsvRow(record: CanonicalResponse, dataset: CanonicalDataset): string[] {
  const row = [
    record.response_id,
    record.questionario_codigo,
    record.questionario_versao,
    record.iniciado_em,
    record.enviado_em,
    String(record.duracao_segundos),
    String(record.total_perguntas),
    String(record.total_respondidas),
    `${record.percentual_respondido.toFixed(1)}%`,
    record.contato.nome,
    record.contato.email,
    record.contato.telefone,
  ];
  if (dataset.hasContatoOriginal) row.push(record.contato.original ?? "");
  row.push(...dataset.extraKeys.map((key) => record.extras[key] ?? ""));

  for (const question of dataset.schemaQuestions) {
    const answer = record.perguntas[question.key];
    row.push(csvCodeCell(answer));
    row.push(csvTextCell(answer));
    if (question.supportsOutroText) {
      row.push("outro_texto" in answer ? (answer.outro_texto ?? "") : "");
    }
  }
  return row.map(protectCsvFormulaCell);
}

function buildXlsxResponseRow(
  record: CanonicalResponse,
  dataset: CanonicalDataset,
): Array<string | number> {
  const row: Array<string | number> = [
    protectSpreadsheetFormulaCell(record.response_id),
    record.questionario_codigo,
    record.questionario_versao,
    record.iniciado_em,
    record.enviado_em,
    record.duracao_segundos,
    record.total_perguntas,
    record.total_respondidas,
    record.percentual_respondido,
    protectSpreadsheetFormulaCell(record.contato.nome),
    protectSpreadsheetFormulaCell(record.contato.email),
    protectSpreadsheetFormulaCell(record.contato.telefone),
  ];
  if (dataset.hasContatoOriginal) {
    row.push(protectSpreadsheetFormulaCell(record.contato.original ?? ""));
  }
  row.push(
    ...dataset.extraKeys.map((key) => protectSpreadsheetFormulaCell(record.extras[key] ?? "")),
  );

  for (const question of dataset.schemaQuestions) {
    const answer = record.perguntas[question.key];
    row.push(protectSpreadsheetFormulaCell(csvCodeCell(answer)));
    if ("codigos" in answer) {
      row.push(protectSpreadsheetFormulaCell(answer.respostas ? answer.respostas.join("|") : ""));
    } else if (typeof answer.resposta === "number") {
      row.push(answer.resposta);
    } else {
      row.push(
        protectSpreadsheetFormulaCell(answer.resposta === null ? "" : String(answer.resposta)),
      );
    }
    if (question.supportsOutroText) {
      row.push(
        protectSpreadsheetFormulaCell("outro_texto" in answer ? (answer.outro_texto ?? "") : ""),
      );
    }
  }
  return row;
}

function buildQuestionarioRows(dataset: CanonicalDataset): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [
    [
      "pergunta_id",
      "pergunta_numero",
      "pergunta_texto",
      "tipo",
      "alternativa_codigo",
      "alternativa_texto",
      "extra_key",
      "suporta_outro_texto",
    ],
  ];

  for (const question of dataset.schemaQuestions) {
    if (question.tipo === "scale") {
      for (let value = 0; value <= 10; value++) {
        rows.push([
          question.key,
          question.numero,
          question.texto,
          question.tipo,
          `${question.numero}.${value}`,
          String(value),
          question.extraKey ?? "",
          question.supportsOutroText ? "SIM" : "NÃO",
        ]);
      }
      continue;
    }
    if (question.tipo === "open") {
      rows.push([
        question.key,
        question.numero,
        question.texto,
        question.tipo,
        "ABERTA",
        "Resposta textual",
        question.extraKey ?? "",
        question.supportsOutroText ? "SIM" : "NÃO",
      ]);
      continue;
    }
    const optionEntries = Object.entries(question.alternativas);
    if (optionEntries.length === 0) {
      rows.push([
        question.key,
        question.numero,
        question.texto,
        question.tipo,
        "",
        "",
        question.extraKey ?? "",
        question.supportsOutroText ? "SIM" : "NÃO",
      ]);
      continue;
    }
    for (const [code, label] of optionEntries) {
      rows.push([
        question.key,
        question.numero,
        question.texto,
        question.tipo,
        code,
        label,
        question.extraKey ?? "",
        question.supportsOutroText ? "SIM" : "NÃO",
      ]);
    }
  }
  return rows;
}

function buildMetadataRows(dataset: CanonicalDataset): Array<Array<string | number>> {
  return [
    ["campo", "valor"],
    ["questionario_codigo", dataset.questionario_codigo],
    ["questionario_versao", dataset.questionario_versao],
    ["exportado_em", dataset.exportado_em],
    ["total_registros", dataset.respostas.length],
    ["total_perguntas", dataset.schemaQuestions.length],
    ["formato", "XLSX"],
  ];
}

function inferXlsxColumnWidth(header: string): number {
  if (header.endsWith("_codigo")) return 16;
  if (header.endsWith("_resposta")) return 42;
  if (header.endsWith("_outro")) return 36;
  if (header.startsWith("contato_")) return 24;
  if (header.startsWith("extra_")) return 22;
  if (header.endsWith("_em")) return 24;
  if (header === "response_id") return 24;
  if (header === "percentual_respondido") return 20;
  return 18;
}

function csvCodeCell(answer: CanonicalAnswer): string {
  if ("codigos" in answer) return answer.codigos ? answer.codigos.join("|") : "";
  return answer.codigo ?? "";
}

function csvTextCell(answer: CanonicalAnswer): string {
  if ("codigos" in answer) return answer.respostas ? answer.respostas.join("|") : "";
  if (answer.resposta === null) return "";
  return String(answer.resposta);
}

function protectCsvFormulaCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function protectSpreadsheetFormulaCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function questionKey(questionId: number): string {
  return `P${String(questionId).padStart(2, "0")}`;
}

function sanitizeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toIsoString(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  return `\uFEFF${lines}`;
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
