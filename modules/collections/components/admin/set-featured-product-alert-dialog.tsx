"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Star } from "lucide-react";
import { useSetFeaturedProduct } from "../../hooks/use-set-featured-product";

export const SET_FEATURED_PRODUCT_DIALOG_ID = "set-featured-product";

interface SetFeaturedProductData {
	collectionId: string;
	collectionSlug: string;
	productId: string;
	productTitle: string;
	isFeatured: boolean;
	[key: string]: unknown;
}

export function SetFeaturedProductAlertDialog() {
	const dialog = useAlertDialog<SetFeaturedProductData>(
		SET_FEATURED_PRODUCT_DIALOG_ID
	);

	const { setFeatured, removeFeatured, isPending } = useSetFeaturedProduct({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const handleConfirm = () => {
		if (!dialog.data) return;

		if (dialog.data.isFeatured) {
			removeFeatured(dialog.data.collectionId, dialog.data.productId);
		} else {
			setFeatured(dialog.data.collectionId, dialog.data.productId);
		}
	};

	const isFeatured = dialog.data?.isFeatured || false;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Star
							className={`h-5 w-5 ${
								isFeatured
									? "fill-yellow-400 text-yellow-400"
									: "text-muted-foreground"
							}`}
						/>
						{isFeatured ? "Retirer le produit vedette" : "Definir le produit vedette"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{isFeatured ? (
							<>
								Voulez-vous retirer le statut vedette de{" "}
								<strong>&quot;{dialog.data?.productTitle}&quot;</strong> ?
								<br />
								<br />
								La collection n'aura plus de produit vedette et affichera le
								produit le plus recent comme image representative.
							</>
						) : (
							<>
								Voulez-vous definir{" "}
								<strong>&quot;{dialog.data?.productTitle}&quot;</strong> comme
								produit vedette de cette collection ?
								<br />
								<br />
								Ce produit sera utilise comme image representative de la
								collection sur la page d'accueil et dans les listes.
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button" disabled={isPending}>
						Annuler
					</AlertDialogCancel>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={isPending}
						variant={isFeatured ? "outline" : "default"}
					>
						{isPending ? (isFeatured ? "Retrait..." : "Definition...") : isFeatured ? "Retirer" : "Definir comme vedette"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
