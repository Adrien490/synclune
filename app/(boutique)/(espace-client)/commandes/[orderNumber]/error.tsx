"use client";

import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { Package, RefreshCw } from "lucide-react";
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";

export default function OrderDetailError({ reset }: ErrorPageProps) {
	return (
		<>
			<PageHeader
				title="Détail de la commande"
				description="Une erreur est survenue"
				variant="compact"
				breadcrumbs={[{ label: "Commandes", href: "/commandes" }]}
			/>

			<Empty className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Package className="size-6 text-muted-foreground" />
					</EmptyMedia>
					<EmptyTitle>
						Impossible de charger cette commande
					</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-muted-foreground max-w-md mb-6">
						Une erreur est survenue lors du chargement de votre
						commande. Réessayez dans quelques instants.
					</p>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button onClick={reset} variant="primary" size="lg">
							<RefreshCw className="size-4 mr-2" />
							Réessayer
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href={ROUTES.ACCOUNT.ORDERS}>
								Retour aux commandes
							</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		</>
	);
}
