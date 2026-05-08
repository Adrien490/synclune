import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RefundDetailPage } from "@/modules/refunds/components/admin/refund-detail-page";
import { getRefundById } from "@/modules/refunds/data/get-refund";

import { RefundsAdminDialogs } from "../_components/refunds-admin-dialogs";

interface RefundDetailRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RefundDetailRouteProps): Promise<Metadata> {
	const { id } = await params;
	const refund = await getRefundById({ id });

	if (!refund) {
		return { title: "Remboursement introuvable - Administration" };
	}

	return {
		title: `Remboursement ${refund.order.orderNumber} - Administration`,
		description: `Détail du remboursement de la commande ${refund.order.orderNumber}`,
	};
}

export default async function RefundDetailRoute({ params }: RefundDetailRouteProps) {
	const { id } = await params;
	const refund = await getRefundById({ id });

	if (!refund) {
		notFound();
	}

	return (
		<>
			<RefundDetailPage refund={refund} />
			<RefundsAdminDialogs />
		</>
	);
}
