"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useUpdateSkuPrice } from "@/modules/skus/hooks/use-update-sku-price";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Kbd } from "@/shared/components/ui/kbd";
import { Label } from "@/shared/components/ui/label";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
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

function toEuros(cents: number | null): string {
	return cents ? (cents / 100).toFixed(2) : "";
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
	const isMobile = useIsMobile();
	const formRef = useRef<HTMLFormElement>(null);

	const initialPrice = (currentPrice / 100).toFixed(2);
	const initialCompareAtPrice = toEuros(currentCompareAtPrice);

	const [price, setPrice] = useState(initialPrice);
	const [compareAtPrice, setCompareAtPrice] = useState(initialCompareAtPrice);

	const { updatePrice, isPending, state } = useUpdateSkuPrice({
		onSuccess: () => {
			// Libère la garde : les champs restent « dirty » vis-à-vis des props jusqu'à
			// la revalidation, mais la navigation de succès ne doit pas être bloquée.
			allowNavigation();
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				setTimeout(
					() => withViewTransition(() => router.push(successPath)),
					FORM_SUCCESS_REDIRECT_DELAY_MS,
				);
			}
		},
	});

	const serverErrors = useServerFieldErrors({ state });

	const priceValue = parseFloat(price) || 0;
	const compareAtPriceValue = parseFloat(compareAtPrice) || 0;
	const isValid = priceValue > 0 && (!compareAtPrice || compareAtPriceValue > priceValue);
	const isDirty = price !== initialPrice || compareAtPrice !== initialCompareAtPrice;

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending);

	// `listPath` seulement en plein écran : en dialogue, Échap doit fermer la modale,
	// pas naviguer vers la variante.
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: redirectOnSuccess ? successPath : undefined,
		allowNavigation,
		getIsDirty: () => isDirty,
		getCanSubmit: () => isValid,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid) return;
		const priceInEuros = parseFloat(price);
		const compareAtPriceInEuros = compareAtPrice ? parseFloat(compareAtPrice) : null;
		if (isNaN(priceInEuros) || priceInEuros <= 0) return;
		updatePrice(skuId, skuName, priceInEuros, compareAtPriceInEuros);
	};

	const compareAtPriceError = compareAtPrice && compareAtPriceValue <= priceValue;

	return (
		<form ref={formRef} onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">{skuName}</span>
			</p>

			<FormServerErrorAlert errors={serverErrors} />

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
						aria-invalid={compareAtPriceError ? true : undefined}
						aria-describedby={compareAtPriceError ? "compareAtPrice-error" : undefined}
					/>
					<span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">€</span>
				</div>
				{compareAtPriceError && (
					<p id="compareAtPrice-error" role="alert" className="text-destructive mt-1 text-sm">
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
						aria-busy={isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>{isPending ? "Enregistrement…" : "Enregistrer"}</span>
						{!isPending && (
							<Kbd className="ml-2 hidden lg:inline-flex" aria-hidden="true">
								⌘S
							</Kbd>
						)}
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
