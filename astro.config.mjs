import { defineConfig } from "astro/config";

function normalizeBase(value) {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function getGitHubPagesDefaults() {
  const repository = process.env.GITHUB_REPOSITORY;

  if (!repository) {
    return null;
  }

  const [owner, repositoryName] = repository.split("/");

  if (!owner || !repositoryName) {
    return null;
  }

  const userSiteRepository = `${owner.toLowerCase()}.github.io`;
  const isUserSiteRepository = repositoryName.toLowerCase() === userSiteRepository;

  return {
    site: `https://${owner}.github.io`,
    base: isUserSiteRepository ? "/" : `/${repositoryName}/`,
  };
}

const githubPagesDefaults = getGitHubPagesDefaults();
const site = process.env.SITE_URL ?? githubPagesDefaults?.site ?? "https://example.github.io";
const base = normalizeBase(process.env.BASE_PATH ?? githubPagesDefaults?.base ?? "/");

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
});
