import type { ComponentType } from "react";
import type { ChangelogMetadata } from "@/modules/dashboard/data/get-changelogs";

// Re-export pour compatibilité
export type { ChangelogData, ChangelogMetadata } from "@/modules/dashboard/data/get-changelogs";

/**
 * Module MDX exporté par les fichiers de changelog
 */
export interface MDXModule {
	/** Composant React par défaut (contenu MDX) */
	default: ComponentType;

	/** Métadonnées exportées du fichier MDX */
	metadata: ChangelogMetadata;
}

/**
 * Changelog avec son contenu MDX chargé
 * Utilisé après le Promise.all dans ChangelogDialog
 */
export interface ChangelogWithContent {
	/** Métadonnées de la version */
	metadata: ChangelogMetadata;

	/** Slug du fichier (version sans .mdx) */
	slug: string;

	/** Composant React du contenu MDX */
	Content: ComponentType;

	/** Indique si la release est récente (< RECENT_RELEASE_DAYS jours) */
	isRecent: boolean;
}
