import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const visualSceneDirections = [
  "une scène de terrain dans une entreprise locale, un commerce, un atelier ou un environnement professionnel réel, avec une activité crédible liée au sujet",
  "une interaction naturelle entre deux ou trois professionnels ou entre un professionnel et un client, sans mise en scène artificielle",
  "une composition éditoriale centrée sur un détail métier, des mains en action, des objets professionnels ou une situation concrète, sans montrer nécessairement de visage",
  "une scène professionnelle en plan large montrant un véritable environnement de travail, avec de la profondeur et plusieurs niveaux de lecture",
  "une scène extérieure ou semi-extérieure liée à une entreprise, un commerce, une rue, une vitrine ou une activité locale",
  "une composition réaliste principalement construite autour d'objets, de matières et d'éléments professionnels cohérents avec le sujet, sans personnage principal",
  "une situation de réflexion ou de décision montrée par une scène collective, une réunion informelle ou un échange professionnel, sans personne seule face à un écran",
  "une métaphore visuelle réaliste et crédible du sujet, intégrée dans un environnement professionnel réel, sans tomber dans l'infographie ou l'illustration conceptuelle abstraite",
];

const visualFramings = [
  "plan large avec environnement visible et profondeur",
  "plan moyen naturel, comme une photographie éditoriale prise sur le vif",
  "cadrage légèrement décentré avec sujet principal sur un tiers de l'image",
  "vue immersive avec premier plan, plan intermédiaire et arrière-plan",
  "cadrage rapproché sur l'action ou les détails métier",
  "composition panoramique laissant respirer la scène",
];

const humanDirections = [
  "la présence humaine est possible mais ne doit pas dominer automatiquement l'image",
  "privilégier une scène sans personnage principal si le sujet peut être compris autrement",
  "si des personnes apparaissent, privilégier plusieurs personnes en interaction plutôt qu'une personne seule",
  "utiliser éventuellement une présence humaine partielle ou secondaire : mains, silhouettes, personnes de dos ou en arrière-plan",
  "éviter les poses face caméra ; les personnes doivent sembler réellement occupées par leur activité",
];

function getRandomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() * items.length
    )
  ];
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
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

  const { id } =
    await context.params;

  try {
    const {
      data: news,
      error: newsError,
    } = await supabaseAdmin
      .from("news")
      .select(
        "id, title, content, image_url"
      )
      .eq("id", id)
      .maybeSingle();

    if (newsError) {
      throw new Error(
        newsError.message
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

    const {
      data: websitePublication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(
        "id, focus_keyword, secondary_keywords, image_alt"
      )
      .eq("news_id", id)
      .eq(
        "channel",
        "website"
      )
      .maybeSingle();

    if (publicationError) {
      throw new Error(
        publicationError.message
      );
    }

    if (!websitePublication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La publication WordPress associée est introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !news.title?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le titre est obligatoire avant de générer le visuel.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !news.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’article doit être rédigé avant de générer son visuel.",
        },
        {
          status: 400,
        }
      );
    }

    const articleExcerpt =
      news.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 1800);

    const sceneDirection =
      getRandomItem(
        visualSceneDirections
      );

    const framingDirection =
      getRandomItem(
        visualFramings
      );

    const humanDirection =
      getRandomItem(
        humanDirections
      );

    const prompt = `
Créer UNE ILLUSTRATION ÉDITORIALE HORIZONTALE pour accompagner un article du site LBMedia.

SUJET DE L'ARTICLE :
${news.title.trim()}

CONTEXTE :
${articleExcerpt}

THÈME PRINCIPAL :
${
  websitePublication.focus_keyword ||
  "communication d'entreprise locale"
}

INTENTION DU VISUEL :
${
  websitePublication.image_alt ||
  "illustrer simplement le sujet principal de l'article"
}

DIRECTION VISUELLE À PRIVILÉGIER POUR CETTE IMAGE :

- ${sceneDirection};
- ${framingDirection};
- ${humanDirection}.

IMPORTANT — DIVERSITÉ ÉDITORIALE :

Les visuels LBMedia doivent former une série éditoriale variée.
Ne pas utiliser systématiquement la même recette visuelle d'un article à l'autre.

ÉVITER EN PARTICULIER :
- la personne seule assise devant un ordinateur portable ;
- le professionnel pensif regardant son écran ;
- le portrait générique d'un homme ou d'une femme dans un bureau ;
- la même composition "personnage + laptop + bureau" ;
- les scènes interchangeables de bureau sans rapport réel avec le sujet.

Le sujet de l'article doit déterminer la scène.
Chercher d'abord une situation, un environnement, une action ou une métaphore visuelle spécifique au contenu avant d'introduire éventuellement un personnage.

DIRECTION ARTISTIQUE LBMEDIA :

- créer une véritable scène éditoriale, pas une collection d'icônes ou d'objets 3D ;
- rendu moderne, professionnel, élégant et crédible ;
- privilégier un environnement réel ou semi-réaliste lié au sujet : entreprise locale, commerce, activité professionnelle, environnement de travail ou situation concrète ;
- composition suffisamment riche pour donner de la matière au visuel, tout en restant aérée ;
- utiliser de la profondeur, de la perspective et une vraie mise en scène ;
- 4 à 6 éléments visuels cohérents maximum ;
- faire comprendre l'idée principale de l'article par la scène et non par des pictogrammes ;
- palette dominée par le bleu nuit profond, le bleu, le cyan / bleu lumineux et le blanc ;
- les couleurs LBMedia doivent guider l'ambiance sans donner l'impression d'un filtre bleu uniforme ;
- lumière soignée, contrastes élégants et détails réalistes ;
- rendu photographique ou illustration éditoriale réaliste haut de gamme ;
- privilégier un résultat crédible pour le site d'une agence de communication ;
- le visuel doit avoir assez de personnalité pour attirer l'œil dans une page d'actualité ;
- éviter absolument le rendu jouet, plastique, cartoon, pictogrammes 3D ou illustration SaaS ;
- éviter les compositions trop minimalistes avec seulement deux ou trois objets isolés sur un fond vide ;
- aucun logo nécessaire.

INTERDICTIONS ABSOLUES :

- AUCUN TEXTE ;
- AUCUNE LETTRE ;
- AUCUN MOT ;
- AUCUN CHIFFRE ;
- AUCUNE TYPOGRAPHIE ;
- AUCUN TITRE ;
- AUCUN SLOGAN ;
- AUCUNE LISTE ;
- AUCUNE INFOGRAPHIE ;
- AUCUN CALENDRIER ;
- AUCUN TABLEAU ;
- AUCUN GRAPHIQUE ;
- AUCUNE CARTE AVEC DU TEXTE ;
- AUCUNE INTERFACE UTILISATEUR ;
- AUCUN FAUX SITE INTERNET ;
- AUCUN ÉCRAN REMPLI D'ÉLÉMENTS ;
- AUCUN LOGO ;
- AUCUNE MARQUE ;
- AUCUN FILIGRANE ;
- éviter les accumulations d'icônes ;
- éviter les compositions en plusieurs panneaux.

Le résultat doit être une véritable IMAGE D'ILLUSTRATION ÉDITORIALE.
Elle doit donner envie de lire l'article et illustrer son idée principale sans chercher à résumer toutes les informations qu'il contient.

Format horizontal, composition équilibrée, suffisamment riche mais aérée, facilement recadrable.

Le choix de scène indiqué plus haut doit réellement influencer la composition finale afin d'obtenir un visuel différent des compositions éditoriales génériques habituelles.
`.trim();

    const result =
      await openai.images.generate({
        model: "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "medium",
      });

    const imageBase64 =
      result.data?.[0]
        ?.b64_json;

    if (!imageBase64) {
      throw new Error(
        "OpenAI n'a retourné aucun visuel exploitable."
      );
    }

    const imageBuffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    const fileName =
      `${id}/${Date.now()}.png`;

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("news-visuals")
      .upload(
        fileName,
        imageBuffer,
        {
          contentType:
            "image/png",
          cacheControl:
            "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      throw new Error(
        `Impossible d’enregistrer le visuel : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabaseAdmin.storage
      .from("news-visuals")
      .getPublicUrl(
        fileName
      );

    const imageUrl =
      publicUrlData.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "Impossible de récupérer l’URL publique du visuel."
      );
    }

    const {
      data: updatedNews,
      error: updateError,
    } = await supabaseAdmin
      .from("news")
      .update({
        image_url:
          imageUrl,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (
      updateError ||
      !updatedNews
    ) {
      throw new Error(
        updateError?.message ||
          "Le visuel a été créé mais son URL n’a pas pu être enregistrée."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Visuel généré et enregistré.",
      image_url:
        imageUrl,
      news:
        updatedNews,
    });
  } catch (error) {
    console.error(
      "Visual generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pénélope n'a pas pu générer le visuel.",
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