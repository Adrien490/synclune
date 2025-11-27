import type { ComponentType } from "react";

/**
 * Métadonnées d'un changelog
 */
export interface ChangelogMetadata {
	/** Version sémantique (ex: "1.0.0") */
	version: string;

	/** Date de release au format ISO (ex: "2025-01-15") */
	date: string;

	/** Description courte de la version */
	description: string;
}

/**
 * Données d'un changelog (métadonnées uniquement)
 * Le contenu MDX est chargé séparément via ChangelogContent
 */
export interface ChangelogData {
	/** Métadonnées de la version */
	metadata: ChangelogMetadata;

	/** Slug du fichier (version sans .mdx) */
	slug: string;
}

/**
 * Module MDX exporté par les fichiers de changelog
 */
export interface MDXModule {
	/** Composant React par défaut (contenu MDX) */
	default: ComponentType;

	/** Métadonnées exportées du fichier MDX */
	metadata: ChangelogMetadata;
}
