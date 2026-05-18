import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function AnnouncementsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des annonces">
			<span className="sr-only">Chargement des annonces…</span>

			<PageHeader
				variant="compact"
				title="Annonces"
				description="Configurez le bandeau d'annonce affiché au-dessus du navbar."
				actions={
					<Button variant="outline" size="sm" asChild>
						<Link
							href="/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Voir sur la boutique (nouvel onglet)"
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Link>
					</Button>
				}
				className="hidden md:block"
			/>

			{/* Mirrors Suspense fallback in page.tsx: <Skeleton className="h-96 w-full" /> */}
			<Skeleton className="h-96 w-full" />
		</div>
	);
}
