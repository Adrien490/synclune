"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useUpdateProductCollections } from "@/modules/products/hooks/admin/use-update-product-collections";
import {
	getAllCollections,
	getProductCollections,
} from "@/modules/products/actions/admin/update-product-collections";
import { Loader2, FolderOpen } from "lucide-react";

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
	const [isLoading, setIsLoading] = useState(false);

	const { update, isPending } = useUpdateProductCollections({
		onSuccess: () => {
			close();
		},
	});

	// Load collections and current product collections when dialog opens
	useEffect(() => {
		if (isOpen && data) {
			setIsLoading(true);
			Promise.all([getAllCollections(), getProductCollections(data.productId)])
				.then(([allCollections, productCollections]) => {
					setCollections(allCollections);
					setSelectedIds(new Set(productCollections.map((c) => c.id)));
				})
				.catch((error) => {
					console.error("Error loading collections:", error);
				})
				.finally(() => {
					setIsLoading(false);
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
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent className="sm:max-w-[450px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Gérer les collections</DialogTitle>
						<DialogDescription>
							Produit: <span className="font-semibold">{data?.productTitle}</span>
						</DialogDescription>
					</DialogHeader>

					<div className="py-6">
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : collections.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<FolderOpen className="h-8 w-8 mx-auto mb-2" />
								<p>Aucune collection disponible</p>
							</div>
						) : (
							<div className="space-y-3 max-h-[300px] overflow-y-auto">
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

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
							disabled={isPending || isLoading}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={isPending || isLoading}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Enregistrement...
								</>
							) : (
								<>Enregistrer</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
