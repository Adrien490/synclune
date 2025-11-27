"use client";

import { useSelection } from "@/shared/hooks/use-selection";
import { ReactNode, createContext, useContext } from "react";

export interface SelectionContextType {
	isSelected: (id: string) => boolean;
	handleItemSelectionChange: (id: string, checked: boolean) => void;
	areAllSelected: (ids: string[]) => boolean;
	handleSelectionChange: (ids: string[], checked: boolean) => void;
	getSelectedCount: () => number;
	selectedItems: string[];
	isPending: boolean;
	clearSelection: () => void;
	clearItems: (ids: string[]) => void;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

interface SelectionProviderProps {
	children: ReactNode;
	selectionKey?: string;
}

export function SelectionProvider({
	children,
	selectionKey = "selected",
}: SelectionProviderProps) {
	const selection = useSelection(selectionKey);

	const contextValue: SelectionContextType = {
		...selection,
		clearSelection: selection.clearAll,
	};

	return (
		<SelectionContext.Provider value={contextValue}>
			{children}
		</SelectionContext.Provider>
	);
}

export function useSelectionContext() {
	const context = useContext(SelectionContext);
	if (!context) {
		throw new Error(
			"useSelectionContext doit être utilisé à l'intérieur d'un SelectionProvider"
		);
	}
	return context;
}
