"use client";

import { Pencil, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
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
			customerPhone: order.customerPhone,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="flex items-center gap-2">
					<User className="size-5" aria-hidden="true" />
					Client
				</CardTitle>
				{canEdit && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleEdit}
						className="min-h-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9"
					>
						<Pencil className="size-4" aria-hidden="true" />
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
					{order.customerPhone && (
						<p className="text-muted-foreground flex items-center gap-1 text-sm">
							<Phone className="size-3" aria-hidden="true" />
							{order.customerPhone}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
