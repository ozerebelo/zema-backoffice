// Segredo de assinatura das sessões. Edge-safe (só usa process.env + TextEncoder),
// para poder ser partilhado pelo middleware (Edge) e pelas Server Actions (Node).
// Em produção FALHA já se AUTH_SECRET não estiver definido — nunca degrada para
// um segredo público.
function resolveSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET não está definido em produção. Configura-o antes de arrancar."
    );
  }
  return "insecure-dev-secret";
}

export const authSecret = new TextEncoder().encode(resolveSecret());
