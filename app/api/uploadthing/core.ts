import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { requireAdminApiRoute } from "@/modules/auth/lib/require-auth";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import { generateThumbHashWithRetry } from "@/modules/media/services/generate-thumbhash";
import {
	ImageDimensionsTooLargeError,
	validateImageDimensions,
} from "@/modules/media/services/validate-image-dimensions.service";
import { stripImageMetadata } from "@/modules/media/services/strip-image-metadata.service";
import { utapi } from "@/shared/lib/uploadthing";
import { UPLOAD_LIMITS } from "@/modules/media/constants/upload-limits";

/**
 * Génère un ThumbHash placeholder avec retry, retourne undefined en cas d'échec.
 * ThumbHash est le standard 2025 (~25 bytes vs ~200 bytes pour plaiceholder).
 * Les échecs sont remontés à Sentry pour visibilité (taux d'échec ThumbHash, timeouts, etc.).
 */
async function generateBlurSafe(url: string): Promise<string | undefined> {
	try {
		const result = await generateThumbHashWithRetry(url);
		return result.dataUrl;
	} catch (err) {
		Sentry.captureException(err, {
			tags: { source: "uploadthing", step: "thumbhash-generation" },
		});
		return undefined;
	}
}

/**
 * Capture les erreurs inattendues (DB, network, bug code) sans capturer les
 * UploadThingError métier (rate-limit, MIME, taille — déjà attendues et bruyantes).
 */
function captureUnexpected(err: unknown, tags: Record<string, string | number | undefined>): void {
	if (err instanceof UploadThingError) return;
	Sentry.captureException(err, { tags: { source: "uploadthing", ...tags } });
}

/**
 * Rejette les images dont les dimensions dépassent la limite (image-bomb DoS).
 * Supprime le fichier orphelin sur UploadThing avant de throw l'erreur client.
 */
async function rejectImageBomb(file: { ufsUrl: string; key: string; name: string }): Promise<void> {
	try {
		await validateImageDimensions(file.ufsUrl);
	} catch (err) {
		if (err instanceof ImageDimensionsTooLargeError) {
			try {
				await utapi.deleteFiles([file.key]);
			} catch (deleteErr) {
				Sentry.captureException(deleteErr, {
					tags: { source: "uploadthing", step: "image-bomb-cleanup", fileKey: file.key },
				});
			}
			throw new UploadThingError(
				`Dimensions trop élevées: ${file.name} (${err.width}×${err.height}px). Max ${err.maxPixels / 1_000_000}MP.`,
			);
		}
		// Lecture metadata échouée pour autre raison (corrupted header, network) → on log
		// et on laisse passer (defense-in-depth: ThumbHash + sharp downstream re-décodent et échoueront proprement)
		Sentry.captureException(err, {
			tags: { source: "uploadthing", step: "dimensions-validation", fileKey: file.key },
		});
	}
}

// Note: La generation de thumbnails video est maintenant faite cote client
// via useMediaUpload hook (Canvas API) pour compatibilite Vercel serverless

// Vérifier que le token UploadThing est configuré au démarrage
if (!process.env.UPLOADTHING_TOKEN) {
	throw new Error(
		"❌ UPLOADTHING_TOKEN n'est pas défini dans les variables d'environnement. L'upload de fichiers ne fonctionnera pas.",
	);
}

// Types MIME autorisés pour la validation serveur
// SVG intentionally excluded: can contain embedded scripts (XSS vector)
// HEIC/HEIF: iPhone default format. Le client compresse en WebP/JPEG avant upload
// (compress-image.ts), mais on tolère le passage HEIC brut au cas où le navigateur
// supporte le décodage natif (Safari) ou si la compression échoue silencieusement.
const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
	"image/heic",
	"image/heif",
] as const;

const ALLOWED_VIDEO_TYPES = ["video/mp4"] as const;

/**
 * Valide le type MIME d'un fichier côté serveur
 * Protection contre les fichiers malveillants renommés
 */
function validateMimeType(
	file: { type: string; name: string },
	allowedTypes: readonly string[],
): void {
	if (!allowedTypes.includes(file.type as never)) {
		throw new UploadThingError(
			`Type de fichier non autorisé: ${file.name} (${file.type}). Types acceptés: ${allowedTypes.join(", ")}`,
		);
	}
}

/**
 * Valide la taille d'un fichier côté serveur
 * Double vérification après validation client
 */
function validateFileSize(file: { size: number; name: string }, maxSizeBytes: number): void {
	if (file.size > maxSizeBytes) {
		const sizeMB = (file.size / 1024 / 1024).toFixed(2);
		const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(0);
		throw new UploadThingError(
			`Fichier trop volumineux: ${file.name} (${sizeMB}MB). Taille max: ${maxSizeMB}MB`,
		);
	}
}

const f = createUploadthing({
	/**
	 * Formatter d'erreur personnalisé pour envoyer des messages clairs au client
	 */
	errorFormatter: (err) => {
		return {
			message: err.message,
			code: err.code,
		};
	},
});

// FileRouter pour l'application
// CSRF: UploadThing route handler uses POST with signature verification.
// Delete operations use Next.js Server Actions (built-in same-origin CSRF protection).
export const ourFileRouter = {
	// Route pour les médias de catalogue (produits et SKUs) - images et vidéos
	catalogMedia: f({
		image: { maxFileSize: "16MB", maxFileCount: 6 },
		video: { maxFileSize: "512MB", maxFileCount: 6 },
	})
		.middleware(async ({ files }) => {
			try {
				// 1. Vérifier l'authentification et les permissions admin (DB re-verification)
				const admin = await requireAdminApiRoute();
				if ("response" in admin) {
					throw new UploadThingError(
						"Seuls les administrateurs peuvent uploader des médias de catalogue",
					);
				}

				// 2. Rate limiting
				const headersList = await headers();
				const clientIp = await getClientIp(headersList);
				const rateLimitId = getRateLimitIdentifier(admin.user.id, null, clientIp);
				const rateLimit = await checkRateLimit(rateLimitId, UPLOAD_LIMITS.CATALOG, clientIp);

				if (!rateLimit.success) {
					throw new UploadThingError(
						rateLimit.error ?? "Trop de tentatives d'upload. Veuillez patienter.",
					);
				}

				// 3. Validation MIME et taille côté serveur
				for (const file of files) {
					const isVideo = file.type.startsWith("video/");
					const isImage = file.type.startsWith("image/");

					if (isVideo) {
						validateMimeType(file, ALLOWED_VIDEO_TYPES);
						validateFileSize(file, 512 * 1024 * 1024); // 512MB
					} else if (isImage) {
						validateMimeType(file, ALLOWED_IMAGE_TYPES);
						validateFileSize(file, 16 * 1024 * 1024); // 16MB
					} else {
						throw new UploadThingError(
							`Type de fichier non supporté: ${file.name} (${file.type}). Seules les images et vidéos sont acceptées.`,
						);
					}
				}

				return {
					userId: admin.user.id,
					userName: admin.user.name,
				};
			} catch (err) {
				captureUnexpected(err, {
					endpoint: "catalogMedia",
					step: "middleware",
					fileCount: files.length,
				});
				throw err;
			}
		})
		.onUploadComplete(async ({ metadata, file }) => {
			try {
				const isImage = file.type.startsWith("image/");

				// Pour les images: rejeter les image-bombs, stripper EXIF/GPS (RGPD), puis generer le blur placeholder
				if (isImage) {
					await rejectImageBomb(file);
					// RGPD: strip EXIF/GPS metadata avant exposition sur CDN public.
					// Best-effort: si le strip échoue, on conserve l'URL d'origine.
					const stripped = await stripImageMetadata({
						ufsUrl: file.ufsUrl,
						key: file.key,
						name: file.name,
						type: file.type,
					});
					const finalUrl = stripped?.url ?? file.ufsUrl;
					const blurDataUrl = await generateBlurSafe(finalUrl);
					return {
						url: finalUrl,
						thumbnailUrl: null,
						blurDataUrl,
						uploadedBy: metadata.userId,
					};
				}

				// Pour les videos: pas de traitement serveur
				// Le thumbnail est genere cote client via Canvas API (useMediaUpload hook)
				// et uploade separement avant la video
				return {
					url: file.ufsUrl,
					thumbnailUrl: null,
					blurDataUrl: null,
					uploadedBy: metadata.userId,
				};
			} catch (err) {
				captureUnexpected(err, {
					endpoint: "catalogMedia",
					step: "onUploadComplete",
					userId: metadata.userId,
					fileType: file.type,
					fileSize: file.size,
				});
				throw err;
			}
		}),

	// Route pour les photos d'avis clients
	// Accessible aux utilisateurs connectés (acheteurs vérifiés)
	reviewMedia: f({
		image: { maxFileSize: "4MB", maxFileCount: 3 },
	})
		.middleware(async ({ files }) => {
			try {
				// 1. Authentification requise
				const session = await getSession();
				if (!session?.user) {
					throw new UploadThingError(
						"Vous devez être connecté pour ajouter des photos à votre avis",
					);
				}

				// 2. Rate limiting
				const headersList = await headers();
				const clientIp = await getClientIp(headersList);
				const rateLimitId = getRateLimitIdentifier(session.user.id, null, clientIp);
				const rateLimit = await checkRateLimit(rateLimitId, UPLOAD_LIMITS.REVIEW_MEDIA, clientIp);

				if (!rateLimit.success) {
					throw new UploadThingError(
						rateLimit.error ?? "Trop de tentatives d'upload. Veuillez patienter.",
					);
				}

				// 3. Validation MIME et taille côté serveur
				for (const file of files) {
					validateMimeType(file, ALLOWED_IMAGE_TYPES);
					validateFileSize(file, 4 * 1024 * 1024); // 4MB
				}

				return {
					userId: session.user.id,
					userName: session.user.name,
				};
			} catch (err) {
				captureUnexpected(err, {
					endpoint: "reviewMedia",
					step: "middleware",
					fileCount: files.length,
				});
				throw err;
			}
		})
		.onUploadComplete(async ({ metadata, file }) => {
			try {
				// Rejeter les image-bombs, stripper EXIF/GPS (RGPD critique — photos clients iPhone), puis generer le blur
				await rejectImageBomb(file);
				const stripped = await stripImageMetadata({
					ufsUrl: file.ufsUrl,
					key: file.key,
					name: file.name,
					type: file.type,
				});
				const finalUrl = stripped?.url ?? file.ufsUrl;
				const blurDataUrl = await generateBlurSafe(finalUrl);

				return {
					url: finalUrl,
					blurDataUrl,
					uploadedBy: metadata.userId,
				};
			} catch (err) {
				captureUnexpected(err, {
					endpoint: "reviewMedia",
					step: "onUploadComplete",
					userId: metadata.userId,
					fileType: file.type,
					fileSize: file.size,
				});
				throw err;
			}
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
