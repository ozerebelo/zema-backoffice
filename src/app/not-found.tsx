import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 40,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: "var(--text-muted)" }}>404</div>
        <h2 style={{ fontSize: 17, margin: "6px 0 14px", color: "var(--ink)" }}>
          Página não encontrada
        </h2>
        <Link href="/" className="btn btn-primary btn-sm">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
