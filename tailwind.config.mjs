import fs from "node:fs";

const theme = JSON.parse(
  fs.readFileSync(new URL("./data/theme.json", import.meta.url), "utf8"),
);

export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: theme.colors,
      borderRadius: theme.rounded,
      spacing: theme.spacing,
      maxWidth: {
        "container-max": theme.spacing["container-max"],
      },
      fontFamily: {
        "headline-lg": ["Noto Serif", "serif"],
        "headline-md": ["Noto Serif", "serif"],
        "headline-sm": ["Noto Serif", "serif"],
        "body-lg": ["Manrope", "sans-serif"],
        "body-md": ["Manrope", "sans-serif"],
        "label-md": ["Manrope", "sans-serif"],
        heading: ["Noto Serif", "serif"],
        body: ["Manrope", "sans-serif"],
      },
      fontSize: Object.fromEntries(
        Object.entries(theme.typography).map(([key, value]) => [
          key,
          [
            value.fontSize,
            {
              lineHeight: value.lineHeight,
              fontWeight: value.fontWeight,
              letterSpacing: value.letterSpacing ?? "0",
            },
          ],
        ]),
      ),
      boxShadow: theme.shadows,
    },
  },
  plugins: [],
};
