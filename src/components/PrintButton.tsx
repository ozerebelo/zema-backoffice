"use client";

export function PrintButton() {
  return (
    <button type="button" className="noprint" onClick={() => window.print()}>
      <i className="ti ti-printer" /> Imprimir / Guardar PDF
    </button>
  );
}
