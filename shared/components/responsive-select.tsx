"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/shared/components/ui/native-select";
import { cn } from "@/shared/utils/cn";

// ============================================================================
// Types
// ============================================================================

interface ResponsiveSelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

interface ResponsiveSelectGroup {
	label: string;
	options: ResponsiveSelectOption[];
}

type ResponsiveSelectOptions = ResponsiveSelectOption[] | ResponsiveSelectGroup[];

function isGroupedOptions(
	options: ResponsiveSelectOptions
): options is ResponsiveSelectGroup[] {
	return options.length > 0 && "options" in options[0];
}

// ============================================================================
// Main Component
// ============================================================================

interface ResponsiveSelectProps {
	options: ResponsiveSelectOptions;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	required?: boolean;
	size?: "sm" | "default";
	className?: string;
	triggerClassName?: string;
	// Accessibilité
	id?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}

function ResponsiveSelect({
	options,
	value,
	defaultValue,
	onValueChange,
	placeholder,
	disabled,
	name,
	required,
	size = "default",
	className,
	triggerClassName,
	id,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedby,
}: ResponsiveSelectProps) {
	const isMobile = useIsMobile();

	// Mobile: NativeSelect
	if (isMobile) {
		return (
			<NativeSelect
				id={id}
				value={value}
				defaultValue={defaultValue}
				onChange={(e) => onValueChange?.(e.target.value)}
				disabled={disabled}
				name={name}
				required={required}
				size={size}
				className={cn("w-full", className, triggerClassName)}
				aria-invalid={ariaInvalid}
				aria-describedby={ariaDescribedby}
			>
				{placeholder && (
					<NativeSelectOption value="" disabled>
						{placeholder}
					</NativeSelectOption>
				)}
				{isGroupedOptions(options)
					? options.map((group) => (
							<NativeSelectOptGroup key={group.label} label={group.label}>
								{group.options.map((option) => (
									<NativeSelectOption
										key={option.value}
										value={option.value}
										disabled={option.disabled}
									>
										{option.label}
									</NativeSelectOption>
								))}
							</NativeSelectOptGroup>
						))
					: options.map((option) => (
							<NativeSelectOption
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</NativeSelectOption>
						))}
			</NativeSelect>
		);
	}

	// Desktop: Radix Select
	return (
		<Select
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			disabled={disabled}
			name={name}
			required={required}
		>
			<SelectTrigger
				id={id}
				size={size}
				className={cn(className, triggerClassName)}
				aria-invalid={ariaInvalid}
				aria-describedby={ariaDescribedby}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{isGroupedOptions(options)
					? options.map((group) => (
							<SelectGroup key={group.label}>
								<SelectLabel>{group.label}</SelectLabel>
								{group.options.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value}
										disabled={option.disabled}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectGroup>
						))
					: options.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</SelectItem>
						))}
			</SelectContent>
		</Select>
	);
}

// ============================================================================
// Exports
// ============================================================================

export { ResponsiveSelect };
export type {
	ResponsiveSelectProps,
	ResponsiveSelectOption,
	ResponsiveSelectGroup,
	ResponsiveSelectOptions,
};
