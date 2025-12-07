"use client";

import {
	useOptimistic,
	useTransition,
	useRef,
	useEffect,
} from "react";
import { toast } from "sonner";
import {
	useAutoVideoThumbnail,
	type ThumbnailResult,
} from "./use-auto-video-thumbnail";
import { updateSkuMediaThumbnail } from "../actions/update-sku-media-thumbnail";
import { ActionStatus } from "@/shared/types/server-action";

interface UseRegenerateThumbnailOptions {
	/** Callback appelé avec le résultat et l'URL vidéo source */
	onSuccess?: (result: ThumbnailResult, videoUrl: string) => void;
	/** Callback appelé en cas d'erreur */
	onError?: (videoUrl: string, error: string) => void;
}

interface RegenerateOptions {
	/** ID du média en BD (si fourni, persiste les thumbnails) */
	mediaId?: string;
	/** Position de capture en secondes (optionnel) */
	captureTimeSeconds?: number;
}

/**
 * Hook pour régénérer les thumbnails d'une vidéo
 *
 * Utilise useOptimistic pour une UX réactive avec callbacks
 *
 * @example
 * ```tsx
 * const { regenerate, regeneratingUrl, isRegenerating } = useRegenerateThumbnail({
 *   onSuccess: (result, videoUrl) => {
 *     const index = mediaList.findIndex(m => m.url === videoUrl);
 *     updateMedia(index, {
 *       thumbnailUrl: result.mediumUrl,
 *       thumbnailSmallUrl: result.smallUrl,
 *       blurDataUrl: result.blurDataUrl, // Nouveau: blur placeholder base64
 *     });
 *   }
 * });
 *
 * <Button onClick={() => regenerate(videoUrl)} disabled={isRegenerating}>
 *   Régénérer
 * </Button>
 * ```
 */
export function useRegenerateThumbnail(options?: UseRegenerateThumbnailOptions) {
	const { generateThumbnail } = useAutoVideoThumbnail();

	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticUrl, setOptimisticUrl] = useOptimistic<string | null>(null);

	// Ref pour tracker l'URL en cours (évite closure stale)
	const regeneratingUrlRef = useRef<string | null>(null);

	useEffect(() => {
		regeneratingUrlRef.current = optimisticUrl;
	}, [optimisticUrl]);

	const regenerate = (videoUrl: string, regenerateOptions?: RegenerateOptions) => {
		// Skip si déjà en cours pour cette URL
		if (regeneratingUrlRef.current === videoUrl) return;

		startTransition(async () => {
			// Mise à jour optimiste immédiate
			setOptimisticUrl(videoUrl);
			const toastId = toast.loading("Régénération de la miniature...");

			try {
				// 1. Générer les thumbnails côté client
				const thumbnailResult = await generateThumbnail(videoUrl, {
					captureTimeSeconds: regenerateOptions?.captureTimeSeconds,
				});

				if (!thumbnailResult.mediumUrl || !thumbnailResult.smallUrl) {
					toast.error("Impossible de générer la miniature", { id: toastId });
					options?.onError?.(videoUrl, "Impossible de générer la miniature");
					return;
				}

				// 2. Si mediaId fourni, persister en BD (incluant blurDataUrl)
				if (regenerateOptions?.mediaId) {
					const formData = new FormData();
					formData.set("mediaId", regenerateOptions.mediaId);
					formData.set("thumbnailUrl", thumbnailResult.mediumUrl);
					formData.set("thumbnailSmallUrl", thumbnailResult.smallUrl);
					// Persister blurDataUrl si disponible (nouveau 2025 - P8)
					if (thumbnailResult.blurDataUrl) {
						formData.set("blurDataUrl", thumbnailResult.blurDataUrl);
					}

					const persistResult = await updateSkuMediaThumbnail(
						undefined,
						formData
					);

					if (persistResult.status !== ActionStatus.SUCCESS) {
						toast.error(persistResult.message, { id: toastId });
						options?.onError?.(videoUrl, persistResult.message);
						return;
					}
				}

				toast.success("Miniature régénérée avec succès", { id: toastId });
				options?.onSuccess?.(thumbnailResult, videoUrl);
			} catch {
				toast.error("Erreur lors de la régénération", { id: toastId });
				options?.onError?.(videoUrl, "Erreur lors de la régénération");
			} finally {
				setOptimisticUrl(null);
			}
		});
	};

	return {
		regenerate,
		regeneratingUrl: optimisticUrl,
		isRegenerating: isTransitionPending || optimisticUrl !== null,
	};
}
