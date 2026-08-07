"use client";

import { PencilSimpleIcon, UserIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { EDIT_CUSTOMER_INFO_DIALOG_ID } from "../edit-customer-info-dialog";
import type { OrderCustomerCardProps } from "./types";

export function OrderCustomerCard({ order }: OrderCustomerCardProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const editDialog = useAlertDialog(EDIT_CUSTOMER_INFO_DIALOG_ID);

	// invoiceNumber et non invoiceStatus : une facture VOIDED garde son numéro et
	// son avoir est rendu depuis les colonnes vivantes — l'identité client reste
	// verrouillée après void (Art. 272-I / L102 B).
	const canEdit = order.invoiceNumber === null;

	const handleEdit = () => {
		haptic("light");
		if (isMobile) {
			router.push(`/admin/ventes/commandes/${order.id}/client`);
			return;
		}
		editDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			customerEmail: order.customerEmail,
			customerName: order.customerName,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="flex items-center gap-2">
					<UserIcon className="size-5" aria-hidden="true" />
					Client
				</CardTitle>
				{canEdit && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleEdit}
						className="min-h-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9"
					>
						<PencilSimpleIcon className="size-4" aria-hidden="true" />
						Modifier
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				{/*
				 * Plus de lien vers une fiche client : `/admin/clients` a disparu avec
				 * l'espace client (2026-07-31). Toute commande est désormais un achat
				 * invité, et ce que l'admin doit lire ici est le SNAPSHOT figé sur la
				 * commande (invariant #5) — pas un profil vivant.
				 */}
				<div>
					<p className="font-medium">{order.customerName}</p>
					<p className="text-muted-foreground text-sm break-words">{order.customerEmail}</p>
					{/* Le téléphone est celui du snapshot de livraison : il s'affiche et
					    s'édite dans la carte « Livraison ». `Order.customerPhone`, jamais
					    renseignée au checkout, a été retirée le 2026-08-04. */}
				</div>
			</CardContent>
		</Card>
	);
}
