"use client";

import { cn } from "@/shared/utils/cn";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useColorPicker } from "./color-picker";
import type { ColorPickerSelectionProps } from "./types";

export function ColorPickerSelection({ className, ...props }: ColorPickerSelectionProps) {
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

		// Effect Event: stable handler for window listeners, reads latest state without re-attaching
		const onPointerMove = useEffectEvent((event: PointerEvent | TouchEvent) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const { x: clientX, y: clientY } = getEventCoordinates(event);
			const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
			updateFromPosition(x, y);
		});

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
				window.addEventListener("pointermove", onPointerMove);
				window.addEventListener("pointerup", handlePointerUp);
				window.addEventListener("touchmove", onPointerMove, { passive: false });
				window.addEventListener("touchend", handlePointerUp);
			}

			return () => {
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
				window.removeEventListener("touchmove", onPointerMove);
				window.removeEventListener("touchend", handlePointerUp);
			};
		}, [isDragging]);

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
