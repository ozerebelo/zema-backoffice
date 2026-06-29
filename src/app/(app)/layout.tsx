import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import styles from "@/components/shell.module.css";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leadCount = await prisma.lead.count();

  const sections = [
    {
      title: "Principal",
      items: [{ href: "/", label: "Dashboard", icon: "ti-layout-dashboard" }],
    },
    {
      title: "Comercial",
      items: [
        { href: "/comercial", label: "Pipeline", icon: "ti-target-arrow", badge: leadCount },
      ],
    },
    {
      title: "Produção",
      items: [{ href: "/producao", label: "Projetos", icon: "ti-movie" }],
    },
    {
      title: "Gestão",
      items: [
        { href: "/clientes", label: "Clientes", icon: "ti-users" },
        { href: "/calendario", label: "Calendário", icon: "ti-calendar" },
        { href: "/financeiro", label: "Financeiro", icon: "ti-receipt" },
      ],
    },
  ];

  return (
    <div className={styles.app}>
      <Sidebar sections={sections} userName={user.displayName} />
      {children}
    </div>
  );
}
