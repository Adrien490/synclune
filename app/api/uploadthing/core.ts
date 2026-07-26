import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { requireAdminApiRoute } from "@/modules/auth/lib/require-auth";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import { generateThumbHashFromBuffer } from "@/modules/media/services/generate-thumbhash";
import {
	ImageDimensionsTooLargeError,
	assertImageDimensions,
	readImageDimensions,
} from "@/modules/media/services/validate-image-dimensions.service";
import { stripImageMetadata } from "@/modules/media/services/strip-image-metadata.service";
import { isHeicMimeType, reencodeHeicToWebp } from "@/modules/media/services/reencode-heic.service";
import {
	ImageDecodeError,
	downloadImage,
	withRetry,
} from "@/modules/media/services/image-downloader.service";
import { THUMBHASH_CONFIG } from "@/modules/media/constants/image-downloader.constants";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";
import { utapi } from "@/shared/lib/uploadthing";
import { UPLOAD_LIMITS } from "@/modules/media/constants/upload-limits";

/** Métadonnées minimales d'un blob fraîchement uploadé sur UploadThing. */
interface UploadedFile {
	ufsUrl: string;
	key: string;
	name: string;
	type: string;
	size: number;
}

/** Résultat du post-traitement image renvoyé au client via `serverData`. */
interface ProcessedImage {
	url: string;
	blurDataUrl: string | undefined;
	/** Dimensions du buffer FINAL (post strip/re-encode) — `undefined` si illisibles. */
	width: number | undefined;
	height: number | undefined;
}

/**
 * Lit les dimensions du buffer publié. Non fatal : une dimension manquante
 * dégrade le srcSet (cf. lightbox) mais ne doit pas faire perdre l'upload.
 */
async function readDimensionsSafe(
	buffer: Buffer,
): Promise<{ width: number | undefined; height: number | undefined }> {
	const dims = await readImageDimensions(buffer);
	return { width: dims?.width, height: dims?.height };
}

/**
 * Génère un ThumbHash placeholder, retourne undefined en cas d'échec.
 * ThumbHash est le standard 2025 (~25 bytes vs ~200 bytes pour plaiceholder).
 * Les échecs sont remontés à Sentry pour visibilité (taux d'échec ThumbHash, etc.).
 */
async function generateBlurSafe(buffer: Buffer): Promise<string | undefined> {
	try {
		const result = await generateThumbHashFromBuffer(buffer);
		return result.dataUrl;
	} catch (err) {
		Sentry.captureException(err, {
			tags: { source: "uploadthing", step: "thumbhash-generation" },
		});
		return undefined;
	}
}

/**
 * Supprime un blob orphelin sans jamais faire échouer l'appelant : le rejet de
 * l'upload prime sur le nettoyage (le cron `cleanup-orphan-media` ramassera le
 * blob si le delete échoue).
 */
async function deleteBlobBestEffort(key: string, step: string): Promise<void> {
	try {
		await utapi.deleteFiles([key]);
	} catch (deleteErr) {
		Sentry.captureException(deleteErr, {
			tags: { source: "uploadthing", step, fileKey: key },
		});
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
 * Post-traitement serveur d'une image fraîchement uploadée.
 *
 * L'image est téléchargée UNE SEULE FOIS puis le buffer circule dans tout le
 * pipeline (audit média M6 — l'implémentation précédente enchaînait trois
 * `downloadImage` sur la même URL, jusqu'à cinq avec les retries ThumbHash).
 *
 * Étapes, dans l'ordre :
 * 1. Téléchargement + contrôle des magic bytes (`downloadImage` → Sharp).
 * 2. Garde image-bomb (dimensions ≤ 50 MP).
 * 3. HEIC/HEIF → WebP web-safe (jamais d'URL HEIC publique, MEDIA-AUDIT-006).
 * 4. Sinon strip EXIF/GPS (RGPD).
 * 5. ThumbHash depuis le buffer final.
 *
 * @param requireMetadataStrip - `true` sur `reviewMedia` : un strip EXIF en
 *   échec REJETTE l'upload au lieu de publier l'original (audit média M4). Les
 *   photos d'avis viennent de téléphones clients et portent des coordonnées GPS ;
 *   une publication en fallback exposerait le domicile d'un client sur le CDN.
 *   `false` sur `catalogMedia` (photos maîtrisées par l'exploitante) : on
 *   privilégie la disponibilité, l'échec reste tracé dans Sentry.
 */
async function processUploadedImage(
	file: UploadedFile,
	{ requireMetadataStrip }: { requireMetadataStrip: boolean },
): Promise<ProcessedImage> {
	// Défense SSRF : le pipeline ne télécharge que depuis un domaine UploadThing.
	if (!isValidUploadThingUrl(file.ufsUrl)) {
		await deleteBlobBestEffort(file.key, "untrusted-origin-cleanup");
		throw new UploadThingError(`Origine du fichier non autorisée: ${file.name}`);
	}

	// --- 1. Téléchargement unique -------------------------------------------
	let buffer: Buffer;
	try {
		buffer = await withRetry(() =>
			downloadImage(file.ufsUrl, {
				downloadTimeout: THUMBHASH_CONFIG.downloadTimeout,
				maxImageSize: THUMBHASH_CONFIG.maxImageSize,
				userAgent: "Synclune-UploadPipeline/1.0",
			}),
		);
	} catch (err) {
		if (err instanceof ImageDecodeError) {
			// MIME spoofé (exécutable/HTML renommé .jpg) ou HEIC sans codec libheif.
			// Audit média M1 : cette branche était auparavant AVALÉE, laissant un blob
			// arbitraire publié derrière une URL d'image.
			await deleteBlobBestEffort(file.key, "undecodable-cleanup");
			Sentry.captureException(err, {
				tags: { source: "uploadthing", step: "decode-validation", fileKey: file.key },
			});
			throw new UploadThingError(
				isHeicMimeType(file.type)
					? `Image HEIC non convertie: ${file.name}. Veuillez réessayer ou utiliser un format JPEG/PNG.`
					: `Fichier illisible: ${file.name}. Le contenu ne correspond pas à une image ${file.type}.`,
			);
		}
		// Incident réseau/timeout : le blob est valide du point de vue du client,
		// on le publie sans post-traitement plutôt que de perdre l'upload.
		Sentry.captureException(err, {
			tags: { source: "uploadthing", step: "download", fileKey: file.key },
		});
		return { url: file.ufsUrl, blurDataUrl: undefined, width: undefined, height: undefined };
	}

	// --- 2. Garde image-bomb -------------------------------------------------
	try {
		await assertImageDimensions(buffer);
	} catch (err) {
		if (err instanceof ImageDimensionsTooLargeError) {
			await deleteBlobBestEffort(file.key, "image-bomb-cleanup");
			throw new UploadThingError(
				`Dimensions trop élevées: ${file.name} (${err.width}×${err.height}px). Max ${err.maxPixels / 1_000_000}MP.`,
			);
		}
		await deleteBlobBestEffort(file.key, "undecodable-cleanup");
		Sentry.captureException(err, {
			tags: { source: "uploadthing", step: "dimensions-validation", fileKey: file.key },
		});
		throw new UploadThingError(
			`Fichier illisible: ${file.name}. Le contenu ne correspond pas à une image ${file.type}.`,
		);
	}

	// --- 3. HEIC brut → WebP -------------------------------------------------
	if (isHeicMimeType(file.type)) {
		try {
			const converted = await reencodeHeicToWebp(buffer, { key: file.key, name: file.name });
			// Re-encode Sharp = EXIF/GPS déjà strippés → strip ultérieur inutile.
			return {
				url: converted.url,
				blurDataUrl: await generateBlurSafe(converted.buffer),
				...(await readDimensionsSafe(converted.buffer)),
			};
		} catch (err) {
			await deleteBlobBestEffort(file.key, "heic-reject-cleanup");
			Sentry.captureException(err, {
				tags: { source: "uploadthing", step: "heic-reencode", fileKey: file.key },
			});
			throw new UploadThingError(
				`Image HEIC non convertie: ${file.name}. Veuillez réessayer ou utiliser un format JPEG/PNG.`,
			);
		}
	}

	// --- 4. Strip EXIF/GPS (RGPD) -------------------------------------------
	const stripped = await stripImageMetadata(buffer, {
		key: file.key,
		name: file.name,
		type: file.type,
	});

	if (stripped.status === "failed" && requireMetadataStrip) {
		await deleteBlobBestEffort(file.key, "metadata-strip-cleanup");
		Sentry.captureException(stripped.reason, {
			tags: { source: "uploadthing", step: "metadata-strip-required", fileKey: file.key },
		});
		throw new UploadThingError(
			`Photo non traitée: ${file.name}. Impossible de retirer les métadonnées de l'image, veuillez réessayer.`,
		);
	}

	// --- 5. ThumbHash --------------------------------------------------------
	const finalUrl = stripped.status === "stripped" ? stripped.url : file.ufsUrl;
	const finalBuffer = stripped.status === "stripped" ? stripped.buffer : buffer;

	return {
		url: finalUrl,
		blurDataUrl: await generateBlurSafe(finalBuffer),
		...(await readDimensionsSafe(finalBuffer)),
	};
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
	//
	// ⚠️ COÛT (audit coûts P2-2) : la vidéo était plafonnée à 512 Mo × 6, soit
	// **3 Go en un seul upload** — le quota de stockage UploadThing (2 Go sur le
	// plan gratuit) sautait d'un coup, par une action admin parfaitement
	// légitime. Ramené à 64 Mo × 2 : très large pour une vidéo de présentation
	// de bijou (quelques secondes en boucle), et le pire cas d'un upload passe
	// de 3 Go à 128 Mo. Les uploads d'images restent inchangés (16 Mo × 6) —
	// `compress-image.ts` les replafonne de toute façon à 2048 px.
	catalogMedia: f({
		image: { maxFileSize: "16MB", maxFileCount: 6 },
		video: { maxFileSize: "64MB", maxFileCount: 2 },
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
				// Pour les videos: pas de traitement serveur.
				// Le thumbnail est genere cote client via Canvas API (useMediaUpload hook)
				// et uploade separement avant la video.
				if (!file.type.startsWith("image/")) {
					return {
						url: file.ufsUrl,
						thumbnailUrl: null,
						blurDataUrl: null,
						// Dimensions non lues pour une vidéo : celles du poster remontent
						// via l'upload du thumbnail (lui-même une image).
						width: null,
						height: null,
						uploadedBy: metadata.userId,
					};
				}

				// Photos catalogue : maîtrisées par l'exploitante, un strip EXIF en échec
				// ne bloque pas la publication (contrairement à reviewMedia).
				const processed = await processUploadedImage(file, { requireMetadataStrip: false });

				return {
					url: processed.url,
					thumbnailUrl: null,
					blurDataUrl: processed.blurDataUrl,
					width: processed.width ?? null,
					height: processed.height ?? null,
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
				// Photos clients : le strip EXIF/GPS est BLOQUANT (audit média M4). Une
				// photo iPhone < 1 Mo contourne la compression cliente et arrive brute
				// avec ses coordonnées GPS ; publier l'original en fallback exposerait le
				// domicile d'un client sur un CDN public.
				const processed = await processUploadedImage(file, { requireMetadataStrip: true });

				return {
					url: processed.url,
					blurDataUrl: processed.blurDataUrl,
					// `ReviewMedia` n'a pas de colonnes width/height : ces valeurs ne sont
					// pas persistées. Elles restent exposées pour garder `serverData`
					// uniforme entre les deux routes (le hook d'upload est partagé).
					width: processed.width ?? null,
					height: processed.height ?? null,
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
