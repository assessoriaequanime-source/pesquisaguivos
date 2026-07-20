// Client-safe wrappers around the Guivos survey's server-only Supabase
// operations (src/integrations/supabase/survey-admin.server.ts). This file is
// imported directly by src/lib/survey-store.ts (and therefore by route
// components), which is safe: createServerFn strips the handler body out of
// the client bundle and replaces it with an RPC call, so no service-role
// credentials ever reach the browser.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PageContent, Question, ResponseRecord } from "./survey-store";

function checkAdminPassword(password: string): void {
  const expected = process.env.ADMIN_PASSWORD || "guivos2026";
  if (!password || password !== expected) {
    throw new Error("Unauthorized: invalid admin password");
  }
}

const responseSchema = z.object({
  id: z.string().min(1).max(64),
  at: z.string().min(1).max(64),
  durationSec: z.number().finite().nonnegative().max(60 * 60 * 6),
  answers: z.record(z.string(), z.unknown()),
  extras: z.record(z.string(), z.string()),
  contact: z.object({ name: z.string().max(200), contact: z.string().max(200) }),
});

const passwordSchema = z.object({ password: z.string().min(1).max(256) });

export const verifyAdminPasswordFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    return { ok: true as const };
  });

export const submitResponseFn = createServerFn({ method: "POST" })
  .validator((data: ResponseRecord) => responseSchema.parse(data))
  .handler(async ({ data }) => {
    const { adminInsertResponse } = await import("@/integrations/supabase/survey-admin.server");
    await adminInsertResponse(data);
  });

export const listResponsesFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminListResponses } = await import("@/integrations/supabase/survey-admin.server");
    return adminListResponses();
  });

export const deleteResponseFn = createServerFn({ method: "POST" })
  .validator((data: { password: string; id: string }) =>
    passwordSchema.extend({ id: z.string().min(1).max(64) }).parse(data),
  )
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminDeleteResponse } = await import("@/integrations/supabase/survey-admin.server");
    await adminDeleteResponse(data.id);
  });

export const clearResponsesFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminClearResponses } = await import("@/integrations/supabase/survey-admin.server");
    await adminClearResponses();
  });

export const getQuestionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { adminGetQuestions } = await import("@/integrations/supabase/survey-admin.server");
  return adminGetQuestions();
});

export const saveQuestionsFn = createServerFn({ method: "POST" })
  .validator((data: { password: string; questions: Question[] }) =>
    passwordSchema.extend({ questions: z.array(z.record(z.string(), z.unknown())) }).parse(data),
  )
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminSetQuestions } = await import("@/integrations/supabase/survey-admin.server");
    await adminSetQuestions(data.questions as unknown as Question[]);
  });

export const resetQuestionsFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminDeleteQuestions } = await import("@/integrations/supabase/survey-admin.server");
    await adminDeleteQuestions();
  });

export const getContentFn = createServerFn({ method: "GET" }).handler(async () => {
  const { adminGetContent } = await import("@/integrations/supabase/survey-admin.server");
  return adminGetContent();
});

export const saveContentFn = createServerFn({ method: "POST" })
  .validator((data: { password: string; content: PageContent }) =>
    passwordSchema.extend({ content: z.record(z.string(), z.unknown()) }).parse(data),
  )
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminSetContent } = await import("@/integrations/supabase/survey-admin.server");
    await adminSetContent(data.content as unknown as PageContent);
  });

export const resetContentFn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkAdminPassword(data.password);
    const { adminDeleteContent } = await import("@/integrations/supabase/survey-admin.server");
    await adminDeleteContent();
  });
