"use client";

import Link from "next/link";

import { MAX_COLOR_SWATCHES } from "@/modules/products/constants/product-texts.constants";
import type { ColorSwatch } from "@/modules/products/types/product-list.types";
import { cn } from "@/shared/utils/cn";

interface ProductCardColorSwatchesProps {
	colors: ColorSwatch[];
	productUrl: string;
	title: string;
}

export function ProductCardColorSwatches({
	colors,
	productUrl,
	title,
}: ProductCardColorSwatchesProps) {
	return (
		<ul
			className="relative z-30 m-0 flex list-none items-center gap-1.5 p-0"
			aria-label={`${colors.length} couleurs disponibles pour ${title}`}
		>
			{colors.slice(0, MAX_COLOR_SWATCHES).map((color) => (
				<li key={color.slug}>
					<Link
						href={`${productUrl}?color=${color.slug}`}
						className={cn(
							"focus-ring border-foreground/15 relative block size-7 shrink-0 rounded-full border sm:size-8",
							"motion-safe:can-hover:hover:scale-110 motion-safe:can-hover:hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]",
							"after:absolute after:-inset-2 after:rounded-full after:content-['']",
							!color.inStock && "opacity-50",
						)}
						style={{ backgroundColor: color.hex }}
						aria-label={`${title} en ${color.name}${!color.inStock ? " - indisponible" : ""}`}
					>
						{!color.inStock && (
							<span
								aria-hidden="true"
								className="absolute inset-0 flex items-center justify-center"
							>
								<span className="bg-foreground block h-[3px] w-[130%] rotate-[-45deg] rounded-full shadow-[0_0_0_1.5px_white]" />
							</span>
						)}
					</Link>
				</li>
			))}
			{colors.length > MAX_COLOR_SWATCHES && (
				<li>
					<Link
						href={productUrl}
						className="text-muted-foreground relative z-30 flex min-h-11 min-w-11 items-center justify-center text-xs"
						aria-label={`Voir les ${colors.length} couleurs disponibles pour ${title}`}
					>
						+{colors.length - MAX_COLOR_SWATCHES}
					</Link>
				</li>
			)}
		</ul>
	);
}
