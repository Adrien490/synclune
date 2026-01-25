import { UTApi } from "uploadthing/server";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";

const UPLOADTHING_URL_PATTERNS = [
	"utfs.io",
	"uploadthing",
	"ufs.sh",
] as const;

/**
 * Verifie si une URL est une URL UploadThing
 */
export function isUploadThingUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	return UPLOADTHING_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * Service centralise pour supprimer des fichiers UploadThing depuis des URLs
 *
 * Utilise pour le nettoyage des fichiers orphelins lors de:
 * - Suppression d'avis (ReviewMedia)
 * - Mise a jour d'avis (anciennes photos remplacees)
 * - Suppression de compte (avatar)
 * - Hard delete apres retention legale
 *
 * @param urls - Liste d'URLs de fichiers a supprimer
 * @returns Resultat avec nombre de fichiers supprimes et echecs
 */
export async function deleteUploadThingFilesFromUrls(
	urls: string[]
): Promise<{ deleted: number; failed: number }> {
	if (urls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Filtrer uniquement les URLs UploadThing
	const uploadThingUrls = urls.filter(isUploadThingUrl);

	if (uploadThingUrls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Extraire les cles des fichiers
	const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(uploadThingUrls);

	if (failedUrls.length > 0) {
		console.warn(
			`[deleteUploadThingFilesFromUrls] ${failedUrls.length} URL(s) n'ont pas pu etre extraites:`,
			failedUrls
		);
	}

	if (fileKeys.length === 0) {
		return { deleted: 0, failed: failedUrls.length };
	}

	try {
		const utapi = new UTApi();
		await utapi.deleteFiles(fileKeys);

		console.log(
			`[deleteUploadThingFilesFromUrls] ${fileKeys.length} fichier(s) supprime(s) avec succes`
		);

		return { deleted: fileKeys.length, failed: failedUrls.length };
	} catch (error) {
		// Log l'erreur mais ne bloque pas l'operation principale
		console.error(
			"[deleteUploadThingFilesFromUrls] Erreur lors de la suppression des fichiers:",
			error instanceof Error ? error.message : String(error)
		);

		return { deleted: 0, failed: urls.length };
	}
}

/**
 * Supprime un seul fichier UploadThing depuis son URL
 * Convenience wrapper autour de deleteUploadThingFilesFromUrls
 *
 * @param url - URL du fichier a supprimer (peut etre null/undefined)
 * @returns true si le fichier a ete supprime, false sinon
 */
export async function deleteUploadThingFileFromUrl(
	url: string | null | undefined
): Promise<boolean> {
	if (!url || !isUploadThingUrl(url)) {
		return false;
	}

	const result = await deleteUploadThingFilesFromUrls([url]);
	return result.deleted > 0;
}
