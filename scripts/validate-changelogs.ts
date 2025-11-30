/**
 * Script de validation des fichiers changelog MDX
 * Vérifie que tous les fichiers ont des métadonnées valides avant le build
 *
 * Usage: pnpm validate:changelogs
 */

import fs from "fs";
import path from "path";

const CONTENT_DIR = "modules/dashboard/components/changelog-dialog/_content";
const SEMVER_REGEX = /^v\d+\.\d+\.\d+(-[a-z]+(\.\d+)?)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface ChangelogMetadata {
	version?: string;
	date?: string;
	description?: string;
}

/**
 * Parse les métadonnées exportées d'un fichier MDX
 * Recherche le pattern: export const metadata = { ... }
 */
function parseMetadataFromMDX(content: string): ChangelogMetadata | null {
	// Recherche le bloc export const metadata = { ... }
	const metadataMatch = content.match(
		/export\s+const\s+metadata\s*=\s*\{([^}]+)\}/s
	);

	if (!metadataMatch) {
		return null;
	}

	const metadataBlock = metadataMatch[1];
	const metadata: ChangelogMetadata = {};

	// Extraire version
	const versionMatch = metadataBlock.match(/version:\s*["']([^"']+)["']/);
	if (versionMatch) {
		metadata.version = versionMatch[1];
	}

	// Extraire date
	const dateMatch = metadataBlock.match(/date:\s*["']([^"']+)["']/);
	if (dateMatch) {
		metadata.date = dateMatch[1];
	}

	// Extraire description
	const descriptionMatch = metadataBlock.match(
		/description:\s*["']([^"']+)["']/
	);
	if (descriptionMatch) {
		metadata.description = descriptionMatch[1];
	}

	return metadata;
}

function validateChangelogs(): void {
	const contentPath = path.join(process.cwd(), CONTENT_DIR);

	// Vérifier que le dossier existe
	if (!fs.existsSync(contentPath)) {
		console.log("Aucun dossier changelog trouvé, validation ignorée.");
		return;
	}

	const files = fs.readdirSync(contentPath).filter((f) => f.endsWith(".mdx"));

	if (files.length === 0) {
		console.log("Aucun fichier changelog trouvé.");
		return;
	}

	const errors: string[] = [];

	for (const file of files) {
		const slug = file.replace(".mdx", "");

		// Valider le nom de fichier (format semver)
		if (!SEMVER_REGEX.test(slug)) {
			errors.push(
				`${file}: Nom de fichier invalide. Format attendu: vX.Y.Z (ex: v1.0.0)`
			);
			continue;
		}

		try {
			// Lire et parser le fichier MDX
			const filePath = path.join(contentPath, file);
			const content = fs.readFileSync(filePath, "utf-8");
			const metadata = parseMetadataFromMDX(content);

			// Vérifier la présence des métadonnées
			if (!metadata) {
				errors.push(
					`${file}: Bloc 'export const metadata = {...}' manquant`
				);
				continue;
			}

			// Vérifier les champs requis
			if (!metadata.version) {
				errors.push(`${file}: Champ 'version' manquant dans metadata`);
			}
			if (!metadata.date) {
				errors.push(`${file}: Champ 'date' manquant dans metadata`);
			}
			if (!metadata.description) {
				errors.push(`${file}: Champ 'description' manquant dans metadata`);
			}

			// Valider le format de la date
			if (metadata.date && !DATE_REGEX.test(metadata.date)) {
				errors.push(
					`${file}: Format de date invalide '${metadata.date}'. Format attendu: YYYY-MM-DD`
				);
			}

			// Valider que la date est réelle (pas 2025-13-45)
			if (metadata.date && DATE_REGEX.test(metadata.date)) {
				const parsedDate = new Date(metadata.date + "T00:00:00Z");
				if (isNaN(parsedDate.getTime())) {
					errors.push(`${file}: Date invalide '${metadata.date}'`);
				}
			}

			// Vérifier la cohérence entre le slug et la version
			if (metadata.version) {
				const expectedSlug = `v${metadata.version}`;
				if (slug !== expectedSlug) {
					errors.push(
						`${file}: Incohérence - nom de fichier '${slug}' ne correspond pas à version '${metadata.version}'`
					);
				}
			}
		} catch (error) {
			errors.push(
				`${file}: Erreur de lecture - ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	if (errors.length > 0) {
		console.error("\nErreurs de validation des changelogs:\n");
		errors.forEach((err) => console.error(`  - ${err}`));
		console.error("");
		process.exit(1);
	}

	console.log(
		`Validation réussie: ${files.length} fichier(s) changelog valide(s)`
	);
}

validateChangelogs();
