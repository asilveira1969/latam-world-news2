export async function fetchRssFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "LATAMWorldNewsBot/1.0 (+https://localhost)"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS ${url}: ${response.status}`);
  }

  return response.text();
}
