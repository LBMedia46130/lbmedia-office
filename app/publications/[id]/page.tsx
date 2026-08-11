import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import PublicationEditor from "@/components/news/PublicationEditor";

import type {
  Publication,
  PublicationChannel,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type PublicationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const channelLabels: Record<
  PublicationChannel,
  string
> = {
  website:
    "Actualité / WordPress",
  brevo: "Brevo",
  google_business:
    "Google Business",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const { id } =
    await params;

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger la publication : ${error.message}`
    );
  }

  if (!data) {
    notFound();
  }

  const publication =
    data as Publication;

  if (
    publication.news_id
  ) {
    redirect(
      `/news/${publication.news_id}`
    );
  }

  if (
    publication.channel ===
    "website"
  ) {
    throw new Error(
      "Une publication WordPress doit être rattachée à une actualité."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
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
            Publication{" "}
            {
              channelLabels[
                publication.channel
              ]
            }
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Publication indépendante.
            Pénélope peut la rédiger,
            puis tu peux la valider
            et la planifier comme
            les autres contenus.
          </p>
        </div>

        <div className="mt-8">
          <PublicationEditor
            publication={
              publication
            }
            label={
              channelLabels[
                publication.channel
              ]
            }
          />
        </div>
      </div>
    </main>
  );
}