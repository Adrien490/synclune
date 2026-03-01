"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { cn } from "@/shared/utils/cn";

type ScrollAxis = "horizontal" | "vertical" | "both";

interface ScrollFadeProps {
	children: React.ReactNode;
	className?: string;
	hideScrollbar?: boolean;
	axis?: ScrollAxis;
}

interface ScrollInfo {
	scrollLeft: number;
	scrollTop: number;
	scrollWidth: number;
	scrollHeight: number;
	clientWidth: number;
	clientHeight: number;
}

export default function ScrollFade({
	children,
	className,
	hideScrollbar = true,
	axis = "horizontal",
}: ScrollFadeProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);

	const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({
		scrollLeft: 0,
		scrollTop: 0,
		scrollWidth: 0,
		scrollHeight: 0,
		clientWidth: 0,
		clientHeight: 0,
	});

	// Variables calculées au lieu de useState
	const showLeft = (axis === "horizontal" || axis === "both") && scrollInfo.scrollLeft > 0;
	const showRight =
		(axis === "horizontal" || axis === "both") &&
		Math.ceil(scrollInfo.scrollLeft + scrollInfo.clientWidth) <
			Math.floor(scrollInfo.scrollWidth - 1);
	const showTop = (axis === "vertical" || axis === "both") && scrollInfo.scrollTop > 0;
	const showBottom =
		(axis === "vertical" || axis === "both") &&
		Math.ceil(scrollInfo.scrollTop + scrollInfo.clientHeight) <
			Math.floor(scrollInfo.scrollHeight - 1);

	const updateScrollInfo = () => {
		const el = containerRef.current;
		if (!el) return;

		setScrollInfo({
			scrollLeft: el.scrollLeft,
			scrollTop: el.scrollTop,
			scrollWidth: el.scrollWidth,
			scrollHeight: el.scrollHeight,
			clientWidth: el.clientWidth,
			clientHeight: el.clientHeight,
		});
	};

	useLayoutEffect(() => {
		requestAnimationFrame(updateScrollInfo);
	}, [axis]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Feature check pour anciens navigateurs
		if (typeof ResizeObserver === "undefined") return;

		container.addEventListener("scroll", updateScrollInfo, { passive: true });

		const ro = new ResizeObserver(updateScrollInfo);
		if (contentRef.current) ro.observe(contentRef.current);
		ro.observe(container);

		window.addEventListener("resize", updateScrollInfo);

		const raf = requestAnimationFrame(updateScrollInfo);

		return () => {
			container.removeEventListener("scroll", updateScrollInfo);
			window.removeEventListener("resize", updateScrollInfo);
			ro.disconnect();
			cancelAnimationFrame(raf);
		};
	}, [axis]);

	return (
		<div className="relative h-full">
			<div
				ref={containerRef}
				className={cn(
					hideScrollbar &&
						"[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					axis === "horizontal" && "w-full overflow-x-auto overflow-y-hidden",
					axis === "vertical" && "h-full overflow-x-hidden overflow-y-auto",
					axis === "both" && "overflow-auto",
					className,
				)}
			>
				<div
					ref={contentRef}
					className={cn(
						axis === "horizontal" && "w-fit min-w-full",
						axis === "vertical" && "h-fit",
						axis === "both" && "h-fit w-fit min-w-full",
					)}
				>
					{children}
				</div>
			</div>

			{(axis === "horizontal" || axis === "both") && showLeft && (
				<div
					aria-hidden="true"
					className="from-background pointer-events-none absolute top-0 left-0 z-10 h-full w-10 bg-linear-to-r to-transparent"
				/>
			)}

			{(axis === "horizontal" || axis === "both") && showRight && (
				<div
					aria-hidden="true"
					className="from-background pointer-events-none absolute top-0 right-0 z-10 h-full w-10 bg-linear-to-l to-transparent"
				/>
			)}

			{(axis === "vertical" || axis === "both") && showTop && (
				<div
					aria-hidden="true"
					className="from-background pointer-events-none absolute top-0 left-0 z-10 h-10 w-full bg-linear-to-b to-transparent"
				/>
			)}

			{(axis === "vertical" || axis === "both") && showBottom && (
				<div
					aria-hidden="true"
					className="from-background pointer-events-none absolute bottom-0 left-0 z-10 h-10 w-full bg-linear-to-t to-transparent"
				/>
			)}
		</div>
	);
}
