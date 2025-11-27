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
import { useDeleteUploadThingFiles } from "@/shared/lib/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { startTransition, useState } from "react";

interface CollectionImageUploadProps {
	imageUrl?: string;
	onRemove: () => void;
	renderUploadZone: () => React.ReactNode;
	/**
	 * ID de la collection existante (si en mode UPDATE)
	 * Si présent, on ne supprime pas l'image immédiatement (gestion par server action)
	 * Si absent (mode CREATE), on supprime immédiatement via UTApi
	 */
	collectionId?: string;
}

export function CollectionImageUpload({
	imageUrl,
	onRemove,
	renderUploadZone,
	collectionId,
}: CollectionImageUploadProps) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const isEditMode = Boolean(collectionId);

	const { isPending, deleteFiles } = useDeleteUploadThingFiles({
		onSuccess: () => {
			onRemove();
			setShowDeleteDialog(false);
		},
	});

	const handleDelete = () => {
		if (!imageUrl) return;

		// En mode CREATE (pas de collectionId), on supprime immédiatement l'image
		if (!isEditMode) {
			startTransition(() => {
				deleteFiles(imageUrl);
			});
		} else {
			// En mode UPDATE, on vide juste le champ (la server action gérera la suppression)
			onRemove();
			setShowDeleteDialog(false);
		}
	};

	return (
		<div className="space-y-3">
			{/* Image uploadée */}
			<AnimatePresence mode="wait">
				{imageUrl ? (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.3 }}
						className="relative w-full"
					>
						<div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-primary/20 shadow group bg-muted">
							<Image
								src={imageUrl}
								alt="Image de la collection"
								fill
								className="object-cover"
								sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
							/>

							{/* Overlay au hover */}
							<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={() => setShowDeleteDialog(true)}
									disabled={isPending}
									className="gap-2"
									aria-label="Supprimer l'image de la collection"
								>
									<X className="h-4 w-4" />
									Supprimer
								</Button>
							</div>
						</div>
					</motion.div>
				) : (
					<motion.div
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
							{!isEditMode
								? "Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible."
								: "Êtes-vous sûr de vouloir retirer cette image ? L'image sera définitivement supprimée lors de la validation du formulaire."}
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
									Supprimer définitivement
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
