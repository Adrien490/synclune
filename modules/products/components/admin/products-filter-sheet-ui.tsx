"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Search, X } from "lucide-react";

// ============================================================================
// SectionHeader - Accordion trigger content with count badge and reset button
// ============================================================================

export function SectionHeader({
	label,
	count,
	badgeContent,
	onReset,
}: {
	label: string;
	count?: number;
	badgeContent?: React.ReactNode;
	onReset?: () => void;
}) {
	return (
		<div className="flex flex-1 items-center gap-2">
			<span>{label}</span>
			{count !== undefined && count > 0 && (
				<Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
					{badgeContent ?? count}
				</Badge>
			)}
			{onReset && count !== undefined && count > 0 && (
				<span
					role="button"
					tabIndex={0}
					onClick={(e) => {
						e.stopPropagation();
						onReset();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							e.stopPropagation();
							onReset();
						}
					}}
					className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-ring ml-auto flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					aria-label={`Effacer le filtre ${label}`}
				>
					<X className="h-3 w-3" />
				</span>
			)}
		</div>
	);
}

// ============================================================================
// SectionSearch - Search input for filtering long lists within a section
// ============================================================================

export function SectionSearch({
	value,
	onChange,
	placeholder = "Rechercher...",
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<div className="relative mb-2">
			<Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
			<Input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="h-10 pr-3 pl-8 text-xs"
			/>
		</div>
	);
}
