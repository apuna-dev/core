import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare / OpenNext build output + generated types (not source):
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
  ]),
  {
    // T3 (theme guardrail): ban arbitrary COLOR values in className utilities
    // (text/bg/border/from/via/to/ring/…-[#hex] or [rgb()/hsl()]). Those bypass the
    // light/dark token system and silently break one mode — the exact regression that
    // made the site ship unreadable on light. Use the slate/cyan/indigo scales or a
    // `dark:` variant. (box-shadow `shadow-[…rgba()]` is allowed, but make it mode-aware.)
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(?:text|bg|border|from|via|to|ring|fill|stroke|outline|decoration|divide|placeholder|caret|accent)-\\[[^\\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()/]",
          message:
            "No arbitrary color values in className — use the themeable token scales (slate/cyan/indigo, bg-*, text-*) or a `dark:` variant so light + dark stay correct.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:text|bg|border|from|via|to|ring|fill|stroke|outline|decoration|divide|placeholder|caret|accent)-\\[[^\\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()/]",
          message:
            "No arbitrary color values in className — use the themeable token scales or a `dark:` variant so light + dark stay correct.",
        },
      ],
    },
  },
]);

export default eslintConfig;
