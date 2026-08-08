import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: news, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Impossible de charger les actualités : ${error.message}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              LBMedia Office
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Actualités
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Crée, rédige et prépare les actualités LBMedia avant leur
              diffusion sur les différents supports.
            </p>
          </div>

          <Link
            href="/news/new"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Nouvelle actualité
          </Link>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Aucune actualité
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Commence par créer la première actualité LBMedia.
            </p>

            <Link
              href="/news/new"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Créer une actualité
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {item.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.content || "Aucun contenu rédigé pour le moment."}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-5 text-xs text-slate-500">
                  Créée le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    ready: "Prête",
    scheduled: "Planifiée",
    published: "Publiée",
  };

  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {labels[status] ?? status}
    </span>
  );
}