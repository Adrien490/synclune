// types/server-action.ts

export enum ActionStatus {
	SUCCESS = "success",
	WARNING = "warning",
	ERROR = "error",
	UNAUTHORIZED = "unauthorized",
	VALIDATION_ERROR = "validation_error",
	NOT_FOUND = "not_found",
	CONFLICT = "conflict",
	FORBIDDEN = "forbidden",
	INITIAL = "initial",
}

export type ActionState = {
	status: ActionStatus;
	message: string;
	data?: unknown;
};
