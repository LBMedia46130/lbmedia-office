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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const channelInstructions: Record<
  PublicationChannel,
  string
> = {
  website: `
Rédige un article web professionnel pour le site de LBMedia.
Le texte doit être clair, naturel, utile à une PME/PMI et suffisamment développé.
Évite le jargon marketing inutile.
Le contenu doit pouvoir servir de contenu éditorial de référence.
`,

  brevo: `
Prépare une newsletter Brevo courte et engageante.
Elle doit donner envie de lire ou de découvrir le contenu sans recopier intégralement l'article.
Le ton doit être professionnel, humain et direct.
`,

  google_business: `
Rédige une publication Google Business concise et immédiatement compréhensible.
Mets en avant l'information essentielle et termine naturellement par une invitation à en savoir plus.
`,

  linkedin: `
Rédige un post LinkedIn professionnel et naturel.
L'accroche doit donner envie de poursuivre la lecture.
Le texte doit être agréable à lire sur LinkedIn, avec des paragraphes courts.
Évite les formulations artificielles et les clichés liés à l'intelligence artificielle.
`,

  facebook: `
Rédige une publication Facebook accessible, naturelle et concise.
Le ton peut être légèrement plus conversationnel que sur LinkedIn tout en restant professionnel.
`,
};

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
${newsRelation.content || "Aucun contenu de référence détaillé."}

Lien éventuel :
${newsRelation.source_url || "Aucun lien"}
`;

  try {
    const response =
      await openai.responses.create({
        model: "gpt-5-mini",
        instructions: `
Tu travailles pour LBMedia, une agence de communication française.

Ta mission est d'adapter une actualité existante à un support précis.

Règles générales :
- respecte strictement les faits présents dans le contenu source ;
- n'invente aucune information ;
- écris en français ;
- adopte un style professionnel, naturel et directement exploitable ;
- évite les phrases génériques et le jargon ;
- ne commente jamais ton travail ;
- retourne uniquement le texte final destiné à être publié.

Consignes spécifiques au support :
${channelInstructions[channel]}
`,
        input: sourceContent,
      });

    const generatedContent =
      response.output_text.trim();

    if (!generatedContent) {
      throw new Error(
        "OpenAI n'a retourné aucun contenu."
      );
    }

    const { data: updatedPublication, error: updateError } =
      await supabaseAdmin
        .from("publications")
        .update({
          content: generatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      publication: updatedPublication,
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