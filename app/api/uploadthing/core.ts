import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import {
	generateVideoThumbnail,
	isFFmpegAvailable,
} from "@/modules/media/services/generate-video-thumbnail";
import { generateBlurDataUrl } from "@/modules/media/services/generate-blur-data-url";
import {
	stripVideoAudio,
	isStripAudioAvailable,
} from "@/modules/media/services/strip-video-audio";

// Vérifier que le token UploadThing est configuré au démarrage
if (!process.env.UPLOADTHING_TOKEN) {
	throw new Error(
		"❌ UPLOADTHING_TOKEN n'est pas défini dans les variables d'environnement. L'upload de fichiers ne fonctionnera pas."
	);
}

// Types MIME autorisés pour la validation serveur
const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
] as const;

const ALLOWED_VIDEO_TYPES = [
	"video/mp4",
	"video/webm",
	"video/quicktime", // .mov
	"video/x-msvideo", // .avi
] as const;

const ALLOWED_DOCUMENT_TYPES = [
	"application/pdf",
	"text/plain",
] as const;

/**
 * Valide le type MIME d'un fichier côté serveur
 * Protection contre les fichiers malveillants renommés
 */
function validateMimeType(
	file: { type: string; name: string },
	allowedTypes: readonly string[]
): void {
	if (!allowedTypes.includes(file.type as never)) {
		throw new UploadThingError(
			`Type de fichier non autorisé: ${file.name} (${file.type}). Types acceptés: ${allowedTypes.join(", ")}`
		);
	}
}

/**
 * Valide la taille d'un fichier côté serveur
 * Double vérification après validation client
 */
function validateFileSize(
	file: { size: number; name: string },
	maxSizeBytes: number
): void {
	if (file.size > maxSizeBytes) {
		const sizeMB = (file.size / 1024 / 1024).toFixed(2);
		const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(0);
		throw new UploadThingError(
			`Fichier trop volumineux: ${file.name} (${sizeMB}MB). Taille max: ${maxSizeMB}MB`
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
export const ourFileRouter = {
	// Route pour les images de témoignages (photo de l'auteur)
	testimonialMedia: f({
		image: { maxFileSize: "4MB", maxFileCount: 1 },
	})
		.middleware(async ({ files }) => {
			// 1. Vérifier l'authentification et les permissions admin
			const session = await getSession();
			if (!session?.user) {
				throw new UploadThingError("Vous devez être connecté pour uploader des médias");
			}
			if (session.user.role !== "ADMIN") {
				throw new UploadThingError("Seuls les administrateurs peuvent uploader des photos de témoignages");
			}

			// 2. Rate limiting (5 uploads/minute)
			const headersList = await headers();
			const clientIp = await getClientIp(headersList);
			const rateLimitId = getRateLimitIdentifier(session.user.id, null, clientIp);
			const rateLimit = checkRateLimit(rateLimitId, { limit: 5, windowMs: 60000 });

			if (!rateLimit.success) {
				throw new UploadThingError(
					rateLimit.error || "Trop de tentatives d'upload. Veuillez patienter."
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
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// Générer le blur placeholder pour les photos de témoignages
			const blurDataUrl = await generateBlurDataUrl(file.ufsUrl);

			return {
				url: file.ufsUrl,
				blurDataUrl,
				uploadedBy: metadata.userId,
			};
		}),

	// Route pour les médias de catalogue (produits et SKUs) - images et vidéos
	catalogMedia: f({
		image: { maxFileSize: "16MB", maxFileCount: 10 },
		video: { maxFileSize: "512MB", maxFileCount: 10 },
	})
		.middleware(async ({ files }) => {
			// 1. Vérifier l'authentification et les permissions admin
			const session = await getSession();
			if (!session?.user) {
				throw new UploadThingError("Vous devez être connecté pour uploader des médias");
			}
			if (session.user.role !== "ADMIN") {
				throw new UploadThingError("Seuls les administrateurs peuvent uploader des médias de catalogue");
			}

			// 2. Rate limiting (10 uploads/minute pour catalogue)
			const headersList = await headers();
			const clientIp = await getClientIp(headersList);
			const rateLimitId = getRateLimitIdentifier(session.user.id, null, clientIp);
			const rateLimit = checkRateLimit(rateLimitId, { limit: 10, windowMs: 60000 });

			if (!rateLimit.success) {
				throw new UploadThingError(
					rateLimit.error || "Trop de tentatives d'upload. Veuillez patienter."
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
						`Type de fichier non supporté: ${file.name} (${file.type}). Seules les images et vidéos sont acceptées.`
					);
				}
			}

			return {
				userId: session.user.id,
				userName: session.user.name,
			};
		})
		.onUploadComplete(async ({ metadata, file }) => {
			const isImage = file.type.startsWith("image/");
			const isVideo = file.type.startsWith("video/");

			// Pour les images: générer le blur placeholder
			if (isImage) {
				const blurDataUrl = await generateBlurDataUrl(file.ufsUrl);
				return {
					url: file.ufsUrl,
					blurDataUrl,
					uploadedBy: metadata.userId,
				};
			}

			// Pour les vidéos: supprimer l'audio et générer les thumbnails
			if (isVideo && isFFmpegAvailable()) {
				let videoUrl = file.ufsUrl;

				// 1. Supprimer la piste audio (si disponible)
				if (isStripAudioAvailable()) {
					try {
						const stripResult = await stripVideoAudio(videoUrl);
						if (stripResult) {
							videoUrl = stripResult.url;
							console.log(
								`[UploadThing] Audio supprimé: -${stripResult.savedPercent}% (${(stripResult.originalSize / 1024 / 1024).toFixed(1)}MB → ${(stripResult.newSize / 1024 / 1024).toFixed(1)}MB)`
							);
						}
					} catch (error) {
						console.warn(
							"[UploadThing] Échec suppression audio (vidéo conservée avec audio):",
							error instanceof Error ? error.message : error
						);
					}
				}

				// 2. Générer les thumbnails
				try {
					const thumbnailResult = await generateVideoThumbnail(videoUrl);
					return {
						url: videoUrl,
						thumbnailUrl: thumbnailResult.thumbnailUrl,
						thumbnailSmallUrl: thumbnailResult.thumbnailSmallUrl,
						blurDataUrl: thumbnailResult.blurDataUrl,
						uploadedBy: metadata.userId,
					};
				} catch (error) {
					console.error(
						"[UploadThing] Échec génération thumbnail vidéo:",
						error instanceof Error ? error.message : error
					);
					return {
						url: videoUrl,
						uploadedBy: metadata.userId,
					};
				}
			}

			// Fallback: retourner juste l'URL
			return {
				url: file.ufsUrl,
				uploadedBy: metadata.userId,
			};
		}),

	// Route pour les pièces jointes du formulaire de contact (tous types de fichiers)
	// Accessible à tous les utilisateurs (pas besoin d'être admin)
	// ⚠️ PROTECTION ABUS: Rate limiting strict car endpoint public
	contactAttachment: f({
		image: { maxFileSize: "4MB", maxFileCount: 3 },
		pdf: { maxFileSize: "4MB", maxFileCount: 3 },
		text: { maxFileSize: "4MB", maxFileCount: 3 },
	})
		.middleware(async ({ files }) => {
			// 1. Authentification optionnelle
			const session = await getSession();

			// 2. Rate limiting STRICT pour endpoint public (3 uploads/10min par IP)
			const headersList = await headers();
			const clientIp = await getClientIp(headersList);
			const rateLimitId = getRateLimitIdentifier(
				session?.user?.id || null,
				null,
				clientIp
			);
			const rateLimit = checkRateLimit(rateLimitId, {
				limit: 3,
				windowMs: 10 * 60 * 1000, // 10 minutes
			});

			if (!rateLimit.success) {
				throw new UploadThingError(
					rateLimit.error ||
						"Trop de tentatives d'upload. Veuillez réessayer plus tard."
				);
			}

			// 3. Validation MIME et taille côté serveur
			for (const file of files) {
				const isImage = file.type.startsWith("image/");
				const isPdf = file.type === "application/pdf";
				const isText = file.type === "text/plain";

				if (isImage) {
					validateMimeType(file, ALLOWED_IMAGE_TYPES);
				} else if (isPdf || isText) {
					validateMimeType(file, ALLOWED_DOCUMENT_TYPES);
				} else {
					throw new UploadThingError(
						`Type de fichier non autorisé: ${file.name} (${file.type})`
					);
				}

				validateFileSize(file, 4 * 1024 * 1024); // 4MB max
			}

			return {
				userId: session?.user?.id || null,
				userName: session?.user?.name || "Anonymous",
			};
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// console.log("Contact attachment upload complete:", {
			// 	url: file.ufsUrl,
			// 	uploadedBy: metadata.userId || "anonymous",
			// 	type: file.type,
			// });
			return {
				url: file.ufsUrl,
				uploadedBy: metadata.userId,
			};
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;


