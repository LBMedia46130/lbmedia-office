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

  const date = new Date(value);

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
    brevoSendApprovedAt,
    setBrevoSendApprovedAt,
  ] = useState(
    publication.brevo_send_approved_at
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
    isChangingStatus,
    setIsChangingStatus,
  ] = useState(false);

  const [
    isCreatingBrevoDraft,
    setIsCreatingBrevoDraft,
  ] = useState(false);

  const [
    isApprovingBrevoSend,
    setIsApprovingBrevoSend,
  ] = useState(false);

  const [
    isPublishingFacebook,
    setIsPublishingFacebook,
  ] = useState(false);

  const [
    isMarkingGoogleBusinessPublished,
    setIsMarkingGoogleBusinessPublished,
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

  function buildUpdatePayload(
    nextStatus: PublicationStatus = status,
    nextScheduledAt:
      | string
      | null = scheduledAt
  ) {
    return {
      title,
      content,
      status: nextStatus,
      scheduled_at:
        nextStatus === "scheduled"
          ? toIsoDateTime(
              nextScheduledAt ?? ""
            )
          : null,
      slug,
      seo_title: seoTitle,
      meta_description:
        metaDescription,
      subject,
      preview_text:
        previewText,
      call_to_action:
        callToAction,
      link_url: linkUrl,
      hashtags,
    };
  }

  async function updatePublication(
    nextStatus: PublicationStatus,
    nextScheduledAt:
      | string
      | null = scheduledAt
  ) {
    const response =
      await fetch(
        `/api/publications/${publication.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            buildUpdatePayload(
              nextStatus,
              nextScheduledAt
            )
          ),
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

    return result.publication as Publication;
  }

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
      await updatePublication(
        status,
        scheduledAt
      );

      setMessage(
        "Modifications enregistrées."
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

  async function validatePublication() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu doit être renseigné avant validation."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} validé. La publication est prête.`
      );
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function retryFailedPublication() {
    if (!content.trim()) {
      setMessage(null);
      setError(
        "Le contenu doit être renseigné avant de relancer la publication."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} est de nouveau prête à être planifiée ou publiée.`
      );
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function returnToDraft() {
    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "draft",
        null
      );

      setScheduledAt("");

      setMessage(
        `${label} repassé en brouillon.`
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function schedulePublication() {
    if (!scheduledAt) {
      setMessage(null);
      setError(
        "Choisis une date et une heure avant de planifier."
      );

      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "scheduled",
        scheduledAt
      );

      setMessage(
        `${label} planifié pour le ${formatDateTime(
          scheduledAt
        )}.`
      );
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function cancelSchedule() {
    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "ready",
        null
      );

      setScheduledAt("");

      setMessage(
        `Planification de ${label} annulée. La publication reste prête.`
      );
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsChangingStatus(false);
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
        generationError instanceof Error
          ? generationError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveBrevoBeforeDraft() {
    await updatePublication(
      status,
      scheduledAt
    );
  }

  async function saveFacebookBeforePublish() {
    await updatePublication(
      status,
      scheduledAt
    );
  }

  async function createBrevoDraft() {
    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la newsletter avant de créer le brouillon Brevo."
      );

      return;
    }

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

      if (
        result.publication
      ) {
        syncFields(
          result.publication
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

  async function approveBrevoSend() {
    if (channel !== "brevo") {
      return;
    }

    if (status !== "scheduled") {
      setMessage(null);
      setError(
        "La newsletter doit être planifiée avant d’autoriser son envoi."
      );

      return;
    }

    if (
      !publication.brevo_campaign_id
    ) {
      setMessage(null);
      setError(
        "Crée d’abord le brouillon Brevo."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Autoriser explicitement l’envoi de cette campagne Brevo à la liste newsletter à la date planifiée ?"
      );

    if (!confirmed) {
      return;
    }

    setIsApprovingBrevoSend(true);
    setMessage(null);
    setError(null);

    try {
      const approvedAt =
        new Date().toISOString();

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
              brevo_send_approved_at:
                approvedAt,
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
            "Impossible d’autoriser l’envoi Brevo."
        );
      }

      syncFields(
        result.publication
      );

      setMessage(
        "Envoi Brevo explicitement autorisé."
      );
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsApprovingBrevoSend(
        false
      );
    }
  }

  async function markGoogleBusinessPublished() {
    if (channel !== "google_business") {
      return;
    }

    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la publication Google Business."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Confirmer que ce contenu a bien été publié manuellement sur la fiche Google Business LBMedia ?"
      );

    if (!confirmed) {
      return;
    }

    setIsMarkingGoogleBusinessPublished(
      true
    );

    setMessage(null);
    setError(null);

    try {
      await updatePublication(
        "published",
        scheduledAt
      );

      setMessage(
        "Publication Google Business marquée comme publiée."
      );
    } catch (
      googleBusinessError
    ) {
      setError(
        googleBusinessError instanceof Error
          ? googleBusinessError.message
          : "Une erreur est survenue."
      );
    } finally {
      setIsMarkingGoogleBusinessPublished(
        false
      );
    }
  }

  async function publishFacebook() {
    if (
      status !== "ready" &&
      status !== "scheduled"
    ) {
      setMessage(null);
      setError(
        "Valide d’abord la publication Facebook avant de la publier."
      );

      return;
    }

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
        facebookError instanceof Error
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

    setBrevoSendApprovedAt(
      updatedPublication.brevo_send_approved_at
    );
  }

  const isBusy =
    isSaving ||
    isGenerating ||
    isChangingStatus ||
    isCreatingBrevoDraft ||
    isApprovingBrevoSend ||
    isPublishingFacebook ||
    isMarkingGoogleBusinessPublished;

  const canEdit =
    status !== "published";

  const canPlan =
    status === "ready";

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

        <StatusBadge
          status={status}
        />
      </div>

      {status === "ready" ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Contenu validé
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            Cette déclinaison est prête à être planifiée ou publiée.
          </p>
        </div>
      ) : null}

      {status === "scheduled" ? (
        <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">
            Publication planifiée
          </p>

          <p className="mt-1 text-sm text-indigo-700">
            {scheduledAt
              ? `Prévue le ${formatDateTime(
                  scheduledAt
                )}.`
              : "Une date de publication doit être définie."}
          </p>
        </div>
      ) : null}

      {channel === "brevo" &&
      status === "scheduled" ? (
        brevoSendApprovedAt ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Envoi Brevo autorisé
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              Cette campagne peut être envoyée par le scheduler à l’heure prévue.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Envoi Brevo non autorisé
            </p>

            <p className="mt-1 text-sm text-amber-800">
              La campagne est planifiée, mais le scheduler ne doit pas l’envoyer tant que tu ne l’as pas autorisée explicitement.
            </p>
          </div>
        )
      ) : null}

      {status === "published" ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Publication effectuée
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Cette déclinaison est marquée comme publiée.
          </p>
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">
            Publication en échec
          </p>

          <p className="mt-1 text-sm text-red-700">
            Le contenu n’a pas été publié. Tu peux le remettre en attente puis le replanifier.
          </p>

          <button
            type="button"
            onClick={
              retryFailedPublication
            }
            disabled={isBusy}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChangingStatus
              ? "Remise en attente..."
              : "Réessayer"}
          </button>
        </div>
      ) : null}

      {canPlan ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date et heure de publication
          </label>

          <div className="mt-2 flex flex-wrap gap-3">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) =>
                setScheduledAt(
                  event.target.value
                )
              }
              disabled={isBusy}
              className="min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={
                schedulePublication
              }
              disabled={
                isBusy ||
                !scheduledAt
              }
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChangingStatus
                ? "Planification..."
                : "Planifier"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {channel === "brevo" &&
        (status === "ready" ||
          status === "scheduled") ? (
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

        {channel === "brevo" &&
        status === "scheduled" &&
        !brevoSendApprovedAt ? (
          <button
            type="button"
            onClick={
              approveBrevoSend
            }
            disabled={
              isBusy ||
              !publication.brevo_campaign_id
            }
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApprovingBrevoSend
              ? "Autorisation..."
              : "Autoriser l’envoi Brevo"}
          </button>
        ) : null}

        {channel === "google_business" &&
        (status === "ready" ||
          status === "scheduled") ? (
          <button
            type="button"
            onClick={
              markGoogleBusinessPublished
            }
            disabled={isBusy}
            className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarkingGoogleBusinessPublished
              ? "Enregistrement..."
              : "Marquer comme publié"}
          </button>
        ) : null}

        {channel === "facebook" &&
        (status === "ready" ||
          status === "scheduled") ? (
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
              : "Publier maintenant"}
          </button>
        ) : null}

        {status === "draft" ? (
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
        ) : null}

        {status === "draft" ? (
          <button
            type="button"
            onClick={
              validatePublication
            }
            disabled={
              isBusy ||
              !content.trim()
            }
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChangingStatus
              ? "Validation..."
              : "Valider"}
          </button>
        ) : null}

        {status === "ready" ? (
          <button
            type="button"
            onClick={
              returnToDraft
            }
            disabled={isBusy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Repasser en brouillon
          </button>
        ) : null}

        {status === "scheduled" ? (
          <button
            type="button"
            onClick={
              cancelSchedule
            }
            disabled={isBusy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Annuler la planification
          </button>
        ) : null}

        {status === "failed" ? (
          <button
            type="button"
            onClick={
              returnToDraft
            }
            disabled={isBusy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Repasser en brouillon
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4">
        {channel === "brevo" ? (
          <>
            <Field
              label="Objet de l’email"
              value={subject}
              onChange={setSubject}
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Préheader"
              value={previewText}
              onChange={
                setPreviewText
              }
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <TextArea
              label="Contenu de la newsletter"
              value={content}
              onChange={setContent}
              rows={12}
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
              disabled={
                !canEdit ||
                isBusy
              }
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
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Appel à l’action"
              value={callToAction}
              onChange={
                setCallToAction
              }
              placeholder="En savoir plus"
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
              disabled={
                !canEdit ||
                isBusy
              }
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
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Hashtags"
              value={hashtags}
              onChange={setHashtags}
              placeholder="#communication #marketing"
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
              disabled={
                !canEdit ||
                isBusy
              }
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
              disabled={
                !canEdit ||
                isBusy
              }
            />

            <Field
              label="Lien"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://..."
              disabled={
                !canEdit ||
                isBusy
              }
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

      {canEdit ? (
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
      ) : null}
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
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
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
        disabled={disabled}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
  disabled?: boolean;
};

function TextArea({
  label,
  value,
  onChange,
  rows,
  disabled = false,
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
        disabled={disabled}
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-slate-950 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PublicationStatus;
}) {
  const styles: Record<
    PublicationStatus,
    string
  > = {
    draft:
      "border-slate-200 bg-slate-100 text-slate-700",
    ready:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    scheduled:
      "border-indigo-200 bg-indigo-50 text-indigo-700",
    published:
      "border-blue-200 bg-blue-50 text-blue-700",
    failed:
      "border-red-200 bg-red-50 text-red-700",
  };

  const labels: Record<
    PublicationStatus,
    string
  > = {
    draft: "Brouillon",
    ready: "Prête",
    scheduled: "Planifiée",
    published: "Publiée",
    failed: "Échec",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
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