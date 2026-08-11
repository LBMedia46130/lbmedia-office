import { NextResponse } from "next/server";

import {
  publicationChannels,
  type PublicationChannel,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateStandalonePublicationInput = {
  channel?: PublicationChannel;
  title?: string;
  content?: string;
};

const standaloneChannels: PublicationChannel[] = [
  "linkedin",
  "facebook",
  "google_business",
  "brevo",
];

export async function POST(
  request: Request
) {
  let body: CreateStandalonePublicationInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Les données envoyées sont invalides.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !body.channel ||
    !publicationChannels.includes(
      body.channel
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le support de publication est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !standaloneChannels.includes(
      body.channel
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Ce support ne peut pas être utilisé pour une publication indépendante.",
      },
      {
        status: 400,
      }
    );
  }

  const title =
    body.title?.trim() ?? "";

  if (!title) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le sujet est obligatoire.",
      },
      {
        status: 400,
      }
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("publications")
    .insert({
      news_id: null,
      channel: body.channel,
      title,
      content:
        body.content?.trim() ?? "",
      status: "draft",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de créer la publication.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    publication: data,
  });
}