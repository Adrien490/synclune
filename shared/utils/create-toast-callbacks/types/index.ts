export type CreateToastCallbacksOptions = {
	loadingMessage?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
};
