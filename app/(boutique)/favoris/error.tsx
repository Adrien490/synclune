"use client";

import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { Heart, RefreshCw } from "lucide-react";
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";

export default function WishlistError({ reset }: ErrorPageProps) {
	return (
		<div className="relative min-h-screen">
			<PageHeader title="Mes favoris" breadcrumbs={[{ label: "Mes favoris", href: "/favoris" }]} />

			<section className="bg-background relative z-10 pt-4 pb-12 lg:pt-6 lg:pb-16">
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Heart className="text-muted-foreground size-6" />
							</EmptyMedia>
							<EmptyTitle>Impossible de charger vos favoris</EmptyTitle>
						</EmptyHeader>
						<EmptyContent>
							<p className="text-muted-foreground mb-6 max-w-md">
								Une erreur est survenue lors du chargement de votre wishlist. Réessayez dans
								quelques instants.
							</p>
							<div className="flex flex-col gap-3 sm:flex-row">
								<Button onClick={reset} variant="primary" size="lg">
									<RefreshCw className="mr-2 size-4" />
									Réessayer
								</Button>
								<Button asChild variant="outline" size="lg">
									<Link href={ROUTES.SHOP.PRODUCTS}>Continuer mes achats</Link>
								</Button>
							</div>
						</EmptyContent>
					</Empty>
				</div>
			</section>
		</div>
	);
}
