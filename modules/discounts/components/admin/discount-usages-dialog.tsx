"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	getDiscountUsages,
	type DiscountUsageItem,
} from "@/modules/discounts/actions/admin/get-discount-usages";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, Loader2, Receipt } from "lucide-react";
import Link from "next/link";

export const DISCOUNT_USAGES_DIALOG_ID = "discount-usages";

type DiscountUsagesDialogData = {
	discountId: string;
	discountCode: string;
	[key: string]: unknown;
};

export function DiscountUsagesDialog() {
	const { isOpen, data, close } = useDialog<DiscountUsagesDialogData>(DISCOUNT_USAGES_DIALOG_ID);
	const [usages, setUsages] = useState<DiscountUsageItem[]>([]);
	const [totalAmount, setTotalAmount] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && data) {
			setIsLoading(true);
			setError(null);

			getDiscountUsages(data.discountId)
				.then((result) => {
					if ("error" in result) {
						setError(result.error);
					} else {
						setUsages(result.usages);
						setTotalAmount(result.totalAmount);
					}
				})
				.catch(() => {
					setError("Erreur lors du chargement");
				})
				.finally(() => {
					setIsLoading(false);
				});
		}
	}, [isOpen, data]);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-[700px]">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Utilisations du code promo</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Code: <span className="font-semibold font-mono">{data?.discountCode}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="flex-1 overflow-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<div className="text-center py-12 text-destructive">{error}</div>
					) : usages.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>Ce code n'a pas encore été utilisé</p>
						</div>
					) : (
						<>
							<div className="mb-4 p-3 rounded-lg bg-muted">
								<div className="flex justify-between text-sm">
									<span>Nombre d'utilisations:</span>
									<span className="font-semibold">{usages.length}</span>
								</div>
								<div className="flex justify-between text-sm mt-1">
									<span>Montant total des réductions:</span>
									<span className="font-semibold text-green-600">
										{(totalAmount / 100).toFixed(2)} €
									</span>
								</div>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Utilisateur</TableHead>
										<TableHead>Commande</TableHead>
										<TableHead className="text-right">Réduction</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{usages.map((usage) => (
										<TableRow key={usage.id}>
											<TableCell className="text-sm text-muted-foreground">
												{format(new Date(usage.createdAt), "d MMM yyyy HH:mm", {
													locale: fr,
												})}
											</TableCell>
											<TableCell>
												{usage.user ? (
													<div className="text-sm">
														<div className="font-medium">
															{usage.user.name || "Sans nom"}
														</div>
														<div className="text-muted-foreground text-xs">
															{usage.user.email}
														</div>
													</div>
												) : (
													<span className="text-muted-foreground text-sm">
														Invité
													</span>
												)}
											</TableCell>
											<TableCell>
												<Link
													href={`/admin/ventes/commandes/${usage.order.id}`}
													className="flex items-center gap-1 text-sm text-primary hover:underline"
												>
													{usage.order.orderNumber}
													<ExternalLink className="h-3 w-3" />
												</Link>
											</TableCell>
											<TableCell className="text-right font-medium text-green-600">
												-{(usage.amountApplied / 100).toFixed(2)} €
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</>
					)}
				</div>

				<div className="flex justify-end pt-4 border-t">
					<Button variant="outline" onClick={close}>
						Fermer
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
