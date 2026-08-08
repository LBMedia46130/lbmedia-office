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
      "https://api.brevo.com/v3/senders",
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
            "Impossible de récupérer les expéditeurs Brevo.",
          status: response.status,
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    const senders = Array.isArray(
      data.senders
    )
      ? data.senders.map(
          (sender: {
            id: number;
            name: string;
            email: string;
            active?: boolean;
          }) => ({
            id: sender.id,
            name: sender.name,
            email: sender.email,
            active:
              sender.active ?? null,
          })
        )
      : [];

    return NextResponse.json({
      success: true,
      senders,
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