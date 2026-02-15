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
	const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString()
	return <time dateTime={isoDate} className={className}>{formatRelativeDate(date)}</time>
}
