"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./shell.module.css";

type Item = { href: string; label: string; icon: string; badge?: number };
type Section = { title: string; items: Item[] };

export function Sidebar({
  sections,
  userName,
}: {
  sections: Section[];
  userName: string;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.studio}>
          zema <span className={styles.accent}>studios</span>
        </span>
      </div>

      <nav className={styles.nav}>
        {sections.map((sec) => (
          <div key={sec.title}>
            <div className={styles.navSection}>{sec.title}</div>
            {sec.items.map((it) => {
              const active =
                it.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`${styles.navItem} ${active ? styles.active : ""}`}
                >
                  <i className={`ti ${it.icon}`} />
                  <span>{it.label}</span>
                  {it.badge ? <span className={styles.badge}>{it.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userPill}>
          <div className={styles.avatar}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.userName}>{userName}</div>
          </div>
          <div className={styles.footerActions}>
            <ThemeToggle />
            <form action="/logout" method="post">
              <button type="submit" className={styles.logout} title="Sair">
                <i className="ti ti-logout" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
