import { validateWebEnvironment } from '@incidentlens/config';
import type { NextConfig } from 'next';

validateWebEnvironment(process.env);

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
