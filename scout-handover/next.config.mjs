/** @type {import('next').NextConfig} */
export default {
  images: {
    // Source images are hot-linked from the page they were published on.
    remotePatterns: [{ protocol: "https", hostname: "**" }]
  }
};
