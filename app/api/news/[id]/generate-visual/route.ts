import fs from "node:fs";
import path from "node:path";

import OpenAI, { toFile } from "openai";
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
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger l’actualité.",
          error: newsError.message,
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
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de charger les données éditoriales de l’article.",
          error:
            publicationError.message,
        },
        {
          status: 500,
        }
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
            "Le titre de l’actualité est obligatoire avant de générer le visuel.",
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

    const logoPath = path.join(
      process.cwd(),
      "public",
      "brand",
      "lbmedia-logo.png"
    );

    if (!fs.existsSync(logoPath)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le logo officiel LBMedia est introuvable dans public/brand/lbmedia-logo.png.",
        },
        {
          status: 500,
        }
      );
    }

    const logoBuffer =
      fs.readFileSync(logoPath);

    const logoFile = await toFile(
      logoBuffer,
      "lbmedia-logo.png",
      {
        type: "image/png",
      }
    );

    const articleExcerpt =
      news.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 2200);

    const prompt = `
Créer un visuel éditorial horizontal pour LBMedia à partir du sujet ci-dessous.

Le fichier image fourni est le LOGO OFFICIEL LBMedia.
Il doit servir de référence de marque et être intégré au visuel sans être redessiné, réinterprété, déformé ou remplacé par un faux logo.

Sujet de l'article :
${news.title.trim()}

Résumé :
${articleExcerpt}

Mot-clé principal :
${websitePublication.focus_keyword || "Non défini"}

Mots-clés secondaires :
${websitePublication.secondary_keywords || "Non définis"}

Intention / texte ALT :
${websitePublication.image_alt || "Illustration professionnelle du sujet de l'article"}

CHARTE VISUELLE LBMEDIA À RESPECTER :
- univers professionnel, moderne, sobre et premium ;
- cohérence avec une agence de communication française travaillant avec des TPE et PME ;
- couleurs dominantes : bleu nuit profond, bleu LBMedia, cyan / bleu lumineux et blanc ;
- les accents violets restent possibles mais secondaires ;
- composition nette, lisible et élégante ;
- rendu éditorial, pas une banque d'images générique ;
- sujet principal immédiatement compréhensible ;
- image suffisamment aérée pour rester exploitable dans les modèles du site et les communications LBMedia ;
- éviter les compositions surchargées et les effets futuristes gratuits ;
- éviter les clichés visuels marketing trop génériques.

LOGO :
- utiliser uniquement le logo LBMedia fourni ;
- préserver son aspect et ses proportions ;
- le placer de manière discrète mais clairement visible, idéalement dans une zone calme de la composition ;
- ne jamais inventer une variante du logo ;
- ne jamais transformer les lettres du logo ;
- ne jamais ajouter d'autre marque ou logo.

TEXTE :
- aucun titre, slogan, mot, pseudo-interface ou texte généré dans l'image ;
- le seul élément typographique autorisé est le logo LBMedia fourni.

FORMAT :
- visuel horizontal adapté à un article de site internet ;
- composition permettant un recadrage raisonnable pour d'autres supports ;
- aucun filigrane.
`.trim();

    const result =
      await openai.images.edit({
        model: "gpt-image-2",
        image: logoFile,
        prompt,
        size: "1536x1024",
        quality: "medium",
        input_fidelity: "high",
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

    const now =
      new Date().toISOString();

    const {
      data: updatedNews,
      error: updateError,
    } = await supabaseAdmin
      .from("news")
      .update({
        image_url: imageUrl,
        updated_at: now,
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
        "Visuel LBMedia généré et enregistré.",
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