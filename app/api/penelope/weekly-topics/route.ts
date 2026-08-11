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

type RecentNewsItem = {
  title: string;
  content: string | null;
  status: string;
  created_at: string;
};

type RecentStandalonePublication = {
  title: string | null;
  content: string;
  channel: string;
  status: string;
  created_at: string;
};

type EditorialHistoryItem = {
  published_at: string | null;
  channel: string;
  title: string;
  summary: string | null;
  source_url: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanExcerpt(
  value: string | null,
  maxLength = 320
) {
  if (!value?.trim()) {
    return "Aucun contenu";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date inconnue";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone:
        "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export async function POST() {
  if (
    !process.env.OPENAI_API_KEY
  ) {
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
    const [
      recentNewsResult,
      recentStandaloneResult,
      editorialHistoryResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("news")
        .select(
          "title, content, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(30),

      supabaseAdmin
        .from("publications")
        .select(
          "title, content, channel, status, created_at"
        )
        .is(
          "news_id",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(30),

      supabaseAdmin
        .from(
          "editorial_history"
        )
        .select(
          "published_at, channel, title, summary, source_url"
        )
        .order(
          "published_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        )
        .limit(100),
    ]);

    if (
      recentNewsResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter les actualités récentes.",
          error:
            recentNewsResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      recentStandaloneResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter les posts récents.",
          error:
            recentStandaloneResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      editorialHistoryResult.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de consulter l’historique éditorial.",
          error:
            editorialHistoryResult
              .error.message,
        },
        {
          status: 500,
        }
      );
    }

    const recentNews =
      (recentNewsResult.data ??
        []) as RecentNewsItem[];

    const recentStandalone =
      (recentStandaloneResult.data ??
        []) as RecentStandalonePublication[];

    const editorialHistory =
      (editorialHistoryResult.data ??
        []) as EditorialHistoryItem[];

    const recentNewsText =
      recentNews.length > 0
        ? recentNews
            .map(
              (
                item,
                index
              ) => {
                return [
                  `${index + 1}. ${item.title}`,
                  "Type : actualité / article LBMedia Office",
                  `Date : ${formatDate(
                    item.created_at
                  )}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${cleanExcerpt(
                    item.content
                  )}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucune actualité récente dans LBMedia Office.";

    const standaloneText =
      recentStandalone.length >
      0
        ? recentStandalone
            .map(
              (
                item,
                index
              ) => {
                return [
                  `${index + 1}. ${
                    item.title ||
                    "Post sans titre"
                  }`,
                  `Type : post indépendant ${item.channel}`,
                  `Date : ${formatDate(
                    item.created_at
                  )}`,
                  `Statut : ${item.status}`,
                  `Résumé : ${cleanExcerpt(
                    item.content
                  )}`,
                ].join("\n");
              }
            )
            .join("\n\n")
        : "Aucun post indépendant récent dans LBMedia Office.";

    const importedHistoryText =
      editorialHistory.length >
      0
        ? editorialHistory
            .map(
              (
                item,
                index
              ) => {
                const lines = [
                  `${index + 1}. ${item.title}`,
                  `Support : ${item.channel}`,
                  `Date de publication : ${formatDate(
                    item.published_at
                  )}`,
                  `Résumé : ${cleanExcerpt(
                    item.summary
                  )}`,
                ];

                if (
                  item.source_url
                ) {
                  lines.push(
                    `Lien : ${item.source_url}`
                  );
                }

                return lines.join(
                  "\n"
                );
              }
            )
            .join("\n\n")
        : "Aucun historique éditorial antérieur n’a encore été importé.";

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

Tu disposes maintenant de plusieurs sources d'historique :
- les actualités créées directement dans LBMedia Office ;
- les posts indépendants créés directement dans LBMedia Office ;
- l'historique éditorial antérieur importé dans LBMedia Office.

Tu dois considérer l'ensemble de ces sources comme la mémoire éditoriale de LBMedia.

RÈGLES

- écris en français ;
- propose exactement 3 sujets ;
- tiens compte de l'identité, des activités, du positionnement et du public de LBMedia ;
- analyse les thèmes déjà traités dans l'ensemble de l'historique fourni ;
- évite de proposer un sujet déjà traité récemment sous un angle trop proche ;
- tiens compte du fait qu'un thème peut avoir déjà été traité sur un autre support ;
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

TEMPORALITÉ ÉDITORIALE

- donne davantage de poids aux contenus les plus récents ;
- un sujet traité récemment doit généralement être évité ;
- un sujet plus ancien peut être repris s'il présente un nouvel angle réellement utile ;
- évite les répétitions éditoriales même lorsque les titres sont différents ;
- cherche aussi les thèmes importants pour LBMedia qui n'ont pas été abordés récemment.

Pour chaque proposition :

- title : titre éditorial possible ;
- angle : ce que l'article doit réellement expliquer ou défendre ;
- reason : pourquoi ce sujet est pertinent maintenant dans la ligne éditoriale LBMedia.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Voici la mémoire éditoriale actuellement connue.

ACTUALITÉS RÉCENTES CRÉÉES DANS LBMEDIA OFFICE

${recentNewsText}

POSTS INDÉPENDANTS RÉCENTS CRÉÉS DANS LBMEDIA OFFICE

${standaloneText}

HISTORIQUE ÉDITORIAL ANTÉRIEUR IMPORTÉ

${importedHistoryText}

À partir de la connaissance LBMedia et de l'ensemble de cette mémoire éditoriale, propose maintenant 3 sujets pour la prochaine communication hebdomadaire.
`,

        text: {
          format: {
            type: "json_schema",
            name:
              "weekly_topics",
            strict: true,
            schema: {
              type: "object",
              properties: {
                topics: {
                  type:
                    "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type:
                      "object",
                    properties: {
                      title: {
                        type:
                          "string",
                      },
                      angle: {
                        type:
                          "string",
                      },
                      reason: {
                        type:
                          "string",
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
      result.topics.length !==
        3
    ) {
      throw new Error(
        "Les propositions retournées sont invalides."
      );
    }

    return NextResponse.json({
      success: true,
      topics:
        result.topics,
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