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
    id: "jmr",
    nome: "José Miguel Neves Rebelo",
    atividade: "Pós-produção · Color grading",
    morada: "Rua Costa Pinto 163 1B · 2770-047 Paço de Arcos",
    nif: "240082982",
    email: "",
    tel: "",
    iban: "",
    notaFiscal: "IVA conforme regime aplicável. Retenção de IRS quando aplicável.",
  },
  {
    id: "mbb",
    nome: "Maria Belo Lopes Braga",
    atividade: "Pós-produção · Color grading",
    morada: "Rua Costa Pinto 163 1B · 2770-047 Paço de Arcos",
    nif: "219807566",
    email: "",
    tel: "",
    iban: "",
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
export const LOGO_SRC = "/zema-logo.png";
