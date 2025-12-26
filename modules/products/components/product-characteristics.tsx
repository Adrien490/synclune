import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/shared/components/ui/card";
import type { ProductSku } from "@/modules/products/types/product.types";
import { Ruler } from "lucide-react";

interface ProductCharacteristicsProps {
	selectedSku?: ProductSku | null;
}

/**
 * ProductCharacteristics - Affiche les informations de taille du SKU selectionne
 *
 * Place AVANT le bouton d'ajout au panier pour aider le client.
 * Les autres caracteristiques (materiau, fabrication) sont dans ProductHighlights.
 */
export function ProductCharacteristics({
	selectedSku,
}: ProductCharacteristicsProps) {
	const sizeInfo = selectedSku?.size
		? {
				size: selectedSku.size,
				isAdjustable: selectedSku.size.toLowerCase().includes("ajustable"),
			}
		: null;

	if (!sizeInfo) {
		return null;
	}

	return (
		<Card
			role="region"
			aria-labelledby="product-characteristics-title"
			className="bg-muted/30 border-transparent transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			<CardHeader>
				<h2
					id="product-characteristics-title"
					className="text-xs/5 font-semibold uppercase tracking-widest antialiased text-muted-foreground flex items-center gap-2"
				>
					<Ruler className="w-4 h-4 text-primary" aria-hidden="true" />
					Taille sélectionnée
				</h2>
				<CardDescription className="text-sm/6 tracking-normal antialiased">
					Dimensions de la variante choisie
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="p-2 bg-muted/50 rounded-lg">
					<span className="text-sm/6 tracking-normal antialiased">
						{sizeInfo.size}
					</span>
				</div>

				{sizeInfo.isAdjustable && (
					<div className="p-3 bg-accent rounded-lg border border-primary/20">
						<div className="flex items-center gap-2">
							<Ruler
								className="w-4 h-4 text-primary"
								aria-hidden="true"
							/>
							<span className="text-sm/6 tracking-normal antialiased font-medium text-accent-foreground">
								<span className="hidden sm:inline">
									Taille ajustable -{" "}
								</span>
								Convient à la plupart des morphologies
							</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
