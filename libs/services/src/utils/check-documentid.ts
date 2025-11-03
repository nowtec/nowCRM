export function checkDocumentId(identifier: any) {
	const isDocumentId =
		typeof identifier === "string" && /^[a-zA-Z0-9]{24}$/.test(identifier);
	if (isDocumentId) {
		return true;
	} else {
		return false;
	}
}
