"use client";

import { ExternalLink, Pencil, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvoiceStatus } from "@/app/generated/prisma/browser";
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

	const canEdit = order.invoiceStatus !== InvoiceStatus.GENERATED;

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
				<div>
					{order.userId ? (
						<Link
							href={`/admin/clients?search=${encodeURIComponent(order.customerEmail)}`}
							className="hover:text-primary inline-flex items-center gap-1 font-medium transition-colors hover:underline"
							aria-label={`Voir le profil de ${order.customerName}`}
						>
							{order.customerName}
							<ExternalLink className="size-3" aria-hidden="true" />
						</Link>
					) : (
						<>
							<p className="font-medium">{order.customerName}</p>
							<p className="text-muted-foreground text-xs">Client non enregistré</p>
						</>
					)}
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
