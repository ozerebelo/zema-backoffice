import Link from "next/link";
import { Page } from "@/components/Page";
import { ClienteForm } from "@/components/ClienteForm";
import { createCliente } from "../actions";

export default function NovoClientePage() {
  return (
    <Page
      title="Novo cliente"
      actions={
        <Link href="/clientes" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ClienteForm action={createCliente} submitLabel="Criar cliente" />
    </Page>
  );
}
