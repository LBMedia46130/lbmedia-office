"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  News,
  NewsStatus,
} from "@/lib/news";

type NewsEditorProps = {
  news: News;
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

export default function NewsEditor({
  news,
}: NewsEditorProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState(news.title);

  const [content, setContent] =
    useState(news.content);

  const [status, setStatus] =
    useState<NewsStatus>(news.status);

  const [imageUrl, setImageUrl] =
    useState(news.image_url ?? "");

  const [sourceUrl, setSourceUrl] =
    useState(news.source_url ?? "");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Le titre est obligatoire.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
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

  async function handleDelete() {
    const confirmed = window.confirm(
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-slate-900"
          >
            Titre
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
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
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
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
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
            Contenu de référence
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
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950"
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
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
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
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          />
        </div>
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
          disabled={
            isDeleting ||
            isSaving
          }
          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting
            ? "Suppression..."
            : "Supprimer"}
        </button>

        <button
          type="submit"
          disabled={
            isSaving ||
            isDeleting
          }
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