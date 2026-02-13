"use client"

import { formatRelativeDate } from "@/shared/utils/dates"

interface RelativeDateProps {
	date: Date | string
	className?: string
}

/**
 * Client component that formats a date relative to now.
 * Avoids calling new Date() during server prerendering.
 */
export function RelativeDate({ date, className }: RelativeDateProps) {
	return <span className={className}>{formatRelativeDate(date)}</span>
}
