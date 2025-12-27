"use client";

import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import { User, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function AccountError({ error, reset }: ErrorProps) {
	useEffect(() => {
		console.error("[ACCOUNT_ERROR]", error);
	}, [error]);

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mon compte"
				description="Une erreur est survenue"
				breadcrumbs={[{ label: "Mon compte", href: "/compte" }]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Empty className="mt-4 mb-12 sm:my-12">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<User className="size-6 text-muted-foreground" />
							</EmptyMedia>
							<EmptyTitle>Impossible de charger ton compte</EmptyTitle>
						</EmptyHeader>
						<EmptyContent>
							<p className="text-muted-foreground max-w-md mb-6">
								Une erreur est survenue lors du chargement de ton espace
								personnel. Réessaie dans quelques instants.
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button onClick={reset} variant="primary" size="lg">
									<RefreshCw className="size-4 mr-2" />
									Réessayer
								</Button>
								<Button asChild variant="outline" size="lg">
									<Link href="/">Retour à l'accueil</Link>
								</Button>
							</div>
						</EmptyContent>
					</Empty>
				</div>
			</section>
		</div>
	);
}
