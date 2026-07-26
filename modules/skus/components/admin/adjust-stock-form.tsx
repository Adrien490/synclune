"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form-nextjs";
import { AlertTriangle, ArrowRight, Loader2, Minus, Plus, RotateCcw } from "lucide-react";

import { useAdjustStockForm } from "@/modules/skus/hooks/use-adjust-stock-form";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Kbd } from "@/shared/components/ui/kbd";
import { Label } from "@/shared/components/ui/label";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import {
	getStockAriaLabel,
	getStockStatusLabel,
	getStockVariant,
} from "@/shared/utils/stock-variant";
import { withViewTransition } from "@/shared/utils/with-view-transition";

/** Plafond aligné sur `adjustSkuStockSchema` (adjustment.max(99999)). */
const MAX_INVENTORY = 99999;

/** Pas rapides : symétrie mobile/desktop avec le Maj+↑/↓ (±10) du clavier. */
const QUICK_STEPS = [-10, -5, 5, 10] as const;

interface AdjustStockFormProps {
	skuId: string;
	skuName: string;
	currentStock: number;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

const REASON_SUGGESTIONS = [
	"Correction inventaire",
	"Casse",
	"Reçu fournisseur",
	"Retour client",
	"Vol / Perte",
];

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function AdjustStockForm({
	skuId,
	skuName,
	currentStock,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: AdjustStockFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const formRef = useRef<HTMLFormElement>(null);
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { form, state, action, isPending, adjustment, newStock, isValid } = useAdjustStockForm({
		skuId,
		currentStock,
		onSuccess: () => {
			haptic("success");
			allowNavigationRef.current?.();
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				navigateWithTransition(router, successPath);
			}
		},
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus de `adjustSkuStockSchema` serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const isDirty = useStore(form.store, (s) => s.isDirty);

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: successPath,
		allowNavigation,
		getIsDirty: () => isDirty,
		getCanSubmit: () => isValid,
	});

	const adjustBy = (delta: number) => {
		haptic("light");
		form.setFieldValue("adjustment", adjustment + delta);
	};

	const resetAdjustment = () => {
		haptic("light");
		form.setFieldValue("adjustment", 0);
	};

	const handleAdjustmentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			adjustBy(event.shiftKey ? 10 : 1);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			adjustBy(event.shiftKey ? -10 : -1);
		}
	};

	// Un pas rapide n'est proposé que s'il maintient un stock valide (0..MAX).
	const canStep = (step: number) => {
		const next = newStock + step;
		return next >= 0 && next <= MAX_INVENTORY;
	};

	const exceedsMax = newStock > MAX_INVENTORY;
	const canSubmit = isValid && !exceedsMax;

	// Statut du stock résultant (réutilise la SSOT des badges catalogue).
	const newStockVariant = getStockVariant(newStock);
	const crossesIntoRupture = newStock === 0 && currentStock > 0;
	const crossesIntoLow =
		newStock > 0 && newStock <= STOCK_THRESHOLDS.LOW && currentStock > STOCK_THRESHOLDS.LOW;

	// Message d'aide expliquant pourquoi le bouton est (in)actif.
	const submitHint = exceedsMax
		? { text: `Maximum ${MAX_INVENTORY.toLocaleString("fr-FR")} unités en stock.`, tone: "error" }
		: newStock < 0
			? { text: "Le stock ne peut pas être négatif.", tone: "error" }
			: adjustment === 0
				? { text: "Saisis un ajustement (≠ 0) pour activer le bouton.", tone: "muted" }
				: null;

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'ajustement de stock"
			className={cn("space-y-6", className)}
		>
			<input type="hidden" name="skuId" value={skuId} />

			<FormServerErrorAlert errors={serverErrors} />

			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">« {skuName} »</span>
			</p>

			<fieldset disabled={isPending} className="space-y-6">
				<div>
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor="adjustment" className="text-sm font-medium">
							Ajustement <span className="text-muted-foreground font-normal">(±)</span>
						</Label>
						{adjustment !== 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={resetAdjustment}
								aria-label="Réinitialiser l'ajustement"
								className="text-muted-foreground hover:text-foreground -mr-1 h-8 gap-1 px-2 text-xs"
							>
								<RotateCcw className="size-3.5" aria-hidden="true" />
								Réinitialiser
							</Button>
						)}
					</div>
					<div className="mt-2 flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => adjustBy(-1)}
							disabled={isPending || newStock - 1 < 0}
							aria-label="Diminuer de 1"
							className="h-11 w-11 touch-manipulation active:scale-[0.98] motion-safe:transition-transform"
						>
							<Minus className="size-4" />
						</Button>
						<form.Field name="adjustment">
							{(field) => (
								<Input
									id="adjustment"
									name="adjustment"
									type="text"
									inputMode="numeric"
									pattern="-?[0-9]*"
									value={field.state.value}
									onChange={(e) => {
										const raw = e.target.value;
										if (raw === "" || raw === "-") {
											field.handleChange(0);
											return;
										}
										const parsed = parseInt(raw, 10);
										field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
									}}
									onKeyDown={handleAdjustmentKeyDown}
									className="text-center text-lg font-semibold"
									aria-describedby="adjustment-hint"
								/>
							)}
						</form.Field>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => adjustBy(1)}
							disabled={isPending || !canStep(1)}
							aria-label="Augmenter de 1"
							className="h-11 w-11 touch-manipulation active:scale-[0.98] motion-safe:transition-transform"
						>
							<Plus className="size-4" />
						</Button>
					</div>

					{/* Pas rapides — donne au tactile l'équivalent du Maj+↑/↓ (±10) du clavier */}
					<div className="mt-2 grid grid-cols-4 gap-2">
						{QUICK_STEPS.map((step) => (
							<Button
								key={step}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => adjustBy(step)}
								disabled={isPending || !canStep(step)}
								aria-label={`${step > 0 ? "Augmenter" : "Diminuer"} de ${Math.abs(step)}`}
								className="h-9 touch-manipulation tabular-nums active:scale-[0.98] motion-safe:transition-transform"
							>
								{step > 0 ? `+${step}` : step}
							</Button>
						))}
					</div>

					<p
						id="adjustment-hint"
						className="text-muted-foreground sr-only mt-1 text-xs lg:not-sr-only"
					>
						Astuce : flèches ↑/↓ pour ±1, Maj+↑/↓ pour ±10.
					</p>
				</div>

				<div className="bg-muted rounded-md p-3">
					<div className="flex items-center justify-between text-sm">
						<div className="text-center">
							<div className="text-muted-foreground mb-1 text-xs">Actuel</div>
							<div className="font-semibold tabular-nums">{currentStock}</div>
						</div>
						<ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
						<div className="flex flex-col items-center gap-1 text-center">
							<div className="text-muted-foreground text-xs">Nouveau</div>
							<div
								className={cn(
									"font-bold tabular-nums motion-safe:transition-colors",
									newStock < 0 && "text-destructive",
									adjustment > 0 && newStock >= 0 && "text-success",
									adjustment < 0 && newStock >= 0 && "text-warning",
								)}
								aria-live="polite"
							>
								{newStock}
							</div>
							{newStock >= 0 && !exceedsMax && (
								<Badge variant={newStockVariant} aria-label={getStockAriaLabel(newStock)}>
									{getStockStatusLabel(newStock)}
								</Badge>
							)}
						</div>
					</div>
					{adjustment !== 0 && (
						<div className="border-border/50 mt-2 border-t pt-2 text-center">
							<span
								className={cn(
									"text-sm font-medium tabular-nums",
									adjustment > 0 ? "text-success" : "text-warning",
								)}
							>
								{adjustment > 0 ? `+${adjustment}` : adjustment}
							</span>
						</div>
					)}
					{newStock < 0 && (
						<div className="text-destructive mt-2 flex items-center justify-center gap-1.5 text-xs">
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>Stock invalide</span>
						</div>
					)}
					{crossesIntoRupture && (
						<div className="text-warning mt-2 flex items-center justify-center gap-1.5 text-xs">
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>Cet ajustement met la variante en rupture.</span>
						</div>
					)}
					{crossesIntoLow && (
						<div className="text-warning mt-2 flex items-center justify-center gap-1.5 text-xs">
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>Passera sous le seuil de stock faible.</span>
						</div>
					)}
				</div>

				<form.Field name="reason">
					{(field) => (
						<div>
							<Label htmlFor="reason" className="text-sm font-medium">
								Raison <span className="text-muted-foreground font-normal">(optionnel)</span>
							</Label>
							<Input
								id="reason"
								name="reason"
								list="adjust-stock-reason-suggestions"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ex : Correction inventaire, casse…"
								enterKeyHint="done"
								autoCapitalize="sentences"
								className="mt-2"
							/>
							<datalist id="adjust-stock-reason-suggestions">
								{REASON_SUGGESTIONS.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
							<p className="text-muted-foreground mt-1 text-xs">
								Enregistré pour le suivi des mouvements de stock.
							</p>
						</div>
					)}
				</form.Field>
			</fieldset>

			<AdminFormFooter pending={isPending}>
				{!isPending && submitHint && (
					<p
						aria-live="polite"
						className={cn(
							"mb-2 text-center text-xs sm:text-right",
							submitHint.tone === "error" ? "text-destructive" : "text-muted-foreground",
						)}
					>
						{submitHint.text}
					</p>
				)}
				<div className="flex justify-end">
					<Button
						type="submit"
						size="input"
						disabled={!canSubmit || isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>{isPending ? "Ajustement…" : "Ajuster le stock"}</span>
						{!isPending && (
							<Kbd
								aria-hidden="true"
								className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
							>
								⌘S
							</Kbd>
						)}
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
