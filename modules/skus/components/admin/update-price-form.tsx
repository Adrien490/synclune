"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useUpdateSkuPrice } from "@/modules/skus/hooks/use-update-sku-price";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface UpdatePriceFormProps {
	skuId: string;
	skuName: string;
	currentPrice: number;
	currentCompareAtPrice: number | null;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

export function UpdatePriceForm({
	skuId,
	skuName,
	currentPrice,
	currentCompareAtPrice,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: UpdatePriceFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const [price, setPrice] = useState(() => (currentPrice / 100).toFixed(2));
	const [compareAtPrice, setCompareAtPrice] = useState(() =>
		currentCompareAtPrice ? (currentCompareAtPrice / 100).toFixed(2) : "",
	);

	const { updatePrice, isPending } = useUpdateSkuPrice({
		onSuccess: () => {
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				setTimeout(
					() => withViewTransition(() => router.push(successPath)),
					FORM_SUCCESS_REDIRECT_DELAY_MS,
				);
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const priceInEuros = parseFloat(price);
		const compareAtPriceInEuros = compareAtPrice ? parseFloat(compareAtPrice) : null;
		if (isNaN(priceInEuros) || priceInEuros <= 0) return;
		updatePrice(skuId, skuName, priceInEuros, compareAtPriceInEuros);
	};

	const priceValue = parseFloat(price) || 0;
	const compareAtPriceValue = parseFloat(compareAtPrice) || 0;
	const isValid = priceValue > 0 && (!compareAtPrice || compareAtPriceValue > priceValue);

	return (
		<form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">{skuName}</span>
			</p>

			<div>
				<Label htmlFor="price" className="text-sm font-medium">
					Prix final (€)
				</Label>
				<div className="relative mt-2">
					<Input
						id="price"
						type="number"
						step="0.01"
						min="0.01"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						className="pr-8 text-lg font-semibold"
						disabled={isPending}
					/>
					<span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">€</span>
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
					<span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">€</span>
				</div>
				{compareAtPrice && compareAtPriceValue <= priceValue && (
					<p className="text-destructive mt-1 text-sm">
						Le prix barré doit être supérieur au prix de vente
					</p>
				)}
			</div>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<Button
						type="submit"
						size="input"
						disabled={!isValid || isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>{isPending ? "Enregistrement…" : "Enregistrer"}</span>
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
