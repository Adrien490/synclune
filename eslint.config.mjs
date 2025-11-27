const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "app/generated/**",
      "**/*.generated.{js,ts,jsx,tsx}",
      "**/prisma/migrations/**",
      "**/.next/**",
      "**/out/**",
    ],
  },
];

export default eslintConfig;
