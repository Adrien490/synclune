"use client";

import { useReducer, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import {
	getDiscountUsages,
	type DiscountUsageItem,
} from "@/modules/discounts/data/admin/get-discount-usages";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, LoaderCircle, Receipt } from "lucide-react";
import Link from "next/link";

export const DISCOUNT_USAGES_DIALOG_ID = "discount-usages";

type DiscountUsagesDialogData = {
	discountId: string;
	discountCode: string;
	[key: string]: unknown;
};

type UsagesState = {
	usages: DiscountUsageItem[];
	totalAmount: number;
	isLoading: boolean;
	error: string | null;
};

type UsagesAction =
	| { type: "FETCH_START" }
	| { type: "FETCH_SUCCESS"; usages: DiscountUsageItem[]; totalAmount: number }
	| { type: "FETCH_ERROR"; error: string };

function usagesReducer(state: UsagesState, action: UsagesAction): UsagesState {
	switch (action.type) {
		case "FETCH_START":
			return { ...state, isLoading: true, error: null };
		case "FETCH_SUCCESS":
			return {
				usages: action.usages,
				totalAmount: action.totalAmount,
				isLoading: false,
				error: null,
			};
		case "FETCH_ERROR":
			return { ...state, isLoading: false, error: action.error };
	}
}

export function DiscountUsagesDialog() {
	const { isOpen, data, close } = useDialog<DiscountUsagesDialogData>(DISCOUNT_USAGES_DIALOG_ID);
	const haptic = useHaptic();
	const [state, dispatch] = useReducer(usagesReducer, {
		usages: [],
		totalAmount: 0,
		isLoading: false,
		error: null,
	});

	const handleClose = () => {
		haptic("light");
		close();
	};

	const { usages, totalAmount, isLoading, error } = state;

	useEffect(() => {
		if (isOpen && data) {
			queueMicrotask(() => {
				dispatch({ type: "FETCH_START" });
			});

			getDiscountUsages(data.discountId)
				.then((result) => {
					if ("error" in result) {
						dispatch({ type: "FETCH_ERROR", error: result.error });
					} else {
						dispatch({
							type: "FETCH_SUCCESS",
							usages: result.usages,
							totalAmount: result.totalAmount,
						});
					}
				})
				.catch(() => {
					dispatch({ type: "FETCH_ERROR", error: "Erreur lors du chargement" });
				});
		}
	}, [isOpen, data]);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<ResponsiveDialogContent className="sm:max-w-175">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Utilisations du code promo</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Code: <span className="font-semibold tabular-nums">{data?.discountCode}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="flex-1 overflow-auto" role="status" aria-live="polite" aria-atomic="true">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<LoaderCircle
								className="text-muted-foreground h-6 w-6 motion-safe:animate-spin"
								aria-label="Chargement des utilisations"
							/>
						</div>
					) : error ? (
						<div className="text-destructive py-12 text-center">{error}</div>
					) : usages.length === 0 ? (
						<div className="text-muted-foreground py-12 text-center">
							<Receipt className="mx-auto mb-3 h-12 w-12 opacity-50" aria-hidden="true" />
							<p>Ce code n'a pas encore été utilisé</p>
						</div>
					) : (
						<>
							<div className="bg-muted mb-4 rounded-lg p-3">
								<div className="flex justify-between text-sm">
									<span>Nombre d'utilisations:</span>
									<span className="font-semibold">{usages.length}</span>
								</div>
								<div className="mt-1 flex justify-between text-sm">
									<span>Montant total des réductions:</span>
									<span className="font-semibold text-green-600">
										{(totalAmount / 100).toFixed(2)} €
									</span>
								</div>
							</div>

							{/* Mobile cards */}
							<ul className="space-y-2 md:hidden" aria-label="Liste des utilisations">
								{usages.map((usage) => (
									<li key={usage.id} className="bg-card rounded-lg border p-3 text-sm">
										<div className="text-muted-foreground text-xs">
											{format(new Date(usage.createdAt), "d MMM yyyy HH:mm", {
												locale: fr,
											})}
										</div>
										<div className="mt-1 flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												{usage.user ? (
													<>
														<div className="truncate font-medium">
															{usage.user.name ?? "Sans nom"}
														</div>
														<div className="text-muted-foreground truncate text-xs">
															{usage.user.email}
														</div>
													</>
												) : (
													<span className="text-muted-foreground">Invité</span>
												)}
												<Link
													href={`/admin/ventes/commandes/${usage.order.id}`}
													className="text-primary mt-1 inline-flex min-h-11 items-center gap-1 text-sm hover:underline"
												>
													{usage.order.orderNumber}
													<ExternalLink className="h-3 w-3" aria-hidden="true" />
												</Link>
											</div>
											<span className="shrink-0 font-medium text-green-600">
												-{(usage.amountApplied / 100).toFixed(2)} €
											</span>
										</div>
									</li>
								))}
							</ul>

							{/* Desktop table */}
							<Table className="hidden md:table">
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
											<TableCell className="text-muted-foreground text-sm">
												{format(new Date(usage.createdAt), "d MMM yyyy HH:mm", {
													locale: fr,
												})}
											</TableCell>
											<TableCell>
												{usage.user ? (
													<div className="text-sm">
														<div className="font-medium">{usage.user.name ?? "Sans nom"}</div>
														<div className="text-muted-foreground text-xs">{usage.user.email}</div>
													</div>
												) : (
													<span className="text-muted-foreground text-sm">Invité</span>
												)}
											</TableCell>
											<TableCell>
												<Link
													href={`/admin/ventes/commandes/${usage.order.id}`}
													className="text-primary flex items-center gap-1 text-sm hover:underline"
												>
													{usage.order.orderNumber}
													<ExternalLink className="h-3 w-3" aria-hidden="true" />
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

				<div className="flex justify-end border-t pt-4 pr-[max(0rem,env(safe-area-inset-right))] pb-[max(0rem,env(safe-area-inset-bottom))] pl-[max(0rem,env(safe-area-inset-left))]">
					<Button variant="outline" onClick={handleClose}>
						Fermer
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
