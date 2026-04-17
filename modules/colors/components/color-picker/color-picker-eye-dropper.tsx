"use client";

import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import { useColorPicker } from "./color-picker";
import type { ColorPickerEyeDropperProps } from "./types";

function parseHslFromHex(hex: string) {
	const color = Color(hex);
	const [h, s, l] = color.hsl().array();
	return { h: h ?? 0, s: s ?? 0, l: l ?? 0 };
}

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness } = useColorPicker();

	const isSupported = typeof window !== "undefined" && "EyeDropper" in window;

	const handleEyeDropper = async (): Promise<void> => {
		if (!isSupported) return;

		let hex: string;
		try {
			const eyeDropper = new EyeDropper();
			const result = await eyeDropper.open();
			hex = result.sRGBHex;
		} catch {
			return;
		}

		const { h, s, l } = parseHslFromHex(hex);
		setHue(h);
		setSaturation(s);
		setLightness(l);
	};

	if (!isSupported) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					{/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- span wraps disabled button so Tooltip can receive focus */}
					<span className="inline-flex" tabIndex={0}>
						<Button
							data-slot="color-picker-eye-dropper"
							className={cn("text-muted-foreground pointer-events-none shrink-0", className)}
							size="icon"
							variant="outline"
							type="button"
							disabled
							aria-label="Pipette non disponible sur ce navigateur"
							aria-disabled="true"
						>
							<PipetteIcon size={16} aria-hidden="true" />
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>Pipette non disponible sur ce navigateur</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Button
			data-slot="color-picker-eye-dropper"
			className={cn("text-muted-foreground shrink-0", className)}
			onClick={handleEyeDropper}
			size="icon"
			variant="outline"
			type="button"
			aria-label="Pipette - sélectionner une couleur à l'écran"
			{...props}
		>
			<PipetteIcon size={16} aria-hidden="true" />
		</Button>
	);
};

ColorPickerEyeDropper.displayName = "ColorPickerEyeDropper";
