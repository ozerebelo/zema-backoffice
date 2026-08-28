import { PrismaClient, Prisma } from "@prisma/client";

// Reutiliza um único PrismaClient entre hot reloads em dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Erro de ligação — tipicamente o Neon a acordar do auto-suspend. */
function ligacaoIndisponivel(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === "P1001" || e.code === "P1002" || e.code === "P1017";
  }
  return false;
}

function criar() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // O Neon suspende a base quando está inativa e a primeira query falha
  // enquanto acorda. Repete-se algumas vezes em vez de rebentar a página.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const esperas = [400, 1000, 2000];
        for (let i = 0; ; i++) {
          try {
            return await query(args);
          } catch (e) {
            if (i >= esperas.length || !ligacaoIndisponivel(e)) throw e;
            await sleep(esperas[i]);
          }
        }
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? criar();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
