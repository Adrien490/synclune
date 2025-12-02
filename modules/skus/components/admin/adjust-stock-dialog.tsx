"use client";

import { useEffect } from "react";
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
import { useAdjustStockForm } from "@/modules/skus/hooks/use-adjust-stock-form";
import { ArrowRight, Loader2, Minus, Package, Plus } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export const ADJUST_STOCK_DIALOG_ID = "adjust-sku-stock";

type AdjustStockDialogData = {
	skuId: string;
	skuName: string;
	currentStock: number;
	[key: string]: unknown;
};

function AdjustStockFormContent({
	skuId,
	skuName,
	currentStock,
	onClose,
}: {
	skuId: string;
	skuName: string;
	currentStock: number;
	onClose: () => void;
}) {
	const { form, action, isPending, adjustment, newStock, isValid } = useAdjustStockForm({
		skuId,
		currentStock,
		onSuccess: onClose,
	});

	// Reset form when dialog opens
	useEffect(() => {
		form.reset();
	}, [form]);

	return (
		<>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2">
					<Package className="h-5 w-5 text-primary" />
					Ajuster le stock
				</DialogTitle>
				<DialogDescription>
					Variante: <span className="font-semibold">{skuName}</span>
				</DialogDescription>
			</DialogHeader>

			<form action={action} className="space-y-4 py-6">
				{/* Hidden fields */}
				<input type="hidden" name="skuId" value={skuId} />

				{/* Contrôle d'ajustement */}
				<div>
					<Label htmlFor="adjustment" className="text-sm font-medium">
						Quantité
					</Label>
					<div className="flex items-center gap-2 mt-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => form.setFieldValue("adjustment", adjustment - 1)}
							disabled={isPending || newStock - 1 < 0}
							aria-label="Diminuer de 1"
						>
							<Minus className="h-4 w-4" />
						</Button>
						<form.Field name="adjustment">
							{(field) => (
								<Input
									id="adjustment"
									name="adjustment"
									type="number"
									value={field.state.value}
									onChange={(e) => field.handleChange(parseInt(e.target.value) || 0)}
									className="text-center text-lg font-semibold"
									disabled={isPending}
								/>
							)}
						</form.Field>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => form.setFieldValue("adjustment", adjustment + 1)}
							disabled={isPending}
							aria-label="Augmenter de 1"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Preview amélioré */}
				<div className="p-3 rounded-md bg-muted">
					<div className="flex items-center justify-between text-sm">
						<div className="text-center">
							<div className="text-xs text-muted-foreground mb-1">Actuel</div>
							<div className="font-semibold">{currentStock}</div>
						</div>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
						<div className="text-center">
							<div className="text-xs text-muted-foreground mb-1">Nouveau</div>
							<div
								className={cn(
									"font-bold",
									newStock < 0 && "text-destructive",
									adjustment > 0 && newStock >= 0 && "text-emerald-600",
									adjustment < 0 && newStock >= 0 && "text-amber-600"
								)}
							>
								{newStock}
							</div>
						</div>
					</div>
					{adjustment !== 0 && (
						<div className="mt-2 pt-2 border-t border-border/50 text-center">
							<span
								className={cn(
									"text-sm font-medium",
									adjustment > 0 ? "text-emerald-600" : "text-amber-600"
								)}
							>
								{adjustment > 0 ? `+${adjustment}` : adjustment}
							</span>
						</div>
					)}
					{newStock < 0 && (
						<div className="mt-2 text-xs text-destructive text-center">
							Stock invalide
						</div>
					)}
				</div>

				{/* Raison optionnelle */}
				<form.Field name="reason">
					{(field) => (
						<div>
							<Label htmlFor="reason" className="text-sm font-medium">
								Raison{" "}
								<span className="text-muted-foreground font-normal">(optionnel)</span>
							</Label>
							<Input
								id="reason"
								name="reason"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ex: Correction inventaire, casse..."
								disabled={isPending}
								className="mt-2"
							/>
						</div>
					)}
				</form.Field>

				<DialogFooter className="pt-2">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isPending}
					>
						Annuler
					</Button>
					<Button type="submit" disabled={!isValid || isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Ajustement...
							</>
						) : (
							<>Confirmer</>
						)}
					</Button>
				</DialogFooter>
			</form>
		</>
	);
}

export function AdjustStockDialog() {
	const { isOpen, data, close } = useDialog<AdjustStockDialogData>(ADJUST_STOCK_DIALOG_ID);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent className="sm:max-w-[400px]">
				{data && (
					<AdjustStockFormContent
						skuId={data.skuId}
						skuName={data.skuName}
						currentStock={data.currentStock}
						onClose={close}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
