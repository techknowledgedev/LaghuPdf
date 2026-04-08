import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/release/**",
      "**/node_modules/**",
      "**/*.d.ts",
    ],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
  })),
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "off",
    },
  },
  {
    // Electron main/preload are CommonJS — allow require()
    files: ["apps/desktop/src/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
