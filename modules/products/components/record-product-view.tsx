"use client";

import { useEffect, useRef } from "react";
import { addRecentProduct } from "../actions/add-recent-product";

interface RecordProductViewProps {
	slug: string;
}

export function RecordProductView({ slug }: RecordProductViewProps) {
	const hasRecorded = useRef(false);

	useEffect(() => {
		if (hasRecorded.current) return;
		hasRecorded.current = true;

		const formData = new FormData();
		formData.set("slug", slug);
		void addRecentProduct(undefined, formData);
	}, [slug]);

	return null;
}
