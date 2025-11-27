"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { SkuStock } from "@/modules/skus/types/inventory.types";
import { History, MoreVertical, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface InventoryRowActionsProps {
	item: SkuStock;
}

export function InventoryRowActions({ item }: InventoryRowActionsProps) {
	const router = useRouter();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
					<span className="sr-only">Ouvrir le menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => {
						// TODO: Open adjustment modal
						alert("Fonctionnalité d'ajustement à implémenter");
					}}
				>
					<Settings className="mr-2 h-4 w-4" />
					Ajuster
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						router.push(
							`/dashboard/stock-movements?filter_skuId=${encodeURIComponent(item.id)}`
						);
					}}
				>
					<History className="mr-2 h-4 w-4" />
					Historique
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
