import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
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
      .select(
        "title, content, status, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

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

    const editorialHistory =
      (recentNews ?? []).length > 0
        ? (recentNews ?? [])
            .map(
              (
                item,
                index
              ) => {
                const excerpt =
                  item.content
                    ?.trim()
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .slice(
                      0,
                      320
                    ) || "Aucun contenu";

                return [
                  `${index + 1}. ${item.title}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${excerpt}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucune actualité précédente.";

    const lbmediaContext =
      getLbmediaContext();

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

Voici la connaissance éditoriale permanente de LBMedia :

${lbmediaContext}

Ta mission est de proposer des sujets réellement pertinents pour la prochaine communication hebdomadaire de LBMedia.

Règles :
- écris en français ;
- propose exactement 3 sujets ;
- tiens compte de l'identité, des activités, du positionnement et du public de LBMedia ;
- analyse les sujets déjà présents dans l'historique fourni ;
- évite de proposer un sujet déjà traité récemment sous un angle trop proche ;
- si un thème mérite d'être repris, trouve un angle clairement différent ;
- les trois propositions doivent être différentes les unes des autres ;
- privilégie des sujets evergreen ou réellement utiles aux entreprises locales ;
- les sujets doivent pouvoir devenir une véritable actualité publiée sur lbmedia.fr ;
- reste proche des activités réelles de LBMedia ;
- évite le jargon marketing ;
- évite les titres racoleurs ;
- évite les formulations génériques ;
- n'invente aucune actualité, étude, chiffre ou tendance récente ;
- ne prétends pas disposer d'informations que le contexte ne fournit pas.

Pour chaque proposition :
- title : titre éditorial possible ;
- angle : ce que l'article doit réellement expliquer ou défendre ;
- reason : pourquoi ce sujet est pertinent maintenant dans la ligne éditoriale LBMedia.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Voici l'historique éditorial actuellement connu dans LBMedia Office :

${editorialHistory}

À partir de la connaissance LBMedia et de cet historique, propose maintenant 3 sujets pour la prochaine communication hebdomadaire.
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
                    additionalProperties:
                      false,
                  },
                },
              },
              required: [
                "topics",
              ],
              additionalProperties:
                false,
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
      !Array.isArray(
        result.topics
      ) ||
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