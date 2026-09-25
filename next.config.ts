import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: "export",
      basePath: "/menchat",
      assetPrefix: "/menchat/",
      trailingSlash: true,
    }
  : {};

export default nextConfig;
