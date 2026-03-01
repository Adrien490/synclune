import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

const nativeSelectVariants = cva(
	cn(
		"border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 appearance-none rounded-md border bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed",
		"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
		"aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
	),
	{
		variants: {
			size: {
				default: "min-h-11",
				sm: "min-h-9 py-1",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

function NativeSelect({
	className,
	size,
	...props
}: Omit<React.ComponentProps<"select">, "size"> & VariantProps<typeof nativeSelectVariants>) {
	const isFullWidth = className?.includes("w-full");
	return (
		<div
			className={cn(
				"group/native-select relative has-[select:disabled]:opacity-50",
				isFullWidth ? "w-full" : "w-fit",
			)}
			data-slot="native-select-wrapper"
		>
			<select
				data-slot="native-select"
				className={cn(nativeSelectVariants({ size }), className)}
				{...props}
			/>
			<ChevronDownIcon
				className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 opacity-70 select-none"
				aria-hidden="true"
				data-slot="native-select-icon"
			/>
		</div>
	);
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
	return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
	return <optgroup data-slot="native-select-optgroup" className={cn(className)} {...props} />;
}

export { NativeSelect, nativeSelectVariants, NativeSelectOptGroup, NativeSelectOption };
