export const DEFAULT_JOB_OPTIONS = {
	removeOnComplete: {
		age:2 * 60 * 60,
	},
	removeOnFail: {
		age:2 * 60 * 60,
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