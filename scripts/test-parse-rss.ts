import assert from "node:assert/strict";
import { parseRss } from "@/lib/rss/parse-rss";

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <item>
      <title>RSS item</title>
      <link>https://example.com/rss-item</link>
      <pubDate>Sat, 07 Mar 2026 10:00:00 GMT</pubDate>
      <description>Descripcion RSS</description>
      <media:thumbnail url="https://example.com/thumb.jpg" />
      <category>Tecnologia</category>
    </item>
  </channel>
</rss>`;

const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom item</title>
    <link rel="self" href="https://example.com/feed-entry" />
    <link rel="alternate" href="https://example.com/atom-item" />
    <updated>2026-03-07T10:00:00Z</updated>
    <summary>Resumen Atom</summary>
    <category term="Economia" />
  </entry>
</feed>`;

const [rssItem] = parseRss(rssXml);
assert.equal(rssItem?.title, "RSS item");
assert.equal(rssItem?.imageUrl, "https://example.com/thumb.jpg");
assert.deepEqual(rssItem?.categories, ["Tecnologia"]);

const [atomItem] = parseRss(atomXml);
assert.equal(atomItem?.title, "Atom item");
assert.equal(atomItem?.link, "https://example.com/atom-item");
assert.deepEqual(atomItem?.categories, ["Economia"]);

console.log("parse-rss OK");
