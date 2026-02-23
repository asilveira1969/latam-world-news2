/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "static.dw.com" },
      { protocol: "https", hostname: "media.france24.com" },
      { protocol: "https", hostname: "img.rt.com" },
      { protocol: "https", hostname: "actualidad.rt.com" },
      { protocol: "https", hostname: "mfes.b37m.ru" },
      { protocol: "https", hostname: "lopezdoriga.com" },
      { protocol: "https", hostname: "lapatilla.com" },
      { protocol: "https", hostname: "pudahuel.cl" },
      { protocol: "https", hostname: "www.pudahuel.cl" },
      { protocol: "https", hostname: "spanish.news-pravda.com" },
      { protocol: "https", hostname: "infobae.com" },
      { protocol: "https", hostname: "www.infobae.com" }
    ]
  }
};

export default nextConfig;
