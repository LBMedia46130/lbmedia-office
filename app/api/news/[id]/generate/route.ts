import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GeneratedNews = {
  title: string;
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  try {
    const {
      data: news,
      error: newsError,
    } = await supabaseAdmin
      .from("news")
      .select(
        "id, title, content, source_url"
      )
      .eq("id", id)
      .maybeSingle();

    if (newsError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger l’actualité.",
          error:
            newsError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!news) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Actualité introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (!news.title?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le sujet de l’actualité est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

LBMedia est une agence de communication française qui accompagne principalement des PME, TPE, commerces, artisans et entreprises locales.

Tu dois transformer un sujet éditorial validé en une actualité complète destinée au site lbmedia.fr.

Cette actualité est le contenu éditorial principal de LBMedia. Elle servira ensuite de référence pour les déclinaisons Brevo, Google Business, LinkedIn et Facebook.

Règles éditoriales :

- écris en français ;
- écris comme une agence expérimentée qui parle à des dirigeants de PME et entreprises locales ;
- reste concret, utile et naturel ;
- évite le jargon marketing ;
- évite les formulations génériques liées à l'intelligence artificielle ;
- n'écris pas pour satisfaire artificiellement un outil SEO ;
- le référencement doit rester naturel ;
- ne présente pas LBMedia comme un donneur de leçons ;
- privilégie l'expérience terrain et les conseils applicables ;
- évite les affirmations chiffrées ou factuelles non fournies dans le sujet ;
- n'invente aucune étude, statistique ou actualité ;
- structure l'article avec des paragraphes et des intertitres lisibles ;
- ne mets pas de titre Markdown avec # ;
- ne termine pas par une conclusion artificielle du type "En conclusion" ;
- le texte doit être directement publiable après relecture.

Retourne :
- title : un titre éditorial naturel ;
- content : l'article complet.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Sujet retenu :
${news.title}

Brief préparé et validé :
${news.content || "Aucun brief détaillé."}

Lien source éventuel :
${news.source_url || "Aucun lien source."}

Rédige maintenant l'actualité complète LBMedia.
`,

        text: {
          format: {
            type: "json_schema",
            name: "lbmedia_news",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                },
                content: {
                  type: "string",
                },
              },
              required: [
                "title",
                "content",
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
        "Pénélope n'a retourné aucun article."
      );
    }

    const generated =
      JSON.parse(
        rawOutput
      ) as GeneratedNews;

    const title =
      generated.title?.trim();

    const content =
      generated.content?.trim();

    if (!title || !content) {
      throw new Error(
        "L'article généré est incomplet."
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedNews,
      error: updateError,
    } = await supabaseAdmin
      .from("news")
      .update({
        title,
        content,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    /*
     * On synchronise également la
     * publication technique website
     * utilisée par WordPress.
     */
    const {
      error:
        websiteUpdateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        title,
        content,
        updated_at: now,
      })
      .eq("news_id", id)
      .eq("channel", "website");

    if (websiteUpdateError) {
      throw new Error(
        websiteUpdateError.message
      );
    }

    return NextResponse.json({
      success: true,
      news: updatedNews,
    });
  } catch (error) {
    console.error(
      "News generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu rédiger l’actualité.",
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