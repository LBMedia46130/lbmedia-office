import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
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
Le canal "website" sert uniquement de publication technique WordPress.

Si tu dois générer ce contenu :
- conserve le fond et le ton éditorial de l'actualité source ;
- ne transforme pas l'article en checklist ou en résumé ;
- garde une structure naturelle d'article.

Retourne :
- title : titre éditorial naturel ;
- content : article complet ;
- slug : slug court et lisible ;
- seo_title : titre SEO naturel ;
- meta_description : méta-description concise et humaine.
`,

  brevo: `
Tu prépares une newsletter Brevo.

OBJECTIF

La newsletter ne doit PAS résumer intégralement l'article.

Elle doit :
- éveiller l'intérêt ;
- rappeler rapidement le problème ou l'enjeu ;
- donner 1 ou 2 idées fortes seulement ;
- donner envie de lire l'article complet ou de contacter LBMedia.

STYLE

- ton direct, naturel et professionnel ;
- plus personnel qu'un article de blog ;
- paragraphes courts ;
- pas de longue liste ;
- pas de reprise mécanique des intertitres de l'article ;
- évite les formules commerciales agressives ;
- évite les objets trop publicitaires.

STRUCTURE CONSEILLÉE

- courte accroche ;
- 2 à 4 paragraphes ;
- éventuellement une courte liste si elle apporte vraiment quelque chose ;
- fin naturelle avec invitation à découvrir le sujet ou à échanger.

Retourne :
- subject : objet d'email court, naturel et incitatif sans être racoleur ;
- preview_text : préheader complémentaire ;
- content : contenu complet de l'email.

Le contenu doit pouvoir être utilisé directement dans Brevo après relecture.
`,

  google_business: `
Tu prépares une publication Google Business Profile.

OBJECTIF

Le lecteur doit comprendre en quelques secondes :
- le sujet ;
- pourquoi cela peut le concerner ;
- ce qu'il peut faire ensuite.

Le texte ne doit PAS être un résumé miniature de tout l'article.

Choisis un seul angle fort issu de l'article source.

STYLE

- très clair ;
- concis ;
- local et concret lorsque le sujet le permet ;
- professionnel ;
- sans jargon ;
- sans longue liste ;
- sans succession d'étapes ;
- sans hashtags ;
- sans introduction inutile.

Le texte doit rester suffisamment court pour être confortable à lire sur une fiche Google Business.

Retourne :
- content : publication Google Business concise et directement exploitable ;
- call_to_action : appel à l'action très court, par exemple "En savoir plus", "Découvrir nos conseils", "Nous contacter".

Ne crée aucun lien : le lien sera géré séparément par LBMedia Office.
`,

  linkedin: `
Tu prépares un post LinkedIn pour LBMedia.

OBJECTIF

Le post doit apporter un point de vue, une observation ou une réflexion professionnelle issue de l'article.

Ne résume PAS l'article paragraphe par paragraphe.

Choisis l'idée la plus intéressante pour un dirigeant de TPE ou PME et développe-la sous forme de publication autonome.

STYLE

- accroche naturelle, sans formule racoleuse ;
- ton professionnel mais humain ;
- phrases et paragraphes courts ;
- pas de structure "1 / 2 / 3" sauf nécessité exceptionnelle ;
- très peu de listes ;
- pas d'émojis systématiques ;
- pas de clichés du type "Et vous ?", "Dans un monde où...", "La clé du succès..." ;
- pas de langage artificiellement inspirant ;
- pas de discours commercial direct.

Le post doit donner envie de réfléchir, de réagir ou de lire l'article complet.

HASHTAGS

Ajoute seulement 2 à 4 hashtags maximum.

Ils doivent être réellement pertinents et lisibles.
Évite les séries de hashtags génériques.

Retourne :
- content : post LinkedIn complet ;
- hashtags : hashtags séparés par des espaces.
`,

  facebook: `
Tu prépares une publication Facebook pour la page LBMedia.

OBJECTIF

Le post doit être accessible immédiatement à un dirigeant de petite entreprise.

Il peut être plus conversationnel que LinkedIn, mais doit rester professionnel.

Ne résume PAS tout l'article.

Choisis un angle simple :
- une question concrète ;
- une erreur fréquente ;
- un conseil utile ;
- une situation que les entreprises locales rencontrent réellement.

STYLE

- naturel ;
- chaleureux sans être familier ;
- paragraphes courts ;
- peu ou pas de listes ;
- pas de jargon ;
- pas de hashtag obligatoire ;
- pas de formule marketing exagérée ;
- pas de longue démonstration.

La publication doit fonctionner seule dans le fil Facebook et donner naturellement envie d'en savoir plus.

Retourne :
- content : publication Facebook complète et directement exploitable.
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

  const lbmediaContext =
    getLbmediaContext();

  const sourceContent = `
Titre de l'actualité :
${newsRelation.title}

Article de référence :
${newsRelation.content || "Aucun contenu détaillé."}

Lien associé :
${newsRelation.source_url || "Aucun lien"}
`;

  try {
    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu travailles pour LBMedia.

Voici la connaissance éditoriale permanente de LBMedia :

${lbmediaContext}

Tu dois adapter une actualité existante à un support de communication précis.

PRINCIPE ESSENTIEL

Une déclinaison n'est PAS un résumé automatique de l'article.

Chaque support a :
- son propre usage ;
- son propre rythme ;
- son propre niveau de détail ;
- son propre objectif.

Tu dois donc sélectionner dans l'article l'angle le plus adapté au canal demandé.

RÈGLES COMMUNES

- écris en français ;
- respecte strictement les informations du contenu source ;
- n'invente aucun fait, chiffre, étude ou résultat ;
- écris un contenu directement exploitable ;
- adopte le ton LBMedia ;
- évite le jargon ;
- évite les formulations génériques ;
- évite de recopier les mêmes phrases que l'article ;
- évite de reprendre mécaniquement ses intertitres ;
- évite les listes si elles ne sont pas nécessaires ;
- n'ajoute aucune explication sur ton travail.

INSTRUCTIONS SPÉCIFIQUES AU CANAL

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
      content:
        generated.content.trim(),
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
        getText(
          generated.subject
        );

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