"use client";

import { useId, useRef, useState } from "react";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useApplyCartDiscount } from "../hooks/use-apply-cart-discount";
import { useRemoveCartDiscount } from "../hooks/use-remove-cart-discount";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { formatEuro } from "@/shared/utils/format-euro";
import { LoaderCircle, Tag, X } from "lucide-react";

interface CartPromoCodeFormProps {
	appliedDiscountCode?: string | null;
	discountAmount?: number | null;
}

/**
 * Disclosure "J'ai un code promo" dans le footer du cart-sheet.
 *
 * - Aucun code appliqué : bouton toggle + input.
 * - Code appliqué : chip "Code XYZ — -Y €" avec bouton retirer.
 */
export function CartPromoCodeForm({
	appliedDiscountCode = null,
	discountAmount = null,
}: CartPromoCodeFormProps) {
	const [open, setOpen] = useState(false);
	const { state: applyState, action: applyAction, isPending: isApplying } = useApplyCartDiscount();
	const { action: removeAction, isPending: isRemoving } = useRemoveCartDiscount();
	const inputRef = useRef<HTMLInputElement>(null);
	const panelId = useId();
	const haptic = useHaptic();

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un code promo refusé par le schéma serveur
	// n'afficherait strictement rien côté client.
	const serverErrors = useServerFieldErrors({ state: applyState });

	const handleToggle = () => {
		const next = !open;
		setOpen(next);
		if (next) {
			requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
		}
	};

	const handleRemoveClick = () => {
		haptic("selection");
	};

	// État "code appliqué" : chip + bouton retirer
	if (appliedDiscountCode) {
		return (
			<div className="w-full">
				<form action={removeAction} className="flex items-center justify-between gap-2">
					<div
						className="border-primary/30 bg-primary/5 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
						aria-live="polite"
					>
						<Tag className="size-3.5" aria-hidden="true" />
						<span>
							Code <span className="font-semibold">{appliedDiscountCode}</span>
							{discountAmount !== null && discountAmount > 0
								? ` — −${formatEuro(discountAmount)}`
								: ""}
						</span>
					</div>
					<Button
						type="submit"
						variant="ghost"
						size="sm"
						disabled={isRemoving}
						onClick={handleRemoveClick}
						className="text-muted-foreground hover:text-foreground h-8"
						aria-label={`Retirer le code promo ${appliedDiscountCode}`}
					>
						{isRemoving ? (
							<LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
						) : (
							<>
								<X className="size-3.5" aria-hidden="true" />
								<span>Retirer</span>
							</>
						)}
					</Button>
				</form>
			</div>
		);
	}

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
				<div className="space-y-2">
					<FormServerErrorAlert errors={serverErrors} />
					<form
						id={panelId}
						action={applyAction}
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
							disabled={isApplying}
							className="h-11 flex-1 uppercase"
						/>
						<Button type="submit" disabled={isApplying} className="h-11 min-w-24">
							{isApplying ? (
								<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
							) : (
								"Appliquer"
							)}
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setOpen(false)}
							disabled={isApplying}
							className="h-11"
							aria-label="Fermer le formulaire de code promo"
						>
							Annuler
						</Button>
					</form>
				</div>
			)}
		</div>
	);
}
