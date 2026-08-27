"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeNif, normalizeTexto } from "@/lib/nif";

function str(v: FormDataEntryValue | null): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function readContactos(fd: FormData) {
  const nomes = fd.getAll("cNome").map(String);
  const cargos = fd.getAll("cCargo").map(String);
  const emails = fd.getAll("cEmail").map(String);
  const tels = fd.getAll("cTel").map(String);
  const out: { nome: string; cargo: string | null; email: string | null; tel: string | null }[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i]?.trim();
    if (!nome) continue;
    out.push({
      nome,
      cargo: cargos[i]?.trim() || null,
      email: emails[i]?.trim() || null,
      tel: tels[i]?.trim() || null,
    });
  }
  return out;
}

function readCliente(fd: FormData) {
  // Nome/empresa/morada normalizados: texto colado em CAPS fica legível.
  const nome = normalizeTexto(fd.get("nome")) ?? normalizeTexto(fd.get("empresa")) ?? "—";
  return {
    nome,
    empresa: normalizeTexto(fd.get("empresa")) ?? nome,
    nif: normalizeNif(fd.get("nif")),
    morada: normalizeTexto(fd.get("morada")),
    email: str(fd.get("email")),
    tel: str(fd.get("tel")),
    notas: str(fd.get("notas")),
  };
}

export async function createCliente(fd: FormData) {
  const c = readCliente(fd);
  const cli = await prisma.cliente.create({
    data: { ...c, contactos: { create: readContactos(fd) } },
  });
  revalidatePath("/clientes");
  redirect(`/clientes/${cli.id}`);
}

export async function updateCliente(id: string, fd: FormData) {
  const c = readCliente(fd);
  await prisma.$transaction([
    prisma.contacto.deleteMany({ where: { clienteId: id } }),
    prisma.cliente.update({
      where: { id },
      data: { ...c, contactos: { create: readContactos(fd) } },
    }),
  ]);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function deleteCliente(id: string) {
  await requireUser();
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
