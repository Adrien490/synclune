"use client";

import { ExternalLink, EyeOff } from "lucide-react";
import Link from "next/link";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface CollectionDetailStorefrontLinkCardProps {
	slug: string;
	status: CollectionStatus;
}

export function CollectionDetailStorefrontLinkCard({
	slug,
	status,
}: CollectionDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const isPublic = status === CollectionStatus.PUBLIC;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isPublic ? (
						<ExternalLink className="size-5" aria-hidden="true" />
					) : (
						<EyeOff className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPublic ? (
					<Button
						asChild
						variant="outline"
						className="w-full transition-transform duration-150 active:scale-[0.98]"
					>
						<Link
							href={`/collections/${slug}`}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Voir la collection sur la boutique (nouvel onglet)"
							onClick={() => haptic("light")}
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Link>
					</Button>
				) : (
					<>
						<Button
							variant="outline"
							className="w-full"
							disabled
							aria-describedby="collection-storefront-help"
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Button>
						<p id="collection-storefront-help" className="text-muted-foreground text-xs">
							Cette collection est {status === CollectionStatus.DRAFT ? "en brouillon" : "archivée"}{" "}
							et n&apos;est pas visible publiquement.
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
