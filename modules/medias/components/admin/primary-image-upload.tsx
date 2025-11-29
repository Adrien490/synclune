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
import { useDeleteUploadThingFiles } from "@/modules/medias/lib/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { startTransition, useState } from "react";
import { MediaTypeBadge } from "@/modules/medias/components/media-type-badge";

interface PrimaryImageUploadProps {
	imageUrl?: string;
	mediaType?: "IMAGE" | "VIDEO";
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
	onRemove,
	renderUploadZone,
	skipUtapiDelete,
}: PrimaryImageUploadProps) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const { isPending, deleteFiles } = useDeleteUploadThingFiles({
		onSuccess: () => {
			onRemove();
			setShowDeleteDialog(false);
		},
	});

	const handleDelete = () => {
		if (!imageUrl) return;

		// Si skipUtapiDelete, on supprime juste localement sans passer par UTAPI
		if (skipUtapiDelete) {
			onRemove();
			setShowDeleteDialog(false);
			return;
		}

		// Sinon, suppression immédiate via UTAPI
		startTransition(() => {
			deleteFiles(imageUrl);
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
						className="relative w-full max-w-md"
					>
						<div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-primary/20 shadow group bg-muted">
							{mediaType === "VIDEO" ? (
								<div className="relative w-full h-full">
									<video
										src={imageUrl}
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
										Votre navigateur ne supporte pas la lecture de vidéos.
									</video>
									{/* Badge VIDEO */}
									<div className="absolute top-2 right-2 z-10">
										<MediaTypeBadge type="VIDEO" size="md" />
									</div>
									{/* Icône play au centre */}
									<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
										<div className="bg-black/70 rounded-full p-4 shadow-xl">
											<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 16 16">
												<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
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
									sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
									quality={80}
								/>
							)}

							{/* Badge étoile (seulement si IMAGE) */}
							{mediaType !== "VIDEO" && (
								<div className="absolute top-2 left-2 z-10">
									<div className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md shadow flex items-center gap-1">
										<span>★</span>
										<span>Principal</span>
									</div>
								</div>
							)}

							{/* Overlay au hover */}
							<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={() => setShowDeleteDialog(true)}
									disabled={isPending}
									className="gap-2"
									aria-label="Supprimer l'image principale"
								>
									<X className="h-4 w-4" />
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

			{/* Dialog de confirmation de suppression */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirmer la suppression</DialogTitle>
						<DialogDescription>
							{skipUtapiDelete
								? "Êtes-vous sûr de vouloir supprimer ce média principal ? Les modifications seront effectives après validation du formulaire."
								: "Êtes-vous sûr de vouloir supprimer ce média principal ? Cette action est irréversible."}
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
		</div>
	);
}
