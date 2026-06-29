"use client";

import { useEffect, useState } from "react";
import styles from "./shell.module.css";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setDark(!dark);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={styles.themeToggle}
      title={dark ? "Modo claro" : "Modo escuro"}
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      <i className={`ti ${dark ? "ti-sun" : "ti-moon"}`} />
    </button>
  );
}
