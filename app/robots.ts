import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything behind a session (see `proxy.ts` matcher) or that's an API is
// kept out of the index — crawlers would only ever see the /login redirect.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin", "/panel", "/cuenta", "/soporte", "/calificar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
