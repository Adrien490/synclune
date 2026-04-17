"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useApplyCartDiscount } from "../hooks/use-apply-cart-discount";
import { LoaderCircle, Tag } from "lucide-react";

/**
 * Disclosure "J'ai un code promo" dans le footer du cart-sheet.
 *
 * Collapsible pour éviter la friction visuelle : bouton toggle,
 * puis input + apply. Haptic auto via wrapper toast sur success/error.
 *
 * NB : l'état "code appliqué" n'est pas affiché ici car GET_CART_SELECT
 * ne retourne pas `appliedDiscountCode` actuellement — évolution future.
 */
export function CartPromoCodeForm() {
	const [open, setOpen] = useState(false);
	const { action, isPending } = useApplyCartDiscount();
	const inputRef = useRef<HTMLInputElement>(null);
	const panelId = useId();

	const handleToggle = () => {
		const next = !open;
		setOpen(next);
		if (next) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	};

	return (
		<div className="w-full">
			{!open ? (
				<button
					type="button"
					onClick={handleToggle}
					aria-expanded={false}
					aria-controls={panelId}
					className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm text-xs underline underline-offset-4 transition-colors group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Tag className="size-3.5" aria-hidden="true" />
					J&apos;ai un code promo
				</button>
			) : (
				<form
					id={panelId}
					action={action}
					className="flex items-stretch gap-2"
					aria-label="Appliquer un code promo"
				>
					<Input
						ref={inputRef}
						type="text"
						name="code"
						placeholder="Code"
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						aria-label="Code promo"
						maxLength={30}
						disabled={isPending}
						className="h-11 flex-1 uppercase"
					/>
					<Button type="submit" disabled={isPending} className="h-11 min-w-24">
						{isPending ? (
							<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
						) : (
							"Appliquer"
						)}
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => setOpen(false)}
						disabled={isPending}
						className="h-11"
						aria-label="Fermer le formulaire de code promo"
					>
						Annuler
					</Button>
				</form>
			)}
		</div>
	);
}
