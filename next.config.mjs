/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "www.dw.com" },
      { protocol: "https", hostname: "actualidad.rt.com" },
      { protocol: "https", hostname: "www.france24.com" },
      { protocol: "https", hostname: "feeds.bbci.co.uk" },
      { protocol: "https", hostname: "www.bbc.com" },
      { protocol: "https", hostname: "elpais.com" }
    ]
  }
};

export default nextConfig;
