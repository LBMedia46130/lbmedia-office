import Link from "next/link";
import { notFound } from "next/navigation";

import NewsEditor from "@/components/news/NewsEditor";
import PublicationEditor from "@/components/news/PublicationEditor";
import type {
  Publication,
  PublicationChannel,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type NewsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const channels: {
  key: PublicationChannel;
  label: string;
}[] = [
  { key: "website", label: "Site Web" },
  { key: "brevo", label: "Brevo" },
  {
    key: "google_business",
    label: "Google Business",
  },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
];

export default async function NewsPage({
  params,
}: NewsPageProps) {
  const { id } = await params;

  const { data: news, error: newsError } =
    await supabaseAdmin
      .from("news")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (newsError) {
    throw new Error(
      `Impossible de charger l’actualité : ${newsError.message}`
    );
  }

  if (!news) {
    notFound();
  }

  const {
    data: existingPublications,
    error: publicationsError,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("news_id", id);

  if (publicationsError) {
    throw new Error(
      `Impossible de charger les déclinaisons : ${publicationsError.message}`
    );
  }

  const existingChannels = new Set(
    (existingPublications ?? []).map(
      (publication) => publication.channel
    )
  );

  const missingPublications = channels
    .filter(
      (channel) =>
        !existingChannels.has(channel.key)
    )
    .map((channel) => ({
      news_id: id,
      channel: channel.key,
      title: news.title,
      content: news.content,
      status: "draft",
    }));

  if (missingPublications.length > 0) {
    const { error: upsertError } =
      await supabaseAdmin
        .from("publications")
        .upsert(missingPublications, {
          onConflict: "news_id,channel",
          ignoreDuplicates: true,
        });

    if (upsertError) {
      throw new Error(
        `Impossible de préparer les déclinaisons : ${upsertError.message}`
      );
    }
  }

  const {
    data: publications,
    error: finalError,
  } = await supabaseAdmin
    .from("publications")
    .select("*")
    .eq("news_id", id)
    .order("created_at", {
      ascending: true,
    });

  if (finalError) {
    throw new Error(
      `Impossible de charger les déclinaisons : ${finalError.message}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
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
            Rédige le contenu de référence puis adapte chaque
            publication à son support.
          </p>
        </div>

        <div className="mt-8">
          <NewsEditor news={news} />
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Déclinaisons
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Chaque version est indépendante et peut être
            adaptée à son canal.
          </p>

          <div className="mt-6 grid gap-5">
            {channels.map((channel) => {
              const publication = (
                publications ?? []
              ).find(
                (item: Publication) =>
                  item.channel === channel.key
              );

              if (!publication) {
                return null;
              }

              return (
                <PublicationEditor
                  key={publication.id}
                  publication={publication}
                  label={channel.label}
                />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}