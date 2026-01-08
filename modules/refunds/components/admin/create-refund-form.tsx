"use client";

import { RefundReason } from "@/app/generated/prisma/browser";
import type { OrderForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";
import { useStore } from "@tanstack/react-form-nextjs";
import { ArrowLeft, Package, RotateCcw } from "lucide-react";
import { formatEuro } from "@/shared/utils/format-euro";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useCreateRefundForm,
	getDefaultRestock,
	getAvailableQuantity,
} from "@/modules/refunds/hooks/use-create-refund-form";
import { RefundItemRow } from "./refund-item-row";

// ============================================================================
// TYPES
// ============================================================================

interface CreateRefundFormProps {
	order: OrderForRefund;
}

// Labels côté client (évite l'import de prisma/client)
const REFUND_REASON_LABELS: Record<RefundReason, string> = {
	CUSTOMER_REQUEST: "Rétractation client",
	DEFECTIVE: "Produit défectueux",
	WRONG_ITEM: "Erreur de préparation",
	LOST_IN_TRANSIT: "Colis perdu",
	FRAUD: "Fraude",
	OTHER: "Autre",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateRefundForm({ order }: CreateRefundFormProps) {
	const router = useRouter();

	// Calculer le montant déjà remboursé
	const alreadyRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
	const maxRefundable = order.total - alreadyRefunded;

	// Hook du formulaire
	const {
		form,
		action,
		isPending,
		reason,
		items,
		selectedItems,
		totalAmount,
		itemsForAction,
	} = useCreateRefundForm({
		orderId: order.id,
		orderItems: order.items,
		onSuccess: () => {
			router.push("/admin/ventes/remboursements");
		},
	});

	// Watch note from store
	const note = useStore(form.store, (s) => s.values.note);

	// Handler pour changer le motif (met à jour le restock par défaut, pas de useEffect)
	const handleReasonChange = (value: RefundReason) => {
		form.setFieldValue("reason", value);
		// Mettre à jour le restock par défaut pour tous les items
		const defaultRestock = getDefaultRestock(value);
		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) => ({
				...item,
				restock: defaultRestock,
			}))
		);
	};

	// Handlers
	const handleItemToggle = (orderItemId: string, checked: boolean) => {
		const currentItems = form.getFieldValue("items");
		const orderItem = order.items.find((oi) => oi.id === orderItemId);
		const available = orderItem ? getAvailableQuantity(orderItem) : 0;

		form.setFieldValue(
			"items",
			currentItems.map((item) => {
				if (item.orderItemId !== orderItemId) return item;
				return {
					...item,
					selected: checked,
					quantity: checked ? Math.min(1, available) : 0,
				};
			})
		);
	};

	const handleQuantityChange = (orderItemId: string, quantity: number) => {
		const orderItem = order.items.find((oi) => oi.id === orderItemId);
		const available = orderItem ? getAvailableQuantity(orderItem) : 0;
		const validQuantity = Math.max(0, Math.min(quantity, available));

		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) =>
				item.orderItemId === orderItemId
					? { ...item, quantity: validQuantity, selected: validQuantity > 0 }
					: item
			)
		);
	};

	const handleRestockToggle = (orderItemId: string, checked: boolean) => {
		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) =>
				item.orderItemId === orderItemId ? { ...item, restock: checked } : item
			)
		);
	};

	const handleSelectAll = () => {
		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) => {
				const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
				const available = orderItem ? getAvailableQuantity(orderItem) : 0;
				return {
					...item,
					selected: available > 0,
					quantity: available,
				};
			})
		);
	};

	const canSubmit =
		selectedItems.length > 0 && totalAmount > 0 && totalAmount <= maxRefundable;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href={`/admin/ventes/commandes/${order.id}`}>
						<ArrowLeft className="h-4 w-4" />
						Retour
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Nouveau remboursement
					</h1>
					<p className="text-sm text-muted-foreground">
						Commande {order.orderNumber} • {order.customerName}
					</p>
				</div>
			</div>

			<form action={action} className="space-y-6">
				{/* Hidden fields */}
				<input type="hidden" name="orderId" value={order.id} />
				<input type="hidden" name="reason" value={reason} />
				<input type="hidden" name="note" value={note} />
				<input type="hidden" name="items" value={JSON.stringify(itemsForAction)} />

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Left column - Items selection */}
					<div className="lg:col-span-2 space-y-6">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Package className="h-5 w-5" />
										Articles à rembourser
									</CardTitle>
									<CardDescription>
										Sélectionnez les articles et quantités
									</CardDescription>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleSelectAll}
								>
									Tout sélectionner
								</Button>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{order.items.map((orderItem) => (
										<RefundItemRow
											key={orderItem.id}
											orderItem={orderItem}
											itemState={items.find((i) => i.orderItemId === orderItem.id)}
											isPending={isPending}
											onToggle={handleItemToggle}
											onQuantityChange={handleQuantityChange}
											onRestockToggle={handleRestockToggle}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right column - Summary */}
					<div className="space-y-6">
						{/* Reason */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Motif du remboursement</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<Select
									value={reason}
									onValueChange={(value) => handleReasonChange(value as RefundReason)}
									disabled={isPending}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(REFUND_REASON_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
									{getDefaultRestock(reason) ? (
										<span className="text-emerald-600">
											Stock restauré par défaut (article récupéré)
										</span>
									) : (
										<span className="text-amber-600">
											Stock non restauré par défaut (article perdu/cassé)
										</span>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Note */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Note (optionnel)</CardTitle>
							</CardHeader>
							<CardContent>
								<Textarea
									value={note}
									onChange={(e) => form.setFieldValue("note", e.target.value)}
									placeholder="Détails supplémentaires..."
									rows={3}
									disabled={isPending}
								/>
							</CardContent>
						</Card>

						{/* Summary */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Récapitulatif</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Articles sélectionnés
									</span>
									<span>{selectedItems.length}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Montant du remboursement
									</span>
									<span className="font-medium">{formatEuro(totalAmount)}</span>
								</div>
								<Separator />
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Déjà remboursé</span>
									<span>{formatEuro(alreadyRefunded)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Max remboursable</span>
									<span>{formatEuro(maxRefundable)}</span>
								</div>
								{totalAmount > maxRefundable && (
									<p className="text-xs text-destructive">
										Le montant dépasse le maximum remboursable
									</p>
								)}
							</CardContent>
						</Card>

						{/* Submit */}
						<Button
							type="submit"
							className="w-full"
							disabled={!canSubmit || isPending}
						>
							{isPending ? (
								"Création en cours..."
							) : (
								<>
									<RotateCcw className="h-4 w-4" />
									Créer la demande ({formatEuro(totalAmount)})
								</>
							)}
						</Button>

						<p className="text-xs text-center text-muted-foreground">
							Le remboursement sera créé en statut "En attente" et devra être
							approuvé puis traité.
						</p>
					</div>
				</div>
			</form>
		</div>
	);
}
