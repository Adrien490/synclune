"use client";

import { useState, useEffect } from "react";
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
import { useAdjustSkuStock } from "@/modules/skus/hooks/admin/use-adjust-sku-stock";
import { Loader2, Minus, Plus } from "lucide-react";

export const ADJUST_STOCK_DIALOG_ID = "adjust-sku-stock";

type AdjustStockDialogData = {
	skuId: string;
	skuName: string;
	currentStock: number;
	[key: string]: unknown;
};

export function AdjustStockDialog() {
	const { isOpen, data, close } = useDialog<AdjustStockDialogData>(ADJUST_STOCK_DIALOG_ID);
	const [adjustment, setAdjustment] = useState(0);

	const { adjust, isPending } = useAdjustSkuStock({
		onSuccess: () => {
			close();
		},
	});

	// Reset adjustment when dialog opens
	useEffect(() => {
		if (isOpen) {
			setAdjustment(0);
		}
	}, [isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (adjustment === 0 || !data) return;
		adjust(data.skuId, data.skuName, adjustment);
	};

	const newStock = (data?.currentStock ?? 0) + adjustment;
	const isValid = adjustment !== 0 && newStock >= 0;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent className="sm:max-w-[400px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Ajuster le stock</DialogTitle>
						<DialogDescription>
							Variante: <span className="font-semibold">{data?.skuName}</span>
							<br />
							Stock actuel: <span className="font-semibold">{data?.currentStock}</span>
						</DialogDescription>
					</DialogHeader>

					<div className="py-6">
						<Label htmlFor="adjustment" className="text-sm font-medium">
							Ajustement
						</Label>
						<div className="flex items-center gap-2 mt-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => setAdjustment((prev) => prev - 1)}
								disabled={isPending || newStock - 1 < 0}
							>
								<Minus className="h-4 w-4" />
							</Button>
							<Input
								id="adjustment"
								type="number"
								value={adjustment}
								onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
								className="text-center text-lg font-semibold"
								disabled={isPending}
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => setAdjustment((prev) => prev + 1)}
								disabled={isPending}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>

						<div className="mt-4 p-3 rounded-md bg-muted text-sm">
							Nouveau stock:{" "}
							<span className={`font-bold ${newStock < 0 ? "text-destructive" : ""}`}>
								{newStock}
							</span>
							{newStock < 0 && (
								<span className="text-destructive ml-2">(stock invalide)</span>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
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
			</DialogContent>
		</Dialog>
	);
}
