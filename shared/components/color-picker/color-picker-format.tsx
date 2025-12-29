"use client";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { memo, type ComponentProps } from "react";
import { useColorPicker } from "./color-picker";
import type { ColorPickerFormatProps } from "./types";

type PercentageInputProps = ComponentProps<typeof Input>;

function PercentageInput({ className, ...props }: PercentageInputProps) {
	return (
		<div className="relative">
			<Input
				readOnly
				aria-readonly="true"
				aria-label="Opacité en pourcentage"
				type="text"
				{...props}
				value={props.value ?? ""}
				className={cn(
					"min-h-11 md:h-8 w-[3.5rem] md:w-[3.25rem] rounded-l-none bg-secondary px-2 text-sm md:text-xs shadow-none",
					className
				)}
			/>
			<span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-sm md:text-xs">
				%
			</span>
		</div>
	);
}

export const ColorPickerFormat = memo(
	({ className, ...props }: ColorPickerFormatProps) => {
		const { hue, saturation, lightness, alpha, mode } = useColorPicker();
		const color = Color.hsl(hue, saturation, lightness, alpha / 100);

		if (mode === "hex") {
			const hex = color.hex();

			return (
				<div
					data-slot="color-picker-format"
					className={cn(
						"-space-x-px relative flex w-full items-center rounded-md shadow-sm",
						className
					)}
					{...props}
				>
					<Input
						className="min-h-11 md:h-8 rounded-r-none bg-secondary px-2 text-sm md:text-xs shadow-none"
						readOnly
						aria-readonly="true"
						aria-label="Code hexadécimal"
						type="text"
						value={hex}
					/>
					<PercentageInput value={alpha} />
				</div>
			);
		}

		if (mode === "rgb") {
			const rgb = color
				.rgb()
				.array()
				.map((value) => Math.round(value));
			const labels = ["Rouge", "Vert", "Bleu"];

			return (
				<div
					data-slot="color-picker-format"
					className={cn(
						"-space-x-px flex items-center rounded-md shadow-sm",
						className
					)}
					{...props}
				>
					{rgb.map((value, index) => (
						<Input
							className={cn(
								"min-h-11 md:h-8 rounded-r-none bg-secondary px-2 text-sm md:text-xs shadow-none",
								index && "rounded-l-none"
							)}
							key={index}
							readOnly
							aria-readonly="true"
							aria-label={labels[index]}
							type="text"
							value={value}
						/>
					))}
					<PercentageInput value={alpha} />
				</div>
			);
		}

		if (mode === "css") {
			const rgb = color
				.rgb()
				.array()
				.map((value) => Math.round(value));

			return (
				<div
					data-slot="color-picker-format"
					className={cn("w-full rounded-md shadow-sm", className)}
					{...props}
				>
					<Input
						className="min-h-11 md:h-8 w-full bg-secondary px-2 text-sm md:text-xs shadow-none"
						readOnly
						aria-readonly="true"
						aria-label="Code CSS RGBA"
						type="text"
						value={`rgba(${rgb.join(", ")}, ${alpha}%)`}
					/>
				</div>
			);
		}

		if (mode === "hsl") {
			const hsl = color
				.hsl()
				.array()
				.map((value) => Math.round(value));
			const labels = ["Teinte", "Saturation", "Luminosité"];

			return (
				<div
					data-slot="color-picker-format"
					className={cn(
						"-space-x-px flex items-center rounded-md shadow-sm",
						className
					)}
					{...props}
				>
					{hsl.map((value, index) => (
						<Input
							className={cn(
								"min-h-11 md:h-8 rounded-r-none bg-secondary px-2 text-sm md:text-xs shadow-none",
								index && "rounded-l-none"
							)}
							key={index}
							readOnly
							aria-readonly="true"
							aria-label={labels[index]}
							type="text"
							value={value}
						/>
					))}
					<PercentageInput value={alpha} />
				</div>
			);
		}

		return null;
	}
);

ColorPickerFormat.displayName = "ColorPickerFormat";
