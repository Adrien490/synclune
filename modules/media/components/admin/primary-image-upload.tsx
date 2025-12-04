"use client";

import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { MediaTypeBadge } from "@/modules/media/components/media-type-badge";
import { DELETE_PRIMARY_IMAGE_DIALOG_ID } from "./delete-primary-image-alert-dialog";

/**
 * Détecte le type de média à partir de l'URL si non fourni
 */
function detectMediaTypeFromUrl(url?: string): "IMAGE" | "VIDEO" | undefined {
	if (!url) return undefined;
	const extension = url.toLowerCase().match(/\.(\w+)(?:\?|#|$)/)?.[1];
	const videoExtensions = ["mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv"];
	if (extension && videoExtensions.includes(extension)) {
		return "VIDEO";
	}
	return "IMAGE";
}

interface PrimaryImageUploadProps {
	imageUrl?: string;
	mediaType?: "IMAGE" | "VIDEO";
	/**
	 * URL de la miniature pour les vidéos (poster)
	 */
	thumbnailUrl?: string;
	onRemove: () => void;
	renderUploadZone: () => React.ReactNode;
	/**
	 * Si true, ne supprime pas via UTAPI immédiatement.
	 * Utilisé pour le mode édition où la suppression est différée.
	 */
	skipUtapiDelete?: boolean;
}

export function PrimaryImageUpload({
	imageUrl,
	mediaType,
	thumbnailUrl,
	onRemove,
	renderUploadZone,
	skipUtapiDelete,
}: PrimaryImageUploadProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const deleteDialog = useAlertDialog(DELETE_PRIMARY_IMAGE_DIALOG_ID);

	// Détection automatique du mediaType si non fourni
	const effectiveMediaType = mediaType ?? detectMediaTypeFromUrl(imageUrl);

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
			{/* Image uploadée */}
			<AnimatePresence mode="wait">
				{imageUrl ? (
					<motion.div
						key="primary-image-preview"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.3 }}
						className="relative w-full max-w-xs sm:max-w-sm"
					>
						<div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-primary/20 shadow group bg-muted">
							{effectiveMediaType === "VIDEO" ? (
								<div
									className="relative w-full h-full"
									role="img"
									aria-label="Aperçu du média principal"
								>
									<video
										ref={videoRef}
										src={imageUrl}
										poster={thumbnailUrl}
										className="w-full h-full object-cover"
										loop
										muted
										playsInline
										preload="none"
										onMouseEnter={(e) => {
											// Throttle: charger et jouer seulement si pas déjà en cours
											if (e.currentTarget.readyState === 0) {
												e.currentTarget.load();
											}
											void e.currentTarget.play();
										}}
										onMouseLeave={(e) => {
											e.currentTarget.pause();
											e.currentTarget.currentTime = 0;
										}}
										aria-label="Aperçu vidéo du média principal"
									>
										Ton navigateur ne supporte pas la lecture de vidéos.
									</video>
									{/* Badge VIDEO */}
									<div className="absolute top-2 right-2 z-10">
										<MediaTypeBadge type="VIDEO" size="md" />
									</div>
									{/* Icône play au centre */}
									<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
										<div className="bg-black/70 rounded-full p-4 shadow-xl">
											<svg
												className="w-8 h-8 text-white"
												fill="currentColor"
												viewBox="0 0 16 16"
											>
												<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
											</svg>
										</div>
									</div>
								</div>
							) : (
								<Image
									src={imageUrl}
									alt="Image principale"
									fill
									className="object-cover"
									sizes="(max-width: 640px) 320px, 384px"
									quality={80}
								/>
							)}

							{/* Badge Principal (toujours visible) */}
							<div className="absolute top-2 left-2 z-10">
								<div className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md shadow flex items-center gap-1">
									<span>★</span>
									<span>Principal</span>
								</div>
							</div>

							{/* Overlay au hover/focus */}
							<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
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
					</motion.div>
				) : (
					<motion.div
						key="primary-image-upload-zone"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="w-full"
					>
						{renderUploadZone()}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
