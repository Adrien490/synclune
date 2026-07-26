import * as Sentry from "@sentry/nextjs";
import { utapi } from "@/shared/lib/uploadthing";
import { prisma } from "@/shared/lib/prisma";
import { extractFileKeysFromUrls } from "@/modules/media/utils/extract-file-key";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";
import { logger } from "@/shared/lib/logger";

/**
 * Écarte les URLs qui pointent vers une archive fiscale (facture ou avoir).
 *
 * Les PDF de facture (`Order.invoicePdfUrl`), d'avoir sur commande
 * (`Order.creditNotePdfUrl`) et d'avoir partiel (`Refund.creditNotePdfUrl`)
 * vivent dans la MÊME app UploadThing que les médias catalogue. Rien
 * n'empêchait ce service — appelé depuis les actions produit/SKU/avis et les
 * actions admin de suppression média — d'en supprimer une : ce sont des
 * archives immuables sous rétention 10 ans (Art. L102 B LPF), dont seul
 * `hard-delete-retention` est l'effaceur légitime (audit média M7).
 *
 * Le cron `cleanup-orphan-media` protège déjà ces clés côté balayage
 * automatique ; cette garde ferme le chemin manuel, en défense en profondeur.
 */
async function partitionProtectedArchives(
	urls: string[],
): Promise<{ deletable: string[]; protectedUrls: string[] }> {
	if (urls.length === 0) return { deletable: [], protectedUrls: [] };

	const [orders, refunds] = await Promise.all([
		prisma.order.findMany({
			where: {
				OR: [{ invoicePdfUrl: { in: urls } }, { creditNotePdfUrl: { in: urls } }],
			},
			select: { invoicePdfUrl: true, creditNotePdfUrl: true },
		}),
		prisma.refund.findMany({
			where: { creditNotePdfUrl: { in: urls } },
			select: { creditNotePdfUrl: true },
		}),
	]);

	const archived = new Set<string>();
	for (const order of orders) {
		if (order.invoicePdfUrl) archived.add(order.invoicePdfUrl);
		if (order.creditNotePdfUrl) archived.add(order.creditNotePdfUrl);
	}
	for (const refund of refunds) {
		if (refund.creditNotePdfUrl) archived.add(refund.creditNotePdfUrl);
	}

	if (archived.size === 0) return { deletable: urls, protectedUrls: [] };

	const protectedUrls = urls.filter((url) => archived.has(url));
	logger.error("Blocked deletion of archived invoice/credit-note PDF(s)", undefined, {
		service: "delete-uploadthing-files",
		blocked: protectedUrls.length,
	});
	Sentry.captureMessage("delete-uploadthing-files: blocked fiscal archive deletion", {
		level: "error",
		tags: { service: "delete-uploadthing-files", blocked: protectedUrls.length },
	});

	return { deletable: urls.filter((url) => !archived.has(url)), protectedUrls };
}

export interface DeleteUploadThingFilesOptions {
	/**
	 * Autorise la suppression des PDF de facture / avoir encore référencés en base.
	 *
	 * RÉSERVÉ à `hard-delete-retention` : seul effaceur légitime, il purge les
	 * archives au terme des 10 ans de rétention légale (Art. L102 B LPF) alors
	 * que les colonnes `Order.invoicePdfUrl` / `Refund.creditNotePdfUrl` pointent
	 * encore dessus. Tout autre appelant doit laisser la garde active.
	 */
	allowFiscalArchives?: boolean;
}

/**
 * Shared service for deleting UploadThing files from URLs.
 *
 * LAYER EXCEPTION: This service contains side effects (UTApi.deleteFiles mutations),
 * unlike typical services/ which are pure functions. This is intentional — similar to
 * the webhooks/services/ exception documented in CLAUDE.md. The service acts as a
 * shared cleanup utility used across multiple modules (reviews, account deletion,
 * hard deletes) and is not exposed as a Server Action.
 *
 * Used for orphan file cleanup during:
 * - Review deletion (ReviewMedia)
 * - Review update (replaced photos)
 * - Account deletion (avatar)
 * - Hard delete after legal retention
 *
 * @param urls - List of file URLs to delete
 * @returns Result with count of deleted files and failures
 */
export async function deleteUploadThingFilesFromUrls(
	urls: string[],
	options: DeleteUploadThingFilesOptions = {},
): Promise<{ deleted: number; failed: number }> {
	if (urls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Filter to valid UploadThing URLs only (HTTPS + allowed domain)
	const candidateUrls = urls.filter(isValidUploadThingUrl);

	if (candidateUrls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Défense en profondeur : jamais d'archive fiscale supprimée par ce chemin,
	// sauf pour l'effaceur légitime de fin de rétention (cf. options).
	const uploadThingUrls = options.allowFiscalArchives
		? candidateUrls
		: (await partitionProtectedArchives(candidateUrls)).deletable;

	if (uploadThingUrls.length === 0) {
		return { deleted: 0, failed: 0 };
	}

	// Extract file keys from URLs
	const { keys: fileKeys, failedUrls } = extractFileKeysFromUrls(uploadThingUrls);

	if (failedUrls.length > 0) {
		logger.warn(`${failedUrls.length} URL(s) could not be extracted: ${failedUrls.join(", ")}`, {
			service: "delete-uploadthing-files",
		});
	}

	if (fileKeys.length === 0) {
		return { deleted: 0, failed: failedUrls.length };
	}

	try {
		const result = await utapi.deleteFiles(fileKeys);

		if (!result.success) {
			logger.warn(`UTApi.deleteFiles returned success=false for ${fileKeys.length} key(s)`, {
				service: "delete-uploadthing-files",
			});
			return { deleted: 0, failed: urls.length };
		}

		const actualDeleted = result.deletedCount;
		const alreadyAbsent = fileKeys.length - actualDeleted;

		// UTApi.deleteFiles est un bulk SANS rapport par clé : une clé inexistante
		// (fichier déjà supprimé par un run précédent interrompu avant l'écriture DB)
		// n'incrémente pas deletedCount mais n'est PAS un échec — le fichier est
		// absent, l'objectif est atteint. Compter ces clés en `failed` bloquait
		// DÉFINITIVEMENT la purge PII 10 ans après un crash entre suppression PDF et
		// scrub (le retry mensuel re-supprimait des clés déjà absentes → failed > 0 →
		// report éternel). Les vrais échecs se manifestent par success=false ou une
		// exception (catch ci-dessous).
		if (alreadyAbsent > 0) {
			logger.info(
				`${actualDeleted}/${fileKeys.length} file(s) deleted (${alreadyAbsent} already absent)`,
				{ service: "delete-uploadthing-files" },
			);
		}

		return { deleted: actualDeleted, failed: failedUrls.length };
	} catch (error) {
		// Log error but don't block the main operation
		logger.error("Failed to delete files", error, { service: "delete-uploadthing-files" });

		return { deleted: 0, failed: urls.length };
	}
}

/**
 * Delete a single UploadThing file from its URL.
 * Convenience wrapper around deleteUploadThingFilesFromUrls.
 *
 * @param url - File URL to delete (can be null/undefined)
 * @returns true if the file was deleted, false otherwise
 */
export async function deleteUploadThingFileFromUrl(
	url: string | null | undefined,
): Promise<boolean> {
	if (!url || !isValidUploadThingUrl(url)) {
		return false;
	}

	const result = await deleteUploadThingFilesFromUrls([url]);
	return result.deleted > 0;
}
