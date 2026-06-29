import styles from "./shell.module.css";

export function Page({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.main}>
      <div className={styles.topbar}>
        <div style={{ flex: 1 }}>
          <span className={styles.title}>{title}</span>
          {sub && <span className={styles.sub}>· {sub}</span>}
        </div>
        {actions}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
