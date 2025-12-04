"use client";

import { RefundReason } from "@/app/generated/prisma/browser";
import type { OrderForRefund, OrderItemForRefund } from "@/modules/refunds/data/get-order-for-refund";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import {
	useCreateRefundForm,
	getDefaultRestock,
	getAvailableQuantity,
} from "@/modules/refunds/hooks/use-create-refund-form";

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
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
	return (amount / 100).toFixed(2) + " €";
}

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
	const handleReasonChange = useCallback(
		(value: RefundReason) => {
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
		},
		[form]
	);

	// Handlers
	const handleItemToggle = useCallback(
		(orderItemId: string, checked: boolean) => {
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
		},
		[form, order.items]
	);

	const handleQuantityChange = useCallback(
		(orderItemId: string, quantity: number) => {
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
		},
		[form, order.items]
	);

	const handleRestockToggle = useCallback(
		(orderItemId: string, checked: boolean) => {
			const currentItems = form.getFieldValue("items");
			form.setFieldValue(
				"items",
				currentItems.map((item) =>
					item.orderItemId === orderItemId ? { ...item, restock: checked } : item
				)
			);
		},
		[form]
	);

	const handleSelectAll = useCallback(() => {
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
	}, [form, order.items]);

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

			<form action={action} className="space-y-6" onSubmit={() => form.handleSubmit()}>
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
									<span className="font-medium">{formatCurrency(totalAmount)}</span>
								</div>
								<Separator />
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Déjà remboursé</span>
									<span>{formatCurrency(alreadyRefunded)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Max remboursable</span>
									<span>{formatCurrency(maxRefundable)}</span>
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
									Créer la demande ({formatCurrency(totalAmount)})
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

// ============================================================================
// SUB-COMPONENT: RefundItemRow
// ============================================================================

interface RefundItemRowProps {
	orderItem: OrderItemForRefund;
	itemState:
		| {
				orderItemId: string;
				quantity: number;
				restock: boolean;
				selected: boolean;
		  }
		| undefined;
	isPending: boolean;
	onToggle: (orderItemId: string, checked: boolean) => void;
	onQuantityChange: (orderItemId: string, quantity: number) => void;
	onRestockToggle: (orderItemId: string, checked: boolean) => void;
}

const RefundItemRow = memo(function RefundItemRow({
	orderItem,
	itemState,
	isPending,
	onToggle,
	onQuantityChange,
	onRestockToggle,
}: RefundItemRowProps) {
	const available = getAvailableQuantity(orderItem);
	const variant = [orderItem.skuColor, orderItem.skuSize, orderItem.skuMaterial]
		.filter(Boolean)
		.join(" / ");

	// Item entièrement remboursé
	if (available === 0) {
		return (
			<div className="flex items-center gap-4 py-3 border-b last:border-0 opacity-50">
				<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
					{orderItem.skuImageUrl || orderItem.productImageUrl ? (
						<Image
							src={orderItem.skuImageUrl || orderItem.productImageUrl || ""}
							alt={orderItem.productTitle}
							fill
							sizes="48px"
							quality={80}
							className="object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center">
							<Package className="h-4 w-4 text-muted-foreground" />
						</div>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium truncate text-sm">{orderItem.productTitle}</p>
					{variant && <p className="text-xs text-muted-foreground">{variant}</p>}
				</div>
				<p className="text-sm text-muted-foreground">Entièrement remboursé</p>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-4 py-3 border-b last:border-0">
			{/* Checkbox */}
			<Checkbox
				id={`item-${orderItem.id}`}
				checked={itemState?.selected || false}
				onCheckedChange={(checked) => onToggle(orderItem.id, checked === true)}
				disabled={isPending}
				className="mt-1"
				aria-label={`Sélectionner ${orderItem.productTitle} pour remboursement`}
			/>

			{/* Image */}
			<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
				{orderItem.skuImageUrl || orderItem.productImageUrl ? (
					<Image
						src={orderItem.skuImageUrl || orderItem.productImageUrl || ""}
						alt={orderItem.productTitle}
						fill
						sizes="48px"
						quality={80}
						className="object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Package className="h-4 w-4 text-muted-foreground" />
					</div>
				)}
			</div>

			{/* Details */}
			<div className="flex-1 min-w-0 space-y-2">
				<div>
					<Label
						htmlFor={`item-${orderItem.id}`}
						className="font-medium text-sm cursor-pointer"
					>
						{orderItem.productTitle}
					</Label>
					{variant && (
						<p className="text-xs text-muted-foreground">{variant}</p>
					)}
					<p className="text-xs text-muted-foreground">
						{formatCurrency(orderItem.price)} • Max {available} dispo
					</p>
				</div>

				{/* Quantity + Restock when selected */}
				{itemState?.selected && (
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Label htmlFor={`qty-${orderItem.id}`} className="text-xs">
								Qté:
							</Label>
							<Input
								id={`qty-${orderItem.id}`}
								type="number"
								min={1}
								max={available}
								value={itemState.quantity}
								onChange={(e) =>
									onQuantityChange(orderItem.id, parseInt(e.target.value) || 0)
								}
								className="w-16 h-8 text-sm"
								disabled={isPending}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id={`restock-${orderItem.id}`}
								checked={itemState.restock}
								onCheckedChange={(checked) =>
									onRestockToggle(orderItem.id, checked === true)
								}
								disabled={isPending}
								aria-label={`Restocker ${orderItem.productTitle}`}
							/>
							<Label
								htmlFor={`restock-${orderItem.id}`}
								className="text-xs cursor-pointer"
							>
								Restocker
							</Label>
						</div>
					</div>
				)}
			</div>

			{/* Price */}
			{itemState?.selected && itemState.quantity > 0 && (
				<div className="text-right shrink-0">
					<p className="font-medium text-sm">
						{formatCurrency(orderItem.price * itemState.quantity)}
					</p>
				</div>
			)}
		</div>
	);
});

RefundItemRow.displayName = "RefundItemRow";
