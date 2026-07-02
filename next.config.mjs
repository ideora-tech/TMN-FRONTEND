import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // diperlukan untuk Docker multi-stage build
};

export default withNextIntl(nextConfig);
