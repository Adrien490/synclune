"use client";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { useHaptic } from "@/shared/hooks/use-haptic";

export function InstagramFollowButton() {
	const haptic = useHaptic();

	return (
		<Button
			asChild
			size="lg"
			className="group w-fit rounded-full bg-linear-to-r from-[#feda75] via-[#d62976] to-[#962fbf] text-white shadow-md hover:shadow-lg motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
		>
			<a
				href={BRAND.social.instagram.url}
				target="_blank"
				rel="noopener noreferrer"
				onClick={() => haptic("selection")}
				aria-label={`Suivre Synclune sur Instagram (${BRAND.social.instagram.handle}, nouvelle fenêtre)`}
			>
				Me suivre sur Instagram
				<ArrowUpRight
					className="ml-1 size-4 motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
					aria-hidden="true"
					strokeWidth={2.25}
				/>
			</a>
		</Button>
	);
}
