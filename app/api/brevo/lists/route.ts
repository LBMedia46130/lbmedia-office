import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;

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
      "https://api.brevo.com/v3/contacts/lists?limit=50&offset=0&sort=desc",
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
            "Impossible de récupérer les listes Brevo.",
          status: response.status,
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    const lists = Array.isArray(data.lists)
      ? data.lists.map(
          (list: {
            id: number;
            name: string;
            totalSubscribers?: number;
          }) => ({
            id: list.id,
            name: list.name,
            totalSubscribers:
              list.totalSubscribers ?? 0,
          })
        )
      : [];

    return NextResponse.json({
      success: true,
      lists,
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