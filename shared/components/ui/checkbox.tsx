"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

function Checkbox({
	className,
	checked,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			checked={checked}
			className={cn(
				"peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary can-hover:hover:border-ring/70 focus-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-[box-shadow,border-color,transform] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-95",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current transition-none"
			>
				{checked === "indeterminate" ? (
					<MinusIcon className="size-3.5" />
				) : (
					<CheckIcon className="size-3.5" />
				)}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
