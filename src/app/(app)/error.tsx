"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Recuperação de erros dentro da app (ex.: a base de dados a acordar do
 * auto-suspend). Em vez de uma página em branco, explica e deixa tentar de novo.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const ligacao = /database|connect|P1001|P1002|P1017|reach/i.test(error.message);

  return (
    <main style={{ flex: 1, display: "grid", placeItems: "center", padding: 40 }}>
      <div className="card" style={{ maxWidth: 460, padding: "26px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 30, color: "var(--amber-fg)", marginBottom: 10 }}>
          <i className="ti ti-plug-connected-x" />
        </div>
        <h2 style={{ fontSize: 17, marginBottom: 8, color: "var(--ink)" }}>
          {ligacao ? "Base de dados indisponível" : "Algo correu mal"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 18 }}>
          {ligacao
            ? "A base de dados pode estar a arrancar depois de um período sem uso. Tenta novamente dentro de instantes."
            : "Ocorreu um erro inesperado ao carregar esta página."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" onClick={reset} className="btn btn-primary btn-sm">
            <i className="ti ti-refresh" /> Tentar de novo
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            Ir para o dashboard
          </Link>
        </div>
        {error.digest && (
          <div style={{ marginTop: 14, fontSize: 10.5, color: "var(--text-muted)" }}>
            ref. {error.digest}
          </div>
        )}
      </div>
    </main>
  );
}
