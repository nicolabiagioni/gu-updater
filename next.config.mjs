/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID,
  },
};

export default nextConfig;
