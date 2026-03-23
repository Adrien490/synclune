"use client";

import { useOptimistic, useTransition } from "react";
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
import { STATUS_FILTER_OPTIONS } from "../../constants/sort.constants";
import { CustomizationStatusBadge } from "./customization-status-badge";
import type { CustomizationRequestStatus } from "../../types/customization.types";

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

	const currentStatus = searchParams.get("filter_status") ?? "ALL";
	const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);

	const handleSelect = (value: string) => {
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

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Filtrer par statut</DrawerTitle>
				</DrawerHeader>
				<DrawerBody>
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
										"flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
										isSelected
											? "bg-primary/5 text-foreground"
											: "text-foreground hover:bg-muted/50",
									)}
								>
									<span className="flex items-center gap-2">
										{isStatus ? (
											<CustomizationStatusBadge
												status={option.value as CustomizationRequestStatus}
											/>
										) : (
											option.label
										)}
									</span>
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
