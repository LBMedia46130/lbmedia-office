import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const pageId =
    process.env.META_PAGE_ID;

  const accessToken =
    process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration Meta est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (publicationError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication Facebook.",
          error:
            publicationError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!publication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Publication introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      publication.channel !== "facebook"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n'est pas destinée à Facebook.",
        },
        {
          status: 400,
        }
      );
    }

    if (!publication.content?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu Facebook est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const messageParts = [
      publication.content.trim(),
    ];

    if (publication.link_url?.trim()) {
      messageParts.push(
        publication.link_url.trim()
      );
    }

    const message =
      messageParts.join("\n\n");

    const body =
      new URLSearchParams();

    body.set("message", message);
    body.set(
      "access_token",
      accessToken
    );

    const response = await fetch(
      `https://graph.facebook.com/v26.0/${pageId}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
      }
    );

    const rawResponse =
      await response.text();

    let metaData: unknown = null;

    try {
      metaData = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch {
      metaData = rawResponse;
    }

    if (!response.ok) {
      console.error(
        "Facebook publication failed",
        {
          status: response.status,
          metaData,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Meta a refusé la publication Facebook.",
          status:
            response.status,
          details:
            metaData,
        },
        {
          status:
            response.status,
        }
      );
    }

    const data =
      metaData as {
        id?: string;
      } | null;

    const publishedAt =
      new Date().toISOString();

    const facebookPostId =
      typeof data?.id === "string"
        ? data.id
        : null;

    const publishedUrl =
      facebookPostId
        ? `https://www.facebook.com/${facebookPostId.replace(
            "_",
            "/posts/"
          )}`
        : null;

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        status: "published",
        published_at: publishedAt,
        published_url: publishedUrl,
        updated_at: publishedAt,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le post a été publié sur Facebook, mais LBMedia Office n'a pas pu enregistrer son statut.",
          error:
            updateError.message,
          facebook_post_id:
            facebookPostId,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Publication Facebook effectuée.",
      facebook_post_id:
        facebookPostId,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de publier sur Facebook.",
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}