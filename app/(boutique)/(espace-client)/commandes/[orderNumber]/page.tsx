import { Suspense } from "react";

import { OrderDetailContent } from "./_components/order-detail-content";
import { OrderDetailSkeleton } from "./_components/order-detail-skeleton";

interface OrderPageProps {
	params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: OrderPageProps) {
	const { orderNumber } = await params;
	return { title: `Commande ${orderNumber}` };
}

export default function OrderPage({ params }: OrderPageProps) {
	return (
		<Suspense fallback={<OrderDetailSkeleton />}>
			<OrderPageContent paramsPromise={params} />
		</Suspense>
	);
}

async function OrderPageContent({
	paramsPromise,
}: {
	paramsPromise: Promise<{ orderNumber: string }>;
}) {
	const { orderNumber } = await paramsPromise;

	return (
		<Suspense fallback={<OrderDetailSkeleton />}>
			<OrderDetailContent orderNumber={orderNumber} />
		</Suspense>
	);
}
