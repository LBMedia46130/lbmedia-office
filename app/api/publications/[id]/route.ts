import { NextResponse } from "next/server";

import {
  publicationStatuses,
  type PublicationStatus,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdatePublicationInput = {
  title?: string | null;
  content?: string;
  status?: PublicationStatus;
  scheduled_at?: string | null;
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
      { status: 400 }
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
      { status: 400 }
    );
  }

  const updateData: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    updateData.title = body.title?.trim() || null;
  }

  if (body.content !== undefined) {
    updateData.content = body.content.trim();
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  if (body.scheduled_at !== undefined) {
    updateData.scheduled_at = body.scheduled_at;
  }

  const { data, error } = await supabaseAdmin
    .from("publications")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Impossible d’enregistrer la déclinaison.",
        error: error.message,
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        message: "Déclinaison introuvable.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    publication: data,
  });
}