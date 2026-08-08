import { NextResponse } from "next/server";

export async function GET() {
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
    const response = await fetch(
      "https://api.brevo.com/v3/account",
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
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
            "Connexion Brevo refusée.",
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
      account: {
        email:
          data.email ?? null,
        firstName:
          data.firstName ?? null,
        lastName:
          data.lastName ?? null,
        companyName:
          data.companyName ?? null,
        plan:
          data.plan ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de contacter Brevo.",
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