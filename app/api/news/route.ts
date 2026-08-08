import { NextResponse } from "next/server";

import {
  newsStatuses,
  type CreateNewsInput,
} from "@/lib/news";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de récupérer les actualités.",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    news: data ?? [],
  });
}

export async function POST(
  request: Request
) {
  let body: CreateNewsInput;

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

  const title = body.title?.trim();

  if (!title) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le titre de l’actualité est obligatoire.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.status &&
    !newsStatuses.includes(body.status)
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le statut de l’actualité est invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("news")
    .insert({
      title,
      content: body.content?.trim() ?? "",
      status: body.status ?? "draft",
      image_url:
        body.image_url?.trim() || null,
      source_url:
        body.source_url?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de créer l’actualité.",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      news: data,
    },
    {
      status: 201,
    }
  );
}