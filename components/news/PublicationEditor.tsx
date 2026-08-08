"use client";

import { useState } from "react";

import type {
  Publication,
  PublicationStatus,
} from "@/lib/news";

type PublicationEditorProps = {
  publication: Publication;
  label: string;
};

const statuses: {
  value: PublicationStatus;
  label: string;
}[] = [
  { value: "draft", label: "Brouillon" },
  { value: "ready", label: "Prête" },
  { value: "scheduled", label: "Planifiée" },
  { value: "published", label: "Publiée" },
];

export default function PublicationEditor({
  publication,
  label,
}: PublicationEditorProps) {
  const [title, setTitle] = useState(
    publication.title ?? ""
  );

  const [content, setContent] = useState(
    publication.content
  );

  const [status, setStatus] =
    useState<PublicationStatus>(
      publication.status
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function savePublication() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/publications/${publication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            content,
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Impossible d’enregistrer."
        );
      }

      setMessage("Enregistré.");
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

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-950">
          {label}
        </h3>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as PublicationStatus
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
        >
          {statuses.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Titre
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contenu
        </label>

        <textarea
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          rows={10}
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-slate-950"
        />
      </div>

      {message ? (
        <p className="mt-3 text-sm font-medium text-green-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={savePublication}
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving
            ? "Enregistrement..."
            : "Enregistrer"}
        </button>
      </div>
    </article>
  );
}