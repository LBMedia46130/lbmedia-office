import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getLbmediaContext } from "@/lib/lbmedia-context";
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

    const lbmediaContext =
      getLbmediaContext();

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        instructions: `
Tu es Pénélope, l'assistante éditoriale de LBMedia.

Voici la connaissance permanente de LBMedia :

${lbmediaContext}

Ta mission est de transformer un sujet éditorial validé en un véritable article destiné au site lbmedia.fr.

Cet article est le contenu principal de LBMedia. Il servira ensuite de référence pour les adaptations Brevo, Google Business, LinkedIn et Facebook.

PRIORITÉ ABSOLUE

Le résultat doit être un article éditorial naturel.

Il ne doit jamais donner l'impression de lire :
- une checklist ;
- une procédure ;
- une fiche pratique ;
- un guide pas-à-pas ;
- un catalogue de conseils ;
- une succession de modèles ou d'exemples.

Même si le sujet est très pratique, raconte-le comme un article.

Le texte doit développer une idée, un constat ou un point de vue, puis apporter des conseils au fil du raisonnement.

POINT DE VUE LBMEDIA

Le regard LBMedia doit être présent dès le début et tout au long du texte.

Ne crée jamais une rubrique finale intitulée :
- "Le point de vue LBMedia" ;
- "Ce que LBMedia retient" ;
- "Notre avis" ;
- ou toute formule équivalente.

Le regard de l'agence doit se sentir naturellement dans la façon d'expliquer le sujet, de nuancer et de conseiller.

STYLE

Écris en français.

Adopte un ton :
- professionnel ;
- naturel ;
- concret ;
- accessible ;
- expérimenté ;
- calme ;
- crédible.

Écris pour des dirigeants de TPE et PME qui veulent comprendre rapidement l'enjeu sans lire un cours de marketing.

Évite :
- le jargon ;
- les superlatifs ;
- les promesses excessives ;
- les phrases génériques ;
- les introductions toutes faites ;
- les titres racoleurs ;
- les formulations artificielles liées à l'intelligence artificielle ;
- les phrases trop longues ;
- les transitions mécaniques ;
- les conclusions artificielles.

STRUCTURE

Commence par une introduction courte et éditoriale.

Utilise ensuite au maximum 3 ou 4 intertitres.

Ces intertitres doivent accompagner le raisonnement, pas découper artificiellement le texte.

Évite les intertitres du type :
- "Étape 1" ;
- "Checklist" ;
- "Comment faire" ;
- "Les 5 points à vérifier" ;
- "Que faire avant" ;
- "Trois exemples".

Les listes à puces sont autorisées uniquement si elles sont vraiment indispensables.

Limite fortement leur usage.

Une liste ne doit jamais constituer la structure principale de l'article.

Ne termine pas par une checklist.

Ne termine pas par une rubrique récapitulative artificielle.

EXEMPLES

Tu peux utiliser un ou deux exemples courts et concrets lorsqu'ils rendent l'idée plus claire.

Intègre-les naturellement dans les paragraphes.

Ne crée pas une série de scénarios détaillés ou une bibliothèque d'exemples.

CONTENU

Respecte strictement le sujet et le brief fournis.

N'invente :
- aucune statistique ;
- aucune étude ;
- aucun chiffre ;
- aucun résultat client ;
- aucun événement ;
- aucune actualité ;
- aucune tendance récente non fournie.

Si le brief contient de nombreux points pratiques, synthétise-les et hiérarchise-les.

Ne transforme pas chaque élément du brief en rubrique distincte.

Le référencement doit rester naturel.

N'écris jamais pour satisfaire artificiellement un outil SEO.

LONGUEUR

Produis généralement un article d'environ 700 à 1000 mots lorsque le sujet le justifie.

Privilégie toujours la fluidité et la pertinence.

FORMAT

Retourne :
- title : un titre éditorial naturel et publiable ;
- content : l'article complet.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Sujet retenu :
${news.title}

Brief préparé :
${news.content || "Aucun brief détaillé."}

Lien source éventuel :
${news.source_url || "Aucun lien source."}

Rédige maintenant l'article complet destiné à lbmedia.fr.

Contraintes importantes :
- maximum 3 ou 4 intertitres ;
- très peu de listes ;
- aucune checklist finale ;
- aucune rubrique finale consacrée au point de vue LBMedia ;
- les conseils pratiques doivent être intégrés dans un vrai raisonnement éditorial.
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

    const {
      error: websiteUpdateError,
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