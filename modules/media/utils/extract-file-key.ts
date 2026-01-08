/**
 * Utilitaire pour extraire les cles de fichiers depuis les URLs UploadThing
 *
 * Centralise la logique d'extraction pour eviter la duplication
 * et garantir une gestion coherente des erreurs.
 *
 * @module modules/media/utils/extract-file-key
 */

/**
 * Extrait la cle du fichier depuis une URL UploadThing
 *
 * @param url - URL complete du fichier (ex: https://utfs.io/f/abc123.png)
 * @returns La cle du fichier ou null si extraction impossible
 *
 * @example
 * extractFileKeyFromUrl("https://utfs.io/f/abc123.png") // "abc123.png"
 * extractFileKeyFromUrl("invalid-url") // null
 */
export function extractFileKeyFromUrl(url: string): string | null {
	try {
		// Format UploadThing: https://utfs.io/f/{fileKey}
		// ou https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}
		// ou https://x1ain1wpub.ufs.sh/f/{fileKey}
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		// La cle est le dernier segment du path
		const key = parts[parts.length - 1];

		// Validation basique: la cle doit etre non-vide et ressembler a un identifiant
		if (!key || key === "" || key === "/") {
			return null;
		}

		return key;
	} catch {
		// URL invalide
		return null;
	}
}

/**
 * Extrait les cles de fichiers depuis plusieurs URLs UploadThing
 * Filtre automatiquement les extractions echouees
 *
 * @param urls - Liste d'URLs completes
 * @returns Objet avec les cles extraites et les URLs en echec
 */
export function extractFileKeysFromUrls(urls: string[]): {
	keys: string[];
	failedUrls: string[];
} {
	const keys: string[] = [];
	const failedUrls: string[] = [];

	for (const url of urls) {
		const key = extractFileKeyFromUrl(url);
		if (key) {
			keys.push(key);
		} else {
			failedUrls.push(url);
		}
	}

	return { keys, failedUrls };
}
