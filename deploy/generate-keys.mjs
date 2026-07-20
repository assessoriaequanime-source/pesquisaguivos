#!/usr/bin/env node
// Gera os segredos necessários para o stack Supabase self-hosted
// (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY) e senhas aleatórias para
// AUTHENTICATOR_PASSWORD / POSTGRES_PASSWORD / ADMIN_PASSWORD.
//
// Uso:
//   node deploy/generate-keys.mjs
//
// Não depende de nenhum pacote externo (só o módulo "crypto" do Node),
// então funciona mesmo antes de rodar "bun install" / "npm install".
import crypto from "node:crypto";

function base64url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${signature}`;
}

function randomPassword(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
}

const jwtSecret = crypto.randomBytes(32).toString("hex");
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 anos

const anonKey = signJwt({ role: "anon", iss: "supabase-self-hosted", iat, exp }, jwtSecret);
const serviceRoleKey = signJwt({ role: "service_role", iss: "supabase-self-hosted", iat, exp }, jwtSecret);

console.log("Cole estas linhas no seu .env (nunca commite o .env real):\n");
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
console.log(`AUTHENTICATOR_PASSWORD=${randomPassword()}`);
console.log(`POSTGRES_PASSWORD=${randomPassword()}`);
console.log(`ADMIN_PASSWORD=${crypto.randomBytes(16).toString("hex")}`);
console.log("\nLembrete: VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_PUBLISHABLE_KEY devem");
console.log("usar o mesmo valor de ANON_KEY. SUPABASE_SERVICE_ROLE_KEY deve usar o mesmo");
console.log("valor de SERVICE_ROLE_KEY.");
