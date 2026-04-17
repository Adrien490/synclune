"use client";

import { CopyButton } from "@/shared/components/copy-button";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { useColorPicker } from "./color-picker";
import { normalizeHex } from "../../utils/hex-normalizer";

type ColorPickerPreviewProps = {
	className?: string;
};

function getContrastColor(hex: string): "dark" | "light" {
	const color = Color(hex);
	return color.isLight() ? "dark" : "light";
}

export function ColorPickerPreview({ className }: ColorPickerPreviewProps) {
	const { hue, saturation, lightness } = useColorPicker();
	const rawHex = Color.hsl(hue, saturation, lightness).hex();
	const hex = normalizeHex(rawHex);
	const contrast = getContrastColor(hex);

	return (
		<div
			data-slot="color-picker-preview"
			className={cn(
				"relative flex h-20 w-full items-center justify-between overflow-hidden rounded-md border px-4 shadow-inner md:h-24",
				className,
			)}
			style={{ backgroundColor: hex }}
			role="img"
			aria-label={`Aperçu de la couleur ${hex}`}
		>
			<span
				className={cn(
					"font-mono text-base font-semibold tracking-wide md:text-lg",
					contrast === "dark" ? "text-neutral-900" : "text-white",
				)}
				aria-hidden="true"
			>
				{hex}
			</span>
			<CopyButton
				text={hex}
				label="Code couleur"
				size="icon"
				className={cn(
					"backdrop-blur-sm",
					contrast === "dark"
						? "text-neutral-900 hover:bg-black/10"
						: "text-white hover:bg-white/15",
				)}
			/>
			<span className="sr-only" aria-live="polite">
				Couleur sélectionnée : {hex}
			</span>
		</div>
	);
}

ColorPickerPreview.displayName = "ColorPickerPreview";
