"use client";

import { useState, useTransition } from "react";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, Loader2, Tag, X } from "lucide-react";

type AppliedDiscount = NonNullable<ValidateDiscountCodeReturn["discount"]>;

interface DiscountCodeInputProps {
	subtotal: number;
	appliedDiscount: AppliedDiscount | null;
	onDiscountApplied: (discount: AppliedDiscount | null) => void;
}

/**
 * Progressive disclosure discount code input
 * Validates codes via server action and displays result inline
 *
 * Security: userId is read server-side from the session by validateDiscountCode.
 */
export function DiscountCodeInput({
	subtotal,
	appliedDiscount,
	onDiscountApplied,
}: DiscountCodeInputProps) {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isOpen, setIsOpen] = useState(!!appliedDiscount);

	const handleApply = () => {
		const trimmed = code.trim().toUpperCase();
		if (!trimmed) return;

		setError(null);
		startTransition(async () => {
			const result = await validateDiscountCode(trimmed, subtotal);
			if (result.valid && result.discount) {
				onDiscountApplied(result.discount);
				setCode("");
			} else {
				setError(result.error ?? "Code invalide");
			}
		});
	};

	const handleRemove = () => {
		onDiscountApplied(null);
		setCode("");
		setError(null);
	};

	// Discount already applied - show badge
	if (appliedDiscount) {
		return (
			<div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5 dark:border-green-900 dark:bg-green-950/20">
				<div className="flex min-w-0 items-center gap-2">
					<Tag className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
					<span className="truncate text-sm font-medium text-green-700 dark:text-green-300">
						{appliedDiscount.code}
					</span>
					<span className="text-sm text-green-600 dark:text-green-400">
						-{formatEuro(appliedDiscount.discountAmount)}
					</span>
				</div>
				<button
					type="button"
					onClick={handleRemove}
					className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					aria-label="Supprimer le code promo"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		);
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="text-muted-foreground hover:text-foreground -mx-3 inline-flex min-h-11 items-center gap-1 px-3 text-sm transition-colors">
				<ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
				J'ai un code promo
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="space-y-2 pt-1">
					<div className="flex gap-2">
						<Input
							value={code}
							onChange={(e) => {
								setCode(e.target.value.toUpperCase());
								if (error) setError(null);
							}}
							placeholder="Entrer un code"
							className="uppercase"
							aria-label="Code promo"
							aria-invalid={!!error}
							aria-describedby={error ? "discount-error" : undefined}
							disabled={isPending}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleApply();
								}
							}}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={handleApply}
							disabled={isPending || !code.trim()}
						>
							{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
						</Button>
					</div>
					{error && (
						<p id="discount-error" className="text-destructive text-sm" role="alert">
							{error}
						</p>
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
