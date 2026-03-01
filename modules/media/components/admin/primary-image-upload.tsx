"use client";

import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { AnimatePresence, m } from "motion/react";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { MediaTypeBadge } from "@/shared/components/ui/media-type-badge";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { DELETE_PRIMARY_IMAGE_DIALOG_ID } from "./delete-primary-image-alert-dialog";
import { isVideoUrl } from "@/modules/media/utils/media-type-detection";

/**
 * Detects the media type from URL if not provided.
 * Uses isVideoUrl() from centralized media-type-detection utility.
 */
function detectMediaTypeFromUrl(url?: string): "IMAGE" | "VIDEO" | undefined {
	if (!url) return undefined;
	return isVideoUrl(url) ? "VIDEO" : "IMAGE";
}

interface PrimaryImageUploadProps {
	imageUrl?: string;
	mediaType?: "IMAGE" | "VIDEO";
	/**
	 * Thumbnail URL for videos (poster)
	 */
	thumbnailUrl?: string;
	onRemove: () => void;
	renderUploadZone: () => React.ReactNode;
	/**
	 * If true, don't delete via UTAPI immediately.
	 * Used for edit mode where deletion is deferred.
	 */
	skipUtapiDelete?: boolean;
	/**
	 * Product name for descriptive alt text (a11y)
	 */
	productName?: string;
}

export function PrimaryImageUpload({
	imageUrl,
	mediaType,
	thumbnailUrl,
	onRemove,
	renderUploadZone,
	skipUtapiDelete,
	productName,
}: PrimaryImageUploadProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoError, setVideoError] = useState(false);
	const deleteDialog = useAlertDialog(DELETE_PRIMARY_IMAGE_DIALOG_ID);

	// Auto-detect mediaType if not provided
	const effectiveMediaType = mediaType ?? detectMediaTypeFromUrl(imageUrl);

	// Reset error state when URL changes
	useEffect(() => {
		queueMicrotask(() => setVideoError(false));
	}, [imageUrl]);

	// Cleanup video element on unmount or when URL changes to prevent memory leaks
	useEffect(() => {
		const video = videoRef.current;
		return () => {
			if (video) {
				video.pause();
				video.src = "";
				video.load();
			}
		};
	}, [imageUrl]);

	const handleOpenDeleteDialog = () => {
		if (!imageUrl) return;
		deleteDialog.open({
			imageUrl,
			skipUtapiDelete,
			onRemove,
		});
	};

	return (
		<div className="space-y-3">
			{/* Uploaded image */}
			<AnimatePresence mode="wait">
				{imageUrl ? (
					<m.div
						key="primary-image-preview"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.3 }}
						className="relative w-full max-w-xs sm:max-w-sm"
					>
						<div className="border-primary/20 group bg-muted relative aspect-square w-full overflow-hidden rounded-lg border-2 shadow">
							{effectiveMediaType === "VIDEO" ? (
								<div
									className="relative h-full w-full"
									role="img"
									aria-label="Aperçu du média principal"
								>
									{videoError ? (
										<MediaErrorFallback
											type="video"
											onRetry={() => {
												setVideoError(false);
												if (videoRef.current) {
													videoRef.current.load();
												}
											}}
										/>
									) : (
										<video
											ref={videoRef}
											src={imageUrl}
											poster={thumbnailUrl}
											className="h-full w-full object-cover"
											loop
											muted
											playsInline
											preload="none"
											onMouseEnter={(e) => {
												// Throttle: load and play only if not already in progress
												if (e.currentTarget.readyState === 0) {
													e.currentTarget.load();
												}
												void e.currentTarget.play();
											}}
											onMouseLeave={(e) => {
												e.currentTarget.pause();
												e.currentTarget.currentTime = 0;
											}}
											onError={() => setVideoError(true)}
											aria-label="Aperçu vidéo du média principal"
										>
											<track kind="captions" srcLang="fr" label="Français" default />
											Votre navigateur ne supporte pas la lecture de vidéos.
										</video>
									)}
									{/* VIDEO badge */}
									<div className="absolute top-2 right-2 z-10">
										<MediaTypeBadge type="VIDEO" size="md" />
									</div>
									{/* Centered play icon */}
									<div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
										<div className="rounded-full bg-black/70 p-4 shadow-xl">
											<svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 16 16">
												<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
											</svg>
										</div>
									</div>
								</div>
							) : (
								<Image
									src={imageUrl}
									alt={productName ? `Image principale - ${productName}` : "Image principale"}
									fill
									className="object-cover"
									sizes="(max-width: 640px) 320px, 384px"
									quality={80}
								/>
							)}

							{/* Primary badge (always visible) */}
							<div className="absolute top-2 left-2 z-10">
								<div className="bg-primary text-primary-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow">
									<span>★</span>
									<span>Principal</span>
								</div>
							</div>

							{/* Hover/focus overlay */}
							<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={handleOpenDeleteDialog}
									className="gap-2"
									aria-label="Supprimer le média principal"
								>
									<Trash2 className="h-4 w-4" />
									Supprimer
								</Button>
							</div>
						</div>
					</m.div>
				) : (
					<m.div
						key="primary-image-upload-zone"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="w-full"
					>
						{renderUploadZone()}
					</m.div>
				)}
			</AnimatePresence>
		</div>
	);
}
