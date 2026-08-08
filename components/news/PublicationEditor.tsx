"use client";

import { useState } from "react";

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

  const [slug, setSlug] = useState(
    publication.slug ?? ""
  );

  const [seoTitle, setSeoTitle] = useState(
    publication.seo_title ?? ""
  );

  const [
    metaDescription,
    setMetaDescription,
  ] = useState(
    publication.meta_description ?? ""
  );

  const [subject, setSubject] = useState(
    publication.subject ?? ""
  );

  const [previewText, setPreviewText] =
    useState(
      publication.preview_text ?? ""
    );

  const [
    callToAction,
    setCallToAction,
  ] = useState(
    publication.call_to_action ?? ""
  );

  const [linkUrl, setLinkUrl] = useState(
    publication.link_url ?? ""
  );

  const [hashtags, setHashtags] = useState(
    publication.hashtags ?? ""
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const channel =
    publication.channel as PublicationChannel;

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
            slug,
            seo_title: seoTitle,
            meta_description:
              metaDescription,
            subject,
            preview_text: previewText,
            call_to_action: callToAction,
            link_url: linkUrl,
            hashtags,
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
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            {label}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {getChannelDescription(channel)}
          </p>
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as PublicationStatus
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

      <div className="mt-5 grid gap-4">
        {channel === "website" ? (
          <>
            <Field
              label="Titre de l’article"
              value={title}
              onChange={setTitle}
            />

            <TextArea
              label="Article"
              value={content}
              onChange={setContent}
              rows={14}
            />

            <Field
              label="Slug"
              value={slug}
              onChange={setSlug}
              placeholder="exemple-actualite-lbmedia"
            />

            <Field
              label="Titre SEO"
              value={seoTitle}
              onChange={setSeoTitle}
            />

            <TextArea
              label="Méta-description"
              value={metaDescription}
              onChange={
                setMetaDescription
              }
              rows={3}
            />
          </>
        ) : null}

        {channel === "brevo" ? (
          <>
            <Field
              label="Objet de l’email"
              value={subject}
              onChange={setSubject}
            />

            <Field
              label="Préheader"
              value={previewText}
              onChange={setPreviewText}
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
              onChange={setCallToAction}
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

        {channel === "linkedin" ? (
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

        {channel === "facebook" ? (
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
        <p className="mt-4 text-sm font-medium text-green-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700">
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

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
          onChange(event.target.value)
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