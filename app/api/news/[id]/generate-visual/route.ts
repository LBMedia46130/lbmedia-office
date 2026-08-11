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
  "une composition principalement construite autour d'objets, de matières, de documents et d'éléments professionnels spécifiques au sujet, sans personnage principal",
  "une situation de réflexion ou de décision montrée par une scène collective ou un échange professionnel concret, sans personne seule face à un écran",
  "une métaphore visuelle crédible du problème ou de la décision évoquée dans l'article, intégrée dans un environnement professionnel cohérent",
];

const visualFramings = [
  "plan large avec environnement visible et profondeur",
  "plan moyen naturel avec une composition éditoriale travaillée",
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

STYLE VISUEL LBMEDIA — RÈGLE PRIORITAIRE :

Créer une ILLUSTRATION NUMÉRIQUE ÉDITORIALE CONTEMPORAINE.

Le résultat doit être clairement identifiable comme une illustration créée pour un article de magazine ou un média professionnel.

CE N'EST PAS UNE PHOTOGRAPHIE.

Ne pas rechercher le photoréalisme.
Ne pas imiter une photographie professionnelle.
Ne pas imiter une banque d'images.
Ne pas produire un rendu de reportage photographique.

Le style doit associer :

- une représentation figurative et immédiatement compréhensible ;
- des personnages et objets reconnaissables mais volontairement stylisés ;
- des formes légèrement simplifiées ;
- des volumes doux et dessinés ;
- des matières et textures illustrées ;
- des contours subtils lorsque cela améliore la lisibilité ;
- une lumière graphique et éditoriale ;
- une profondeur construite par l'illustration ;
- une composition élégante proche d'une illustration de presse ou de magazine ;
- un niveau de détail intermédiaire : suffisamment riche pour être professionnel, suffisamment stylisé pour ne jamais ressembler à une photo.

La stylisation doit être immédiatement perceptible.

Les personnages ne doivent pas avoir une peau, des cheveux ou des vêtements reproduits avec un niveau de détail photographique.

Les lieux ne doivent pas donner l'impression d'avoir été photographiés.

Les ombres, matières, lumières et volumes doivent conserver une interprétation graphique.

Le résultat doit être adulte, élégant et professionnel.

NE PAS BASCULER VERS :

- le cartoon enfantin ;
- la bande dessinée ;
- le dessin humoristique ;
- l'illustration vectorielle plate ;
- les personnages corporate simplistes ;
- l'esthétique SaaS ;
- les pictogrammes ;
- la 3D plastique ;
- le rendu jouet ;
- le collage ;
- l'aquarelle traditionnelle ;
- la peinture classique.

IDENTITÉ VISUELLE LBMEDIA :

Les visuels doivent pouvoir être reconnus comme appartenant à une même collection éditoriale LBMedia.

Conserver d'une génération à l'autre :

- le même degré de stylisation ;
- une sophistication graphique comparable ;
- des compositions éditoriales modernes ;
- une ambiance professionnelle mais accessible ;
- une palette cohérente ;
- une utilisation récurrente et subtile des couleurs LBMedia.

La palette privilégie :

- bleu nuit profond ;
- bleu soutenu ;
- cyan / bleu lumineux ;
- blanc et tons clairs ;
- quelques couleurs naturelles complémentaires nécessaires à la scène.

Les couleurs LBMedia doivent structurer ou ponctuer l'image sans appliquer un filtre bleu uniforme.

Chaque illustration doit cependant rester différente dans son sujet, son environnement, son cadrage et sa composition.

DIVERSITÉ ÉDITORIALE :

Les illustrations LBMedia doivent former une collection variée tout en conservant cette même famille graphique.

Chaque article doit pouvoir avoir son propre univers visuel en fonction de son sujet.

Avant de composer l'image, identifier mentalement :

1. quel est le problème concret traité par l'article ;
2. quelle situation pourrait représenter visuellement ce problème ;
3. quels éléments permettraient de comprendre cette situation sans aucun texte.

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
- les décors de bureau sans rapport précis avec l'article ;
- l'esthétique de photographie corporate de banque d'images ;
- le photoréalisme ;
- l'hyperréalisme ;
- les textures photographiques ;
- l'effet reportage photo ;
- les éclairages cinématographiques hyperréalistes ;
- la profondeur de champ photographique artificielle.

Un ordinateur ou un smartphone peut apparaître comme élément secondaire si la scène l'exige réellement, mais il ne doit pas constituer automatiquement le centre de l'image.

DIRECTION ARTISTIQUE :

- créer une véritable scène éditoriale illustrée ;
- rendu moderne, professionnel, élégant et clairement stylisé ;
- environnement cohérent avec le sujet ;
- privilégier les entreprises locales, commerces, ateliers, lieux professionnels, interactions clients, documents, objets et situations concrètes lorsque cela correspond au sujet ;
- composition suffisamment riche mais aérée ;
- profondeur, perspective et véritable mise en scène ;
- 4 à 6 éléments visuels cohérents maximum ;
- faire comprendre l'idée principale par la scène ;
- utiliser les couleurs LBMedia comme accents et éléments de cohérence visuelle ;
- conserver quelques couleurs naturelles complémentaires afin que l'image reste vivante ;
- lumière douce interprétée graphiquement ;
- contrastes élégants ;
- détails riches mais simplifiés par l'illustration ;
- image adaptée au site d'une agence de communication ;
- suffisamment de personnalité pour attirer l'œil dans une page d'actualité ;
- éviter le rendu publicitaire artificiel ;
- éviter absolument le rendu photographique ;
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
- AUCUN WIREFRAME ;
- AUCUNE MAQUETTE D'INTERFACE ;
- AUCUN SCHÉMA DE PAGE WEB ;
- AUCUN DESSIN D'INTERFACE SUR PAPIER ;
- AUCUNE CASE À COCHER ;
- AUCUNE COCHE ;
- AUCUN POINT D'INTERROGATION ;
- AUCUN SYMBOLE GRAPHIQUE ;
- AUCUN DIAGRAMME ;
- AUCUN SCHÉMA FONCTIONNEL ;
- éviter les accumulations d'icônes ;
- éviter les compositions en plusieurs panneaux ;
- si des documents, carnets ou feuilles apparaissent dans la scène, ils doivent rester vierges ou présenter uniquement des formes abstraites non interprétables.

IMPORTANT POUR LES DOCUMENTS ET OBJETS :

Les documents, carnets, feuilles, écrans ou supports présents dans l'image servent uniquement à construire la scène.

Ils ne doivent jamais devenir un moyen détourné d'afficher du texte, une interface, un wireframe, un diagramme, des coches, des symboles ou des éléments graphiques assimilables à une interface.

Le résultat doit être une véritable ILLUSTRATION ÉDITORIALE.

Elle doit donner envie de lire l'article et représenter UNE idée forte issue du contenu, plutôt que chercher à résumer l'ensemble de l'article.

Format horizontal.
Composition équilibrée.
Image suffisamment riche mais aérée.
Facilement recadrable.

IMPORTANT :

Le concept de l'image doit être choisi à partir du contenu réel de l'article.

Ne pas utiliser une scène de bureau générique comme solution par défaut.

Le résultat final doit être immédiatement identifiable comme une illustration numérique éditoriale LBMedia et ne doit jamais pouvoir être confondu avec une photographie.
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