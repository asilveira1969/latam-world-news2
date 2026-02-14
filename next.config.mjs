/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "static.dw.com" },
      { protocol: "https", hostname: "media.france24.com" },
      { protocol: "https", hostname: "img.rt.com" }
    ]
  }
};

export default nextConfig;
