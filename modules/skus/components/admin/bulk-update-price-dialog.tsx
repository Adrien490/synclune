"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkUpdatePrice } from "@/modules/skus/hooks/use-bulk-update-price";
import { DollarSign } from "lucide-react";

export const BULK_UPDATE_PRICE_DIALOG_ID = "bulk-update-sku-price";

type BulkUpdatePriceDialogData = {
	skuIds: string[];
	[key: string]: unknown;
};

export function BulkUpdatePriceDialog() {
	const { isOpen, data, close } = useDialog<BulkUpdatePriceDialogData>(BULK_UPDATE_PRICE_DIALOG_ID);
	const { clearSelection } = useSelectionContext();
	const [mode, setMode] = useState<"percentage" | "absolute">("percentage");
	const [value, setValue] = useState(0);
	const [updateCompareAtPrice, setUpdateCompareAtPrice] = useState(false);

	const { updatePrice, isPending } = useBulkUpdatePrice({
		onSuccess: () => {
			clearSelection();
			close();
		},
	});

	// Reset when dialog opens
	useEffect(() => {
		if (isOpen) {
			setMode("percentage");
			setValue(0);
			setUpdateCompareAtPrice(false);
		}
	}, [isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!data?.skuIds?.length) return;
		if (mode === "percentage" && value === 0) return;
		if (mode === "absolute" && value < 0) return;

		// Convertir en centimes pour le mode absolu
		const finalValue = mode === "absolute" ? Math.round(value * 100) : value;
		updatePrice(data.skuIds, mode, finalValue, updateCompareAtPrice);
	};

	const count = data?.skuIds?.length ?? 0;
	const isValid =
		count > 0 &&
		((mode === "percentage" && value !== 0) ||
			(mode === "absolute" && value > 0));

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && !isPending && close()}>
			<ResponsiveDialogContent className="sm:max-w-[450px]">
				<form onSubmit={handleSubmit}>
					<ResponsiveDialogHeader>
						<div className="flex items-center gap-2">
							<DollarSign className="h-5 w-5 text-primary" />
							<ResponsiveDialogTitle>Modifier les prix</ResponsiveDialogTitle>
						</div>
						<ResponsiveDialogDescription>
							{count} variante{count > 1 ? "s" : ""} selectionnee{count > 1 ? "s" : ""}
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-6 space-y-6">
						{/* Mode selection */}
						<div className="space-y-3">
							<Label className="text-sm font-medium">Mode de modification</Label>
							<RadioGroup
								value={mode}
								onValueChange={(v) => {
									setMode(v as "percentage" | "absolute");
									setValue(0);
								}}
								className="flex gap-4"
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="percentage" id="mode-percentage" />
									<Label htmlFor="mode-percentage" className="font-normal cursor-pointer">
										Pourcentage (+/-)
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="absolute" id="mode-absolute" />
									<Label htmlFor="mode-absolute" className="font-normal cursor-pointer">
										Prix fixe
									</Label>
								</div>
							</RadioGroup>
						</div>

						{/* Value input */}
						<div className="space-y-2">
							<Label htmlFor="value" className="text-sm font-medium">
								{mode === "percentage" ? "Pourcentage" : "Nouveau prix (EUR)"}
							</Label>
							<div className="relative">
								<Input
									id="value"
									type="number"
									value={value}
									onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
									className="text-lg font-semibold pr-10"
									disabled={isPending}
									step={mode === "absolute" ? "0.01" : "1"}
									min={mode === "absolute" ? 0.01 : undefined}
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									{mode === "percentage" ? "%" : "EUR"}
								</span>
							</div>
							{mode === "percentage" && (
								<p className="text-xs text-muted-foreground">
									Utilisez un nombre negatif pour reduire les prix (ex: -10 pour -10%)
								</p>
							)}
						</div>

						{/* Update compare at price option */}
						<div className="flex items-center space-x-2">
							<Checkbox
								id="updateCompareAtPrice"
								checked={updateCompareAtPrice}
								onCheckedChange={(checked) => setUpdateCompareAtPrice(checked === true)}
							/>
							<Label
								htmlFor="updateCompareAtPrice"
								className="text-sm font-normal cursor-pointer"
							>
								Appliquer egalement aux prix barres
							</Label>
						</div>

						{/* Preview */}
						<div className="p-3 rounded-md bg-muted text-sm">
							{mode === "percentage" ? (
								<>
									Les prix seront{" "}
									<span className="font-semibold">
										{value >= 0 ? `augmentes de ${value}%` : `reduits de ${Math.abs(value)}%`}
									</span>
								</>
							) : (
								<>
									Tous les prix seront{" "}
									<span className="font-semibold">definis a {value.toFixed(2)} EUR</span>
								</>
							)}
						</div>
					</div>

					<ResponsiveDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={!isValid || isPending}>
							{isPending ? "Modification..." : "Appliquer"}
						</Button>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
