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

// Partículas que ficam em minúsculas no meio de um nome/morada em português.
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "no", "na"]);

/**
 * Corrige texto escrito em MAIÚSCULAS (moradas, nomes) para capitalização
 * normal, palavra a palavra: só mexe nas palavras que estão todas em caps com
 * 3+ letras. Palavras já em minúsculas ficam intactas e siglas/abreviaturas
 * curtas (N, R, C, SP, DT) são preservadas.
 */
export function normalizeTexto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (t === "") return null;

  return t
    .split(" ")
    .map((palavra, i) => {
      const letras = palavra.replace(/[^a-zà-ÿ]/gi, "");
      // sem letras (277, 2785-165) ou já com minúsculas → não mexer
      if (letras === "" || /[a-zà-ÿ]/.test(palavra)) return palavra;

      const low = palavra.toLowerCase();
      // partículas ("DE", "DO", "E") vão a minúsculas antes do corte de siglas
      if (i > 0 && MINUSCULAS.has(low)) return low;
      // sigla/abreviatura curta em caps (N, R, C, SP, DT) → preservar
      if (letras.length < 3) return palavra;
      // capitaliza cada parte de palavras hifenizadas
      return low.replace(/(^|-)([a-zà-ÿ])/g, (_m, sep, c) => sep + c.toUpperCase());
    })
    .join(" ");
}
