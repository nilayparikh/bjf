import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";

const root = fileURLToPath(new URL("../", import.meta.url));

const imagePath = z.string().startsWith("/images/");
const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});
const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  template: z.enum(["home", "daily", "media", "projects", "social", "contact"]),
  summary: z.string().min(1),
  eyebrow: z.string().optional(),
  heroImage: imagePath.optional(),
  heroAlt: z.string().optional(),
  primaryCta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  mission: z
    .object({
      eyebrow: z.string().min(1),
      icon: z.string().min(1),
      title: z.string().min(1),
      image: imagePath,
      imageAlt: z.string().min(1),
    })
    .optional(),
  seo: seoSchema,
});

const dailySchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1),
  icon: z.string().min(1),
  image: imagePath,
  imageAlt: z.string().min(1),
  location: z.string().min(1),
  featured: z.boolean(),
  summary: z.string().min(1),
});

const projectSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["planned", "ongoing", "completed"]),
  location: z.string().min(1),
  image: imagePath,
  imageAlt: z.string().min(1),
  ctaLabel: z.string().min(1),
  ctaHref: z.string().min(1),
  tags: z.array(z.string().min(1)),
  sortOrder: z.number().int(),
  progress: z.number().int().min(0).max(100).optional(),
  summary: z.string().min(1),
});

const donatePageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  template: z.literal("donate"),
  summary: z.string().min(1),
  heroImage: imagePath.optional(),
  heroAlt: z.string().optional(),
  seo: seoSchema,
});

const navigationSchema = z.array(
  z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    key: z.string().min(1),
  }),
);

const mediaSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    kind: z.enum(["photo", "video"]),
    category: z.string().min(1),
    src: imagePath,
    alt: z.string().min(1),
    featured: z.boolean(),
    span: z.enum(["standard", "wide", "tall", "wide-tall"]),
    source: z.string().min(1),
  }),
);

const donationSchema = z.object({
  methods: z.array(
    z.object({
      type: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      details: z.array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          format: z.literal("monospace").optional(),
        }),
      ),
    }),
  ),
  instructions: z.object({
    title: z.string().min(1),
    icon: z.string().min(1),
    body: z.string().min(1),
  }),
  notices: z.array(
    z.object({
      title: z.string().min(1),
      icon: z.string().min(1),
      tone: z.string().min(1),
      body: z.string().min(1),
    }),
  ),
  impact: z.array(
    z.object({ icon: z.string().min(1), body: z.string().min(1) }),
  ),
  image: imagePath,
  imageAlt: z.string().min(1),
});

const socialMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().min(1),
  alt: z.string().min(1),
});
const socialFeedSchema = z.array(
  z.object({
    id: z.string().min(1),
    provider: z.enum(["facebook", "instagram"]),
    providerPostId: z.string().min(1),
    accountName: z.string().min(1),
    url: z.string().url(),
    publishedAt: z.string().datetime(),
    title: z.string().min(1),
    caption: z.string().min(1),
    media: z.array(socialMediaSchema),
    tags: z.array(z.string().min(1)),
    metrics: z
      .object({ likes: z.number().optional(), shares: z.number().optional() })
      .optional(),
  }),
);

const socialLibrarySchema = z.array(
  z.object({
    id: z.string().min(1),
    provider: z.enum(["facebook", "instagram"]),
    providerPostId: z.string().min(1),
    sourceUrl: z.string().url(),
    publishedAt: z.string().datetime(),
    title: z.string().min(1),
    caption: z.string().min(1),
    kind: z.enum(["photo", "video"]),
    url: z.string().min(1),
    alt: z.string().min(1),
    tags: z.array(z.string().min(1)),
    source: z.string().min(1),
  }),
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function listMarkdownFiles(relativeDir) {
  const dir = path.join(root, relativeDir);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(relativeDir, entry.name));
}

function readFrontmatter(relativePath) {
  const file = fs.readFileSync(path.join(root, relativePath), "utf8");
  return matter(file).data;
}

function assertImageExists(value, source) {
  if (!value || !value.startsWith("/images/")) {
    return;
  }

  const imagePathOnDisk = path.join(root, "public", value.replace(/^\/+/, ""));
  if (!fs.existsSync(imagePathOnDisk)) {
    throw new Error(`${source} references missing image: ${value}`);
  }
}

function validateMarkdownCollection(relativeDir, schema, label) {
  const files = listMarkdownFiles(relativeDir);
  if (files.length === 0) {
    throw new Error(`${label} collection is empty.`);
  }

  return files.map((relativePath) => {
    const parsed = schema.parse(readFrontmatter(relativePath));
    for (const key of ["heroImage", "image"]) {
      assertImageExists(parsed[key], relativePath);
    }
    assertImageExists(parsed.mission?.image, relativePath);
    return { relativePath, data: parsed };
  });
}

function validateLocalMediaUrls(records, source, key = "url") {
  for (const record of records) {
    assertImageExists(record.src, `${source}:${record.id}`);
    assertImageExists(record[key], `${source}:${record.id}`);
    if (Array.isArray(record.media)) {
      for (const media of record.media) {
        assertImageExists(media.url, `${source}:${record.id}`);
      }
    }
  }
}

const pages = validateMarkdownCollection("content/pages", pageSchema, "Pages");
validateMarkdownCollection(
  "content/daily-updates",
  dailySchema,
  "Daily updates",
);
validateMarkdownCollection("content/projects", projectSchema, "Projects");
const donationPages = validateMarkdownCollection(
  "content/donate",
  donatePageSchema,
  "Donation pages",
);

const navigation = navigationSchema.parse(readJson("data/navigation.json"));
const media = mediaSchema.parse(readJson("data/media.json"));
const donation = donationSchema.parse(readJson("data/donation.json"));
const socialFeed = socialFeedSchema.parse(
  readJson("data/generated/social-feed.json"),
);
const socialLibrary = socialLibrarySchema.parse(
  readJson("data/generated/social-library.json"),
);

const routeSet = new Set([
  ...pages.map((page) => page.data.slug),
  ...donationPages.map((page) => page.data.slug),
]);
for (const item of navigation) {
  if (!routeSet.has(item.href)) {
    throw new Error(
      `Navigation link ${item.href} does not point to a generated route.`,
    );
  }
}

validateLocalMediaUrls(media, "data/media.json", "src");
validateLocalMediaUrls(socialFeed, "data/generated/social-feed.json");
validateLocalMediaUrls(socialLibrary, "data/generated/social-library.json");
assertImageExists(donation.image, "data/donation.json");

console.log(
  `Validated ${pages.length} pages, ${media.length} media records, ${socialFeed.length} social feed records, and ${socialLibrary.length} social media records.`,
);
