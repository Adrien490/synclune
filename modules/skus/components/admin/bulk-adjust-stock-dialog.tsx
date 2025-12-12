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
} from "@/shared/components/ui/responsive-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkAdjustStock } from "@/modules/skus/hooks/use-bulk-adjust-stock";
import { Minus, Plus, Package } from "lucide-react";

export const BULK_ADJUST_STOCK_DIALOG_ID = "bulk-adjust-sku-stock";

type BulkAdjustStockDialogData = {
	skuIds: string[];
	[key: string]: unknown;
};

export function BulkAdjustStockDialog() {
	const { isOpen, data, close } = useDialog<BulkAdjustStockDialogData>(BULK_ADJUST_STOCK_DIALOG_ID);
	const { clearSelection } = useSelectionContext();
	const [mode, setMode] = useState<"relative" | "absolute">("relative");
	const [value, setValue] = useState(0);

	const { adjustStock, isPending } = useBulkAdjustStock({
		onSuccess: () => {
			clearSelection();
			close();
		},
	});

	// Reset when dialog opens
	useEffect(() => {
		if (isOpen) {
			setMode("relative");
			setValue(0);
		}
	}, [isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!data?.skuIds?.length) return;
		if (mode === "relative" && value === 0) return;
		if (mode === "absolute" && value < 0) return;
		adjustStock(data.skuIds, mode, value);
	};

	const count = data?.skuIds?.length ?? 0;
	const isValid =
		count > 0 &&
		((mode === "relative" && value !== 0) ||
			(mode === "absolute" && value >= 0));

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && !isPending && close()}>
			<ResponsiveDialogContent className="sm:max-w-[450px]">
				<form onSubmit={handleSubmit}>
					<ResponsiveDialogHeader>
						<div className="flex items-center gap-2">
							<Package className="h-5 w-5 text-primary" />
							<ResponsiveDialogTitle>Ajuster le stock</ResponsiveDialogTitle>
						</div>
						<ResponsiveDialogDescription>
							{count} variante{count > 1 ? "s" : ""} sélectionnée{count > 1 ? "s" : ""}
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-6 space-y-6">
						{/* Mode selection */}
						<div className="space-y-3">
							<Label className="text-sm font-medium">Mode d&apos;ajustement</Label>
							<RadioGroup
								value={mode}
								onValueChange={(v) => {
									setMode(v as "relative" | "absolute");
									setValue(0);
								}}
								className="flex gap-4"
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="relative" id="mode-relative" />
									<Label htmlFor="mode-relative" className="font-normal cursor-pointer">
										Ajuster (+/-)
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="absolute" id="mode-absolute" />
									<Label htmlFor="mode-absolute" className="font-normal cursor-pointer">
										Definir une valeur
									</Label>
								</div>
							</RadioGroup>
						</div>

						{/* Value input */}
						<div className="space-y-2">
							<Label htmlFor="value" className="text-sm font-medium">
								{mode === "relative" ? "Ajustement" : "Nouvelle valeur de stock"}
							</Label>
							<div className="flex items-center gap-2">
								{mode === "relative" && (
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => setValue((prev) => prev - 1)}
										disabled={isPending}
									>
										<Minus className="h-4 w-4" />
									</Button>
								)}
								<Input
									id="value"
									type="number"
									value={value}
									onChange={(e) => setValue(parseInt(e.target.value) || 0)}
									className="text-center text-lg font-semibold"
									disabled={isPending}
									min={mode === "absolute" ? 0 : undefined}
								/>
								{mode === "relative" && (
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => setValue((prev) => prev + 1)}
										disabled={isPending}
									>
										<Plus className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>

						{/* Preview */}
						<div className="p-3 rounded-md bg-muted text-sm">
							{mode === "relative" ? (
								<>
									Le stock de chaque variante sera{" "}
									<span className="font-semibold">
										{value >= 0 ? `augmente de ${value}` : `diminue de ${Math.abs(value)}`}
									</span>
								</>
							) : (
								<>
									Le stock de toutes les variantes sera{" "}
									<span className="font-semibold">défini à {value}</span>
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
							{isPending ? "Ajustement..." : "Appliquer"}
						</Button>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
