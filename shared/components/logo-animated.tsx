"use client";

import { m } from "motion/react";
import { Logo } from "./logo";
import type { ComponentProps } from "react";

type LogoAnimatedProps = ComponentProps<typeof Logo>;

export function LogoAnimated(props: LogoAnimatedProps) {
	return (
		<m.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
		>
			<Logo {...props} />
		</m.div>
	);
}
