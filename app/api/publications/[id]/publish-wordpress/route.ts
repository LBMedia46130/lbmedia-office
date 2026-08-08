import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getWordPressConfig() {
  const wordpressUrl =
    process.env.WORDPRESS_URL;

  const username =
    process.env.WORDPRESS_USERNAME;

  const appPassword =
    process.env.WORDPRESS_APP_PASSWORD;

  if (
    !wordpressUrl ||
    !username ||
    !appPassword
  ) {
    throw new Error(
      "Configuration WordPress incomplète."
    );
  }

  return {
    wordpressUrl,
    username,
    appPassword,
  };
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  try {
    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(`
        *,
        news (
          title
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (publicationError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger la publication.",
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
      publication.channel !== "website"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n’est pas destinée au site web.",
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
            "Le contenu de l’article est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const authorization =
      Buffer.from(
        `${username}:${appPassword}`
      ).toString("base64");

    const wordpressResponse =
      await fetch(
        `${wordpressUrl}/wp-json/wp/v2/posts`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authorization}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title:
              publication.title ||
              "Actualité LBMedia",
            content:
              publication.content,
            slug:
              publication.slug ||
              undefined,
            excerpt:
              publication.meta_description ||
              undefined,
            status: "draft",
          }),
          cache: "no-store",
        }
      );

    const wordpressData =
      await wordpressResponse.json();

    if (!wordpressResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a refusé la création du brouillon.",
          status:
            wordpressResponse.status,
          details:
            wordpressData,
        },
        {
          status:
            wordpressResponse.status,
        }
      );
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        published_url:
          wordpressData.link ??
          null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le brouillon WordPress a été créé mais LBMedia Office n’a pas pu enregistrer son URL.",
          error:
            updateError.message,
          wordpress_post_id:
            wordpressData.id,
          wordpress_url:
            wordpressData.link ??
            null,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Brouillon WordPress créé.",
      wordpress_post_id:
        wordpressData.id,
      wordpress_url:
        wordpressData.link ??
        null,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de créer le brouillon WordPress.",
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