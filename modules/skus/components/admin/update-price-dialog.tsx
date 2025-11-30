"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useUpdateSkuPrice } from "@/modules/skus/hooks/use-update-sku-price";
import { Loader2 } from "lucide-react";

export const UPDATE_PRICE_DIALOG_ID = "update-sku-price";

type UpdatePriceDialogData = {
	skuId: string;
	skuName: string;
	currentPrice: number; // en centimes
	currentCompareAtPrice: number | null;
	[key: string]: unknown;
};

export function UpdatePriceDialog() {
	const { isOpen, data, close } = useDialog<UpdatePriceDialogData>(UPDATE_PRICE_DIALOG_ID);
	const [price, setPrice] = useState("");
	const [compareAtPrice, setCompareAtPrice] = useState("");

	const { updatePrice, isPending } = useUpdateSkuPrice({
		onSuccess: () => {
			close();
		},
	});

	// Reset values when dialog opens
	useEffect(() => {
		if (isOpen && data) {
			setPrice((data.currentPrice / 100).toFixed(2));
			setCompareAtPrice(
				data.currentCompareAtPrice ? (data.currentCompareAtPrice / 100).toFixed(2) : ""
			);
		}
	}, [isOpen, data]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!data) return;

		const priceInCents = Math.round(parseFloat(price) * 100);
		const compareAtPriceInCents = compareAtPrice
			? Math.round(parseFloat(compareAtPrice) * 100)
			: null;

		if (isNaN(priceInCents) || priceInCents <= 0) return;

		updatePrice(data.skuId, data.skuName, priceInCents, compareAtPriceInCents);
	};

	const priceValue = parseFloat(price) || 0;
	const compareAtPriceValue = parseFloat(compareAtPrice) || 0;
	const isValid = priceValue > 0 && (!compareAtPrice || compareAtPriceValue > priceValue);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent className="sm:max-w-[400px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Modifier le prix</DialogTitle>
						<DialogDescription>
							Variante: <span className="font-semibold">{data?.skuName}</span>
						</DialogDescription>
					</DialogHeader>

					<div className="py-6 space-y-4">
						<div>
							<Label htmlFor="price" className="text-sm font-medium">
								Prix TTC (€)
							</Label>
							<div className="relative mt-2">
								<Input
									id="price"
									type="number"
									step="0.01"
									min="0.01"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									className="text-lg font-semibold pr-8"
									disabled={isPending}
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									€
								</span>
							</div>
						</div>

						<div>
							<Label htmlFor="compareAtPrice" className="text-sm font-medium">
								Prix barré (optionnel)
							</Label>
							<div className="relative mt-2">
								<Input
									id="compareAtPrice"
									type="number"
									step="0.01"
									min="0"
									value={compareAtPrice}
									onChange={(e) => setCompareAtPrice(e.target.value)}
									placeholder="Laisser vide pour aucun"
									className="pr-8"
									disabled={isPending}
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									€
								</span>
							</div>
							{compareAtPrice && compareAtPriceValue <= priceValue && (
								<p className="text-sm text-destructive mt-1">
									Le prix barré doit être supérieur au prix de vente
								</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={!isValid || isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Enregistrement...
								</>
							) : (
								<>Enregistrer</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
