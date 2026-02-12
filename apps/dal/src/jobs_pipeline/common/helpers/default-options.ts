export const DEFAULT_JOB_OPTIONS = {
	removeOnComplete: true,
	removeOnFail: {
		age: 7 * 24 * 60 * 60,
	},
};

export const MASS_JOB_OPTIONS = {
	removeOnComplete: {
		count: 20,
	},
	removeOnFail: {
		count: 20,
	},
};
