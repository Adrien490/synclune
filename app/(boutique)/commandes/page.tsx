import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { OrdersList } from "@/modules/orders/components/orders-list";
import { OrdersListSkeleton } from "@/modules/orders/components/orders-list-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes commandes - Synclune | Suivi des commandes",
	description:
		"Suivez vos commandes Synclune. Consultez l'historique, le statut de livraison et les détails de vos bijoux commandés.",
	keywords: [
		"mes commandes",
		"suivi commande",
		"Synclune",
		"livraison",
		"historique commandes",
		"bijoux commandés",
	],
	robots: {
		index: false,
		follow: true,
	},
	openGraph: {
		title: "Mes commandes - Synclune",
		description:
			"Suivez toutes vos commandes de bijoux Synclune en temps réel.",
		type: "website",
		url: "/commandes",
	},
};

type OrdersPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
	}>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	// Note: La vérification d'authentification est gérée par le middleware
	// Si l'utilisateur n'est pas connecté, il sera redirigé vers /login automatiquement

	const params = await searchParams;

	// Extraire les paramètres
	const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
	const direction = (
		typeof params.direction === "string" ? params.direction : "forward"
	) as "forward" | "backward";
	const perPage = Number(params.perPage) || 10;

	// Créer la promise pour les commandes de l'utilisateur connecté
	const ordersPromise = getUserOrders({
		cursor,
		direction,
		perPage,
		sortBy: "created-descending",
	});

	return (
		<div className="py-8 lg:py-12 relative min-h-screen">
			{/* Background minimal - Pages fonctionnelles */}
			<ParticleSystem variant="minimal" className="fixed inset-0 z-0" />

			{/* Header section */}
			<section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl mb-8 relative z-10">
				<div className="text-center">
					<div className="w-20 h-20 mx-auto mb-6 bg-linear-icon-rose rounded-2xl flex items-center justify-center shadow-lg">
						<span className="text-4xl">📦</span>
					</div>
					<h1 className="text-2xl/8 lg:text-3xl/9 tracking-tight antialiased font-bold text-primary mb-4">
						Mes commandes
					</h1>
					<p className="text-xl/7 tracking-normal antialiased font-medium text-secondary mb-4">
						Suivez vos bijoux
					</p>
					<p className="text-base/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto">
						Retrouvez ici toutes vos commandes. Je prépare chaque bijou avec soin,
						et vous pouvez suivre l'avancée ici !
					</p>
				</div>
			</section>

			{/* Contenu principal avec Suspense */}
			<section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10">
				<Suspense fallback={<OrdersListSkeleton />}>
					<OrdersList ordersPromise={ordersPromise} />
				</Suspense>
			</section>
		</div>
	);
}
