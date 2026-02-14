"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Label } from "@/shared/components/ui/label";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useUpdateProductCollections } from "@/modules/products/hooks/use-update-product-collections";
import {
	getAllCollections,
	getProductCollections,
} from "@/modules/products/data/get-product-collections";
import { Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export const MANAGE_COLLECTIONS_DIALOG_ID = "manage-product-collections";

type ManageCollectionsDialogData = {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
};

type Collection = { id: string; name: string };

export function ManageCollectionsDialog() {
	const { isOpen, data, close } = useDialog<ManageCollectionsDialogData>(
		MANAGE_COLLECTIONS_DIALOG_ID
	);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isLoadingData, startLoadTransition] = useTransition();

	const { update, isPending } = useUpdateProductCollections({
		onSuccess: () => {
			close();
		},
	});

	// Load collections and current product collections when dialog opens
	useEffect(() => {
		if (isOpen && data) {
			startLoadTransition(async () => {
				try {
					const [allCollections, productCollections] = await Promise.all([
						getAllCollections(),
						getProductCollections(data.productId),
					]);
					setCollections(allCollections);
					setSelectedIds(new Set(productCollections.map((c) => c.id)));
				} catch {
					toast.error("Erreur lors du chargement des collections");
				}
			});
		}
	}, [isOpen, data]);

	const handleToggle = (collectionId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(collectionId)) {
				next.delete(collectionId);
			} else {
				next.add(collectionId);
			}
			return next;
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!data) return;
		update(data.productId, data.productTitle, Array.from(selectedIds));
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-[450px]">
				<form onSubmit={handleSubmit}>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Gérer les collections</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Produit: <span className="font-semibold">{data?.productTitle}</span>
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-6">
						{isLoadingData ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : collections.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<FolderOpen className="h-8 w-8 mx-auto mb-2" />
								<p>Aucune collection disponible</p>
							</div>
						) : (
							<div className="space-y-3 max-h-75 overflow-y-auto">
								{collections.map((collection) => (
									<div
										key={collection.id}
										className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
										onClick={() => handleToggle(collection.id)}
									>
										<Checkbox
											id={collection.id}
											checked={selectedIds.has(collection.id)}
											onCheckedChange={() => handleToggle(collection.id)}
											disabled={isPending}
										/>
										<Label
											htmlFor={collection.id}
											className="flex-1 cursor-pointer font-normal"
										>
											{collection.name}
										</Label>
									</div>
								))}
							</div>
						)}
					</div>

					<ResponsiveDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
							disabled={isPending || isLoadingData}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={isPending || isLoadingData}>
							{isPending ? "Enregistrement..." : "Enregistrer"}
						</Button>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
