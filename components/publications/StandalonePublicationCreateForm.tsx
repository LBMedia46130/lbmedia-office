"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import type {
  PublicationChannel,
} from "@/lib/news";

const channelOptions: {
  value: PublicationChannel;
  label: string;
  description: string;
}[] = [
  {
    value: "linkedin",
    label: "LinkedIn",
    description:
      "Créer un post LinkedIn indépendant.",
  },
  {
    value: "facebook",
    label: "Facebook",
    description:
      "Créer une publication Facebook indépendante.",
  },
  {
    value: "google_business",
    label: "Google Business",
    description:
      "Créer une publication pour la fiche Google Business.",
  },
  {
    value: "brevo",
    label: "Brevo",
    description:
      "Créer une newsletter indépendante.",
  },
];

export default function StandalonePublicationCreateForm() {
  const router =
    useRouter();

  const [
    channel,
    setChannel,
  ] = useState<PublicationChannel>(
    "linkedin"
  );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      setError(
        "Indique le sujet de la publication."
      );

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/publications",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              channel,
              title:
                cleanTitle,
              content:
                content.trim(),
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
            "Impossible de créer la publication."
        );
      }

      router.push(
        `/publications/${result.publication.id}`
      );

      router.refresh();
    } catch (
      submissionError
    ) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  const currentChannel =
    channelOptions.find(
      (option) =>
        option.value ===
        channel
    );

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label
          htmlFor="channel"
          className="block text-sm font-semibold text-slate-900"
        >
          Support
        </label>

        <select
          id="channel"
          value={channel}
          onChange={(
            event
          ) =>
            setChannel(
              event.target
                .value as PublicationChannel
            )
          }
          disabled={
            isSubmitting
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
        >
          {channelOptions.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>

        <p className="mt-2 text-sm text-slate-500">
          {
            currentChannel?.description
          }
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="title"
          className="block text-sm font-semibold text-slate-900"
        >
          Sujet
        </label>

        <input
          id="title"
          type="text"
          value={title}
          onChange={(
            event
          ) =>
            setTitle(
              event.target
                .value
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="Ex. Pourquoi refaire son site ne suffit pas toujours à gagner en visibilité"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
          autoFocus
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Donne simplement
          l’idée principale.
          Pénélope pourra
          rédiger la
          publication ensuite.
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="content"
          className="block text-sm font-semibold text-slate-900"
        >
          Brief
          <span className="ml-1 font-normal text-slate-400">
            — facultatif
          </span>
        </label>

        <textarea
          id="content"
          value={content}
          onChange={(
            event
          ) =>
            setContent(
              event.target
                .value
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="Ajoute ici un angle, une idée, une information importante ou quelques consignes si nécessaire."
          rows={8}
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-950 disabled:opacity-60"
        />
      </div>

      {error ? (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.push("/")
          }
          disabled={
            isSubmitting
          }
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Création..."
            : "Créer la publication"}
        </button>
      </div>
    </form>
  );
}