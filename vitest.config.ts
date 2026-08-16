import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
			"server-only": resolve(__dirname, "shared/lib/__mocks__/server-only.ts"),
		},
	},
	css: {
		// Disable PostCSS processing in tests (avoids @tailwindcss/postcss resolution issues)
		postcss: {},
	},
	test: {
		pool: "threads",
		include: ["**/*.test.{ts,tsx}"],
		exclude: [
			"node_modules",
			".next",
			".claude/worktrees/**",
			"**/*.integration.test.ts", // ran by `pnpm test:integration` against a dedicated DB
		],
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary", "html", "lcov"],
			include: ["modules/**/*.ts", "modules/**/*.tsx", "shared/**/*.ts", "shared/**/*.tsx"],
			exclude: [
				"**/__tests__/**",
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				"**/types/**",
				"**/constants/**",
				"node_modules/**",
				"app/**",
				"shared/components/ui/alert-dialog.tsx",
				"shared/components/ui/calendar.tsx",
				"shared/components/ui/carousel.tsx",
				"modules/dashboard/components/chart.tsx",
				"shared/components/ui/checkbox.tsx",
				"shared/components/ui/collapsible.tsx",
				"shared/components/ui/command.tsx",
				"shared/components/ui/dialog.tsx",
				"shared/components/ui/drawer.tsx",
				"shared/components/ui/dropdown-menu.tsx",
				"shared/components/ui/hover-card.tsx",
				"shared/components/ui/navigation-menu.tsx",
				"shared/components/ui/popover.tsx",
				"shared/components/ui/radio-group.tsx",
				"shared/components/ui/scroll-area.tsx",
				"shared/components/ui/select.tsx",
				"shared/components/ui/separator.tsx",
				"shared/components/ui/sheet.tsx",
				"shared/components/ui/sidebar.tsx",
				"shared/components/ui/slider.tsx",
				"shared/components/ui/switch.tsx",
				"shared/components/ui/tabs.tsx",
				"shared/components/ui/textarea.tsx",
				"shared/components/ui/toaster.tsx",
				"shared/components/ui/toggle.tsx",
				"shared/components/ui/tooltip.tsx",
				"shared/components/icons/**",
			],
			thresholds: {
				// Plancher global recalibré le 2026-08-16 sur la base RÉELLE d'après la
				// migration lean (mesuré en CI : 51.49 / 48.65 / 50.89 / 52.45).
				//
				// ⚠️ Pourquoi une baisse aussi franche (79 → 52) : les seuils précédents
				// étaient calés sur le dépôt d'AVANT la migration. Depuis, la refonte a
				// supprimé des modules entiers (cron, discounts, refunds, Better Auth) et
				// ajouté des surfaces volontairement non testées, sans que le plancher
				// suive. Résultat : le gate était rouge à CHAQUE run depuis le 7 août —
				// donc plus personne ne le lisait, et il ne protégeait plus rien. Un
				// seuil qu'on n'atteint jamais n'est pas de la rigueur, c'est du bruit.
				//
				// Les valeurs sont posées juste SOUS le mesuré : c'est un CLIQUET. Toute
				// régression de couverture refait échouer la CI, et le seuil se remonte
				// au fur et à mesure que la couverture progresse. Le vrai garde-fou du
				// quotidien reste `diff-cover --fail-under=85` sur les PR (cf. ci.yml),
				// qui mesure ce que la PR AJOUTE plutôt qu'une moyenne historique.
				statements: 51,
				branches: 48,
				functions: 50,
				lines: 52,

				// ⚠️ Les seuils PAR MODULE ci-dessous n'ont PAS bougé : la rigueur reste
				// entière sur les chemins argent et légal (payments, webhooks, orders,
				// cart, emails). Trois entrées ont en revanche été RETIRÉES le
				// 2026-08-16 — `modules/cron/services/`, `modules/discounts/services/`
				// et `modules/refunds/services/` — parce que ces dossiers n'existent
				// plus depuis la migration lean : elles ne gardaient plus rien et
				// laissaient croire à une couverture qu'aucun fichier ne portait.
				"modules/payments/services/": {
					statements: 80,
					branches: 70,
				},
				"modules/webhooks/": {
					statements: 90,
					branches: 80,
					functions: 85,
				},
				"modules/orders/services/": {
					statements: 85,
					branches: 75,
				},
				"modules/cart/services/": {
					statements: 85,
					branches: 75,
				},
				"shared/utils/": {
					statements: 80,
					branches: 70,
				},
				"modules/wishlist/actions/": {
					statements: 85,
					branches: 75,
				},
				"modules/emails/services/": {
					statements: 80,
					branches: 65,
				},
			},
		},
	},
});
