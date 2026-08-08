import { NextResponse } from "next/server";

export async function GET() {
  const pageId =
    process.env.META_PAGE_ID;

  const accessToken =
    process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La configuration Meta est incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v26.0/${pageId}?fields=id,name&access_token=${encodeURIComponent(
        accessToken
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Meta a refusé la connexion.",
          status: response.status,
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      page: {
        id: data.id ?? null,
        name: data.name ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de contacter Meta.",
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