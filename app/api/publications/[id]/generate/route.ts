import OpenAI from "openai";
import { NextResponse } from "next/server";

import type {
  PublicationChannel,
} from "@/lib/news";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GeneratedPublication = {
  title?: string;
  content: string;
  slug?: string;
  seo_title?: string;
  meta_description?: string;
  subject?: string;
  preview_text?: string;
  call_to_action?: string;
  link_url?: string;
  hashtags?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const channelInstructions: Record<
  PublicationChannel,
  string
> = {
  website: `
Prépare l'article destiné au site web LBMedia.

Retourne :
- title : titre éditorial de l'article
- content : article complet, professionnel, naturel et structuré
- slug : slug court en minuscules avec des tirets
- seo_title : titre SEO naturel
- meta_description : méta-description concise

N'utilise pas de jargon inutile.
Le contenu doit être utile à une PME/PMI.
`,

  brevo: `
Prépare une newsletter Brevo courte et engageante.

Retourne :
- subject : objet de l'email
- preview_text : préheader
- content : contenu de la newsletter

La newsletter doit donner envie de découvrir le sujet
sans recopier intégralement l'article.
`,

  google_business: `
Prépare une publication Google Business.

Retourne :
- content : texte concis et immédiatement compréhensible
- call_to_action : appel à l'action court

Le texte doit présenter l'information essentielle
et inciter naturellement à en savoir plus.
`,

  linkedin: `
Prépare un post LinkedIn professionnel et naturel.

Retourne :
- content : publication LinkedIn
- hashtags : quelques hashtags réellement pertinents

Utilise une accroche intéressante, des paragraphes courts
et évite les clichés marketing ou liés à l'intelligence artificielle.
`,

  facebook: `
Prépare une publication Facebook.

Retourne :
- content : texte accessible, naturel et concis

Le ton peut être légèrement plus conversationnel que sur LinkedIn
tout en restant professionnel.
`,
};

function getText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API OpenAI n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: publication,
    error: publicationError,
  } = await supabaseAdmin
    .from("publications")
    .select(`
      *,
      news (
        title,
        content,
        source_url
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
        error: publicationError.message,
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

  const channel =
    publication.channel as PublicationChannel;

  const newsRelation = Array.isArray(
    publication.news
  )
    ? publication.news[0]
    : publication.news;

  if (!newsRelation) {
    return NextResponse.json(
      {
        success: false,
        message:
          "L'actualité source est introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  const sourceContent = `
Titre de l'actualité :
${newsRelation.title}

Contenu de référence :
${newsRelation.content || "Aucun contenu détaillé."}

Lien associé :
${newsRelation.source_url || "Aucun lien"}
`;

  try {
    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu travailles pour LBMedia, une agence de communication française.

Tu adaptes une actualité existante à un support de communication précis.

Règles :
- écris en français ;
- respecte strictement les informations du contenu source ;
- n'invente aucun fait ;
- écris un contenu directement exploitable ;
- adopte un style professionnel, naturel et humain ;
- évite le jargon et les formulations génériques ;
- n'ajoute aucune explication sur ton travail.

${channelInstructions[channel]}

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: sourceContent,

        text: {
          format: {
            type: "json_schema",
            name: "publication",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                content: {
                  type: "string",
                },
                slug: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                seo_title: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                meta_description: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                subject: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                preview_text: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                call_to_action: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                link_url: {
                  type: [
                    "string",
                    "null",
                  ],
                },
                hashtags: {
                  type: [
                    "string",
                    "null",
                  ],
                },
              },

              required: [
                "title",
                "content",
                "slug",
                "seo_title",
                "meta_description",
                "subject",
                "preview_text",
                "call_to_action",
                "link_url",
                "hashtags",
              ],

              additionalProperties: false,
            },
          },
        },
      });

    const rawOutput =
      response.output_text.trim();

    if (!rawOutput) {
      throw new Error(
        "OpenAI n'a retourné aucun contenu."
      );
    }

    const generated =
      JSON.parse(
        rawOutput
      ) as GeneratedPublication;

    if (!generated.content?.trim()) {
      throw new Error(
        "Le contenu généré est vide."
      );
    }

    const updateData: Record<
      string,
      string | null
    > = {
      content: generated.content.trim(),
      updated_at:
        new Date().toISOString(),
    };

    if (channel === "website") {
      updateData.title =
        getText(generated.title);

      updateData.slug =
        getText(generated.slug);

      updateData.seo_title =
        getText(
          generated.seo_title
        );

      updateData.meta_description =
        getText(
          generated.meta_description
        );
    }

    if (channel === "brevo") {
      updateData.subject =
        getText(generated.subject);

      updateData.preview_text =
        getText(
          generated.preview_text
        );
    }

    if (
      channel === "google_business"
    ) {
      updateData.call_to_action =
        getText(
          generated.call_to_action
        );
    }

    if (channel === "linkedin") {
      updateData.hashtags =
        getText(
          generated.hashtags
        );
    }

    if (newsRelation.source_url) {
      updateData.link_url =
        newsRelation.source_url;
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return NextResponse.json({
      success: true,
      publication:
        updatedPublication,
    });
  } catch (error) {
    console.error(
      "Publication generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de générer la déclinaison.",
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