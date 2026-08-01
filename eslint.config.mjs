import nextConfig from "eslint-config-next";
import localPlugin from "./eslint-plugin-local/index.mjs";

const eslintConfig = [
	{
		ignores: [
			"node_modules/**",
			".next/**",
			"out/**",
			"build/**",
			"dist/**",
			"coverage/**",
			"scripts/**",
			"next-env.d.ts",
			"app/generated/**",
			"**/*.generated.{js,ts,jsx,tsx}",
			"**/prisma/migrations/**",
			"public/sw*",
			"public/swe-worker*",
			"eslint-plugin-local/**",
			".claude/worktrees/**",
		],
	},
	...nextConfig,
	{
		files: ["**/*.{js,jsx,mjs,ts,tsx}"],
		rules: {
			// jsx-a11y rules — critical rules as errors, nuanced rules as warnings
			"jsx-a11y/anchor-has-content": "error",
			"jsx-a11y/anchor-is-valid": "warn",
			"jsx-a11y/aria-activedescendant-has-tabindex": "warn",
			"jsx-a11y/aria-role": "error",
			"jsx-a11y/autocomplete-valid": "warn",
			"jsx-a11y/click-events-have-key-events": "warn",
			"jsx-a11y/heading-has-content": "error",
			"jsx-a11y/html-has-lang": "error",
			"jsx-a11y/iframe-has-title": "warn",
			"jsx-a11y/img-redundant-alt": "warn",
			"jsx-a11y/interactive-supports-focus": "warn",
			"jsx-a11y/label-has-associated-control": "error",
			"jsx-a11y/media-has-caption": "warn",
			"jsx-a11y/mouse-events-have-key-events": "warn",
			"jsx-a11y/no-access-key": "warn",
			"jsx-a11y/no-autofocus": "error",
			"jsx-a11y/no-distracting-elements": "warn",
			"jsx-a11y/no-interactive-element-to-noninteractive-role": "warn",
			"jsx-a11y/no-noninteractive-element-interactions": "warn",
			"jsx-a11y/no-noninteractive-element-to-interactive-role": "warn",
			"jsx-a11y/no-noninteractive-tabindex": "warn",
			"jsx-a11y/no-redundant-roles": "warn",
			"jsx-a11y/no-static-element-interactions": "warn",
			"jsx-a11y/scope": "warn",
			"jsx-a11y/tabindex-no-positive": "error",

			"prefer-const": "warn",
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"react/no-unescaped-entities": "off",
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "sonner",
							importNames: ["toast"],
							message:
								"Utilise `import { toast } from '@/shared/utils/toast'` pour bénéficier du haptic et de la sanitisation.",
						},
					],
				},
			],
		},
	},
	{
		files: [
			"shared/utils/toast.ts",
			"shared/components/ui/toaster.tsx",
			"**/__tests__/**",
			"**/*.test.{ts,tsx}",
		],
		rules: {
			"no-restricted-imports": "off",
		},
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unnecessary-condition": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
		},
	},
	{
		files: [
			"prisma/**/*.ts",
			"instrumentation.ts",
			"instrumentation-client.ts",
			"shared/lib/env.ts",
		],
		rules: {
			"no-console": "off",
		},
	},
	{
		files: ["e2e/**/*.ts"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
			"no-console": "off",
		},
	},
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { local: localPlugin },
		rules: {
			"local/require-cache-life": "error",
			"local/no-update-tag-outside-server-action": "error",
		},
	},
	{
		// `shared/lib/cache.ts` est le SEUL fichier autorisé à importer `updateTag`
		// hors `"use server"` : c'est lui qui expose `updateTagsAfterMutation`, dont
		// le nom porte la contrainte « Server Actions uniquement ».
		files: ["shared/lib/cache.ts"],
		rules: {
			"local/no-update-tag-outside-server-action": "off",
		},
	},
	{
		files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
		rules: {
			"local/require-cache-life": "off",
			// Les tests mockent `next/cache` : `updateTag` y est un `vi.fn()`, pas
			// l'implémentation Next. C'est précisément l'angle mort qui a laissé
			// passer le bug — d'où le test de contrat SANS mock qui, lui, exerce la
			// vraie implémentation (`test/contract/cache-invalidation-context.contract.test.ts`).
			"local/no-update-tag-outside-server-action": "off",
		},
	},
	{
		files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-return": "off",
		},
	},
	{
		files: ["test/factories.ts", "**/__tests__/**"],
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
	{
		// shadcn/ui primitives re-export sub-parts (SidebarRail, PopoverAnchor, etc.) as
		// public API; schema/type files export `z.infer` aliases likewise. Currently-unused
		// names stay part of the module surface.
		files: [
			"shared/components/ui/**/*.{ts,tsx}",
			"shared/schemas/**/*.{ts,tsx}",
			"shared/types/**/*.{ts,tsx}",
			"modules/**/schemas/**/*.{ts,tsx}",
			"modules/**/types/**/*.{ts,tsx}",
			"modules/**/constants/**/*.{ts,tsx}",
		],
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
];

export default eslintConfig;
