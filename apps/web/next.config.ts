import { validateWebEnvironment } from '@incidentlens/config';
import type { NextConfig } from 'next';

validateWebEnvironment(process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
