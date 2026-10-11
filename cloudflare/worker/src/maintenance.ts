import normalWorker from "./index";

// Temporary entrypoint only: preserve bindings/secrets, delegate public reads.
export default {
  async fetch(...args: Parameters<typeof normalWorker.fetch>): Promise<Response> {
    const [request] = args;
    const path = new URL(request.url).pathname;
    if (request.method === "GET" &&
        (path === "/health" || path === "/articles" || path.startsWith("/articles/"))) {
      return normalWorker.fetch(...args);
    }
    return Response.json({ error: "Editorial maintenance. Writes temporarily disabled." }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  },
  async scheduled(..._args: Parameters<typeof normalWorker.scheduled>): Promise<void> {
    // Deliberately ignore even a delayed cron delivery. No DB or waitUntil access.
  },
};
