import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const BREVO_LIST_ID = 5;
const BREVO_SENDER_ID = 2;

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const apiKey =
    process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API Brevo n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select("*")
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

    if (
      publication.channel !== "brevo"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette publication n'est pas une newsletter Brevo.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      publication.brevo_campaign_id
    ) {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          message:
            "Un brouillon Brevo existe déjà pour cette newsletter.",
          brevo_campaign_id:
            publication.brevo_campaign_id,
          publication,
        },
        {
          status: 200,
        }
      );
    }

    if (
      !publication.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu de la newsletter est vide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !publication.subject?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "L'objet de l'email est vide.",
        },
        {
          status: 400,
        }
      );
    }

    const campaignName =
      publication.title?.trim() ||
      publication.subject.trim();

    const htmlContent =
      buildHtmlContent(
        publication.content,
        publication.link_url
      );

    const payload = {
      name: campaignName,

      subject:
        publication.subject,

      previewText:
        publication.preview_text ||
        undefined,

      sender: {
        id: BREVO_SENDER_ID,
      },

      recipients: {
        listIds: [
          BREVO_LIST_ID,
        ],
      },

      htmlContent,
    };

    const response = await fetch(
      "https://api.brevo.com/v3/emailCampaigns",
      {
        method: "POST",
        headers: {
          accept:
            "application/json",
          "api-key": apiKey,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload
        ),
        cache: "no-store",
      }
    );

    const rawResponse =
      await response.text();

    let data: unknown = null;

    try {
      data = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch {
      data = rawResponse;
    }

    if (!response.ok) {
      console.error(
        "Brevo campaign creation failed",
        {
          status:
            response.status,
          data,
          payload,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Brevo a refusé la création de la campagne.",
          status:
            response.status,
          details: data,
        },
        {
          status:
            response.status,
        }
      );
    }

    const campaignData =
      data as {
        id?: number;
      } | null;

    const campaignId =
      campaignData?.id ?? null;

    if (!campaignId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brevo a créé la campagne mais n'a retourné aucun identifiant.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        brevo_campaign_id:
          campaignId,
        brevo_send_approved_at:
          null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le brouillon Brevo a été créé mais LBMedia Office n'a pas pu enregistrer son identifiant.",
          error:
            updateError.message,
          brevo_campaign_id:
            campaignId,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      message:
        "Brouillon de campagne Brevo créé.",
      brevo_campaign_id:
        campaignId,
      brevo_list_id:
        BREVO_LIST_ID,
      brevo_sender_id:
        BREVO_SENDER_ID,
      publication:
        updatedPublication,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de créer le brouillon Brevo.",
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

function buildHtmlContent(
  content: string,
  linkUrl: string | null
) {
  const paragraphs = content
    .split("\n")
    .map((paragraph) =>
      paragraph.trim()
    )
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;">${escapeHtml(
          paragraph
        )}</p>`
    )
    .join("");

  const link =
    linkUrl?.trim()
      ? `
        <p style="margin:28px 0 0;">
          <a
            href="${escapeHtml(
              linkUrl
            )}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#111827;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:600;
            "
          >
            En savoir plus
          </a>
        </p>
      `
      : "";

  return `
    <div
      style="
        max-width:640px;
        margin:0 auto;
        padding:24px;
        font-family:Arial,sans-serif;
        font-size:16px;
        line-height:1.6;
        color:#111827;
      "
    >
      ${paragraphs}
      ${link}
    </div>
  `;
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}