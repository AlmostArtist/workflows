/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The catalogue JSON lives outside the app dir; keep it out of the server bundle trace.
  outputFileTracingIncludes: {
    '/api/**': ['./data/**'],
    '/workflow/**': ['./data/**'],
  },
  experimental: {
    largePageDataBytes: 512 * 1024,
  },
};
export default nextConfig;
