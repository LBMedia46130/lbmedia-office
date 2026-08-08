import Link from "next/link";

import type {
  PublicationChannel,
  PublicationStatus,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type PlanningPublication = {
  id: string;
  news_id: string;
  channel: PublicationChannel;
  title: string | null;
  status: PublicationStatus;
  scheduled_at: string | null;
  published_at: string | null;
  news:
    | {
        title: string;
      }
    | {
        title: string;
      }[]
    | null;
};

const channelLabels: Record<
  PublicationChannel,
  string
> = {
  website: "Site Web",
  brevo: "Brevo",
  google_business: "Google Business",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

const statusLabels: Record<
  PublicationStatus,
  string
> = {
  draft: "Brouillon",
  ready: "Prête",
  scheduled: "Planifiée",
  published: "Publiée",
  failed: "Échec",
};

function getNewsTitle(
  relation: PlanningPublication["news"]
) {
  if (Array.isArray(relation)) {
    return relation[0]?.title ?? "Actualité";
  }

  return relation?.title ?? "Actualité";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Aucune date";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function statusClasses(
  status: PublicationStatus
) {
  switch (status) {
    case "ready":
      return "bg-emerald-50 text-emerald-700";

    case "scheduled":
      return "bg-blue-50 text-blue-700";

    case "published":
      return "bg-violet-50 text-violet-700";

    case "failed":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function PlanningPage() {
  const { data, error } =
    await supabaseAdmin
      .from("publications")
      .select(`
        id,
        news_id,
        channel,
        title,
        status,
        scheduled_at,
        published_at,
        news (
          title
        )
      `)
      .order("scheduled_at", {
        ascending: true,
        nullsFirst: false,
      });

  if (error) {
    throw new Error(
      `Impossible de charger le planning : ${error.message}`
    );
  }

  const publications =
    (data ?? []) as PlanningPublication[];

  const scheduled =
    publications.filter(
      (publication) =>
        publication.status === "scheduled"
    );

  const ready =
    publications.filter(
      (publication) =>
        publication.status === "ready"
    );

  const published =
    publications.filter(
      (publication) =>
        publication.status === "published"
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 transition hover:text-slate-950"
            >
              ← Retour aux actualités
            </Link>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              LBMedia Office
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Planning éditorial
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Suis les contenus prêts, les
              publications programmées et
              l’historique des contenus publiés.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Gérer les actualités
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Counter
            label="Prêtes"
            value={ready.length}
          />

          <Counter
            label="Planifiées"
            value={scheduled.length}
          />

          <Counter
            label="Publiées"
            value={published.length}
          />
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                À venir
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Publications actuellement
                planifiées.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {scheduled.length} publication
              {scheduled.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {scheduled.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <p className="font-semibold text-slate-950">
                Rien de planifié
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Les publications auxquelles tu
                attribues une date apparaîtront
                ici.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {scheduled.map(
                (publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-950">
            Prêtes à planifier
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Contenus validés qui n’ont pas encore
            de date de publication.
          </p>

          {ready.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Aucun contenu prêt pour le moment.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {ready.map(
                (publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-12 pb-10">
          <h2 className="text-xl font-bold text-slate-950">
            Dernières publications
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Historique des contenus marqués comme
            publiés.
          </p>

          {published.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Aucune publication enregistrée.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {published
                .slice()
                .sort((a, b) => {
                  const first =
                    a.published_at ??
                    a.scheduled_at ??
                    "";

                  const second =
                    b.published_at ??
                    b.scheduled_at ??
                    "";

                  return second.localeCompare(
                    first
                  );
                })
                .slice(0, 10)
                .map((publication) => (
                  <PublicationRow
                    key={publication.id}
                    publication={
                      publication
                    }
                  />
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Counter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function PublicationRow({
  publication,
}: {
  publication: PlanningPublication;
}) {
  const newsTitle = getNewsTitle(
    publication.news
  );

  const date =
    publication.status === "published"
      ? publication.published_at ??
        publication.scheduled_at
      : publication.scheduled_at;

  return (
    <Link
      href={`/news/${publication.news_id}`}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950">
              {
                channelLabels[
                  publication.channel
                ]
              }
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                publication.status
              )}`}
            >
              {
                statusLabels[
                  publication.status
                ]
              }
            </span>
          </div>

          <h3 className="mt-3 font-semibold text-slate-900">
            {publication.title ||
              newsTitle}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {newsTitle}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">
            {formatDate(date)}
          </p>

          <p className="mt-2 text-xs font-medium text-slate-400 transition group-hover:text-slate-700">
            Ouvrir l’actualité →
          </p>
        </div>
      </div>
    </Link>
  );
}