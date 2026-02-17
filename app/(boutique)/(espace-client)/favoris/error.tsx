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
		<div className="min-h-screen">
			<PageHeader
				title="Mes favoris"
				description="Une erreur est survenue"
				breadcrumbs={[
					{ label: "Mon compte", href: ROUTES.ACCOUNT.ROOT },
					{ label: "Favoris", href: ROUTES.ACCOUNT.FAVORITES },
				]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Empty className="mt-4 mb-12 sm:my-12">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Heart className="size-6 text-muted-foreground" />
							</EmptyMedia>
							<EmptyTitle>Impossible de charger vos favoris</EmptyTitle>
						</EmptyHeader>
						<EmptyContent>
							<p className="text-muted-foreground max-w-md mb-6">
								Une erreur est survenue lors du chargement de votre wishlist.
								Réessayez dans quelques instants.
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button onClick={reset} variant="primary" size="lg">
									<RefreshCw className="size-4 mr-2" />
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
