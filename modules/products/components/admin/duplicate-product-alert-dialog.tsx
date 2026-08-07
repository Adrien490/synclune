"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useDuplicateProduct } from "@/modules/products/hooks/use-duplicate-product";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";
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

	const { action } = useDuplicateProduct({
		onSuccess: (message, data) => {
			haptic("success");
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

	return (
		<ConfirmDialog
			open={duplicateDialog.isOpen}
			onClose={duplicateDialog.close}
			action={action}
			tone="info"
			fields={{ productId: duplicateDialog.data?.productId }}
			title="Dupliquer ce bijou"
			confirmLabel="Dupliquer"
			description={
				<>
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
				</>
			}
		/>
	);
}
