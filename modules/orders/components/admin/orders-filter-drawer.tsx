"use client";

import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/utils/cn";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";

interface OrdersFilterDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** DOM `id` of the drawer content node (paired with `aria-controls`). */
	id?: string;
}

const FILTER_OPTIONS = [
	{ value: "all", label: "Tous" },
	// Order statuses
	...Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => ({
		value: `status_${key}`,
		label: `Statut: ${label}`,
	})),
	// Payment statuses
	...Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => ({
		value: `payment_${key}`,
		label: `Paiement: ${label}`,
	})),
];

function getCurrentFilter(searchParams: URLSearchParams): string {
	const filterStatus = searchParams.get("filter_status");
	const filterPaymentStatus = searchParams.get("filter_paymentStatus");

	if (filterStatus) return `status_${filterStatus}`;
	if (filterPaymentStatus) return `payment_${filterPaymentStatus}`;
	return "all";
}

function OrdersFilterDrawerInner({ open, onOpenChange, id }: OrdersFilterDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentFilter = getCurrentFilter(searchParams);
	const [optimisticFilter, setOptimisticFilter] = useOptimistic(currentFilter);

	const handleSelect = (value: string) => {
		startTransition(() => {
			setOptimisticFilter(value);
			const params = new URLSearchParams(searchParams);

			// Reset cursor and all filters
			params.delete("cursor");
			params.delete("direction");
			params.delete("filter_status");
			params.delete("filter_paymentStatus");

			// Apply new filter
			if (value.startsWith("status_")) {
				params.set("filter_status", value.replace("status_", ""));
			} else if (value.startsWith("payment_")) {
				params.set("filter_paymentStatus", value.replace("payment_", ""));
			}

			router.push(`?${params.toString()}`, { scroll: false });
			onOpenChange(false);
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent id={id}>
				<DrawerHeader>
					<DrawerTitle>Filtrer les commandes</DrawerTitle>
				</DrawerHeader>
				<DrawerBody className="overscroll-contain" data-vaul-no-drag>
					<div role="listbox" aria-label="Filtrer les commandes" className="flex flex-col gap-1">
						{FILTER_OPTIONS.map((option) => {
							const isSelected = optimisticFilter === option.value;

							return (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={isSelected}
									onClick={() => handleSelect(option.value)}
									disabled={isPending}
									className={cn(
										"flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
										isSelected
											? "bg-primary/5 text-foreground"
											: "text-foreground hover:bg-muted/50",
									)}
								>
									<span>{option.label}</span>
									{isSelected && (
										<Check className="text-primary size-4 shrink-0" aria-hidden="true" />
									)}
								</button>
							);
						})}
					</div>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}

export function OrdersFilterDrawer(props: ComponentProps<typeof OrdersFilterDrawerInner>) {
	return (
		<Suspense fallback={null}>
			<OrdersFilterDrawerInner {...props} />
		</Suspense>
	);
}
