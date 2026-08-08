import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type WeeklyTopic = {
  title: string;
  angle: string;
  reason: string;
};

type WeeklyTopicsResponse = {
  topics: WeeklyTopic[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
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
      data: recentNews,
      error: recentNewsError,
    } = await supabaseAdmin
      .from("news")
      .select("title")
      .order("created_at", {
        ascending: false,
      })
      .limit(12);

    if (recentNewsError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter les actualités récentes.",
          error:
            recentNewsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const previousTitles =
      (recentNews ?? [])
        .map((item) => item.title)
        .filter(Boolean);

    const previousTopics =
      previousTitles.length > 0
        ? previousTitles
            .map(
              (title, index) =>
                `${index + 1}. ${title}`
            )
            .join("\n")
        : "Aucune actualité précédente.";

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

LBMedia est une agence de communication française qui accompagne principalement des PME et entreprises locales.

Les sujets peuvent notamment concerner :
- communication locale ;
- publicité radio ;
- création et évolution de sites web ;
- visibilité sur Google ;
- évolution des usages numériques ;
- communication des PME ;
- conseils pratiques tirés de l'expérience d'une agence.

Ta mission est de proposer des idées réellement exploitables pour les publications LBMedia de la semaine.

Règles :
- écris en français ;
- propose exactement 3 sujets ;
- évite les sujets déjà traités récemment ;
- évite les titres génériques ou trop marketing ;
- privilégie les sujets evergreen ou directement utiles aux PME ;
- chaque sujet doit pouvoir devenir une actualité/article LBMedia ;
- ne prétends pas qu'un événement récent a eu lieu si tu n'en as pas la preuve ;
- privilégie une approche concrète, professionnelle et accessible ;
- pas de jargon inutile ;
- pas de formulations du type "révolutionner", "booster", "dans un monde en constante évolution" ;
- les trois propositions doivent être suffisamment différentes les unes des autres.

Pour chaque proposition :
- title : titre éditorial possible ;
- angle : ce que l'article doit réellement raconter ;
- reason : pourquoi ce sujet est pertinent pour LBMedia et ses clients.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Voici les derniers sujets déjà présents dans LBMedia Office :

${previousTopics}

Propose maintenant 3 nouveaux sujets pour la prochaine communication hebdomadaire de LBMedia.
`,

        text: {
          format: {
            type: "json_schema",
            name: "weekly_topics",
            strict: true,
            schema: {
              type: "object",
              properties: {
                topics: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                      },
                      angle: {
                        type: "string",
                      },
                      reason: {
                        type: "string",
                      },
                    },
                    required: [
                      "title",
                      "angle",
                      "reason",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["topics"],
              additionalProperties: false,
            },
          },
        },
      });

    const rawOutput =
      response.output_text.trim();

    if (!rawOutput) {
      throw new Error(
        "Pénélope n'a retourné aucune proposition."
      );
    }

    const result =
      JSON.parse(
        rawOutput
      ) as WeeklyTopicsResponse;

    if (
      !Array.isArray(result.topics) ||
      result.topics.length !== 3
    ) {
      throw new Error(
        "Les propositions retournées sont invalides."
      );
    }

    return NextResponse.json({
      success: true,
      topics: result.topics,
    });
  } catch (error) {
    console.error(
      "Weekly topics generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu préparer les sujets de la semaine.",
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