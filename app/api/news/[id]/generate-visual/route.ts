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
  "une scène de terrain dans une entreprise locale, un commerce, un atelier ou un environnement professionnel réel, avec une activité crédible directement liée au sujet",
  "une interaction naturelle entre deux ou trois professionnels ou entre un professionnel et un client, dans une situation concrète directement liée au sujet",
  "une composition éditoriale centrée sur une action métier, des mains en action, des documents, des objets ou des éléments professionnels ayant un rapport direct avec le sujet",
  "une scène professionnelle en plan large montrant un véritable environnement de travail ou commercial, avec de la profondeur et plusieurs niveaux de lecture",
  "une scène extérieure ou semi-extérieure liée à une entreprise locale, un commerce, une vitrine, une activité ou un parcours client",
  "une composition réaliste principalement construite autour d'objets, de matières, de documents et d'éléments professionnels spécifiques au sujet, sans personnage principal",
  "une situation de réflexion ou de décision montrée par une scène collective ou un échange professionnel concret, sans personne seule face à un écran",
  "une métaphore visuelle réaliste du problème ou de la décision évoquée dans l'article, intégrée dans un environnement professionnel crédible",
];

const visualFramings = [
  "plan large avec environnement visible et profondeur",
  "plan moyen naturel, comme une photographie éditoriale prise sur le vif",
  "cadrage légèrement décentré avec le sujet principal placé sur un tiers de l'image",
  "vue immersive avec premier plan, plan intermédiaire et arrière-plan",
  "cadrage rapproché sur une action, des mains, des documents ou des détails métier",
  "composition panoramique laissant respirer la scène",
];

const humanDirections = [
  "la présence humaine est possible mais ne doit pas être le sujet automatique de l'image",
  "privilégier une scène sans personnage principal lorsque l'idée peut être exprimée plus précisément par une situation, un lieu ou une action",
  "si des personnes apparaissent, privilégier une interaction réelle entre plusieurs personnes plutôt qu'une personne seule",
  "utiliser éventuellement une présence humaine partielle ou secondaire : mains, silhouettes, personnes de dos ou personnages en arrière-plan",
  "éviter les poses face caméra ; les personnes doivent sembler réellement occupées par une activité liée au sujet",
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
        "id, focus_keyword, secondary_keywords"
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
        .slice(0, 2200);

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

CONTENU DE RÉFÉRENCE :
${articleExcerpt}

THÈME PRINCIPAL :
${
  websitePublication.focus_keyword ||
  "communication d'entreprise locale"
}

MOTS-CLÉS COMPLÉMENTAIRES :
${
  websitePublication.secondary_keywords ||
  "entreprise locale, communication, activité professionnelle"
}

OBJECTIF :

Comprendre d'abord l'idée centrale de l'article.

Imaginer ensuite UNE situation visuelle précise qui représente cette idée.

Ne pas simplement illustrer les mots-clés.
Ne pas créer une scène professionnelle générique.

La scène doit avoir un rapport évident avec le problème, la décision, l'action ou la situation concrète abordée dans l'article.

DIRECTION VISUELLE POUR CETTE GÉNÉRATION :

- ${sceneDirection};
- ${framingDirection};
- ${humanDirection}.

DIVERSITÉ ÉDITORIALE :

Les illustrations LBMedia doivent former une collection variée.

Chaque article doit pouvoir avoir son propre univers visuel en fonction de son sujet.

Avant de composer l'image, identifier mentalement :
1. quel est le problème concret traité par l'article ;
2. quelle situation réelle pourrait représenter ce problème ;
3. quels éléments visuels permettraient de comprendre cette situation sans aucun texte.

Choisir cette situation plutôt qu'une représentation générique du travail de bureau.

ÉVITER EN PARTICULIER :

- une personne seule devant un ordinateur portable ;
- une personne qui regarde ou manipule simplement un smartphone ;
- un professionnel pensif devant son écran ;
- deux personnes regardant ensemble un ordinateur ou un téléphone sans autre action significative ;
- un portrait générique dans un bureau ;
- la composition classique personnage + laptop + tasse ;
- la composition personnage + smartphone + laptop ;
- les réunions génériques autour d'un ordinateur ;
- les scènes interchangeables de coworking ;
- les décors de bureau sans rapport précis avec l'article.

Un ordinateur ou un smartphone peut apparaître comme élément secondaire si la scène l'exige réellement, mais il ne doit pas constituer automatiquement le centre de l'image.

DIRECTION ARTISTIQUE LBMEDIA :

- créer une véritable scène éditoriale ;
- rendu moderne, professionnel, élégant et crédible ;
- environnement réel ou semi-réaliste ;
- privilégier les entreprises locales, commerces, ateliers, lieux professionnels, interactions clients, documents, objets et situations concrètes lorsque cela correspond au sujet ;
- composition suffisamment riche mais aérée ;
- profondeur, perspective et vraie mise en scène ;
- 4 à 6 éléments visuels cohérents maximum ;
- faire comprendre l'idée principale par la scène ;
- palette dominée par le bleu nuit profond, le bleu, le cyan / bleu lumineux et le blanc ;
- utiliser les couleurs LBMedia comme ambiance subtile, jamais comme filtre bleu uniforme ;
- lumière naturelle ou professionnelle soignée ;
- contrastes élégants ;
- détails réalistes ;
- rendu photographique éditorial haut de gamme ;
- image crédible pour le site d'une agence de communication ;
- suffisamment de personnalité pour attirer l'œil dans une page d'actualité ;
- éviter le rendu publicitaire artificiel ou la photographie de banque d'images trop parfaite ;
- éviter absolument le rendu jouet, plastique, cartoon, pictogrammes 3D ou illustration SaaS ;
- éviter les compositions minimalistes constituées de quelques objets isolés sur un fond vide.

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

Elle doit donner envie de lire l'article et représenter UNE idée forte issue du contenu, plutôt que chercher à résumer l'ensemble de l'article.

Format horizontal.
Composition équilibrée.
Image suffisamment riche mais aérée.
Facilement recadrable.

IMPORTANT :
Le concept de l'image doit être choisi à partir du contenu réel de l'article.
Ne pas utiliser une scène de bureau générique comme solution par défaut.
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