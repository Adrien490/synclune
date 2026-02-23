import { Suspense } from "react";

import { PageHeader } from "@/shared/components/page-header";
import { OrderDetailContent } from "./_components/order-detail-content";
import { OrderDetailSkeleton } from "./_components/order-detail-skeleton";

interface OrderPageProps {
	params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: OrderPageProps) {
	const { orderNumber } = await params;
	return { title: `Commande ${orderNumber}` };
}

export default async function OrderPage({ params }: OrderPageProps) {
	const { orderNumber } = await params;

	return (
		<>
			<PageHeader
				variant="compact"
				title={`Commande ${orderNumber}`}
				breadcrumbs={[{ label: "Commandes", href: "/commandes" }]}
			/>
			<Suspense fallback={<OrderDetailSkeleton />}>
				<OrderDetailContent orderNumber={orderNumber} />
			</Suspense>
		</>
	);
}
