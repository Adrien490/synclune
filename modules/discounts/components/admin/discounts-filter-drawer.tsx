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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";

interface DiscountsFilterDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** DOM `id` of the drawer content node (paired with `aria-controls`). */
	id?: string;
}

const FILTER_OPTIONS = [
	{ value: "all", label: "Tous" },
	{ value: "active", label: "Actifs uniquement" },
	{ value: "inactive", label: "Inactifs uniquement" },
	{
		value: `type_${DiscountType.PERCENTAGE}`,
		label: DISCOUNT_TYPE_LABELS[DiscountType.PERCENTAGE],
	},
	{
		value: `type_${DiscountType.FIXED_AMOUNT}`,
		label: DISCOUNT_TYPE_LABELS[DiscountType.FIXED_AMOUNT],
	},
	{ value: "with_usages", label: "Avec utilisations" },
	{ value: "without_usages", label: "Sans utilisation" },
] as const;

function getCurrentFilter(searchParams: URLSearchParams): string {
	const filterType = searchParams.get("filter_type");
	const filterIsActive = searchParams.get("filter_isActive");
	const filterHasUsages = searchParams.get("filter_hasUsages");

	if (filterType) return `type_${filterType}`;
	if (filterIsActive === "true") return "active";
	if (filterIsActive === "false") return "inactive";
	if (filterHasUsages === "true") return "with_usages";
	if (filterHasUsages === "false") return "without_usages";
	return "all";
}

function DiscountsFilterDrawerInner({ open, onOpenChange, id }: DiscountsFilterDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const haptic = useHaptic();

	const currentFilter = getCurrentFilter(searchParams);
	const [optimisticFilter, setOptimisticFilter] = useOptimistic(currentFilter);

	const handleSelect = (value: string) => {
		haptic("selection");
		startTransition(() => {
			setOptimisticFilter(value);
			const params = new URLSearchParams(searchParams);

			// Reset cursor and all filters
			params.delete("cursor");
			params.delete("direction");
			params.delete("filter_type");
			params.delete("filter_isActive");
			params.delete("filter_hasUsages");

			// Apply new filter
			if (value === "active") {
				params.set("filter_isActive", "true");
			} else if (value === "inactive") {
				params.set("filter_isActive", "false");
			} else if (value.startsWith("type_")) {
				params.set("filter_type", value.replace("type_", ""));
			} else if (value === "with_usages") {
				params.set("filter_hasUsages", "true");
			} else if (value === "without_usages") {
				params.set("filter_hasUsages", "false");
			}

			router.push(`?${params.toString()}`, { scroll: false });
			onOpenChange(false);
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent id={id}>
				<DrawerHeader>
					<DrawerTitle>Filtrer les codes promo</DrawerTitle>
				</DrawerHeader>
				<DrawerBody className="overscroll-contain" data-base-ui-swipe-ignore="">
					<div
						role="listbox"
						aria-label="Filtrer les codes promo"
						className="flex flex-col gap-1 pb-[max(0rem,env(safe-area-inset-bottom))]"
					>
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
										"focus-ring flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
										isSelected
											? "bg-primary/5 text-foreground"
											: "text-foreground can-hover:hover:bg-muted/50",
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

export function DiscountsFilterDrawer(props: ComponentProps<typeof DiscountsFilterDrawerInner>) {
	return (
		<Suspense fallback={null}>
			<DiscountsFilterDrawerInner {...props} />
		</Suspense>
	);
}
