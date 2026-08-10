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

export async function POST(
  _request: Request,
  context: RouteContext
) {
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

  const { id } = await context.params;

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
      .eq("channel", "website")
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

    if (!news.title?.trim()) {
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

    if (!news.content?.trim()) {
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

    const prompt = `
Créer UNE ILLUSTRATION ÉDITORIALE HORIZONTALE pour accompagner un article du site LBMedia.

SUJET DE L'ARTICLE :
${news.title.trim()}

CONTEXTE :
${articleExcerpt}

THÈME PRINCIPAL :
${websitePublication.focus_keyword || "communication d'entreprise locale"}

INTENTION DU VISUEL :
${websitePublication.image_alt || "illustrer simplement le sujet principal de l'article"}

DIRECTION ARTISTIQUE LBMEDIA :
- créer une véritable scène éditoriale, pas une collection d'icônes ou d'objets 3D ;
- rendu moderne, professionnel, élégant et crédible ;
- privilégier un environnement réel ou semi-réaliste lié au sujet : entreprise locale, commerce, bureau, communication ou environnement professionnel ;
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
`.trim();

    const result =
      await openai.images.generate({
        model: "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "medium",
      });

    const imageBase64 =
      result.data?.[0]?.b64_json;

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
          contentType: "image/png",
          cacheControl: "3600",
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
      .getPublicUrl(fileName);

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
        image_url: imageUrl,
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
      image_url: imageUrl,
      news: updatedNews,
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