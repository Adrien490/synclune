"use client";

import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { MediaTypeBadge } from "@/modules/medias/components/media-type-badge";
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";

export interface GalleryMedia {
	url: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl?: string | null;
}

interface MediaGalleryProps {
	images: GalleryMedia[];
	onRemove: (index: number) => void;
	/**
	 * Si true, ne supprime pas via UTAPI immédiatement.
	 * Utilisé pour le mode édition où la suppression est différée.
	 */
	skipUtapiDelete?: boolean;
	/** URLs des vidéos dont la miniature est en cours de génération */
	generatingThumbnails?: Set<string>;
}

interface MediaItemProps {
	media: GalleryMedia;
	index: number;
	onRemove: () => void;
	skipUtapiDelete?: boolean;
	isGeneratingThumbnail?: boolean;
}

function MediaItem({
	media,
	index,
	onRemove,
	skipUtapiDelete,
	isGeneratingThumbnail,
}: MediaItemProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);

	const handleOpenDeleteDialog = () => {
		deleteDialog.open({
			index,
			url: media.url,
			skipUtapiDelete,
			onRemove,
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			handleOpenDeleteDialog();
		}
	};

	const isVideo = media.mediaType === "VIDEO";

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			transition={{ delay: index * 0.05 }}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			role="listitem"
			aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}`}
			className={cn(
				"group relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all shrink-0",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			)}
		>
			<div className="relative w-full h-full bg-muted">
				{isVideo ? (
					<div className="relative w-full h-full">
						{/* Thumbnail si disponible, sinon vidéo avec lecture au hover */}
						{media.thumbnailUrl ? (
							<Image
								src={media.thumbnailUrl}
								alt={media.altText || `Miniature vidéo ${index + 1}`}
								fill
								className="object-cover"
								sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
								quality={80}
								loading="lazy"
							/>
						) : (
							<video
								src={media.url}
								className="w-full h-full object-cover"
								loop
								muted
								playsInline
								preload="none"
								onMouseEnter={(e) => {
									if (e.currentTarget.readyState === 0) {
										e.currentTarget.load();
									}
									void e.currentTarget.play();
								}}
								onMouseLeave={(e) => {
									e.currentTarget.pause();
									e.currentTarget.currentTime = 0;
								}}
								aria-label={media.altText || `Aperçu vidéo ${index + 1}`}
							>
								Votre navigateur ne supporte pas la lecture de vidéos.
							</video>
						)}
						{/* Badge VIDEO visible en permanence */}
						<div className="absolute top-2 right-2 z-10">
							<MediaTypeBadge type="VIDEO" size="sm" />
						</div>
						{/* Icône play au centre (visible quand pas de hover) */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
							<div className="bg-black/70 rounded-full p-3 shadow-xl">
								<svg
									className="w-6 h-6 text-white"
									fill="currentColor"
									viewBox="0 0 16 16"
								>
									<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
								</svg>
							</div>
						</div>
						{/* Loader pendant génération de miniature */}
						{isGeneratingThumbnail && (
							<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
								<Loader2 className="h-8 w-8 text-white animate-spin" />
							</div>
						)}
					</div>
				) : (
					<Image
						src={media.url}
						alt={media.altText || `Galerie ${index + 1}`}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
						quality={80}
						loading={index > 0 ? "lazy" : undefined}
					/>
				)}
			</div>

			{/* Overlay avec contrôles */}
			<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
				{/* Bouton de suppression - taille tactile optimale */}
				<Button
					type="button"
					variant="destructive"
					size="icon"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleOpenDeleteDialog();
					}}
					className="h-11 w-11 md:h-9 md:w-9 rounded-full min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
					aria-label={`Supprimer le média numéro ${index + 1}`}
				>
					<Trash2 className="h-5 w-5" />
				</Button>
			</div>

			{/* Numéro d'ordre */}
			<div className="absolute bottom-1 left-1 pointer-events-none">
				<div className="bg-background/90 text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
					#{index + 1}
				</div>
			</div>
		</motion.div>
	);
}

export function MediaGallery({
	images,
	onRemove,
	skipUtapiDelete,
	generatingThumbnails,
}: MediaGalleryProps) {
	return (
		<div
			className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full"
			role="list"
			aria-label="Galerie de médias du produit"
		>
			<AnimatePresence mode="popLayout">
				{images.map((media, index) => (
					<MediaItem
						key={media.url}
						media={media}
						index={index}
						onRemove={() => onRemove(index)}
						skipUtapiDelete={skipUtapiDelete}
						isGeneratingThumbnail={
							media.mediaType === "VIDEO" &&
							generatingThumbnails?.has(media.url)
						}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}

// Export pour rétrocompatibilité (à supprimer après migration complète)
export { MediaGallery as ImageGallery };
export type { GalleryMedia as GalleryImage };
