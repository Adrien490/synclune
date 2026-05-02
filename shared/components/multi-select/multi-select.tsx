"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/utils/cn";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";

export interface MultiSelectOption {
	value: string;
	label: string;
}

export interface MultiSelectProps extends Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"onChange" | "defaultValue"
> {
	options: MultiSelectOption[];
	onValueChange: (value: string[]) => void;
	defaultValue?: string[];
	placeholder?: string;
	disabled?: boolean;
}

export const MultiSelect = ({
	options,
	onValueChange,
	defaultValue = [],
	placeholder = "Sélectionner",
	disabled = false,
	className,
	...props
}: MultiSelectProps) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const selected = defaultValue;

	const toggle = (value: string) => {
		if (disabled) return;
		onValueChange(
			selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
		);
	};

	const clear = () => {
		if (disabled || selected.length === 0) return;
		onValueChange([]);
	};

	const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					disabled={disabled}
					role="combobox"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					className={cn(
						"flex h-auto min-h-11 w-full items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit",
						disabled && "cursor-not-allowed opacity-50",
						className,
					)}
					{...props}
				>
					{selected.length === 0 ? (
						<>
							<span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
							<ChevronDown className="text-muted-foreground mx-2 size-4" aria-hidden="true" />
						</>
					) : (
						<>
							<div className="flex flex-1 flex-wrap items-center gap-1">
								{selected.map((value) => (
									<Badge key={value} className="bg-card text-foreground border-foreground/10 m-0.5">
										<span className="truncate">{labelOf(value)}</span>
										<span
											role="button"
											tabIndex={disabled ? -1 : 0}
											onClick={(e) => {
												e.stopPropagation();
												toggle(value);
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													e.stopPropagation();
													toggle(value);
												}
											}}
											aria-label={`Retirer ${labelOf(value)}`}
											className="hover:bg-foreground/20 focus-visible:ring-foreground/50 -mr-1 ml-1 flex size-6 cursor-pointer items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:outline-hidden"
										>
											<X className="size-3" aria-hidden="true" />
										</span>
									</Badge>
								))}
							</div>
							<div className="flex shrink-0 items-center">
								<span
									role="button"
									tabIndex={disabled ? -1 : 0}
									onClick={(e) => {
										e.stopPropagation();
										clear();
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											e.stopPropagation();
											clear();
										}
									}}
									aria-label={`Effacer les ${selected.length} options sélectionnées`}
									className="text-muted-foreground hover:text-foreground focus:ring-ring mx-1 flex size-8 cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:outline-hidden"
								>
									<X className="size-4" aria-hidden="true" />
								</span>
								<Separator orientation="vertical" className="h-6" />
								<ChevronDown className="text-muted-foreground mx-2 size-4" aria-hidden="true" />
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				role="listbox"
				aria-multiselectable="true"
				aria-label="Options disponibles"
				className="w-(--radix-popover-trigger-width) min-w-64 p-1"
				align="start"
				sideOffset={4}
			>
				{options.length === 0 ? (
					<p className="text-muted-foreground py-6 text-center text-sm">Aucune option disponible</p>
				) : (
					<div className="flex flex-col gap-0.5">
						{options.map((option) => {
							const isSelected = selected.includes(option.value);
							return (
								<label
									key={option.value}
									className={cn(
										"hover:bg-accent focus-within:bg-accent flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3",
										isSelected && "bg-accent/60",
									)}
								>
									<Checkbox
										checked={isSelected}
										onCheckedChange={() => toggle(option.value)}
										aria-label={option.label}
										className="pointer-events-none"
									/>
									<span className="flex-1 truncate text-sm">{option.label}</span>
								</label>
							);
						})}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
};
