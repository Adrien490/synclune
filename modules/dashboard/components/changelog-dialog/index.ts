/**
 * Changelog Dialog - Exports publics
 *
 * Système de changelog basé sur MDX avec Server Components Next.js 16
 */

// Composants

// Fonctions serveur
export {
	getChangelogByVersion,
	getChangelogs,
	getLatestChangelog,
} from "@/modules/dashboard/data/get-changelogs";

// Types
export type { ChangelogData, ChangelogMetadata } from "@/modules/dashboard/data/get-changelogs";
export type { MDXModule } from "./_types";

// Constantes
export {
	CHANGELOG_CONFIG,
	METADATA_FIELDS,
	RECENT_RELEASE_DAYS,
} from "./_constants";
