import { makeValidator } from "envalid";

export const URLValidator = makeValidator((x) => {
	if (!x) throw new Error("Expected not empty string");
	if (/^https?:\/\//.test(x)) return x;
	else throw new Error("Expected URL to start with http or https");
});
