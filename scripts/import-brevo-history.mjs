const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const BREVO_API_KEY =
  process.env.BREVO_API_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL est manquante."
  );
}

if (!SUPABASE_SECRET_KEY) {
  throw new Error(
    "SUPABASE_SECRET_KEY est manquante."
  );
}

if (!BREVO_API_KEY) {
  throw new Error(
    "BREVO_API_KEY est manquante."
  );
}

const BREVO_API =
  "https://api.brevo.com/v3";

function decodeHtml(value = "") {
  const namedEntities = {
    amp: "&",
    apos: "'",
    quot: '"',
    lt: "<",
    gt: ">",
    nbsp: " ",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    ndash: "–",
    mdash: "—",
  };

  return value
    .replace(
      /&([a-zA-Z]+);/g,
      (
        match,
        entity
      ) =>
        namedEntities[
          entity.toLowerCase()
        ] ?? match
    )
    .replace(
      /&#(\d+);/g,
      (
        match,
        code
      ) => {
        const number =
          Number(code);

        try {
          return String.fromCodePoint(
            number
          );
        } catch {
          return match;
        }
      }
    )
    .replace(
      /&#x([0-9a-fA-F]+);/g,
      (
        match,
        code
      ) => {
        const number =
          Number.parseInt(
            code,
            16
          );

        try {
          return String.fromCodePoint(
            number
          );
        } catch {
          return match;
        }
      }
    );
}

function stripHtml(value = "") {
  return decodeHtml(
    value
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
  )
    .replace(/\s+/g, " ")
    .trim();
}

function getCutoffDate() {
  const date =
    new Date();

  date.setUTCFullYear(
    date.getUTCFullYear() - 1
  );

  return date;
}

async function brevoFetch(
  path
) {
  const response =
    await fetch(
      `${BREVO_API}${path}`,
      {
        headers: {
          accept:
            "application/json",
          "api-key":
            BREVO_API_KEY,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Brevo HTTP ${response.status} : ${await response.text()}`
    );
  }

  return response.json();
}

async function fetchCampaigns() {
  const campaigns = [];

  let offset = 0;

  const limit = 50;

  while (true) {
    const data =
      await brevoFetch(
        `/emailCampaigns?type=classic&status=sent&limit=${limit}&offset=${offset}&sort=desc`
      );

    const batch =
      Array.isArray(
        data.campaigns
      )
        ? data.campaigns
        : [];

    campaigns.push(
      ...batch
    );

    if (
      batch.length <
      limit
    ) {
      break;
    }

    offset += limit;
  }

  return campaigns;
}

async function fetchCampaignDetails(
  campaignId
) {
  return brevoFetch(
    `/emailCampaigns/${campaignId}`
  );
}

function getCampaignDate(
  campaign
) {
  if (
    !campaign.sentDate
  ) {
    return null;
  }

  const date =
    new Date(
      campaign.sentDate
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function prepareHistoryRow(
  campaign,
  details
) {
  const name =
    stripHtml(
      campaign.name ??
        ""
    );

  const subject =
    stripHtml(
      campaign.subject ??
        details?.subject ??
        ""
    );

  const title =
    subject ||
    name ||
    `Newsletter Brevo ${campaign.id}`;

  const htmlContent =
    details?.htmlContent ??
    "";

  const plainContent =
    details?.plaintextContent ??
    "";

  const cleanContent =
    stripHtml(
      htmlContent
    ) ||
    stripHtml(
      plainContent
    );

  const summaryParts = [];

  if (
    name &&
    name !== title
  ) {
    summaryParts.push(
      `Nom de campagne : ${name}.`
    );
  }

  if (cleanContent) {
    summaryParts.push(
      cleanContent
    );
  } else if (subject) {
    summaryParts.push(
      subject
    );
  }

  const summary =
    summaryParts
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);

  const sentDate =
    getCampaignDate(
      campaign
    );

  return {
    published_at:
      sentDate
        ? sentDate.toISOString()
        : null,

    channel:
      "brevo",

    title,

    summary:
      summary || null,

    source_url:
      `brevo://campaign/${campaign.id}`,
  };
}

async function importRow(
  row
) {
  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/editorial_history?on_conflict=source_url`,
      {
        method:
          "POST",

        headers: {
          apikey:
            SUPABASE_SECRET_KEY,

          Authorization:
            `Bearer ${SUPABASE_SECRET_KEY}`,

          "Content-Type":
            "application/json",

          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },

        body:
          JSON.stringify(
            row
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Supabase HTTP ${response.status} : ${await response.text()}`
    );
  }
}

async function main() {
  console.log(
    "Récupération de l’historique Brevo LBMedia..."
  );

  const cutoff =
    getCutoffDate();

  const campaigns =
    await fetchCampaigns();

  const recentCampaigns =
    campaigns.filter(
      (campaign) => {
        const date =
          getCampaignDate(
            campaign
          );

        return (
          date &&
          date >= cutoff
        );
      }
    );

  console.log(
    `${recentCampaigns.length} campagne(s) envoyée(s) sur les 12 derniers mois.`
  );

  if (
    recentCampaigns.length ===
    0
  ) {
    console.log(
      "Aucune campagne à importer."
    );

    return;
  }

  let imported = 0;
  let ignored = 0;

  for (
    const campaign of
    recentCampaigns
  ) {
    try {
      const details =
        await fetchCampaignDetails(
          campaign.id
        );

      const row =
        prepareHistoryRow(
          campaign,
          details
        );

      await importRow(
        row
      );

      imported += 1;

      console.log(
        `✓ ${row.title}`
      );
    } catch (error) {
      ignored += 1;

      console.log(
        `- Campagne ${campaign.id} ignorée : ${
          error instanceof Error
            ? error.message
            : "erreur inconnue"
        }`
      );
    }
  }

  console.log("");
  console.log(
    "Import Brevo terminé."
  );

  console.log(
    `Traitées : ${recentCampaigns.length}`
  );

  console.log(
    `Importées / mises à jour : ${imported}`
  );

  console.log(
    `Ignorées : ${ignored}`
  );
}

main().catch(
  (error) => {
    console.error("");

    console.error(
      "Échec de l’import Brevo :"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
);