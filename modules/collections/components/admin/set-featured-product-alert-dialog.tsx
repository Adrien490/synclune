"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { LoaderCircle, Star } from "lucide-react";
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
	const dialog = useAlertDialog<SetFeaturedProductData>(SET_FEATURED_PRODUCT_DIALOG_ID);

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

	const isFeatured = dialog.data?.isFeatured ?? false;

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle className="flex items-center gap-2">
						<Star
							className={cn(
								"size-5",
								isFeatured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
							)}
						/>
						{isFeatured ? "Retirer le produit vedette" : "Definir le produit vedette"}
					</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription asChild>
						<div className="space-y-3">
							{isFeatured ? (
								<>
									<p>
										Voulez-vous retirer le statut vedette de{" "}
										<strong>&quot;{dialog.data?.productTitle}&quot;</strong> ?
									</p>
									<p>
										La collection n'aura plus de produit vedette et affichera le produit le plus
										recent comme image representative.
									</p>
								</>
							) : (
								<>
									<p>
										Voulez-vous definir <strong>&quot;{dialog.data?.productTitle}&quot;</strong>{" "}
										comme produit vedette de cette collection ?
									</p>
									<p>
										Ce produit sera utilise comme image representative de la collection sur la page
										d'accueil et dans les listes.
									</p>
								</>
							)}
						</div>
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
					<ResponsiveAlertDialogAction
						type="button"
						onClick={handleConfirm}
						disabled={isPending}
						aria-busy={isPending}
					>
						{isPending && <LoaderCircle className="animate-spin" />}
						{isPending
							? isFeatured
								? "Retrait…"
								: "Definition…"
							: isFeatured
								? "Retirer"
								: "Definir comme vedette"}
					</ResponsiveAlertDialogAction>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
