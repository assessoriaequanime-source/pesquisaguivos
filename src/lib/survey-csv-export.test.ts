import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import {
  buildSurveyCsvExport,
  buildSurveyExportFilePrefix,
  buildSurveyJsonExport,
  buildSurveyXlsxExport,
  normalizeSurveyExportData,
  QUESTIONNAIRE_CODE,
  QUESTIONNAIRE_VERSION,
} from "./survey-csv-export";
import type { Question, ResponseRecord } from "./survey-store";
import * as XLSX from "xlsx";

function makeQuestions(): Question[] {
  const questions: Question[] = [];
  for (let id = 1; id <= 22; id++) {
    questions.push({
      id,
      code: String(id).padStart(2, "0"),
      section: "A",
      sectionLabel: "Perfil",
      type: "single",
      title: `Pergunta ${id}`,
      options: [
        { code: `${id}.1`, label: `Opção ${id}.1` },
        { code: `${id}.2`, label: `Opção ${id}.2` },
      ],
    });
  }
  questions[1] = {
    ...questions[1],
    extra: { key: "cidade", placeholder: "Cidade" },
  };
  questions[5] = {
    ...questions[5],
    type: "multi",
    options: [
      { code: "6.1", label: "Falta de tempo" },
      { code: "6.2", label: "Falta de dinheiro" },
      { code: "6.3", label: "Falta de orientação" },
      { code: "6.5", label: "Falta de oportunidades" },
    ],
  };
  questions[6] = {
    ...questions[6],
    options: [
      { code: "7.1", label: "A" },
      { code: "7.2", label: "B" },
      { code: "7.3", label: "Outro" },
    ],
    extra: { key: "q7_outro", placeholder: "Outro texto" },
  };
  questions[10] = {
    ...questions[10],
    type: "scale",
    min: 0,
    max: 10,
    minLabel: "Mínimo",
    maxLabel: "Máximo",
  };
  questions[11] = {
    ...questions[11],
    type: "open",
    placeholder: "Digite aqui",
  };
  questions[21] = {
    ...questions[21],
    optional: true,
  };
  return questions;
}

function makeResponse(overrides?: Partial<ResponseRecord>): ResponseRecord {
  return {
    id: "r_1",
    at: "2026-07-24T00:00:00.000Z",
    durationSec: 120,
    answers: {
      1: "1.2",
      2: "2.1",
      6: ["6.1", "6.3", "6.5"],
      7: "7.3",
      11: 8,
      12: 'ação, "evolução"\nlinha 2 😀',
      22: "",
    },
    extras: {
      cidade: "São Paulo",
      q7_outro: "Texto do outro",
    },
    contact: {
      name: "Ana",
      contact: "ana@exemplo.com | +55 11 98888-7777",
    },
    ...overrides,
  };
}

function parseCsv(csv: string): string[][] {
  const content = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function getCsvCell(rows: string[][], column: string, row = 1): string {
  const idx = rows[0].indexOf(column);
  if (idx < 0) throw new Error(`Missing column: ${column}`);
  return rows[row][idx] ?? "";
}

function readXlsx(bytes: Uint8Array): XLSX.WorkBook {
  return XLSX.read(bytes, { type: "array", cellFormula: true, raw: true });
}

function getSheetRows(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
}

function getSheetCell(rows: unknown[][], column: string, row = 1): unknown {
  const headers = rows[0] as string[];
  const idx = headers.indexOf(column);
  if (idx < 0) throw new Error(`Missing column: ${column}`);
  return rows[row]?.[idx];
}

describe("survey export normalization", () => {
  test("uses official ids from source file (P01..P22)", () => {
    const sourcePath = path.resolve(process.cwd(), "src/lib/survey-store.ts");
    const text = fs.readFileSync(sourcePath, "utf8");
    const ids = new Set<number>();
    const regex = /id:\s*(\d+),/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 22) ids.add(value);
    }
    assert.equal(ids.size, 22);
    for (let id = 1; id <= 22; id++) assert.ok(ids.has(id));
  });

  test("builds deterministic CSV headers and full P01..P22 even with no records", () => {
    const { csv } = buildSurveyCsvExport({ responses: [], questions: makeQuestions() });
    const rows = parseCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][0], "response_id");
    assert.ok(rows[0].includes("P01_codigo"));
    assert.ok(rows[0].includes("P22_resposta"));
    assert.equal(new Set(rows[0]).size, rows[0].length);
  });

  test("builds valid JSON document with questionnaire dictionary", () => {
    const { json } = buildSurveyJsonExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const parsed = JSON.parse(json) as {
      schema: { questionario_codigo: string };
      questionario: Record<string, { numero: number }>;
      respostas: Array<{ perguntas: Record<string, unknown> }>;
    };
    assert.equal(parsed.schema.questionario_codigo, QUESTIONNAIRE_CODE);
    assert.equal(parsed.questionario.P01.numero, 1);
    assert.ok("P22" in parsed.respostas[0].perguntas);
  });

  test("builds JSON with no records", () => {
    const { document } = buildSurveyJsonExport({ responses: [], questions: makeQuestions() });
    assert.equal(document.schema.total_registros, 0);
    assert.equal(document.respostas.length, 0);
    assert.equal(document.schema.questionario_codigo, QUESTIONNAIRE_CODE);
  });

  test("exports simple, multi, open and optional-empty answers", () => {
    const questions = makeQuestions();
    const response = makeResponse();
    const csvRows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    assert.equal(getCsvCell(csvRows, "P01_codigo"), "1.2");
    assert.equal(getCsvCell(csvRows, "P01_resposta"), "Opção 1.2");
    assert.equal(getCsvCell(csvRows, "P06_codigo"), "6.1|6.3|6.5");
    assert.equal(
      getCsvCell(csvRows, "P06_resposta"),
      "Falta de tempo|Falta de orientação|Falta de oportunidades",
    );
    assert.equal(getCsvCell(csvRows, "P12_codigo"), "ABERTA");
    assert.equal(getCsvCell(csvRows, "P22_codigo"), "");
    assert.equal(getCsvCell(csvRows, "P22_resposta"), "");
  });

  test("exports scale with 0 and 10 as valid responses", () => {
    const questions = makeQuestions();
    const zero = makeResponse({ answers: { ...makeResponse().answers, 11: 0 } });
    const ten = makeResponse({ answers: { ...makeResponse().answers, 11: 10 } });
    const rows0 = parseCsv(buildSurveyCsvExport({ responses: [zero], questions }).csv);
    const rows10 = parseCsv(buildSurveyCsvExport({ responses: [ten], questions }).csv);
    assert.equal(getCsvCell(rows0, "P11_codigo"), "11.0");
    assert.equal(getCsvCell(rows0, "P11_resposta"), "0");
    assert.equal(getCsvCell(rows10, "P11_codigo"), "11.10");
    assert.equal(getCsvCell(rows10, "P11_resposta"), "10");
  });

  test("handles comma, quotes, CRLF, accents and unicode in open text", () => {
    const questions = makeQuestions();
    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        12: 'ação,\r\n"evolução" 😀',
      },
    });
    const rows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    assert.equal(getCsvCell(rows, "P12_resposta"), 'ação,\r\n"evolução" 😀');
  });

  test("exports Outro code, label and dedicated PXX_outro column", () => {
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [makeResponse()], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "P07_codigo"), "7.3");
    assert.equal(getCsvCell(rows, "P07_resposta"), "Outro");
    assert.equal(getCsvCell(rows, "P07_outro"), "Texto do outro");
  });

  test("normalizes contact and preserves legacy original when ambiguous", () => {
    const questions = makeQuestions();
    const response = makeResponse({
      contact: { name: "João", contact: "contato sem padrão claro" },
    });
    const rows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    assert.equal(getCsvCell(rows, "contato_nome"), "João");
    assert.equal(getCsvCell(rows, "contato_email"), "");
    assert.equal(getCsvCell(rows, "contato_telefone"), "");
    assert.equal(getCsvCell(rows, "contato_original"), "contato sem padrão claro");
  });

  test("preserves extras deterministically", () => {
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [makeResponse()], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "extra_cidade"), "São Paulo");
  });

  test("uses fallback questions when admin state is empty", () => {
    const rows = parseCsv(
      buildSurveyCsvExport({
        responses: [makeResponse()],
        questions: [],
        fallbackQuestions: makeQuestions(),
      }).csv,
    );
    assert.ok(rows[0].includes("P22_resposta"));
    assert.equal(getCsvCell(rows, "P01_codigo"), "1.2");
  });

  test("counts answered questions and percentage per-question (multi counts once)", () => {
    const response = makeResponse();
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "total_perguntas"), "22");
    assert.equal(getCsvCell(rows, "total_respondidas"), "6");
    assert.equal(getCsvCell(rows, "percentual_respondido"), "27.3%");
  });

  test("computes 4/22 as 18.2%", () => {
    const response = makeResponse({
      answers: {
        1: "1.2",
        6: ["6.1"],
        11: 8,
        12: "texto",
      },
    });
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "total_respondidas"), "4");
    assert.equal(getCsvCell(rows, "percentual_respondido"), "18.2%");
  });

  test("tolerates response with cross-question option code (uses code as fallback)", () => {
    // Q6 answered with "7.2" which belongs to Q7 — export must not throw
    const response = makeResponse({
      answers: { ...makeResponse().answers, 6: ["7.2"] },
    });
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    // Code is exported as-is; text falls back to the raw code string
    assert.equal(getCsvCell(rows, "P06_codigo"), "7.2");
    assert.equal(getCsvCell(rows, "P06_resposta"), "7.2");
  });

  test("rejects duplicated question id", () => {
    const questions = makeQuestions();
    questions.push({ ...questions[0] });
    assert.throws(
      () => normalizeSurveyExportData({ responses: [], questions }),
      /Duplicate official question id/,
    );
  });

  test("tolerates schema missing some official questions (exports available questions)", () => {
    // Schema with only 21 questions (Q6 removed) — must not throw
    const questions = makeQuestions().filter((q) => q.id !== 6);
    const response = makeResponse({
      answers: { ...makeResponse().answers, 6: ["6.1"] },
    });
    const { csv } = buildSurveyCsvExport({ responses: [response], questions });
    const rows = parseCsv(csv);
    // P01 and P22 should still be present
    assert.ok(rows[0].includes("P01_codigo"));
    assert.ok(rows[0].includes("P22_resposta"));
    // Q6 answer not in schema → appears as synthetic open column
    assert.ok(rows[0].includes("P06_codigo"));
    // P01 answer is still correct
    assert.equal(getCsvCell(rows, "P01_codigo"), "1.2");
  });

  test("rejects invalid official id", () => {
    const questions = makeQuestions() as Array<Question & { id: number }>;
    questions[0].id = 0;
    assert.throws(
      () => normalizeSurveyExportData({ responses: [], questions: questions as Question[] }),
      /Invalid official question id/,
    );
  });

  test("tolerates option code with wrong prefix in schema (warns, exports proceed)", () => {
    const questions = makeQuestions();
    const q6 = questions.find((q) => q.id === 6);
    if (!q6 || q6.type !== "multi") throw new Error("invalid fixture");
    // Deliberately corrupt one option code — export must not throw
    q6.options[0] = { ...q6.options[0], code: "7.1" };
    const { csv } = buildSurveyCsvExport({ responses: [], questions });
    const rows = parseCsv(csv);
    assert.ok(rows[0].includes("P06_codigo"));
    assert.ok(rows[0].includes("P22_resposta"));
  });

  test("sanitizes CSV formula injection while preserving JSON original", () => {
    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        12: '=HYPERLINK("http://x")',
      },
    });
    const questions = makeQuestions();
    const csvRows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    const json = buildSurveyJsonExport({ responses: [response], questions }).document;
    assert.equal(getCsvCell(csvRows, "P12_resposta"), '\'=HYPERLINK("http://x")');
    assert.equal(json.respostas[0].perguntas.P12.resposta, '=HYPERLINK("http://x")');
  });

  test("keeps correlation by official id even when questions are shuffled", () => {
    const questions = makeQuestions().sort((a, b) => b.id - a.id);
    const response = makeResponse({
      answers: { ...makeResponse().answers, 1: "1.1", 6: ["6.3"] },
    });
    const rows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    assert.equal(getCsvCell(rows, "P01_codigo"), "1.1");
    assert.equal(getCsvCell(rows, "P06_codigo"), "6.3");
  });

  test("keeps deterministic column order across runs", () => {
    const questions = makeQuestions();
    const h1 = parseCsv(buildSurveyCsvExport({ responses: [makeResponse()], questions }).csv)[0];
    const h2 = parseCsv(buildSurveyCsvExport({ responses: [makeResponse()], questions }).csv)[0];
    assert.deepEqual(h1, h2);
  });

  test("treats open whitespace as unanswered in CSV and JSON", () => {
    const questions = makeQuestions();
    const response = makeResponse({
      answers: { ...makeResponse().answers, 12: "   " },
    });
    const csvRows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    const jsonDoc = buildSurveyJsonExport({ responses: [response], questions }).document;
    assert.equal(getCsvCell(csvRows, "P12_codigo"), "");
    assert.equal(getCsvCell(csvRows, "P12_resposta"), "");
    assert.equal(jsonDoc.respostas[0].perguntas.P12.codigo, null);
    assert.equal(jsonDoc.respostas[0].perguntas.P12.resposta, null);
  });

  test("treats multi empty array as unanswered", () => {
    const response = makeResponse({
      answers: { ...makeResponse().answers, 6: [] },
    });
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "P06_codigo"), "");
    assert.equal(getCsvCell(rows, "P06_resposta"), "");
  });

  test("normalizes legacy contact with only phone", () => {
    const response = makeResponse({
      contact: { name: "Rita", contact: "+55 21 90000-1111" },
    });
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "contato_nome"), "Rita");
    assert.equal(getCsvCell(rows, "contato_email"), "");
    assert.equal(getCsvCell(rows, "contato_telefone"), "'+55 21 90000-1111");
  });

  test("CSV and JSON are semantically equivalent for P01..P22", () => {
    const questions = makeQuestions();
    const response = makeResponse();
    const csvRows = parseCsv(buildSurveyCsvExport({ responses: [response], questions }).csv);
    const jsonDoc = buildSurveyJsonExport({ responses: [response], questions }).document;
    const jsonPerguntas = jsonDoc.respostas[0].perguntas;

    for (let id = 1; id <= 22; id++) {
      const key = `P${String(id).padStart(2, "0")}` as keyof typeof jsonPerguntas;
      const csvCode = getCsvCell(csvRows, `${key}_codigo`);
      const csvText = getCsvCell(csvRows, `${key}_resposta`);
      const jsonEntry = jsonPerguntas[key];
      if ("codigos" in jsonEntry) {
        assert.equal(csvCode, jsonEntry.codigos ? jsonEntry.codigos.join("|") : "");
        assert.equal(csvText, jsonEntry.respostas ? jsonEntry.respostas.join("|") : "");
      } else {
        assert.equal(csvCode, jsonEntry.codigo ?? "");
        assert.equal(csvText, jsonEntry.resposta === null ? "" : String(jsonEntry.resposta));
      }
    }
  });

  test("end-to-end synthetic flow keeps equivalence after CSV parse and JSON parse", () => {
    const questions = makeQuestions();
    const response = makeResponse();
    const csv = buildSurveyCsvExport({ responses: [response], questions }).csv;
    const json = buildSurveyJsonExport({ responses: [response], questions }).json;
    const parsedCsv = parseCsv(csv);
    const parsedJson = JSON.parse(json) as {
      respostas: Array<{ perguntas: Record<string, unknown> }>;
    };
    assert.equal(parsedJson.respostas.length, 1);
    assert.equal(getCsvCell(parsedCsv, "P01_codigo"), "1.2");
    assert.ok("P22" in parsedJson.respostas[0].perguntas);
  });

  test("produces expected questionnaire metadata values", () => {
    const csvRows = parseCsv(
      buildSurveyCsvExport({ responses: [makeResponse()], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(csvRows, "questionario_codigo"), QUESTIONNAIRE_CODE);
    assert.equal(getCsvCell(csvRows, "questionario_versao"), QUESTIONNAIRE_VERSION);
  });

  test("never emits textual undefined/null/object in CSV", () => {
    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        12: undefined,
      },
      extras: {
        cidade: "São Paulo",
        estranho: null as unknown as string,
      },
    });
    const { csv } = buildSurveyCsvExport({ responses: [response], questions: makeQuestions() });
    assert.equal(csv.includes('"undefined"'), false);
    assert.equal(csv.includes('"null"'), false);
    assert.equal(csv.includes("[object Object]"), false);
  });

  test("JSON export remains parseable and typed", () => {
    const { json } = buildSurveyJsonExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const parsed = JSON.parse(json) as {
      schema: { total_registros: number };
      respostas: Array<{ perguntas: Record<string, unknown> }>;
    };
    assert.equal(parsed.schema.total_registros, 1);
    assert.ok("P01" in parsed.respostas[0].perguntas);
  });

  test("null and undefined closed answers are exported as empty in CSV", () => {
    const response = makeResponse({
      answers: { ...makeResponse().answers, 4: null, 5: undefined },
    });
    const rows = parseCsv(
      buildSurveyCsvExport({ responses: [response], questions: makeQuestions() }).csv,
    );
    assert.equal(getCsvCell(rows, "P04_codigo"), "");
    assert.equal(getCsvCell(rows, "P05_codigo"), "");
  });

  test("builds xlsx with expected sheets", () => {
    const { bytes } = buildSurveyXlsxExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const workbook = readXlsx(bytes);
    assert.ok(workbook.SheetNames.includes("Respostas"));
    assert.ok(workbook.SheetNames.includes("Questionário"));
    assert.ok(workbook.SheetNames.includes("Metadados"));
  });

  test("xlsx respostas has P01..P22 and contact/extra columns", () => {
    const { bytes } = buildSurveyXlsxExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    const headers = rows[0] as string[];
    assert.ok(headers.includes("P01_codigo"));
    assert.ok(headers.includes("P22_resposta"));
    assert.ok(headers.includes("contato_nome"));
    assert.ok(headers.includes("extra_cidade"));
  });

  test("xlsx keeps official question identity independently of visual order", () => {
    const questions = makeQuestions().sort((a, b) => b.id - a.id);
    const response = makeResponse({ answers: { ...makeResponse().answers, 1: "1.1", 6: ["6.3"] } });
    const { bytes } = buildSurveyXlsxExport({ responses: [response], questions });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    assert.equal(getSheetCell(rows, "P01_codigo"), "1.1");
    assert.equal(getSheetCell(rows, "P06_codigo"), "6.3");
  });

  test("xlsx keeps multi-choice, scale 0/10, open text and unicode", () => {
    const questions = makeQuestions();
    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        6: ["6.1", "6.3"],
        11: 0,
        12: 'ação, "evolução"\n😀',
      },
    });
    const { bytes } = buildSurveyXlsxExport({ responses: [response], questions });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    assert.equal(getSheetCell(rows, "P06_codigo"), "6.1|6.3");
    assert.equal(getSheetCell(rows, "P06_resposta"), "Falta de tempo|Falta de orientação");
    assert.equal(getSheetCell(rows, "P11_codigo"), "11.0");
    assert.equal(getSheetCell(rows, "P11_resposta"), 0);
    assert.equal(getSheetCell(rows, "P12_resposta"), 'ação, "evolução"\n😀');
  });

  test("xlsx includes PXX_outro and cidade", () => {
    const { bytes } = buildSurveyXlsxExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    assert.equal(getSheetCell(rows, "P07_outro"), "Texto do outro");
    assert.equal(getSheetCell(rows, "extra_cidade"), "São Paulo");
  });

  test("xlsx metadados sheet contains VAL-002 and v1", () => {
    const { bytes } = buildSurveyXlsxExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const rows = getSheetRows(readXlsx(bytes), "Metadados");
    const kv = new Map(rows.slice(1).map((line) => [String(line[0]), String(line[1])]));
    assert.equal(kv.get("questionario_codigo"), QUESTIONNAIRE_CODE);
    assert.equal(kv.get("questionario_versao"), QUESTIONNAIRE_VERSION);
    assert.equal(kv.get("formato"), "XLSX");
  });

  test("xlsx questionario sheet exposes dictionary for P01..P22", () => {
    const { bytes } = buildSurveyXlsxExport({
      responses: [makeResponse()],
      questions: makeQuestions(),
    });
    const rows = getSheetRows(readXlsx(bytes), "Questionário");
    const ids = new Set(rows.slice(1).map((line) => String(line[0])));
    assert.ok(ids.has("P01"));
    assert.ok(ids.has("P22"));
  });

  test("xlsx formula injection protection applies to user text cells", () => {
    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        12: '=HYPERLINK("http://x")',
      },
    });
    const { bytes } = buildSurveyXlsxExport({
      responses: [response],
      questions: makeQuestions(),
    });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    assert.equal(getSheetCell(rows, "P12_resposta"), '\'=HYPERLINK("http://x")');
  });

  test("xlsx round-trip preserves canonical equivalence with normalization", () => {
    const questions = makeQuestions();
    const responses = [makeResponse()];
    const normalized = normalizeSurveyExportData({ responses, questions });
    const { bytes } = buildSurveyXlsxExport({ responses, questions });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    const entry = normalized.respostas[0];
    assert.equal(getSheetCell(rows, "response_id"), entry.response_id);
    assert.equal(getSheetCell(rows, "total_respondidas"), entry.total_respondidas);
    assert.equal(getSheetCell(rows, "percentual_respondido"), entry.percentual_respondido);
    for (let id = 1; id <= 22; id++) {
      const key = `P${String(id).padStart(2, "0")}` as keyof typeof entry.perguntas;
      const answer = entry.perguntas[key];
      const expectedCode =
        "codigos" in answer ? (answer.codigos?.join("|") ?? "") : (answer.codigo ?? "");
      const expectedText =
        "codigos" in answer
          ? (answer.respostas?.join("|") ?? "")
          : answer.resposta === null
            ? ""
            : answer.resposta;
      assert.equal(String(getSheetCell(rows, `${key}_codigo`) ?? ""), expectedCode);
      assert.equal(getSheetCell(rows, `${key}_resposta`) ?? "", expectedText);
      const supportsOutro = "outro_texto" in answer;
      if (supportsOutro) {
        assert.equal(
          String(getSheetCell(rows, `${key}_outro`) ?? ""),
          String(answer.outro_texto ?? ""),
        );
      }
    }
  });

  test("xlsx is semantically equivalent to csv and json for P01..P22", () => {
    const questions = makeQuestions();
    const responses = [makeResponse()];
    const csvRows = parseCsv(buildSurveyCsvExport({ responses, questions }).csv);
    const jsonDoc = buildSurveyJsonExport({ responses, questions }).document;
    const xlsxRows = getSheetRows(
      readXlsx(buildSurveyXlsxExport({ responses, questions }).bytes),
      "Respostas",
    );
    for (let id = 1; id <= 22; id++) {
      const key =
        `P${String(id).padStart(2, "0")}` as keyof (typeof jsonDoc.respostas)[0]["perguntas"];
      const csvCode = getCsvCell(csvRows, `${key}_codigo`);
      const xlsxCode = String(getSheetCell(xlsxRows, `${key}_codigo`) ?? "");
      const jsonEntry = jsonDoc.respostas[0].perguntas[key];
      if ("codigos" in jsonEntry) {
        const expected = jsonEntry.codigos ? jsonEntry.codigos.join("|") : "";
        assert.equal(csvCode, expected);
        assert.equal(xlsxCode, expected);
        const csvText = getCsvCell(csvRows, `${key}_resposta`);
        const xlsxText = String(getSheetCell(xlsxRows, `${key}_resposta`) ?? "");
        const expectedText = jsonEntry.respostas ? jsonEntry.respostas.join("|") : "";
        assert.equal(csvText, expectedText);
        assert.equal(xlsxText, expectedText);
      } else {
        const expected = jsonEntry.codigo ?? "";
        assert.equal(csvCode, expected);
        assert.equal(xlsxCode, expected);
        const csvText = getCsvCell(csvRows, `${key}_resposta`);
        const xlsxText = getSheetCell(xlsxRows, `${key}_resposta`);
        const expectedText = jsonEntry.resposta === null ? "" : jsonEntry.resposta;
        assert.equal(csvText, String(expectedText));
        assert.equal(xlsxText ?? "", expectedText);
      }
    }
  });

  test("xlsx keeps validated reference semantics for official answers", () => {
    const questions = makeQuestions();
    questions[0] = {
      ...questions[0],
      options: [
        { code: "1.1", label: "Até 17 anos" },
        { code: "1.2", label: "18 a 24 anos" },
      ],
    };
    questions[1] = {
      ...questions[1],
      options: [
        { code: "2.1", label: "Acre" },
        { code: "2.7", label: "Distrito Federal" },
      ],
    };
    questions[5] = {
      ...questions[5],
      options: [
        { code: "6.1", label: "Falta de dinheiro ou recursos" },
        { code: "6.2", label: "Falta de tempo" },
        { code: "6.3", label: "Falta de informação confiável" },
      ],
    };
    questions[9] = { ...questions[9], type: "scale", min: 0, max: 10 };
    questions[10] = { ...questions[10], type: "scale", min: 0, max: 10 };
    questions[12] = { ...questions[12], type: "scale", min: 0, max: 10 };
    questions[16] = { ...questions[16], type: "scale", min: 0, max: 10 };
    questions[21] = { ...questions[21], type: "open" };

    const response = makeResponse({
      answers: {
        ...makeResponse().answers,
        1: "1.2",
        2: "2.7",
        6: ["6.1", "6.2", "6.3"],
        10: 6,
        11: 6,
        13: 9,
        17: 9,
        22: "Resposta aberta",
      },
    });

    const rows = getSheetRows(
      readXlsx(buildSurveyXlsxExport({ responses: [response], questions }).bytes),
      "Respostas",
    );
    assert.equal(getSheetCell(rows, "P01_codigo"), "1.2");
    assert.equal(getSheetCell(rows, "P01_resposta"), "18 a 24 anos");
    assert.equal(getSheetCell(rows, "P02_codigo"), "2.7");
    assert.equal(getSheetCell(rows, "P02_resposta"), "Distrito Federal");
    assert.equal(getSheetCell(rows, "P06_codigo"), "6.1|6.2|6.3");
    assert.equal(
      getSheetCell(rows, "P06_resposta"),
      "Falta de dinheiro ou recursos|Falta de tempo|Falta de informação confiável",
    );
    assert.equal(getSheetCell(rows, "P10_codigo"), "10.6");
    assert.equal(getSheetCell(rows, "P10_resposta"), 6);
    assert.equal(getSheetCell(rows, "P11_codigo"), "11.6");
    assert.equal(getSheetCell(rows, "P11_resposta"), 6);
    assert.equal(getSheetCell(rows, "P13_codigo"), "13.9");
    assert.equal(getSheetCell(rows, "P13_resposta"), 9);
    assert.equal(getSheetCell(rows, "P17_codigo"), "17.9");
    assert.equal(getSheetCell(rows, "P17_resposta"), 9);
    assert.equal(getSheetCell(rows, "P22_codigo"), "ABERTA");
  });

  test("xlsx export works with zero responses and keeps full header", () => {
    const { bytes } = buildSurveyXlsxExport({ responses: [], questions: makeQuestions() });
    const rows = getSheetRows(readXlsx(bytes), "Respostas");
    assert.equal(rows.length, 1);
    const headers = rows[0] as string[];
    assert.ok(headers.includes("P01_codigo"));
    assert.ok(headers.includes("P22_resposta"));
  });

  test("xlsx file prefix matches convention", () => {
    const prefix = buildSurveyExportFilePrefix(new Date("2026-07-24T12:00:00.000Z"));
    assert.equal(prefix, "guivos-VAL-002-respostas-2026-07-24");
  });

  // --- Tolerant schema tests ---

  test("tolerates schema with extra questions (IDs > 22) — all three formats work", () => {
    const questions = makeQuestions();
    const extra: Question = { ...questions[0], id: 23, code: "23" };
    const response = makeResponse({ answers: { ...makeResponse().answers, 23: "extra answer" } });
    const { csv } = buildSurveyCsvExport({
      responses: [response],
      questions: [...questions, extra],
    });
    const jsonDoc = buildSurveyJsonExport({
      responses: [response],
      questions: [...questions, extra],
    }).document;
    const { bytes } = buildSurveyXlsxExport({
      responses: [response],
      questions: [...questions, extra],
    });
    const rows = parseCsv(csv);
    // P23 should appear as a column
    assert.ok(
      rows[0].includes("P23_codigo") || rows[0].includes("P23_resposta"),
      "P23 column expected",
    );
    // P01 and P22 still present
    assert.ok(rows[0].includes("P01_codigo"));
    assert.ok(rows[0].includes("P22_resposta"));
    assert.ok(
      jsonDoc.respostas[0].perguntas["P22" as keyof (typeof jsonDoc.respostas)[0]["perguntas"]],
    );
    assert.ok(bytes.byteLength > 0);
  });

  test("tolerates schema missing some official questions — orphan answers appear as synthetic columns", () => {
    const questions = makeQuestions().filter((q) => q.id !== 6);
    const response = makeResponse({ answers: { ...makeResponse().answers, 6: "6.1" } });
    const { csv } = buildSurveyCsvExport({ responses: [response], questions });
    const rows = parseCsv(csv);
    // Orphan Q6 should appear as a synthetic open column
    assert.ok(rows[0].includes("P06_codigo"), "orphan P06 column expected");
    // Content: single-string raw answer → treated as open text for synthetic question
    const resposta = getCsvCell(rows, "P06_resposta");
    assert.equal(resposta, "6.1");
  });

  test("no duplicate columns when schema and orphan answers overlap", () => {
    const questions = makeQuestions();
    const response = makeResponse();
    const { csv } = buildSurveyCsvExport({ responses: [response], questions });
    const rows = parseCsv(csv);
    const headers = rows[0] as string[];
    const seen = new Set<string>();
    for (const h of headers) {
      assert.ok(!seen.has(h), `Duplicate column header: ${h}`);
      seen.add(h);
    }
  });

  test("historical response with extra question preserved in CSV/JSON/XLSX", () => {
    const questions = makeQuestions();
    const historicalResponse = makeResponse({
      answers: { ...makeResponse().answers, 99: "resposta histórica" },
    });
    const { csv } = buildSurveyCsvExport({ responses: [historicalResponse], questions });
    const jsonDoc = buildSurveyJsonExport({ responses: [historicalResponse], questions }).document;
    const { bytes } = buildSurveyXlsxExport({ responses: [historicalResponse], questions });
    const rows = parseCsv(csv);
    assert.ok(rows[0].includes("P99_codigo"), "P99 synthetic column expected");
    const csvVal = getCsvCell(rows, "P99_resposta");
    assert.equal(csvVal, "resposta histórica");
    const p99 = (jsonDoc.respostas[0].perguntas as Record<string, unknown>)["P99"];
    assert.ok(p99, "P99 must be in JSON");
    assert.ok(bytes.byteLength > 0);
  });

  test("schema-with-no-official-questions still exports structural columns", () => {
    // Schema has only Q99 (non-official)
    const minimalQuestion: Question = {
      ...makeQuestions()[21],
      id: 99,
      code: "99",
      type: "open",
    };
    const response = makeResponse({ answers: { 99: "x" } });
    const { csv } = buildSurveyCsvExport({ responses: [response], questions: [minimalQuestion] });
    const rows = parseCsv(csv);
    assert.ok(rows[0].includes("response_id"), "structural column must be present");
    assert.ok(rows[0].includes("P99_codigo"));
  });
});
