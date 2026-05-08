"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useDuplicateProduct } from "@/modules/products/hooks/use-duplicate-product";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export const DUPLICATE_PRODUCT_DIALOG_ID = "duplicate-product";

interface DuplicateProductData {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DuplicateProductAlertDialog() {
	const duplicateDialog = useAlertDialog<DuplicateProductData>(DUPLICATE_PRODUCT_DIALOG_ID);
	const router = useRouter();
	const haptic = useHaptic();

	const { action, isPending } = useDuplicateProduct({
		onSuccess: (message, data) => {
			haptic("success");
			duplicateDialog.close();
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir le bijou",
					onClick: () =>
						withViewTransition(() =>
							router.push(`/admin/catalogue/produits/${data.slug}/modifier`),
						),
				},
			});
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			duplicateDialog.close();
		}
	};

	return (
		<AlertDialog open={duplicateDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="productId" value={duplicateDialog.data?.productId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Dupliquer ce bijou</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir dupliquer le bijou{" "}
									<strong>&quot;{duplicateDialog.data?.productTitle}&quot;</strong> ?
								</p>
								<p className="mt-4">Une copie sera créée avec :</p>
								<ul className="mt-2 list-inside list-disc space-y-1">
									<li>Le titre préfixé par &quot;Copie de&quot;</li>
									<li>Toutes les variantes et leurs images</li>
									<li>Le statut mis en &quot;Brouillon&quot;</li>
								</ul>
								<p className="text-muted-foreground mt-4 text-xs">
									Vous pourrez ensuite modifier le bijou dupliqué selon vos besoins.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Duplication…" : "Dupliquer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
