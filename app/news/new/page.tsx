import Link from "next/link";

import NewsCreateForm from "@/components/news/NewsCreateForm";

export default function NewNewsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
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
            Nouvelle actualité
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Commence par le contenu de référence. Les déclinaisons par support
            viendront ensuite.
          </p>
        </div>

        <div className="mt-8">
          <NewsCreateForm />
        </div>
      </div>
    </main>
  );
}