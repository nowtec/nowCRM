import { makeValidator } from "envalid";

export const NotEmptyStringValidator = makeValidator((x) => {
	if (x) return x;
	else throw new Error("Expected not empty string");
});
