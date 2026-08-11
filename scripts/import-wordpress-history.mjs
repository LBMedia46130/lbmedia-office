const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const WORDPRESS_URL =
  process.env.WORDPRESS_URL;

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

if (!WORDPRESS_URL) {
  throw new Error(
    "WORDPRESS_URL est manquante."
  );
}

const WORDPRESS_API =
  `${WORDPRESS_URL.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

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
      ) => {
        return (
          namedEntities[
            entity.toLowerCase()
          ] ?? match
        );
      }
    )
    .replace(
      /&#(\d+);/g,
      (
        match,
        code
      ) => {
        const value =
          Number(code);

        if (
          !Number.isFinite(
            value
          )
        ) {
          return match;
        }

        try {
          return String.fromCodePoint(
            value
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
        const value =
          Number.parseInt(
            code,
            16
          );

        if (
          !Number.isFinite(
            value
          )
        ) {
          return match;
        }

        try {
          return String.fromCodePoint(
            value
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

async function fetchWordPressPosts() {
  const cutoff =
    getCutoffDate();

  const posts = [];

  let page = 1;

  while (true) {
    const url =
      new URL(
        WORDPRESS_API
      );

    url.searchParams.set(
      "per_page",
      "100"
    );

    url.searchParams.set(
      "page",
      String(page)
    );

    url.searchParams.set(
      "orderby",
      "date"
    );

    url.searchParams.set(
      "order",
      "desc"
    );

    url.searchParams.set(
      "after",
      cutoff.toISOString()
    );

    url.searchParams.set(
      "_fields",
      [
        "id",
        "date_gmt",
        "link",
        "title",
        "excerpt",
        "content",
      ].join(",")
    );

    const response =
      await fetch(url);

    if (
      response.status === 400 &&
      page > 1
    ) {
      break;
    }

    if (!response.ok) {
      throw new Error(
        `WordPress HTTP ${response.status} : ${await response.text()}`
      );
    }

    const batch =
      await response.json();

    if (
      !Array.isArray(batch) ||
      batch.length === 0
    ) {
      break;
    }

    posts.push(
      ...batch
    );

    const totalPages =
      Number(
        response.headers.get(
          "x-wp-totalpages"
        )
      ) || 1;

    if (
      page >= totalPages
    ) {
      break;
    }

    page += 1;
  }

  return posts;
}

function prepareHistoryRow(
  post
) {
  const title =
    stripHtml(
      post.title?.rendered ??
        ""
    );

  const excerpt =
    stripHtml(
      post.excerpt?.rendered ??
        ""
    );

  const content =
    stripHtml(
      post.content?.rendered ??
        ""
    );

  const summary =
    (
      excerpt ||
      content ||
      title
    ).slice(
      0,
      1200
    );

  const publishedAt =
    post.date_gmt
      ? `${post.date_gmt}Z`
      : null;

  return {
    published_at:
      publishedAt,
    channel:
      "website",
    title,
    summary,
    source_url:
      post.link ?? null,
  };
}

async function importRow(
  row
) {
  if (!row.title) {
    return {
      status:
        "ignored",
      reason:
        "titre vide",
    };
  }

  if (!row.source_url) {
    return {
      status:
        "ignored",
      reason:
        "URL absente",
    };
  }

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

  return {
    status:
      "imported",
  };
}

async function main() {
  console.log(
    "Récupération de l’historique WordPress LBMedia..."
  );

  const posts =
    await fetchWordPressPosts();

  console.log(
    `${posts.length} article(s) trouvé(s) sur les 12 derniers mois.`
  );

  if (
    posts.length === 0
  ) {
    console.log(
      "Aucun article à importer."
    );

    return;
  }

  let imported = 0;
  let ignored = 0;

  for (
    const post of posts
  ) {
    const row =
      prepareHistoryRow(
        post
      );

    const result =
      await importRow(
        row
      );

    if (
      result.status ===
      "imported"
    ) {
      imported += 1;

      console.log(
        `✓ ${row.title}`
      );
    } else {
      ignored += 1;

      console.log(
        `- Ignoré : ${
          row.title ||
          "sans titre"
        } (${result.reason})`
      );
    }
  }

  console.log("");
  console.log(
    "Import WordPress terminé."
  );
  console.log(
    `Traités : ${posts.length}`
  );
  console.log(
    `Importés / mis à jour : ${imported}`
  );
  console.log(
    `Ignorés : ${ignored}`
  );
}

main().catch(
  (error) => {
    console.error("");

    console.error(
      "Échec de l’import WordPress :"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
);