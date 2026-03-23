"use client";

import { Search } from "lucide-react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { QUICK_SEARCH_DIALOG_ID } from "./constants";

interface QuickSearchTriggerProps {
	className?: string;
}

/**
 * Trigger button for the quick search dialog.
 */
export function QuickSearchTrigger({ className }: QuickSearchTriggerProps) {
	const { open, isOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => open()}
			className={cn("size-11 transition-all duration-300 ease-out", className)}
			aria-label="Ouvrir la recherche rapide"
			aria-expanded={isOpen}
			aria-haspopup="dialog"
		>
			<Search className="size-5" />
		</Button>
	);
}
