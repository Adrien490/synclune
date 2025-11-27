"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type PaginationState = {
	total: number;
	pageCount: number;
	page: number;
	perPage: number;
};

export function usePagination() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const page = Number(searchParams.get("page")) || 1;
	const perPage = Number(searchParams.get("perPage")) || 10;

	const preserveParams = () => {
		return new URLSearchParams(searchParams.toString());
	};

	const handlePageChange = (newPage: number) => {
		if (newPage === page) return;

		const params = preserveParams();
		params.set("page", String(newPage));

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const handlePerPageChange = (newPerPage: number) => {
		if (newPerPage === perPage) return;

		const params = preserveParams();
		params.set("perPage", String(newPerPage));
		params.set("page", "1"); // Reset to first page when changing items per page

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const getPageNumbers = (pageCount: number) => {
		const numbers = [];

		if (pageCount <= 7) {
			// Si peu de pages, on affiche tout
			for (let i = 1; i <= pageCount; i++) {
				numbers.push(i);
			}
		} else {
			// Toujours afficher la première page
			numbers.push(1);

			// On veut toujours 5 éléments entre la première et dernière page
			if (page <= 4) {
				// Début : 1, 2, 3, 4, 5, ..., N
				for (let i = 2; i <= 5; i++) {
					numbers.push(i);
				}
				numbers.push(-1);
			} else if (page >= pageCount - 3) {
				// Fin : 1, ..., N-4, N-3, N-2, N-1, N
				numbers.push(-1);
				for (let i = pageCount - 4; i <= pageCount - 1; i++) {
					numbers.push(i);
				}
			} else {
				// Milieu : 1, ..., page-1, page, page+1, ..., N
				numbers.push(-1);
				for (let i = page - 1; i <= page + 1; i++) {
					numbers.push(i);
				}
				numbers.push(-1);
			}

			// Toujours afficher la dernière page
			numbers.push(pageCount);
		}

		return numbers;
	};

	const getVisibleRange = (total: number) => {
		const start = total === 0 ? 0 : (page - 1) * perPage + 1;
		const end = Math.min(page * perPage, total);
		return { start, end };
	};

	return {
		page,
		perPage,
		isPending,
		handlePageChange,
		handlePerPageChange,
		getPageNumbers,
		getVisibleRange,
	};
}
