// Normalização de NIF / VAT.
// Guardamos sempre sem separadores e em maiúsculas, para o mesmo número não
// aparecer em formatos diferentes ("515 642 460" vs "515642460").
// Prefixos de país intracomunitários (ex.: "NL003135369B22") são preservados.

/** Remove espaços, pontos e hífenes; devolve null se ficar vazio. */
export function normalizeNif(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const clean = v.replace(/[\s.\-/]/g, "").toUpperCase();
  return clean === "" ? null : clean;
}
