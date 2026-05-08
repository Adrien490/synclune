import { getOrderForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { notFound, redirect } from "next/navigation";
import { type Metadata } from "next";
import { CreateRefundForm } from "@/modules/refunds/components/admin/create-refund-form";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouveau remboursement - Administration",
	description: "Créer une demande de remboursement",
};

type NewRefundPageProps = {
	searchParams: Promise<{ orderId?: string }>;
};

export default async function NewRefundPage({ searchParams }: NewRefundPageProps) {
	const { orderId } = await searchParams;

	// Rediriger si pas d'orderId
	if (!orderId) {
		redirect("/admin/ventes/commandes");
	}

	// Récupérer la commande
	const order = await getOrderForRefund({ orderId });

	if (!order) {
		notFound();
	}

	// Vérifier que la commande peut être remboursée
	if (
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.REFUNDED
	) {
		redirect(`/admin/ventes/commandes/${orderId}`);
	}

	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/ventes/remboursements" label="Retour aux remboursements" />
			<CreateRefundForm order={order} />
		</div>
	);
}
