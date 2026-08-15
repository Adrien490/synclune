"use client";

import { ArrowSquareOutIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface CollectionDetailStorefrontLinkCardProps {
	slug: string;
	active: boolean;
}

export function CollectionDetailStorefrontLinkCard({
	slug,
	active,
}: CollectionDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const isPublic = active;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isPublic ? (
						<ArrowSquareOutIcon className="size-5" aria-hidden="true" />
					) : (
						<EyeSlashIcon className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPublic ? (
					<Button
						render={
							<Link
								href={`/collections/${slug}`}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Voir la collection sur la boutique (nouvel onglet)"
								onClick={() => haptic("light")}
							/>
						}
						variant="outline"
						className="w-full transition-transform duration-150 active:scale-[0.98]"
					>
						<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Button>
				) : (
					<>
						<Button
							variant="outline"
							className="w-full"
							disabled
							aria-describedby="collection-storefront-help"
						>
							<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Button>
						<p id="collection-storefront-help" className="text-muted-foreground text-xs">
							Cette collection est en brouillon et n&apos;est pas visible publiquement.
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
