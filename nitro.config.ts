// Este arquivo só tem efeito quando a variável de ambiente NITRO_PRESET é definida
// no momento do build (ex.: pelo nosso Dockerfile, com NITRO_PRESET=node-server).
// Sem essa variável, este arquivo não altera nada — o build feito pela plataforma
// Lovable continua usando o preset padrão dela (cloudflare), sem impacto.
//
// Por quê: @lovable.dev/vite-tanstack-config configura o Nitro com o preset
// "cloudflare" por padrão (voltado para Lovable Cloud). Para rodar em um
// container Docker comum na VPS, precisamos do preset "node-server", que gera
// um servidor Node.js simples em `.output/server/index.mjs`.
export default {
  ...(process.env.NITRO_PRESET ? { preset: process.env.NITRO_PRESET } : {}),
};
