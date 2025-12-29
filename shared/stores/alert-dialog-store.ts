import { createStore } from "zustand/vanilla"

import type {
	AlertDialogData,
	AlertDialogState,
	AlertDialogStore,
} from "@/shared/types/store.types"

export type { AlertDialogData, AlertDialogState, AlertDialogActions, AlertDialogStore } from "@/shared/types/store.types"

export const defaultInitState: AlertDialogState = {
	alertDialogs: {},
};

export const createAlertDialogStore = (
	initState: AlertDialogState = defaultInitState,
) => {
	return createStore<AlertDialogStore>()((set, get) => ({
		...initState,
		openAlertDialog: (dialogId: string, data?: AlertDialogData) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { isOpen: true, data },
				},
			})),
		closeAlertDialog: (dialogId: string) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { ...state.alertDialogs[dialogId], isOpen: false },
				},
			})),
		isAlertDialogOpen: (dialogId: string) => {
			return get().alertDialogs[dialogId]?.isOpen ?? false;
		},
		getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
			dialogId: string,
		): T | undefined => {
			return get().alertDialogs[dialogId]?.data as T | undefined;
		},
		clearAlertDialogData: (dialogId: string) =>
			set((state) => ({
				alertDialogs: {
					...state.alertDialogs,
					[dialogId]: { isOpen: false, data: undefined },
				},
			})),
	}));
};
