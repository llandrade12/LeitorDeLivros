import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormSerie } from "@/components/admin/FormSerie";

export const metadata: Metadata = { title: "Nova HQ" };

export default async function NovaHqPage() {
  await exigirAdmin();
  const { data } = await createAdminClient().from("profiles").select("id,nome").eq("role", "leitor").order("nome");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/hqs" className="inline-flex items-center gap-2 text-sm text-suave hover:text-texto">
        <ArrowLeft size={16} /> HQs
      </Link>
      <h1 className="text-2xl font-bold">Nova HQ</h1>
      <p className="text-sm text-suave">Depois de criar, você adiciona os capítulos e envia os PDFs.</p>
      <FormSerie leitores={(data ?? []) as { id: string; nome: string }[]} />
    </div>
  );
}
