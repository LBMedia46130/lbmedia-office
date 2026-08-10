import fs from "node:fs";
import path from "node:path";

import OpenAI from "openai";
import { NextResponse } from "next/server";
import sharp from "sharp";

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
      { status: 500 }
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
        { status: 404 }
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
        { status: 404 }
      );
    }

    if (!news.title?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le titre est obligatoire avant de générer le visuel.",
        },
        { status: 400 }
      );
    }

    if (!news.content?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L’article doit être rédigé avant de générer son visuel.",
        },
        { status: 400 }
      );
    }

    const articleExcerpt =
      news.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 2200);

    const prompt = `
Créer un visuel éditorial horizontal professionnel pour LBMedia.

Sujet :
${news.title.trim()}

Résumé :
${articleExcerpt}

Mot-clé principal :
${websitePublication.focus_keyword || "Non défini"}

Mots-clés secondaires :
${websitePublication.secondary_keywords || "Non définis"}

Intention / texte ALT :
${websitePublication.image_alt || "Illustration professionnelle du sujet"}

CHARTE LBMEDIA :
- rendu moderne, professionnel, sobre et premium ;
- adapté à une agence de communication française travaillant avec des TPE et PME ;
- couleurs dominantes : bleu nuit profond, bleu, cyan / bleu lumineux et blanc ;
- violet possible uniquement comme accent secondaire ;
- composition claire, élégante et aérée ;
- sujet principal immédiatement compréhensible ;
- éviter l'esthétique banque d'images générique ;
- éviter les clichés marketing et les effets futuristes gratuits ;
- aucun texte, titre, slogan, logo, marque ou filigrane dans l'image ;
- prévoir une zone visuellement calme dans l'angle inférieur droit afin d'y ajouter ensuite le logo LBMedia ;
- format horizontal adapté à un article web et suffisamment souple pour un recadrage raisonnable.
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

    const generatedBuffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    let finalBuffer =
      generatedBuffer;

    const logoPath = path.join(
      process.cwd(),
      "public",
      "brand",
      "lbmedia-logo.png"
    );

    if (fs.existsSync(logoPath)) {
      try {
        const logoSource =
          fs.readFileSync(
            logoPath
          );

        const logoBuffer =
          await sharp(logoSource)
            .resize({
              width: 260,
              withoutEnlargement: true,
            })
            .png()
            .toBuffer();

        finalBuffer =
          await sharp(
            generatedBuffer
          )
            .composite([
              {
                input: logoBuffer,
                gravity: "southeast",
              },
            ])
            .png()
            .toBuffer();
      } catch (logoError) {
        console.warn(
          "LBMedia logo overlay skipped:",
          logoError
        );

        /*
         * Le logo est un bonus.
         * S'il ne peut pas être incrusté,
         * on conserve le visuel généré
         * plutôt que de bloquer la V1.
         */
        finalBuffer =
          generatedBuffer;
      }
    }

    const fileName =
      `${id}/${Date.now()}.png`;

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("news-visuals")
      .upload(
        fileName,
        finalBuffer,
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
      { status: 500 }
    );
  }
}