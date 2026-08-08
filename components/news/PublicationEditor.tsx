"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  Publication,
  PublicationChannel,
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

function toLocalDateTimeValue(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function toIsoDateTime(
  value: string
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

export default function PublicationEditor({
  publication,
  label,
}: PublicationEditorProps) {
  const [title, setTitle] =
    useState(
      publication.title ?? ""
    );

  const [content, setContent] =
    useState(
      publication.content
    );

  const [status, setStatus] =
    useState<PublicationStatus>(
      publication.status
    );

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState(
    toLocalDateTimeValue(
      publication.scheduled_at
    )
  );

  const [slug, setSlug] =
    useState(
      publication.slug ?? ""
    );

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    publication.seo_title ?? ""
  );

  const [
    metaDescription,
    setMetaDescription,
  ] = useState(
    publication.meta_description ??
      ""
  );

  const [subject, setSubject] =
    useState(
      publication.subject ?? ""
    );

  const [
    previewText,
    setPreviewText,
  ] = useState(
    publication.preview_text ??
      ""
  );

  const [
    callToAction,
    setCallToAction,
  ] = useState(
    publication.call_to_action ??
      ""
  );

  const [
    linkUrl,
    setLinkUrl,
  ] = useState(
    publication.link_url ?? ""
  );

  const [
    hashtags,
    setHashtags,
  ] = useState(
    publication.hashtags ?? ""
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    isCreatingBrevoDraft,
    setIsCreatingBrevoDraft,
  ] = useState(false);

  const [
    isPublishingFacebook,
    setIsPublishingFacebook,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const channel =
    publication.channel as PublicationChannel;

  useEffect(() => {
    syncFields(publication);
  }, [publication]);

  async function savePublication() {
    if (
      status === "scheduled" &&
      !scheduledAt
    ) {
      setMessage(null);
      setError(
        "Choisis une date et une heure de publication."
      );

      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/publications/${publication.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title,
              content,
              status,
              scheduled_at:
                status ===
                "scheduled"
                  ? toIsoDateTime(
                      scheduledAt
                    )
                  : null,
              slug,
              seo_title:
                seoTitle,
              meta_description:
                metaDescription,
              subject,
              preview_text:
                previewText,
              call_to_action:
                callToAction,
              link_url: linkUrl,
              hashtags,
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
            "Impossible d’enregistrer."
        );
      }

      syncFields(
        result.publication
      );

      setMessage(
        "Enregistré."
      );
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

  async function generatePublication() {
    const confirmed =
      content.trim().length ===
        0 ||
      window.confirm(
        `Le contenu actuel de ${label} sera remplacé par une nouvelle proposition. Continuer ?`
      );

    if (!confirmed) {
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/publications/${publication.id}/generate`,
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
            "Impossible de générer le contenu."
        );
      }

      syncFields(
        result.publication
      );

      setMessage(
        "Nouvelle proposition générée et enregistrée."
      );
    } catch (
      generationError
    ) {
      setError(
        generationError instanceof
          Error
          ? generationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveBrevoBeforeDraft() {
    const response =
      await fetch(
        `/api/publications/${publication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title,
            content,
            status,
            subject,
            preview_text:
              previewText,
            link_url: linkUrl,
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
          "Impossible d’enregistrer la newsletter."
      );
    }

    syncFields(
      result.publication
    );
  }

  async function saveFacebookBeforePublish() {
    const response =
      await fetch(
        `/api/publications/${publication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content,
            status,
            link_url: linkUrl,
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
          "Impossible d’enregistrer la publication Facebook."
      );
    }

    syncFields(
      result.publication
    );
  }

  async function createBrevoDraft() {
    const confirmed =
      window.confirm(
        "Créer maintenant un brouillon de campagne Brevo avec cette newsletter ? Aucun email ne sera envoyé."
      );

    if (!confirmed) {
      return;
    }

    setIsCreatingBrevoDraft(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await saveBrevoBeforeDraft();

      const response =
        await fetch(
          `/api/publications/${publication.id}/create-brevo-draft`,
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
            "Impossible de créer le brouillon Brevo."
        );
      }

      setMessage(
        `Brouillon Brevo créé${
          result.brevo_campaign_id
            ? ` — campagne n°${result.brevo_campaign_id}`
            : ""
        }.`
      );
    } catch (brevoError) {
      setError(
        brevoError instanceof Error
          ? brevoError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsCreatingBrevoDraft(
        false
      );
    }
  }

  async function publishFacebook() {
    const confirmed =
      window.confirm(
        "Publier maintenant ce contenu sur la page Facebook LBMedia ? Cette action le rendra visible publiquement."
      );

    if (!confirmed) {
      return;
    }

    setIsPublishingFacebook(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await saveFacebookBeforePublish();

      const response =
        await fetch(
          `/api/publications/${publication.id}/publish-facebook`,
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
            "Impossible de publier sur Facebook."
        );
      }

      if (
        result.publication
      ) {
        syncFields(
          result.publication
        );
      }

      setMessage(
        "Publication Facebook effectuée."
      );
    } catch (
      facebookError
    ) {
      setError(
        facebookError instanceof
          Error
          ? facebookError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsPublishingFacebook(
        false
      );
    }
  }

  function syncFields(
    updatedPublication: Publication
  ) {
    setTitle(
      updatedPublication.title ??
        ""
    );

    setContent(
      updatedPublication.content ??
        ""
    );

    setStatus(
      updatedPublication.status
    );

    setScheduledAt(
      toLocalDateTimeValue(
        updatedPublication.scheduled_at
      )
    );

    setSlug(
      updatedPublication.slug ??
        ""
    );

    setSeoTitle(
      updatedPublication.seo_title ??
        ""
    );

    setMetaDescription(
      updatedPublication.meta_description ??
        ""
    );

    setSubject(
      updatedPublication.subject ??
        ""
    );

    setPreviewText(
      updatedPublication.preview_text ??
        ""
    );

    setCallToAction(
      updatedPublication.call_to_action ??
        ""
    );

    setLinkUrl(
      updatedPublication.link_url ??
        ""
    );

    setHashtags(
      updatedPublication.hashtags ??
        ""
    );
  }

  const isBusy =
    isSaving ||
    isGenerating ||
    isCreatingBrevoDraft ||
    isPublishingFacebook;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            {label}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {getChannelDescription(
              channel
            )}
          </p>
        </div>

        <select
          value={status}
          onChange={(event) => {
            const nextStatus =
              event.target
                .value as PublicationStatus;

            setStatus(nextStatus);

            if (
              nextStatus !==
              "scheduled"
            ) {
              setScheduledAt("");
            }
          }}
          disabled={isBusy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none disabled:opacity-50"
        >
          {statuses.map(
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

      {status ===
      "scheduled" ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date et heure de
            publication
          </label>

          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) =>
              setScheduledAt(
                event.target.value
              )
            }
            disabled={isBusy}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950 disabled:opacity-50"
          />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {channel ===
        "brevo" ? (
          <button
            type="button"
            onClick={
              createBrevoDraft
            }
            disabled={isBusy}
            className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingBrevoDraft
              ? "Création dans Brevo..."
              : "Créer le brouillon dans Brevo"}
          </button>
        ) : null}

        {channel ===
          "facebook" &&
        status !==
          "published" ? (
          <button
            type="button"
            onClick={
              publishFacebook
            }
            disabled={isBusy}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishingFacebook
              ? "Publication Facebook..."
              : "Publier sur Facebook"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={
            generatePublication
          }
          disabled={isBusy}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating
            ? "Génération..."
            : "Générer avec l’IA"}
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        {channel ===
        "brevo" ? (
          <>
            <Field
              label="Objet de l’email"
              value={subject}
              onChange={setSubject}
            />

            <Field
              label="Préheader"
              value={previewText}
              onChange={
                setPreviewText
              }
            />

            <TextArea
              label="Contenu de la newsletter"
              value={content}
              onChange={setContent}
              rows={12}
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
            />
          </>
        ) : null}

        {channel ===
        "google_business" ? (
          <>
            <TextArea
              label="Texte Google Business"
              value={content}
              onChange={setContent}
              rows={8}
            />

            <Field
              label="Appel à l’action"
              value={callToAction}
              onChange={
                setCallToAction
              }
              placeholder="En savoir plus"
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
            />
          </>
        ) : null}

        {channel ===
        "linkedin" ? (
          <>
            <TextArea
              label="Post LinkedIn"
              value={content}
              onChange={setContent}
              rows={10}
            />

            <Field
              label="Hashtags"
              value={hashtags}
              onChange={setHashtags}
              placeholder="#communication #marketing"
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
            />
          </>
        ) : null}

        {channel ===
        "facebook" ? (
          <>
            <TextArea
              label="Post Facebook"
              value={content}
              onChange={setContent}
              rows={10}
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
            />
          </>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={
            savePublication
          }
          disabled={isBusy}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Enregistrement..."
            : "Enregistrer"}
        </button>
      </div>
    </article>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  rows: number;
};

function TextArea({
  label,
  value,
  onChange,
  rows,
}: TextAreaProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows={rows}
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-slate-950"
      />
    </div>
  );
}

function getChannelDescription(
  channel: PublicationChannel
) {
  const descriptions: Record<
    PublicationChannel,
    string
  > = {
    website:
      "Article de référence publié sur lbmedia.fr.",
    brevo:
      "Newsletter ou email préparé pour Brevo.",
    google_business:
      "Publication courte pour la fiche Google Business.",
    linkedin:
      "Publication professionnelle destinée à LinkedIn.",
    facebook:
      "Publication destinée à la page Facebook.",
  };

  return descriptions[channel];
}