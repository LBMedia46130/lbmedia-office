import { NextResponse } from "next/server";

export async function GET() {
  const wordpressUrl =
    process.env.WORDPRESS_URL;

  const username =
    process.env.WORDPRESS_USERNAME;

  const appPassword =
    process.env.WORDPRESS_APP_PASSWORD;

  if (
    !wordpressUrl ||
    !username ||
    !appPassword
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Configuration WordPress incomplète.",
      },
      {
        status: 500,
      }
    );
  }

  const authorization =
    Buffer.from(
      `${username}:${appPassword}`
    ).toString("base64");

  try {
    const response = await fetch(
      `${wordpressUrl}/wp-json/wp/v2/users/me`,
      {
        headers: {
          Authorization: `Basic ${authorization}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Connexion WordPress refusée.",
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
      user: {
        id: data.id,
        name: data.name,
        slug: data.slug,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de contacter WordPress.",
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