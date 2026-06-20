/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hardware-csp/shared-types'],
};

module.exports = nextConfig;
