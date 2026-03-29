"use client";

import { useEffect } from "react";
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
import { useAppForm } from "@/shared/components/forms";
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

	const form = useAppForm({
		defaultValues: {
			mode: "percentage" as "percentage" | "absolute",
			value: 0,
			updateCompareAtPrice: false,
		},
	});

	const { updatePrice, isPending } = useBulkUpdatePrice({
		onSuccess: () => {
			clearSelection();
			close();
		},
	});

	// Reset when dialog opens
	useEffect(() => {
		if (isOpen) {
			queueMicrotask(() => {
				form.reset();
			});
		}
	}, [isOpen, form]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const values = form.state.values;
		if (!data?.skuIds.length) return;
		if (values.mode === "percentage" && values.value === 0) return;
		if (values.mode === "absolute" && values.value < 0) return;

		// Convertir en centimes pour le mode absolu
		const finalValue = values.mode === "absolute" ? Math.round(values.value * 100) : values.value;
		updatePrice(data.skuIds, values.mode, finalValue, values.updateCompareAtPrice);
	};

	const count = data?.skuIds.length ?? 0;

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && !isPending && close()}>
			<ResponsiveDialogContent className="sm:max-w-[450px]">
				<form onSubmit={handleSubmit}>
					<ResponsiveDialogHeader>
						<div className="flex items-center gap-2">
							<DollarSign className="text-primary h-5 w-5" />
							<ResponsiveDialogTitle>Modifier les prix</ResponsiveDialogTitle>
						</div>
						<ResponsiveDialogDescription>
							{count} variante{count > 1 ? "s" : ""} sélectionnée{count > 1 ? "s" : ""}
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="space-y-6 py-6">
						{/* Mode selection */}
						<form.Field name="mode">
							{(field) => (
								<div className="space-y-3">
									<Label className="text-sm font-medium">Mode de modification</Label>
									<RadioGroup
										value={field.state.value}
										onValueChange={(v) => {
											field.handleChange(v as "percentage" | "absolute");
											form.setFieldValue("value", 0);
										}}
										className="flex gap-4"
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="percentage" id="mode-percentage" />
											<Label htmlFor="mode-percentage" className="cursor-pointer font-normal">
												Pourcentage (+/-)
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="absolute" id="mode-absolute" />
											<Label htmlFor="mode-absolute" className="cursor-pointer font-normal">
												Prix fixe
											</Label>
										</div>
									</RadioGroup>
								</div>
							)}
						</form.Field>

						{/* Value input */}
						<form.Field name="value">
							{(field) => (
								<form.Subscribe selector={(state) => state.values.mode}>
									{(mode) => (
										<div className="space-y-2">
											<Label htmlFor="value" className="text-sm font-medium">
												{mode === "percentage" ? "Pourcentage" : "Nouveau prix (EUR)"}
											</Label>
											<div className="relative">
												<Input
													id="value"
													type="number"
													value={field.state.value}
													onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
													className="pr-10 text-lg font-semibold"
													disabled={isPending}
													step={mode === "absolute" ? "0.01" : "1"}
													min={mode === "absolute" ? 0.01 : undefined}
												/>
												<span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
													{mode === "percentage" ? "%" : "EUR"}
												</span>
											</div>
											{mode === "percentage" && (
												<p className="text-muted-foreground text-xs">
													Utilisez un nombre négatif pour réduire les prix (ex: -10 pour -10%)
												</p>
											)}
										</div>
									)}
								</form.Subscribe>
							)}
						</form.Field>

						{/* Update compare at price option */}
						<form.Field name="updateCompareAtPrice">
							{(field) => (
								<div className="flex items-center space-x-2">
									<Checkbox
										id="updateCompareAtPrice"
										checked={field.state.value}
										onCheckedChange={(checked) => field.handleChange(checked === true)}
									/>
									<Label
										htmlFor="updateCompareAtPrice"
										className="cursor-pointer text-sm font-normal"
									>
										Appliquer également aux prix barrés
									</Label>
								</div>
							)}
						</form.Field>

						{/* Preview */}
						<form.Subscribe selector={(state) => state.values}>
							{(values) => (
								<div className="bg-muted rounded-md p-3 text-sm">
									{values.mode === "percentage" ? (
										<>
											Les prix seront{" "}
											<span className="font-semibold">
												{values.value >= 0
													? `augmentés de ${values.value}%`
													: `réduits de ${Math.abs(values.value)}%`}
											</span>
										</>
									) : (
										<>
											Tous les prix seront{" "}
											<span className="font-semibold">définis à {values.value.toFixed(2)} EUR</span>
										</>
									)}
								</div>
							)}
						</form.Subscribe>
					</div>

					<ResponsiveDialogFooter>
						<Button type="button" variant="outline" onClick={close} disabled={isPending}>
							Annuler
						</Button>
						<form.Subscribe selector={(state) => state.values}>
							{(values) => {
								const isValid =
									count > 0 &&
									((values.mode === "percentage" && values.value !== 0) ||
										(values.mode === "absolute" && values.value > 0));
								return (
									<Button type="submit" disabled={!isValid || isPending}>
										{isPending ? "Modification..." : "Appliquer"}
									</Button>
								);
							}}
						</form.Subscribe>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
