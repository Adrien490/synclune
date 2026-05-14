"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form-nextjs";
import { AlertTriangle, ArrowRight, Loader2, Minus, Plus } from "lucide-react";

import { useAdjustStockForm } from "@/modules/skus/hooks/use-adjust-stock-form";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Kbd } from "@/shared/components/ui/kbd";
import { Label } from "@/shared/components/ui/label";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

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

	const { form, action, isPending, adjustment, newStock, isValid } = useAdjustStockForm({
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

	const isDirty = useStore(form.store, (s) => s.isDirty);

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending || !isValid) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isValid, haptic]);

	useEffect(() => {
		if (isMobile || !successPath) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[role='dialog']",
				)
			) {
				return;
			}
			if (
				isDirty &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			allowNavigation();
			navigateWithTransition(router, successPath);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isDirty, haptic, router, allowNavigation, successPath]);

	const adjustBy = (delta: number) => {
		haptic("light");
		form.setFieldValue("adjustment", adjustment + delta);
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

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'ajustement de stock"
			className={cn("space-y-6", className)}
		>
			<input type="hidden" name="skuId" value={skuId} />

			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">« {skuName} »</span>
			</p>

			<fieldset disabled={isPending} className="space-y-6">
				<div>
					<Label htmlFor="adjustment" className="text-sm font-medium">
						Ajustement <span className="text-muted-foreground font-normal">(±)</span>
					</Label>
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
							disabled={isPending}
							aria-label="Augmenter de 1"
							className="h-11 w-11 touch-manipulation active:scale-[0.98] motion-safe:transition-transform"
						>
							<Plus className="size-4" />
						</Button>
					</div>
					<p id="adjustment-hint" className="text-muted-foreground mt-1 hidden text-xs lg:block">
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
						<div className="text-center">
							<div className="text-muted-foreground mb-1 text-xs">Nouveau</div>
							<div
								className={cn(
									"font-bold tabular-nums motion-safe:transition-colors",
									newStock < 0 && "text-destructive",
									adjustment > 0 && newStock >= 0 && "text-emerald-600",
									adjustment < 0 && newStock >= 0 && "text-amber-600",
								)}
								aria-live="polite"
							>
								{newStock}
							</div>
						</div>
					</div>
					{adjustment !== 0 && (
						<div className="border-border/50 mt-2 border-t pt-2 text-center">
							<span
								className={cn(
									"text-sm font-medium tabular-nums",
									adjustment > 0 ? "text-emerald-600" : "text-amber-600",
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
								Visible uniquement par toi dans l&apos;historique.
							</p>
						</div>
					)}
				</form.Field>
			</fieldset>

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
