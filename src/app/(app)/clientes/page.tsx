import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { deleteCliente } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";
import { ClientesFilter } from "@/components/ClientesFilter";
import { fmtMoney } from "@/lib/dates";
import styles from "./clientes-list.module.css";

export const dynamic = "force-dynamic";

type SP = { q?: string; fiscal?: string };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const todos = await prisma.cliente.findMany({
    include: {
      contactos: true,
      projetos: { select: { valor: true } },
      _count: { select: { projetos: true, leads: true } },
    },
    orderBy: { nome: "asc" },
  });

  // Pesquisa por nome/empresa/NIF/email/contacto e filtro de dados fiscais.
  const q = (sp.q ?? "").trim().toLowerCase();
  const clientes = todos.filter((c) => {
    if (sp.fiscal === "incompletos" && c.nif && c.morada) return false;
    if (!q) return true;
    const alvo = [c.nome, c.empresa, c.nif, c.email, c.tel, ...c.contactos.map((x) => x.nome)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return alvo.includes(q);
  });

  const incompletos = todos.filter((c) => !c.nif || !c.morada).length;

  return (
    <Page
      title="Clientes"
      sub={q || sp.fiscal ? `${clientes.length} de ${todos.length}` : `${todos.length}`}
      actions={
        <Link href="/clientes/novo" className="btn btn-red btn-sm">
          <i className="ti ti-plus" /> Novo cliente
        </Link>
      }
    >
      <ClientesFilter />

      {incompletos > 0 && sp.fiscal !== "incompletos" && (
        <div className={styles.aviso}>
          <i className="ti ti-alert-triangle" />
          <span>
            <b>{incompletos}</b> cliente(s) sem NIF ou morada — os recibos saem incompletos.
          </span>
          <Link href="/clientes?fiscal=incompletos" className="btn btn-ghost btn-sm">Ver</Link>
        </div>
      )}

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Contactos</th>
              <th>Projetos</th>
              <th className={styles.right}>Contratado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const faturado = c.projetos.reduce((s, p) => s + Number(p.valor), 0);
              const nProj = c._count.projetos + c._count.leads;
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clientes/${c.id}`} className={styles.empresa}>{c.nome}</Link>
                    <div className={styles.fiscal}>
                      {c.nif ? (
                        <span className={styles.nif}>NIF {c.nif}</span>
                      ) : (
                        <span className={styles.falta}>sem NIF</span>
                      )}
                      {!c.morada && <span className={styles.falta}>sem morada</span>}
                    </div>
                  </td>
                  <td>
                    <div className={styles.contactList}>
                      {c.contactos.length === 0 && <span className={styles.ctMeta}>{c.email ?? "—"}</span>}
                      {c.contactos.map((ct) => (
                        <div key={ct.id}>
                          <div>
                            <span className={styles.ctName}>{ct.nome}</span>
                            {ct.cargo && <span className={styles.ctCargo}>{ct.cargo}</span>}
                          </div>
                          {ct.tel && <div className={styles.ctMeta}>{ct.tel}</div>}
                          {ct.email && <div className={styles.ctMeta}><a href={`mailto:${ct.email}`}>{ct.email}</a></div>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td><span className="badge badge-grey">{nProj} proj.</span></td>
                  <td className={`${styles.right} ${styles.faturado}`}>{fmtMoney(faturado)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/clientes/${c.id}/editar`} className={styles.iconBtn} title="Editar">
                        <i className="ti ti-edit" />
                      </Link>
                      <DeleteButton
                        action={deleteCliente.bind(null, c.id)}
                        confirmText={`Apagar o cliente "${c.nome}"? Os contactos são removidos e os projetos ficam sem cliente. Esta ação é irreversível.`}
                        className={`${styles.iconBtn} ${styles.del}`}
                        title="Eliminar"
                      >
                        <i className="ti ti-trash" />
                      </DeleteButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
