/**
 * Changelog Dialog - Exports publics
 *
 * Système de changelog basé sur MDX avec Server Components Next.js 16
 */

// Composants
export { ChangelogDialog } from "./changelog-dialog";
export { ChangelogDialogSkeleton } from "./changelog-dialog-skeleton";

// Fonctions serveur
export {
	getChangelogByVersion,
	getChangelogs,
	getLatestChangelog,
} from "@/modules/dashboard/data/get-changelogs";

// Types
export type { ChangelogData, ChangelogMetadata } from "@/modules/dashboard/data/get-changelogs";
export type { ChangelogWithContent, MDXModule } from "./_types";

// Constantes
export { CHANGELOG_UI_CONFIG, RECENT_RELEASE_DAYS } from "./_constants";

// Cache helpers (re-export depuis le module dashboard)
export {
	cacheChangelogs,
	CHANGELOG_CACHE_TAGS,
	getChangelogInvalidationTags,
} from "@/modules/dashboard/constants/cache";
