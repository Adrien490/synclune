"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useColorPicker } from "./color-picker";
import type { ColorPickerOutputProps } from "./types";

const formats = ["hex", "rgb", "css", "hsl"];

export const ColorPickerOutput = ({
	className,
	...props
}: ColorPickerOutputProps) => {
	const { mode, setMode } = useColorPicker();

	return (
		<Select onValueChange={setMode} value={mode}>
			<SelectTrigger
				data-slot="color-picker-output"
				className="min-h-11 md:h-8 w-auto min-w-20 shrink-0 text-sm md:text-xs"
				{...props}
			>
				<SelectValue placeholder="Mode" />
			</SelectTrigger>
			<SelectContent>
				{formats.map((format) => (
					<SelectItem className="text-sm md:text-xs" key={format} value={format}>
						{format.toUpperCase()}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

ColorPickerOutput.displayName = "ColorPickerOutput";
