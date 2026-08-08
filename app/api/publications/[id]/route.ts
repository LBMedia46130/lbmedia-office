import { NextResponse } from "next/server";

import {
  publicationStatuses,
  type UpdatePublicationInput,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  let body: UpdatePublicationInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Les données envoyées sont invalides.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.status &&
    !publicationStatuses.includes(body.status)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Le statut est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const updateData: Record<
    string,
    string | null
  > = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    updateData.title =
      body.title?.trim() || null;
  }

  if (body.content !== undefined) {
    updateData.content =
      body.content.trim();
  }

  if (body.status !== undefined) {
    updateData.status =
      body.status;
  }

  if (body.slug !== undefined) {
    updateData.slug =
      body.slug?.trim() || null;
  }

  if (body.seo_title !== undefined) {
    updateData.seo_title =
      body.seo_title?.trim() || null;
  }

  if (
    body.meta_description !== undefined
  ) {
    updateData.meta_description =
      body.meta_description?.trim() || null;
  }

  if (body.subject !== undefined) {
    updateData.subject =
      body.subject?.trim() || null;
  }

  if (
    body.preview_text !== undefined
  ) {
    updateData.preview_text =
      body.preview_text?.trim() || null;
  }

  if (
    body.call_to_action !== undefined
  ) {
    updateData.call_to_action =
      body.call_to_action?.trim() || null;
  }

  if (body.link_url !== undefined) {
    updateData.link_url =
      body.link_url?.trim() || null;
  }

  if (body.hashtags !== undefined) {
    updateData.hashtags =
      body.hashtags?.trim() || null;
  }

  if (
    body.scheduled_at !== undefined
  ) {
    updateData.scheduled_at =
      body.scheduled_at;
  }

  const { data, error } =
    await supabaseAdmin
      .from("publications")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible d’enregistrer la déclinaison.",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Déclinaison introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,
    publication: data,
  });
}