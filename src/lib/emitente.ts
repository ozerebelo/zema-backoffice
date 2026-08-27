// Emitentes dos recibos. A zema studios emite com dois NIFs diferentes; o
// emitente é escolhido ao emitir cada recibo e fica guardado nele, para o PDF
// e a exportação saírem sempre com os dados corretos.
//
// ⚠️ PREENCHER com os dados reais de cada emitente (são placeholders).

export type Emitente = {
  id: string; // chave estável guardada no recibo — NÃO alterar depois de usada
  nome: string;
  atividade: string;
  morada: string;
  nif: string;
  email: string;
  tel: string;
  iban: string;
  notaFiscal: string; // nota de isenção/regime no rodapé
};

export const EMITENTES: Emitente[] = [
  {
    id: "a",
    nome: "Zema Studios",
    atividade: "Pós-produção · Color grading",
    morada: "Rua Exemplo, 00 · 1000-000 Lisboa",
    nif: "PT 000 000 000",
    email: "geral@zemastudios.pt",
    tel: "+351 000 000 000",
    iban: "PT50 0000 0000 0000 0000 0000 0",
    notaFiscal: "IVA conforme regime aplicável. Retenção de IRS quando aplicável.",
  },
  {
    id: "b",
    nome: "Zema Studios (NIF 2)",
    atividade: "Pós-produção · Color grading",
    morada: "Rua Exemplo, 00 · 1000-000 Lisboa",
    nif: "PT 111 111 111",
    email: "geral@zemastudios.pt",
    tel: "+351 000 000 000",
    iban: "PT50 0000 0000 0000 0000 0000 0",
    notaFiscal: "IVA conforme regime aplicável. Retenção de IRS quando aplicável.",
  },
];

export const DEFAULT_EMITENTE = EMITENTES[0].id;

/** Devolve o emitente pela chave; cai no primeiro (default) se não existir. */
export function getEmitente(id?: string | null): Emitente {
  return EMITENTES.find((e) => e.id === id) ?? EMITENTES[0];
}

// Caminho do logótipo no cabeçalho do PDF (ficheiro em /public). Vazio → usa o
// nome em texto. Definir para "/zema-logo.png" quando o ficheiro estiver lá.
export const LOGO_SRC = "";
