import { Stagger } from "@/shared/components/animations";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { Package } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { OrderCard } from "./order-card";

interface OrdersListProps {
	ordersPromise: ReturnType<typeof getUserOrders>;
}

export function OrdersList({ ordersPromise }: OrdersListProps) {
	const { orders, pagination } = use(ordersPromise);

	// Afficher le composant Empty si aucune commande
	if (!orders || orders.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Package />
					</EmptyMedia>
					<EmptyTitle>Aucune commande pour le moment</EmptyTitle>
					<EmptyDescription>
						Vous n'avez pas encore passé de commande. Découvrez nos créations
						uniques et laissez-vous tenter par nos bijoux faits main avec amour.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Button
							asChild
							variant="primary"
							size="lg"
						>
							<Link href="/produits">✨ Découvrir la boutique</Link>
						</Button>

						<Button asChild variant="primary" size="lg">
							<Link href="/collections">💎 Voir les collections</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<div className="space-y-8">
			{/* Liste des commandes avec animation stagger */}
			<Stagger className="space-y-4" stagger={0.1} delay={0.1}>
				{orders.map((order) => (
					<div key={order.id} className="order-item">
						<OrderCard order={order} />
					</div>
				))}
			</Stagger>

			{/* Pagination */}
			{(pagination.hasNextPage || pagination.hasPreviousPage) && (
				<div className="flex justify-center mt-8">
					<CursorPagination
						perPage={orders.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={orders.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			)}
		</div>
	);
}
