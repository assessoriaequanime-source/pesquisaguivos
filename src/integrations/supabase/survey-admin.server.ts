// Server-only Supabase operations for the Guivos survey (responses + admin config).
// Uses the service-role client, which bypasses RLS by design (see
// supabase/migrations/0001_survey_schema.sql). Never import this module from
// client code - only from other *.server.ts modules or via dynamic import()
// inside a server function handler (see src/lib/survey-server-fns.ts).
import { supabaseAdmin } from "./client.server";
import type { PageContent, Question, ResponseRecord } from "@/lib/survey-store";

export async function adminListResponses(): Promise<ResponseRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("survey_responses")
    .select("id, submitted_at, duration_sec, answers, extras, contact_name, contact_value")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    at: row.submitted_at,
    durationSec: row.duration_sec,
    answers: (row.answers ?? {}) as Record<string, unknown>,
    extras: (row.extras ?? {}) as Record<string, string>,
    contact: { name: row.contact_name ?? "", contact: row.contact_value ?? "" },
  }));
}

export async function adminInsertResponse(record: ResponseRecord): Promise<void> {
  const { error } = await supabaseAdmin.from("survey_responses").insert({
    id: record.id,
    submitted_at: record.at,
    duration_sec: record.durationSec,
    answers: record.answers,
    extras: record.extras,
    contact_name: record.contact?.name || null,
    contact_value: record.contact?.contact || null,
  });
  if (error) throw error;
}

export async function adminDeleteResponse(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("survey_responses").delete().eq("id", id);
  if (error) throw error;
}

export async function adminClearResponses(): Promise<void> {
  const { error } = await supabaseAdmin.from("survey_responses").delete().neq("id", "");
  if (error) throw error;
}

export async function adminGetQuestions(): Promise<Question[] | null> {
  const { data, error } = await supabaseAdmin
    .from("survey_config")
    .select("data")
    .eq("key", "questions")
    .maybeSingle();
  if (error) throw error;
  return (data?.data as Question[] | undefined) ?? null;
}

export async function adminSetQuestions(questions: Question[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from("survey_config")
    .upsert({ key: "questions", data: questions, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function adminDeleteQuestions(): Promise<void> {
  const { error } = await supabaseAdmin.from("survey_config").delete().eq("key", "questions");
  if (error) throw error;
}

export async function adminGetContent(): Promise<PageContent | null> {
  const { data, error } = await supabaseAdmin
    .from("survey_config")
    .select("data")
    .eq("key", "content")
    .maybeSingle();
  if (error) throw error;
  return (data?.data as PageContent | undefined) ?? null;
}

export async function adminSetContent(content: PageContent): Promise<void> {
  const { error } = await supabaseAdmin
    .from("survey_config")
    .upsert({ key: "content", data: content, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function adminDeleteContent(): Promise<void> {
  const { error } = await supabaseAdmin.from("survey_config").delete().eq("key", "content");
  if (error) throw error;
}
