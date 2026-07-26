import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

const nativeSelectVariants = cva(
	cn(
		// `text-base md:text-sm` (et non `text-sm` seul) : c'est la variante MOBILE
		// de `SelectField`, et iOS zoome sur tout contrôle de formulaire dont la
		// police est < 16px au focus. Le repo s'en sortait uniquement grâce à la
		// règle globale `select { font-size: max(16px,1rem) }` de `pwa.css`, qui
		// gagne parce que ce fichier est importé HORS `@layer` — couplage invisible
		// qui casserait au premier déplacement de l'import dans un layer.
		"border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground can-hover:hover:border-ring/70 w-full min-w-0 appearance-none bg-none rounded-md border bg-transparent px-3 py-2 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed md:text-sm",
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
				className="text-muted-foreground can-hover:group-hover/native-select:text-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 opacity-70 transition-colors select-none"
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

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
