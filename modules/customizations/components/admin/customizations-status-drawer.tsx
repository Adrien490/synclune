"use client";

import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";

import { STATUS_FILTER_OPTIONS } from "../../constants/sort.constants";
import type { CustomizationRequestStatus } from "../../types/customization.types";
import { CustomizationStatusBadge } from "./customization-status-badge";

interface CustomizationsStatusDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CustomizationsStatusDrawer({
	open,
	onOpenChange,
}: CustomizationsStatusDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const isMobile = useIsMobile();
	const triggerHaptic = useHaptic();

	const currentStatus = searchParams.get("filter_status") ?? "ALL";
	const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			triggerHaptic("selection");
		}
		onOpenChange(next);
	};

	const handleSelect = (value: string) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticStatus(value);
			const params = new URLSearchParams(searchParams);

			// Reset cursor on filter change
			params.delete("cursor");
			params.delete("direction");

			if (value === "ALL") {
				params.delete("filter_status");
			} else {
				params.set("filter_status", value);
			}

			router.push(`?${params.toString()}`, { scroll: false });
			onOpenChange(false);
		});
	};

	const list = (
		<div role="listbox" aria-label="Filtrer par statut" className="flex flex-col gap-1">
			{STATUS_FILTER_OPTIONS.map((option) => {
				const isSelected = optimisticStatus === option.value;
				const isStatus = option.value !== "ALL";

				return (
					<button
						key={option.value}
						type="button"
						role="option"
						aria-selected={isSelected}
						onClick={() => handleSelect(option.value)}
						disabled={isPending}
						className={cn(
							"flex min-h-11 items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
							isSelected ? "bg-primary/5 text-foreground" : "text-foreground hover:bg-muted/50",
						)}
					>
						<span className="flex items-center gap-2">
							{isStatus ? (
								<CustomizationStatusBadge status={option.value as CustomizationRequestStatus} />
							) : (
								option.label
							)}
						</span>
						{isSelected && <Check className="text-primary size-4 shrink-0" aria-hidden="true" />}
					</button>
				);
			})}
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Filtrer par statut</DrawerTitle>
					</DrawerHeader>
					<DrawerBody>{list}</DrawerBody>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet direction="right" open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
				<SheetHeader className="bg-background sticky top-0 z-10 border-b px-6 py-4">
					<SheetTitle>Filtrer par statut</SheetTitle>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto px-4 py-4">{list}</div>
			</SheetContent>
		</Sheet>
	);
}
