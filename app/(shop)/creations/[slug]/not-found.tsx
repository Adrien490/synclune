import { NotFoundContent } from "@/app/_components/not-found-content";
import { NotFoundShell } from "@/app/_components/not-found-shell";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Produit non trouvé - Synclune",
	robots: { index: false, follow: false },
};

export default function ProductNotFound() {
	return (
		<NotFoundShell errorCode="404">
			<NotFoundContent
				emoji={
					<p className="text-8xl" aria-hidden="true">
						💎
					</p>
				}
				title={
					<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
						Ce bijou n'existe plus
					</h1>
				}
				description={
					<p className="text-muted-foreground text-lg md:text-xl">
						Cette création a peut-être été retirée ou n'est plus disponible. Découvrez nos autres
						bijoux artisanaux faits main !
					</p>
				}
				actions={
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Button asChild size="lg">
							<Link href={ROUTES.SHOP.PRODUCTS}>Découvrir nos créations</Link>
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link href={ROUTES.SHOP.HOME}>Retour à l'accueil</Link>
						</Button>
					</div>
				}
			/>
		</NotFoundShell>
	);
}
