"use client";

import { useSpring, useTransform, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
	value: number;
	formatter: (n: number) => string;
	className?: string;
}

export function AnimatedNumber({
	value,
	formatter,
	className,
}: AnimatedNumberProps) {
	const shouldReduceMotion = useReducedMotion();
	const prevValue = useRef(value);
	const springValue = useSpring(value, {
		stiffness: 300,
		damping: 30,
		mass: 0.8,
	});
	const display = useTransform(springValue, (v) => formatter(Math.round(v)));

	useEffect(() => {
		if (shouldReduceMotion || prevValue.current === value) {
			springValue.jump(value);
		} else {
			springValue.set(value);
		}
		prevValue.current = value;
	}, [value, springValue, shouldReduceMotion]);

	return <motion.span className={className}>{display}</motion.span>;
}
