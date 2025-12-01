import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import type {
	GetProductReturn,
	ProductSku,
} from "@/modules/products/types/product.types";
import { Crown, Palette, Ruler, ShieldCheck, Sparkles } from "lucide-react";

interface ProductCharacteristicsProps {
	product: GetProductReturn;
	selectedSku?: ProductSku | null;
}

/**
 * ProductCharacteristics - Affiche les caractéristiques principales du produit
 *
 * Placé AVANT le bouton d'ajout au panier pour aider le client à prendre une décision éclairée.
 *
 * Responsabilités :
 * - Matériau principal
 * - Catégorie du bijou
 * - Fabrication artisanale
 * - Dimensions du SKU sélectionné
 */
export function ProductCharacteristics({
	product,
	selectedSku,
}: ProductCharacteristicsProps) {
	const primarySku = product.skus[0];
	const primaryMaterial = primarySku?.material?.name;

	// Calculer les dimensions du SKU sélectionné
	const dimensions = selectedSku
		? {
				dimensions:
					[selectedSku.size, selectedSku.material?.name].filter(Boolean).join(" - ") ||
					undefined,
				requiresSize:
					product.type?.slug === "ring" ||
					product.type?.slug === "bracelet" ||
					selectedSku.size !== null,
			}
		: null;

	return (
		<Card role="region" aria-labelledby="product-characteristics-title">
			<CardHeader>
				<h2
					id="product-characteristics-title"
					className="text-xs/5 font-semibold uppercase tracking-widest antialiased text-muted-foreground flex items-center gap-2"
				>
					<Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
					Caractéristiques
				</h2>
				<CardDescription className="text-sm/6 tracking-normal antialiased">
					Détails de ce bijou
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-4 sm:grid-cols-2">
					{/* Matériau principal */}
					{primaryMaterial && (
						<div className="flex items-center gap-3">
							<div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
								<Palette className="w-4 h-4 text-primary" />
							</div>
							<div>
								<dt className="text-sm/6 tracking-normal antialiased font-medium">
									Matériau principal
								</dt>
								<dd className="text-xs/5 tracking-normal antialiased text-muted-foreground">
									{primaryMaterial}
								</dd>
							</div>
						</div>
					)}

					{/* Type de bijou */}
					{product.type && (
						<div className="flex items-center gap-3">
							<div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
								<Crown className="w-4 h-4 text-primary" />
							</div>
							<div>
								<dt className="text-sm/6 tracking-normal antialiased font-medium">
									Catégorie
								</dt>
								<dd className="text-xs/5 tracking-normal antialiased text-muted-foreground">
									{product.type.label}
								</dd>
							</div>
						</div>
					)}

					{/* Fabrication */}
					<div className="flex items-center gap-3">
						<div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
							<ShieldCheck className="w-4 h-4 text-primary" />
						</div>
						<div>
							<dt className="text-sm/6 tracking-normal antialiased font-medium">Fabrication</dt>
							<dd className="text-xs/5 tracking-normal antialiased text-muted-foreground">
								Artisanale française
							</dd>
						</div>
					</div>
				</dl>

				{/* Dimensions du SKU sélectionné */}
				{dimensions && dimensions.dimensions && selectedSku && (
					<>
						<Separator />
						<div className="space-y-3">
							<h3 className="text-sm/6 font-semibold tracking-tight antialiased flex items-center gap-2">
								<Ruler className="w-4 h-4" aria-hidden="true" />
								Dimensions{" "}
								{selectedSku.material?.name && `(${selectedSku.material.name})`}
							</h3>

							<div className="p-2 bg-muted/50 rounded-lg">
								<span className="text-sm/6 tracking-normal antialiased">
									{dimensions.dimensions}
								</span>
							</div>

							{selectedSku?.size?.toLowerCase().includes("ajustable") && (
								<div className="p-3 bg-accent rounded-lg border border-primary/20">
									<div className="flex items-center gap-2">
										<Ruler className="w-4 h-4 text-primary" aria-hidden="true" />
										<span className="text-sm/6 tracking-normal antialiased font-medium text-accent-foreground">
											<span className="hidden sm:inline">Taille ajustable - </span>
											Convient à la plupart des morphologies
										</span>
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
