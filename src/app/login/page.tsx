"use client";

import { useActionState } from "react";
import { login } from "./actions";
import styles from "./login.module.css";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className={styles.wrap}>
      <form action={formAction} className={styles.card}>
        <div className={styles.brand}>
          <span className={`serif ${styles.wordmark}`}>backoffice</span>
          <span className={styles.studio}>
            zema <span className={styles.accent}>studios</span>
          </span>
        </div>

        <label className={styles.label}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            className={styles.input}
            defaultValue="ze.rebelo19@gmail.com"
            required
          />
        </label>

        <label className={styles.label}>
          Palavra-passe
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            required
          />
        </label>

        {state?.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifyContent: "center" }}>
          {pending ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
