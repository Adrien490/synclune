"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import Color from "color";
import {
	type ChangeEvent,
	type HTMLAttributes,
	type KeyboardEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useRecentColors } from "@/shared/hooks/use-recent-colors";
import { cn } from "@/shared/utils/cn";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type ColorPreset = {
	name: string;
	hex: `#${string}`;
};

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
	value: string;
	onChange: (hex: string) => void;
	disabled?: boolean;
	id?: string;
	presets?: readonly ColorPreset[];
	recentStorageKey?: string;
};

type Hsl = { h: number; s: number; l: number };

const HEX_3_OR_6_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const HEX_FULL_REGEX = /^#[0-9A-Fa-f]{6}$/;
const FALLBACK_HEX = "#000000";

// ============================================================================
// HELPERS
// ============================================================================

function normalizeHex(value: string): string {
	let cleaned = value.trim().replace(/^#/, "");
	if (cleaned.length === 3) {
		cleaned = cleaned
			.split("")
			.map((char) => char + char)
			.join("");
	}
	return `#${cleaned.toUpperCase()}`;
}

function hexToHsl(hex: string): Hsl {
	try {
		const c = Color(hex);
		return {
			h: c.hue() || 0,
			s: c.saturationl() || 0,
			l: c.lightness() || 0,
		};
	} catch {
		return { h: 0, s: 0, l: 0 };
	}
}

function hslToHex(hsl: Hsl): string {
	return Color.hsl(hsl.h, hsl.s, hsl.l).hex().toUpperCase();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ColorPicker({
	value,
	onChange,
	disabled,
	id,
	presets,
	recentStorageKey,
	className,
	...props
}: ColorPickerProps) {
	const haptic = useHaptic();
	const reactId = useId();
	const inputId = id ?? `color-picker-${reactId}`;
	const errorId = `${inputId}-error`;

	const initialHex = HEX_FULL_REGEX.test(value) ? value.toUpperCase() : FALLBACK_HEX;

	const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(initialHex));
	const [draftHex, setDraftHex] = useState<string>(initialHex);
	const [hexError, setHexError] = useState<string | null>(null);

	const lastCommittedRef = useRef(initialHex);

	const { recents, push } = useRecentColors(recentStorageKey);

	// External sync: when `value` prop is replaced from outside (e.g. form reset)
	useEffect(() => {
		if (!HEX_FULL_REGEX.test(value)) return;
		const upper = value.toUpperCase();
		if (upper === lastCommittedRef.current) return;
		lastCommittedRef.current = upper;
		setHsl(hexToHsl(upper));
		setDraftHex(upper);
		setHexError(null);
	}, [value]);

	const commit = (rawHex: string) => {
		const upper = normalizeHex(rawHex);
		if (!HEX_FULL_REGEX.test(upper)) return;
		setHexError(null);
		setHsl(hexToHsl(upper));
		setDraftHex(upper);
		if (upper === lastCommittedRef.current) return;
		lastCommittedRef.current = upper;
		onChange(upper);
		push(upper);
	};

	const currentHex = hslToHex(hsl);

	// ──────────────── Handlers ─────────────────
	const handleSwatchSelect = (hex: string) => {
		if (disabled) return;
		haptic("selection");
		commit(hex);
	};

	const handleHexChange = (event: ChangeEvent<HTMLInputElement>) => {
		setDraftHex(event.target.value);
		if (hexError) setHexError(null);
	};

	const tryCommitDraft = () => {
		const cleaned = draftHex.trim();
		if (cleaned.length === 0) {
			setDraftHex(lastCommittedRef.current);
			setHexError(null);
			return;
		}
		const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
		if (!HEX_3_OR_6_REGEX.test(withHash)) {
			haptic("error");
			setHexError("Format invalide. Utilisez #RRGGBB (ex: #FF5733) ou #RGB (ex: #F57)");
			return;
		}
		const normalized = normalizeHex(withHash);
		if (normalized !== lastCommittedRef.current) haptic("light");
		commit(normalized);
	};

	const handleHexKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			tryCommitDraft();
			event.currentTarget.blur();
		} else if (event.key === "Escape") {
			event.preventDefault();
			setDraftHex(lastCommittedRef.current);
			setHexError(null);
			event.currentTarget.blur();
		}
	};

	const handleSlPreview = (s: number, l: number) => {
		setHsl((prev) => ({ ...prev, s, l }));
	};

	const handleSlCommit = (s: number, l: number) => {
		haptic("light");
		commit(hslToHex({ h: hsl.h, s, l }));
	};

	const handleHuePreview = (h: number) => {
		setHsl((prev) => ({ ...prev, h }));
	};

	const handleHueCommit = (h: number) => {
		haptic("light");
		commit(hslToHex({ h, s: hsl.s, l: hsl.l }));
	};

	const handleAccordionToggle = () => {
		haptic("selection");
	};

	return (
		<div
			data-slot="color-picker"
			className={cn("flex flex-col gap-4", disabled && "pointer-events-none opacity-50", className)}
			aria-disabled={disabled ? true : undefined}
			{...props}
		>
			{/* Preview */}
			<div className="flex items-center gap-3">
				<div
					className="size-16 shrink-0 rounded-lg border shadow-sm"
					style={{
						backgroundColor: currentHex,
						viewTransitionName: "color-picker-preview",
					}}
					aria-hidden="true"
					data-testid="color-picker-preview"
				/>
				<div className="min-w-0 flex-1">
					<p className="text-muted-foreground text-xs font-medium">Aperçu</p>
					<p
						className="font-mono text-base"
						aria-live="polite"
						data-testid="color-picker-preview-hex"
					>
						{currentHex}
					</p>
				</div>
			</div>

			{/* Palette presets */}
			{presets && presets.length > 0 ? (
				<SwatchGrid
					label="Couleurs bijoux"
					swatches={presets.map((preset) => ({
						hex: preset.hex.toUpperCase(),
						name: preset.name,
					}))}
					selected={currentHex}
					disabled={disabled}
					onSelect={handleSwatchSelect}
					testId="color-picker-presets"
				/>
			) : null}

			{/* Recents */}
			{recents.length > 0 ? (
				<SwatchGrid
					label="Récents"
					swatches={recents.map((hex) => ({ hex, name: hex }))}
					selected={currentHex}
					disabled={disabled}
					onSelect={handleSwatchSelect}
					testId="color-picker-recents"
					columns={5}
				/>
			) : null}

			{/* Hex input */}
			<div className="space-y-1.5">
				<Label htmlFor={inputId}>Code couleur</Label>
				<Input
					id={inputId}
					type="text"
					inputMode="text"
					autoCapitalize="characters"
					autoComplete="off"
					autoCorrect="off"
					spellCheck={false}
					enterKeyHint="done"
					maxLength={7}
					value={draftHex}
					disabled={disabled}
					onChange={handleHexChange}
					onBlur={tryCommitDraft}
					onKeyDown={handleHexKeyDown}
					aria-invalid={hexError ? true : undefined}
					aria-describedby={hexError ? errorId : undefined}
					data-testid="color-picker-hex-input"
				/>
				{hexError ? (
					<p id={errorId} role="alert" className="text-destructive text-xs">
						{hexError}
					</p>
				) : null}
			</div>

			{/* Custom canvas (optional) */}
			<Accordion type="single" collapsible className="border-t">
				<AccordionItem value="customize" className="border-b-0">
					<AccordionTrigger className="text-sm" onClick={handleAccordionToggle}>
						Personnaliser
					</AccordionTrigger>
					<AccordionContent className="space-y-4 px-0 pt-2">
						<SaturationLightnessCanvas
							hue={hsl.h}
							saturation={hsl.s}
							lightness={hsl.l}
							disabled={disabled}
							onPreview={handleSlPreview}
							onCommit={handleSlCommit}
						/>
						<HueSlider
							hue={hsl.h}
							disabled={disabled}
							onPreview={handleHuePreview}
							onCommit={handleHueCommit}
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}

// ============================================================================
// SUB-COMPONENTS (internal)
// ============================================================================

type SwatchGridProps = {
	label: string;
	swatches: readonly { hex: string; name: string }[];
	selected: string;
	disabled?: boolean;
	onSelect: (hex: string) => void;
	testId?: string;
	columns?: 5;
};

function SwatchGrid({
	label,
	swatches,
	selected,
	disabled,
	onSelect,
	testId,
	columns,
}: SwatchGridProps) {
	return (
		<div className="space-y-2" data-testid={testId}>
			<p className="text-muted-foreground text-xs font-medium">{label}</p>
			<div
				role="radiogroup"
				aria-label={label}
				className={cn("grid gap-2", columns === 5 ? "grid-cols-5" : "grid-cols-4 sm:grid-cols-6")}
			>
				{swatches.map((swatch) => {
					const isSelected = swatch.hex === selected;
					return (
						<button
							key={swatch.hex}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={swatch.name}
							title={swatch.name}
							disabled={disabled}
							onClick={() => onSelect(swatch.hex)}
							className={cn(
								"relative flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-md border shadow-sm",
								"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
								"motion-safe:transition-transform motion-safe:active:scale-95",
								isSelected && "ring-foreground ring-2 ring-offset-2",
							)}
							style={{ backgroundColor: swatch.hex }}
							data-hex={swatch.hex}
							data-testid={`${testId ?? "swatch"}-item`}
						>
							<span className="sr-only">{swatch.name}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

type SaturationLightnessCanvasProps = {
	hue: number;
	saturation: number;
	lightness: number;
	disabled?: boolean;
	onPreview: (s: number, l: number) => void;
	onCommit: (s: number, l: number) => void;
};

function SaturationLightnessCanvas({
	hue,
	saturation,
	lightness,
	disabled,
	onPreview,
	onCommit,
}: SaturationLightnessCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const latestRef = useRef({ s: saturation, l: lightness });
	const [isDragging, setIsDragging] = useState(false);

	// Stable refs so window listeners stay attached for the whole drag
	const onPreviewRef = useRef(onPreview);
	const onCommitRef = useRef(onCommit);
	useEffect(() => {
		onPreviewRef.current = onPreview;
		onCommitRef.current = onCommit;
	});

	const updateFromPointer = (clientX: number, clientY: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		const sat = px * 100;
		const topLightness = px < 0.01 ? 100 : 50 + 50 * (1 - px);
		const light = topLightness * (1 - py);
		latestRef.current = { s: sat, l: light };
		onPreviewRef.current(sat, light);
	};

	useEffect(() => {
		if (!isDragging) return;
		const handleMove = (event: PointerEvent) => updateFromPointer(event.clientX, event.clientY);
		const handleUp = () => {
			setIsDragging(false);
			onCommitRef.current(latestRef.current.s, latestRef.current.l);
		};
		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerup", handleUp);
		window.addEventListener("pointercancel", handleUp);
		return () => {
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerup", handleUp);
			window.removeEventListener("pointercancel", handleUp);
		};
	}, [isDragging]);

	const x = Math.max(0, Math.min(1, saturation / 100));
	const topLightnessAtX = x < 0.01 ? 100 : 50 + 50 * (1 - x);
	const y = topLightnessAtX === 0 ? 0 : Math.max(0, Math.min(1, 1 - lightness / topLightnessAtX));

	return (
		<div
			ref={containerRef}
			role="application"
			aria-label="Saturation et luminosité"
			aria-disabled={disabled ? true : undefined}
			className={cn(
				"relative aspect-[4/3] w-full touch-none rounded-md select-none",
				disabled ? "cursor-not-allowed" : "cursor-crosshair",
			)}
			style={{
				background: `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
hsl(${hue}, 100%, 50%)`,
			}}
			onPointerDown={(event) => {
				if (disabled) return;
				event.preventDefault();
				setIsDragging(true);
				updateFromPointer(event.clientX, event.clientY);
			}}
			data-testid="color-picker-canvas"
		>
			<div
				className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
				style={{
					left: `${x * 100}%`,
					top: `${y * 100}%`,
					boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
				}}
				data-testid="color-picker-canvas-thumb"
			/>
		</div>
	);
}

type HueSliderProps = {
	hue: number;
	disabled?: boolean;
	onPreview: (h: number) => void;
	onCommit: (h: number) => void;
};

function HueSlider({ hue, disabled, onPreview, onCommit }: HueSliderProps) {
	return (
		<div className="space-y-1.5">
			<Label className="text-muted-foreground text-xs">Teinte</Label>
			<SliderPrimitive.Root
				className="relative flex h-6 w-full touch-none items-center select-none"
				max={360}
				step={1}
				value={[hue]}
				disabled={disabled}
				onValueChange={([next]) => onPreview(next ?? 0)}
				onValueCommit={([next]) => onCommit(next ?? 0)}
				aria-label="Teinte"
				data-testid="color-picker-hue"
			>
				<SliderPrimitive.Track className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
					<SliderPrimitive.Range className="absolute h-full" />
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb className="border-primary/60 bg-background focus-visible:ring-ring relative block size-6 rounded-full border-2 shadow-md transition-colors before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
			</SliderPrimitive.Root>
		</div>
	);
}
