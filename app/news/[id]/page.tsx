import Link from "next/link";
import { notFound } from "next/navigation";

import NewsEditor from "@/components/news/NewsEditor";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type NewsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewsPage({
  params,
}: NewsPageProps) {
  const { id } = await params;

  const { data: news, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger l’actualité : ${error.message}`
    );
  }

  if (!news) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          ← Retour aux actualités
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            LBMedia Office
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Actualité
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Contenu de référence qui servira ensuite à préparer les
            publications sur chaque support.
          </p>
        </div>

        <div className="mt-8">
          <NewsEditor news={news} />
        </div>
      </div>
    </main>
  );
}