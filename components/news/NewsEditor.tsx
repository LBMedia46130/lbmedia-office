"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  News,
  NewsStatus,
  Publication,
  PublicationChannel,
} from "@/lib/news";

type PublicationTarget = {
  id: string;
  channel: PublicationChannel;
};

type NewsEditorProps = {
  news: News;
  publications: PublicationTarget[];
  websitePublication: Publication;
};

const statusOptions: {
  value: NewsStatus;
  label: string;
}[] = [
  {
    value: "draft",
    label: "Brouillon",
  },
  {
    value: "ready",
    label: "Prête",
  },
  {
    value: "scheduled",
    label: "Planifiée",
  },
  {
    value: "published",
    label: "Publiée",
  },
];

const generationOrder: PublicationChannel[] = [
  "brevo",
  "google_business",
  "linkedin",
  "facebook",
];

export default function NewsEditor({
  news,
  publications,
  websitePublication,
}: NewsEditorProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState(news.title);

  const [content, setContent] =
    useState(news.content);

  const [status, setStatus] =
    useState(news.status);

  const [imageUrl, setImageUrl] =
    useState(news.image_url ?? "");

  const [sourceUrl, setSourceUrl] =
    useState(news.source_url ?? "");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [
    isPreparingCommunication,
    setIsPreparingCommunication,
  ] = useState(false);

  const [
    isPublishingWordPressDraft,
    setIsPublishingWordPressDraft,
  ] = useState(false);

  const [
    isPublishingWordPressLive,
    setIsPublishingWordPressLive,
  ] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function saveNews() {
    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      throw new Error(
        "Le titre est obligatoire."
      );
    }

    const response = await fetch(
      `/api/news/${news.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          content: content.trim(),
          status,
          image_url:
            imageUrl.trim() || null,
          source_url:
            sourceUrl.trim() || null,
        }),
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible d’enregistrer l’actualité."
      );
    }

    return result.news;
  }

  async function syncWebsitePublication() {
    const response = await fetch(
      `/api/publications/${websitePublication.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          status,
          link_url:
            sourceUrl.trim() || null,
        }),
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible de préparer l’article pour WordPress."
      );
    }

    return result.publication;
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveNews();
      await syncWebsitePublication();

      setMessage(
        "Actualité enregistrée."
      );

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function generatePublication(
    publicationId: string
  ) {
    const response = await fetch(
      `/api/publications/${publicationId}/generate`,
      {
        method: "POST",
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ??
          "Impossible de générer une déclinaison."
      );
    }

    return result.publication;
  }

  async function prepareCommunication() {
    if (!title.trim()) {
      setMessage(null);
      setError(
        "Le titre est obligatoire."
      );
      return;
    }

    if (!content.trim()) {
      setMessage(null);
      setError(
        "Rédige d’abord l’actualité avant de préparer ses déclinaisons."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Préparer les déclinaisons Brevo, Google Business, LinkedIn et Facebook à partir de cette actualité ? Les propositions existantes seront remplacées."
      );

    if (!confirmed) {
      return;
    }

    setIsPreparingCommunication(true);
    setMessage(null);
    setError(null);

    try {
      await saveNews();
      await syncWebsitePublication();

      for (const channel of generationOrder) {
        const target =
          publications.find(
            (publication) =>
              publication.channel ===
              channel
          );

        if (!target) {
          throw new Error(
            `La déclinaison ${getChannelLabel(
              channel
            )} est introuvable.`
          );
        }

        setMessage(
          `Préparation ${getChannelLabel(
            channel
          )}...`
        );

        await generatePublication(
          target.id
        );
      }

      setMessage(
        "Les déclinaisons Brevo, Google Business, LinkedIn et Facebook sont prêtes."
      );

      router.refresh();
    } catch (preparationError) {
      setMessage(null);

      setError(
        preparationError instanceof Error
          ? preparationError.message
          : "Impossible de préparer les déclinaisons."
      );
    } finally {
      setIsPreparingCommunication(
        false
      );
    }
  }

  async function sendToWordPressDraft() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu de l’actualité est vide."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Créer ou mettre à jour le brouillon WordPress avec cette actualité ?"
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingWordPressDraft(true);
    setMessage(null);
    setError(null);

    try {
      await saveNews();
      await syncWebsitePublication();

      const response = await fetch(
        `/api/publications/${websitePublication.id}/publish-wordpress`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de traiter le brouillon WordPress."
        );
      }

      setMessage(
        result.action === "updated"
          ? "Brouillon WordPress mis à jour."
          : "Brouillon WordPress créé."
      );

      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingWordPressDraft(
        false
      );
    }
  }

  async function publishWordPressLive() {
    const confirmed =
      window.confirm(
        "Publier maintenant cette actualité sur lbmedia.fr ? Cette action la rendra visible publiquement."
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingWordPressLive(true);
    setMessage(null);
    setError(null);

    try {
      await saveNews();
      await syncWebsitePublication();

      const response = await fetch(
        `/api/publications/${websitePublication.id}/publish-wordpress-live`,
        {
          method: "POST",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de publier l’actualité sur WordPress."
        );
      }

      setMessage(
        "Actualité publiée sur WordPress."
      );

      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingWordPressLive(
        false
      );
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Supprimer définitivement cette actualité ?"
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/news/${news.id}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Impossible de supprimer l’actualité."
        );
      }

      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur est survenue."
      );

      setIsDeleting(false);
    }
  }

  const isBusy =
    isSaving ||
    isDeleting ||
    isPreparingCommunication ||
    isPublishingWordPressDraft ||
    isPublishingWordPressLive;

  const hasWordPressPost =
    Boolean(
      websitePublication.wordpress_post_id
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-950">
              Préparer la communication
            </p>

            <p className="mt-1 text-sm leading-6 text-indigo-800">
              Pénélope adapte cette
              actualité pour Brevo,
              Google Business,
              LinkedIn et Facebook.
            </p>
          </div>

          <button
            type="button"
            onClick={
              prepareCommunication
            }
            disabled={isBusy}
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPreparingCommunication
              ? "Préparation en cours..."
              : "Préparer les déclinaisons"}
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-slate-900"
          >
            Titre de l’actualité
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            disabled={isBusy}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-semibold text-slate-900"
          >
            Statut
          </label>

          <select
            id="status"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as NewsStatus
              )
            }
            disabled={isBusy}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-semibold text-slate-900"
          >
            Actualité
          </label>

          <textarea
            id="content"
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            rows={16}
            disabled={isBusy}
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="imageUrl"
            className="block text-sm font-semibold text-slate-900"
          >
            URL du visuel
          </label>

          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(event) =>
              setImageUrl(
                event.target.value
              )
            }
            disabled={isBusy}
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="sourceUrl"
            className="block text-sm font-semibold text-slate-900"
          >
            Lien associé
          </label>

          <input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(event) =>
              setSourceUrl(
                event.target.value
              )
            }
            disabled={isBusy}
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <button
          type="button"
          onClick={
            sendToWordPressDraft
          }
          disabled={isBusy}
          className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPublishingWordPressDraft
            ? "Envoi vers WordPress..."
            : hasWordPressPost
              ? "Mettre à jour le brouillon WordPress"
              : "Envoyer vers WordPress en brouillon"}
        </button>

        {hasWordPressPost &&
        websitePublication.status !==
          "published" ? (
          <button
            type="button"
            onClick={
              publishWordPressLive
            }
            disabled={isBusy}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishingWordPressLive
              ? "Publication..."
              : "Publier sur WordPress"}
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting
            ? "Suppression..."
            : "Supprimer"}
        </button>

        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Enregistrement..."
            : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function getChannelLabel(
  channel: PublicationChannel
) {
  const labels: Record<
    PublicationChannel,
    string
  > = {
    website: "Site Web",
    brevo: "Brevo",
    google_business:
      "Google Business",
    linkedin: "LinkedIn",
    facebook: "Facebook",
  };

  return labels[channel];
}