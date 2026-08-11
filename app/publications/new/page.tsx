import Link from "next/link";

import StandalonePublicationCreateForm from "@/components/publications/StandalonePublicationCreateForm";

export default function NewPublicationPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          ← Retour au pilotage
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            LBMedia Office
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Nouvelle publication
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Prépare un contenu
            directement pour un
            support, sans créer
            d’actualité ni de
            déclinaisons inutiles.
          </p>
        </div>

        <div className="mt-8">
          <StandalonePublicationCreateForm />
        </div>
      </div>
    </main>
  );
}