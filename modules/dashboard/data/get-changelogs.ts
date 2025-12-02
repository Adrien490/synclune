import fs from "fs";
import path from "path";
import { cacheChangelogs } from "@/modules/dashboard/constants/cache";
import { isPathSafe } from "@/shared/lib/file-utils";

/**
 * Configuration pour le système de changelog MDX
 */
const CHANGELOG_CONFIG = {
	/** Chemin relatif vers le dossier contenant les fichiers MDX */
	CONTENT_PATH: "modules/dashboard/components/changelog-dialog/_content",

	/** Messages d'erreur */
	ERRORS: {
		NO_CONTENT_DIRECTORY: "Changelog content directory not found:",
		INVALID_METADATA: "Invalid metadata structure",
		MISSING_REQUIRED_FIELD: "Missing required metadata field",
	},
} as const;

/**
 * Définition des champs de metadata
 */
const METADATA_FIELDS = {
	/** Champs obligatoires pour chaque changelog */
	REQUIRED: ["version", "date", "description"] as const,
} as const;

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
 * Récupère tous les changelogs avec leurs métadonnées
 * @returns Liste des changelogs triés par version décroissante
 */
export async function getChangelogs(): Promise<ChangelogData[]> {
	"use cache: remote";
	cacheChangelogs();
	const contentDirectory = path.join(process.cwd(), CHANGELOG_CONFIG.CONTENT_PATH);

	// Vérifier si le dossier existe
	if (!fs.existsSync(contentDirectory)) {
		return [];
	}

	const filenames = fs
		.readdirSync(contentDirectory)
		.filter((f) => {
			// Filtrer uniquement les fichiers .mdx
			if (!f.endsWith(".mdx")) return false;

			// Validation path traversal : verifier que le fichier est bien dans le dossier
			const filePath = path.join(contentDirectory, f);
			return isPathSafe(filePath, contentDirectory);
		});

	const changelogs = await Promise.all(
		filenames.map(async (filename) => {
			const slug = filename.replace(/\.mdx$/, "");

			// Validation du slug (format semver avec support des pre-releases)
			// Formats acceptés : vX.Y.Z, vX.Y.Z-beta, vX.Y.Z-rc.1, vX.Y.Z-alpha.2
			if (!/^v\d+\.\d+\.\d+(-[a-z]+(\.\d+)?)?$/.test(slug)) {
				return null;
			}

			try {
				// Import dynamique du fichier MDX (métadonnées uniquement)
				const mdxModule = (await import(
					`@/modules/dashboard/components/changelog-dialog/_content/${slug}.mdx`
				)) as { metadata: ChangelogMetadata };

				const { metadata } = mdxModule;

				// Validation de la structure des métadonnées
				if (!metadata || typeof metadata !== "object") {
					throw new Error(
						`${CHANGELOG_CONFIG.ERRORS.INVALID_METADATA} for ${slug}`
					);
				}

				// Vérifier les champs requis
				for (const field of METADATA_FIELDS.REQUIRED) {
					if (!metadata[field]) {
						throw new Error(
							`${CHANGELOG_CONFIG.ERRORS.MISSING_REQUIRED_FIELD} "${field}" for ${slug}`
						);
					}
				}

				// Validation du format de date ISO (YYYY-MM-DD)
				const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
				if (!dateRegex.test(metadata.date)) {
					throw new Error(
						`Invalid date format for ${slug}: "${metadata.date}" (expected YYYY-MM-DD)`
					);
				}

				// Vérifier que la date est valide (pas 2025-13-45)
				// UTC explicite pour éviter les problèmes de timezone
				const parsedDate = new Date(metadata.date + "T00:00:00Z");
				if (isNaN(parsedDate.getTime())) {
					throw new Error(
						`Invalid date value for ${slug}: "${metadata.date}"`
					);
				}

				return {
					metadata: {
						version: metadata.version,
						date: metadata.date,
						description: metadata.description,
					},
					slug,
				};
			} catch (error) {
				// En développement, lever l'erreur pour faciliter le debug
				if (process.env.NODE_ENV === "development") {
					throw error;
				}

				return null;
			}
		})
	);

	// Filtrer les changelogs null et trier par version décroissante (semver)
	const validChangelogs = changelogs.filter(
		(changelog) => changelog !== null
	) as ChangelogData[];

	// Fonction de comparaison optimisée pour semver
	const compareVersions = (a: ChangelogData, b: ChangelogData): number => {
		const [aMajor, aMinor, aPatch] = a.metadata.version.split(".").map(Number);
		const [bMajor, bMinor, bPatch] = b.metadata.version.split(".").map(Number);

		// Comparer major, puis minor, puis patch (version décroissante)
		return (bMajor - aMajor) || (bMinor - aMinor) || (bPatch - aPatch);
	};

	return validChangelogs.sort(compareVersions);
}
