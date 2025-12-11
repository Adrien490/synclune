"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
	type ComponentProps,
	createContext,
	type HTMLAttributes,
	memo,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

interface ColorPickerContextValue {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
	mode: string;
	setHue: (hue: number) => void;
	setSaturation: (saturation: number) => void;
	setLightness: (lightness: number) => void;
	setAlpha: (alpha: number) => void;
	setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
	undefined
);

export const useColorPicker = (): ColorPickerContextValue => {
	const context = useContext(ColorPickerContext);

	if (!context) {
		throw new Error("useColorPicker must be used within a ColorPickerProvider");
	}

	return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
	value?: Parameters<typeof Color>[0];
	defaultValue?: Parameters<typeof Color>[0];
	onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
	value,
	defaultValue = "#000000",
	onChange,
	className,
	...props
}: ColorPickerProps) => {
	const selectedColor = Color(value);
	const defaultColor = Color(defaultValue);

	const [hue, setHue] = useState(
		selectedColor.hue() || defaultColor.hue() || 0
	);
	const [saturation, setSaturation] = useState(
		selectedColor.saturationl() || defaultColor.saturationl() || 100
	);
	const [lightness, setLightness] = useState(
		selectedColor.lightness() || defaultColor.lightness() || 50
	);
	const [alpha, setAlpha] = useState(() => {
		const normalizeAlpha = (v: number) => (isNaN(v) ? 1 : v);
		const selectedAlpha = normalizeAlpha(selectedColor.alpha()) * 100;
		const defaultAlpha = normalizeAlpha(defaultColor.alpha()) * 100;
		return selectedAlpha || defaultAlpha || 100;
	});
	const [mode, setMode] = useState("hex");

	// Refs pour éviter les boucles infinies
	const isUpdatingFromValue = useRef(false);
	const onChangeRef = useRef(onChange);

	// Synchroniser onChangeRef avec onChange pour éviter les dépendances instables
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	// Sync controlled value → internal state (nécessaire pour composant contrôlé)
	const prevValueRef = useRef(value);
	useEffect(() => {
		if (value && value !== prevValueRef.current) {
			prevValueRef.current = value;
			isUpdatingFromValue.current = true;
			const color = Color(value);
			const hslValues = color.hsl().array();

			setHue(hslValues[0] || 0);
			setSaturation(hslValues[1] || 100);
			setLightness(hslValues[2] || 50);
			const normalizedAlpha = isNaN(color.alpha()) ? 1 : color.alpha();
			setAlpha(normalizedAlpha * 100 || 100);
		}
	}, [value]);

	// Notify parent of changes (skip if updating from controlled value to avoid loop)
	useEffect(() => {
		if (isUpdatingFromValue.current) {
			isUpdatingFromValue.current = false;
			return;
		}
		if (onChangeRef.current) {
			const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
			const rgba = color.rgb().array();
			onChangeRef.current([rgba[0], rgba[1], rgba[2], alpha / 100]);
		}
	}, [hue, saturation, lightness, alpha]);

	return (
		<ColorPickerContext.Provider
			value={{
				hue,
				saturation,
				lightness,
				alpha,
				mode,
				setHue,
				setSaturation,
				setLightness,
				setAlpha,
				setMode,
			}}
		>
			<div
				data-slot="color-picker"
				className={cn("flex size-full flex-col gap-4", className)}
				{...props}
			/>
		</ColorPickerContext.Provider>
	);
};

ColorPicker.displayName = "ColorPicker";

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
	({ className, ...props }: ColorPickerSelectionProps) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const [isDragging, setIsDragging] = useState(false);
		const [positionX, setPositionX] = useState(0);
		const [positionY, setPositionY] = useState(0);
		const { hue, saturation, lightness, setSaturation, setLightness } =
			useColorPicker();

		const backgroundGradient = `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;

		const updateFromPosition = (x: number, y: number) => {
			setPositionX(x);
			setPositionY(y);
			setSaturation(x * 100);
			const topLightness = x <= 0 ? 100 : 50 + 50 * (1 - x);
			const newLightness = topLightness * (1 - y);
			setLightness(newLightness);
		};

		// Support touch et pointer events
		const getEventCoordinates = (event: PointerEvent | TouchEvent) => {
			if ("touches" in event && event.touches.length > 0) {
				return { x: event.touches[0].clientX, y: event.touches[0].clientY };
			}
			if ("clientX" in event) {
				return { x: event.clientX, y: event.clientY };
			}
			return { x: 0, y: 0 };
		};

		const handlePointerMove = (event: PointerEvent | TouchEvent) => {
			if (!(isDragging && containerRef.current)) {
				return;
			}
			const rect = containerRef.current.getBoundingClientRect();
			const { x: clientX, y: clientY } = getEventCoordinates(event);
			const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
			updateFromPosition(x, y);
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			const step = e.shiftKey ? 0.1 : 0.01;
			let newX = positionX;
			let newY = positionY;

			switch (e.key) {
				case "ArrowRight":
					newX = Math.min(1, positionX + step);
					break;
				case "ArrowLeft":
					newX = Math.max(0, positionX - step);
					break;
				case "ArrowUp":
					e.preventDefault();
					newY = Math.max(0, positionY - step);
					break;
				case "ArrowDown":
					e.preventDefault();
					newY = Math.min(1, positionY + step);
					break;
				default:
					return;
			}

			updateFromPosition(newX, newY);
		};

		useEffect(() => {
			const handlePointerUp = () => setIsDragging(false);

			if (isDragging) {
				window.addEventListener("pointermove", handlePointerMove);
				window.addEventListener("pointerup", handlePointerUp);
				window.addEventListener("touchmove", handlePointerMove, { passive: false });
				window.addEventListener("touchend", handlePointerUp);
			}

			return () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
				window.removeEventListener("touchmove", handlePointerMove);
				window.removeEventListener("touchend", handlePointerUp);
			};
		}, [isDragging, handlePointerMove]);

		return (
			<div
				role="slider"
				aria-label="Sélecteur de couleur"
				aria-description="Utilisez les flèches pour ajuster. Gauche/Droite: saturation. Haut/Bas: luminosité."
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(saturation)}
				aria-valuetext={`Saturation ${Math.round(saturation)}%, Luminosité ${Math.round(lightness)}%`}
				tabIndex={0}
				data-slot="color-picker-selection"
				className={cn(
					"relative size-full cursor-crosshair rounded touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					className
				)}
				onPointerDown={(e) => {
					e.preventDefault();
					setIsDragging(true);
					handlePointerMove(e.nativeEvent);
				}}
				onTouchStart={(e) => {
					e.preventDefault();
					setIsDragging(true);
					handlePointerMove(e.nativeEvent);
				}}
				onKeyDown={handleKeyDown}
				ref={containerRef}
				style={{
					background: backgroundGradient,
				}}
				{...props}
			>
				<div
					className={cn(
						"-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute rounded-full border-2 border-white/90 transition-transform motion-reduce:transition-none",
						isDragging ? "h-5 w-5 scale-110" : "h-4 w-4"
					)}
					style={{
						left: `${positionX * 100}%`,
						top: `${positionY * 100}%`,
						boxShadow: "0 0 0 1.5px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)",
					}}
				/>
			</div>
		);
	}
);

ColorPickerSelection.displayName = "ColorPickerSelection";

export type ColorPickerHueProps = ComponentProps<typeof SliderPrimitive.Root>;

export const ColorPickerHue = ({
	className,
	...props
}: ColorPickerHueProps) => {
	const { hue, setHue } = useColorPicker();

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-hue"
			aria-label="Teinte"
			className={cn("relative flex h-6 w-full touch-none select-none", className)}
			max={360}
			onValueChange={([hue]) => setHue(hue)}
			step={1}
			value={[hue]}
			{...props}
		>
			<SliderPrimitive.Track className="relative my-0.5 h-5 md:h-4 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
				<SliderPrimitive.Range className="absolute h-full" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="relative block h-6 w-6 rounded-full border-2 border-primary/50 bg-background shadow-md transition-transform motion-reduce:transition-none hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 before:absolute before:-inset-2 before:content-['']" />
		</SliderPrimitive.Root>
	);
};

ColorPickerHue.displayName = "ColorPickerHue";

export type ColorPickerAlphaProps = ComponentProps<typeof SliderPrimitive.Root>;

export const ColorPickerAlpha = ({
	className,
	...props
}: ColorPickerAlphaProps) => {
	const { alpha, setAlpha } = useColorPicker();

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-alpha"
			aria-label="Opacité"
			className={cn("relative flex h-6 w-full touch-none select-none", className)}
			max={100}
			onValueChange={([alpha]) => setAlpha(alpha)}
			step={1}
			value={[alpha]}
			{...props}
		>
			<SliderPrimitive.Track
				className="relative my-0.5 h-5 md:h-4 w-full grow rounded-full"
				style={{
					background:
						'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
				}}
			>
				<div className="absolute inset-0 rounded-full bg-linear-to-r from-transparent to-black/50" />
				<SliderPrimitive.Range className="absolute h-full rounded-full bg-transparent" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="relative block h-6 w-6 rounded-full border-2 border-primary/50 bg-background shadow-md transition-transform motion-reduce:transition-none hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 before:absolute before:-inset-2 before:content-['']" />
		</SliderPrimitive.Root>
	);
};

ColorPickerAlpha.displayName = "ColorPickerAlpha";

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
	className,
	...props
}: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

	// Vérifier si l'API EyeDropper est supportée
	const isSupported = typeof window !== "undefined" && "EyeDropper" in window;

	const handleEyeDropper = async (): Promise<void> => {
		if (!isSupported) {
			return;
		}

		try {
			// @ts-expect-error - EyeDropper API is experimental
			const eyeDropper = new EyeDropper();
			const result = await eyeDropper.open();
			const color = Color(result.sRGBHex);
			const [h, s, l] = color.hsl().array();

			setHue(h);
			setSaturation(s);
			setLightness(l);
			setAlpha(100);
		} catch {
			// L'utilisateur a annulé la sélection
		}
	};

	// Ne pas afficher le bouton si l'API n'est pas supportée
	if (!isSupported) {
		return null;
	}

	return (
		<Button
			data-slot="color-picker-eye-dropper"
			className={cn("shrink-0 text-muted-foreground", className)}
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

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

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

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
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
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

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
