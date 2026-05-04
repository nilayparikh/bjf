import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const imagePathSchema = z.string().startsWith("/images/");

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/pages" }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    template: z.enum([
      "home",
      "daily",
      "media",
      "projects",
      "social",
      "contact",
    ]),
    summary: z.string().min(1),
    eyebrow: z.string().optional(),
    heroImage: imagePathSchema.optional(),
    heroAlt: z.string().optional(),
    primaryCta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
    mission: z
      .object({
        eyebrow: z.string().min(1),
        icon: z.string().min(1),
        title: z.string().min(1),
        image: imagePathSchema,
        imageAlt: z.string().min(1),
      })
      .optional(),
    seo: seoSchema,
  }),
});

const dailyUpdates = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/daily-updates" }),
  schema: z.object({
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1),
    icon: z.string().min(1),
    image: imagePathSchema,
    imageAlt: z.string().min(1),
    location: z.string().min(1),
    featured: z.boolean().default(false),
    summary: z.string().min(1),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/projects" }),
  schema: z.object({
    title: z.string().min(1),
    status: z.enum(["planned", "ongoing", "completed"]),
    location: z.string().min(1),
    image: imagePathSchema,
    imageAlt: z.string().min(1),
    ctaLabel: z.string().min(1),
    ctaHref: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
    sortOrder: z.number().int(),
    progress: z.number().int().min(0).max(100).optional(),
    summary: z.string().min(1),
  }),
});

const donate = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/donate" }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    template: z.literal("donate"),
    summary: z.string().min(1),
    heroImage: imagePathSchema.optional(),
    heroAlt: z.string().optional(),
    seo: seoSchema,
  }),
});

export const collections = { pages, dailyUpdates, projects, donate };
