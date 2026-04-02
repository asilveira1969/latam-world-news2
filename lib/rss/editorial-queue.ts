type PendingEditorialRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string | null;
  source_name: string;
  source_url: string;
  region: "Mundo" | "LatAm" | "EE.UU." | "Europa" | "Asia" | "Medio Oriente" | "UY" | "AR" | "BR" | "MX" | "CL";
  category: string;
  tags: string[] | null;
  published_at: string;
};

function publishedTime(row: Pick<PendingEditorialRow, "published_at">): number {
  return new Date(row.published_at).getTime();
}

export async function loadPendingRssEditorialRows(
  supabase: any,
  input?: {
    totalLimit?: number;
    perSourceLimit?: number;
    fetchMultiplier?: number;
  }
): Promise<PendingEditorialRow[]> {
  const totalLimit = Math.max(1, input?.totalLimit ?? 30);
  const perSourceLimit = Math.max(1, input?.perSourceLimit ?? 8);
  const fetchLimit = Math.max(totalLimit, totalLimit * Math.max(2, input?.fetchMultiplier ?? 4));

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, content, source_name, source_url, region, category, tags, published_at")
    .eq("source_type", "rss")
    .or("editorial_status.is.null,editorial_status.eq.pending,editorial_status.eq.failed")
    .order("published_at", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    throw new Error(`Failed to load pending RSS articles: ${error.message}`);
  }

  const groups = new Map<string, PendingEditorialRow[]>();
  for (const row of (data ?? []) as PendingEditorialRow[]) {
    const key = row.source_name || "Fuente desconocida";
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const orderedGroups = [...groups.entries()]
    .map(([sourceName, rows]) => ({
      sourceName,
      rows: rows.sort((a, b) => publishedTime(b) - publishedTime(a))
    }))
    .sort((a, b) => publishedTime(b.rows[0]) - publishedTime(a.rows[0]));

  const selected: PendingEditorialRow[] = [];
  let round = 0;

  while (selected.length < totalLimit) {
    let addedThisRound = 0;

    for (const group of orderedGroups) {
      if (selected.length >= totalLimit) {
        break;
      }
      if (round >= perSourceLimit || round >= group.rows.length) {
        continue;
      }
      selected.push(group.rows[round]);
      addedThisRound += 1;
    }

    if (addedThisRound === 0) {
      break;
    }

    round += 1;
  }

  return selected;
}
