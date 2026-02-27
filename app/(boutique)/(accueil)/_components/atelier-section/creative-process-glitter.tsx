"use client"

import dynamic from "next/dynamic"

const GlitterSparkles = dynamic(
	() => import("@/shared/components/animations/glitter-sparkles").then(m => m.GlitterSparkles),
	{ ssr: false }
)

export function CreativeProcessGlitter() {
	return <GlitterSparkles count={8} sizeRange={[1, 3]} disableOnMobile />
}
