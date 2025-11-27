"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { useDeleteUploadThingFile } from "@/shared/lib/uploadthing";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { startTransition, useState } from "react";
import { MediaTypeBadge } from "./media-type-badge";

interface GalleryImage {
	url: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
}

interface ImageGalleryProps {
	images: GalleryImage[];
	onRemove: (index: number) => void;
	/**
	 * Si true, ne supprime pas via UTAPI immédiatement.
	 * Utilisé pour le mode édition où la suppression est différée.
	 */
	skipUtapiDelete?: boolean;
}

interface ImageItemProps {
	image: GalleryImage;
	index: number;
	onRemove: () => void;
	skipUtapiDelete?: boolean;
}

function ImageItem({ image, index, onRemove, skipUtapiDelete }: ImageItemProps) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const { isPending, action } = useDeleteUploadThingFile({
		onSuccess: () => {
			onRemove();
			setShowDeleteDialog(false);
		},
	});

	const handleDelete = () => {
		// Si skipUtapiDelete, on supprime juste localement sans passer par UTAPI
		if (skipUtapiDelete) {
			onRemove();
			setShowDeleteDialog(false);
			return;
		}

		// Sinon, suppression immédiate via UTAPI
		const formData = new FormData();
		formData.append("fileUrl", image.url);
		startTransition(() => {
			action(formData);
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			setShowDeleteDialog(true);
		}
	};

	const isVideo = image.mediaType === "VIDEO";

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
						<video
							src={image.url}
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
							aria-label={
								image.altText ||
								`Aperçu vidéo de l'article, image ${index + 1} de la galerie`
							}
						>
							Votre navigateur ne supporte pas la lecture de vidéos.
						</video>
						{/* Badge VIDEO visible en permanence */}
						<div className="absolute top-2 right-2 z-10">
							<MediaTypeBadge type="VIDEO" size="sm" />
						</div>
						{/* Icône play au centre (visible quand pas de hover) */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
							<div className="bg-black/70 rounded-full p-3 shadow-xl">
								<svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 16 16">
									<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
								</svg>
							</div>
						</div>
					</div>
				) : (
					<Image
						src={image.url}
						alt={image.altText || `Galerie ${index + 1}`}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
						preload={index === 0}
						loading={index > 0 ? "lazy" : undefined}
					/>
				)}
			</div>

			{/* Overlay avec contrôles */}
			<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1">
				{/* Bouton de suppression - taille tactile optimale */}
				<Button
					type="button"
					variant="destructive"
					size="icon"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setShowDeleteDialog(true);
					}}
					disabled={isPending}
					className="h-11 w-11 md:h-9 md:w-9 rounded-full min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
					aria-label={`Supprimer le média numéro ${index + 1}`}
				>
					{isPending ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<X className="h-5 w-5" />
					)}
				</Button>
			</div>

			{/* Numéro d'ordre */}
			<div className="absolute bottom-1 left-1 pointer-events-none">
				<div className="bg-background/90 text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
					#{index + 1}
				</div>
			</div>

			{/* Dialog de confirmation de suppression */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirmer la suppression</DialogTitle>
						<DialogDescription>
							{skipUtapiDelete
								? "Êtes-vous sûr de vouloir supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
								: "Êtes-vous sûr de vouloir supprimer ce média de la galerie ? Cette action est irréversible."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isPending}>
								Annuler
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isPending}
							className="gap-2"
						>
							{isPending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								<>
									<X className="h-4 w-4" />
									{skipUtapiDelete ? "Supprimer" : "Supprimer définitivement"}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</motion.div>
	);
}

export function ImageGallery({ images, onRemove, skipUtapiDelete }: ImageGalleryProps) {
	return (
		<div
			className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full"
			role="list"
			aria-label="Galerie d'images du produit"
		>
			<AnimatePresence mode="popLayout">
				{images.map((image, index) => (
					<ImageItem
						key={image.url}
						image={image}
						index={index}
						onRemove={() => onRemove(index)}
						skipUtapiDelete={skipUtapiDelete}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}
