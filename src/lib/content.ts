import { getCollection, type CollectionEntry } from "astro:content";

export type PageTemplate = CollectionEntry<"pages">["data"]["template"];

export async function getPageByTemplate(template: PageTemplate) {
  const pages = await getCollection("pages");
  const page = pages.find((entry) => entry.data.template === template);

  if (!page) {
    throw new Error(`Missing page content for template: ${template}`);
  }

  return page;
}

export async function getDonationPage() {
  const pages = await getCollection("donate");
  const page = pages[0];

  if (!page) {
    throw new Error("Missing donation page content.");
  }

  return page;
}

export async function getSortedProjects() {
  const projects = await getCollection("projects");
  return projects.sort(
    (left, right) => left.data.sortOrder - right.data.sortOrder,
  );
}

export async function getSortedDailyUpdates() {
  const updates = await getCollection("dailyUpdates");
  return updates.sort((left, right) =>
    right.data.date.localeCompare(left.data.date),
  );
}

export function groupDailyUpdatesByDate(
  updates: CollectionEntry<"dailyUpdates">[],
) {
  return updates.reduce<Record<string, CollectionEntry<"dailyUpdates">[]>>(
    (groups, update) => {
      groups[update.data.date] ??= [];
      groups[update.data.date].push(update);
      return groups;
    },
    {},
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
