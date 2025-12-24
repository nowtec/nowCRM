export const renderWithMentions = (text: string, mentions: string[]) => {
	if (!text) return null;

	// Escape mentions for regex usage
	const escaped = mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

	const regex = new RegExp(`(${escaped.join("|")})`, "g");

	return text.split(regex).map((part, index) => {
		if (mentions.includes(part)) {
			return (
				<span
					key={index}
					className="rounded bg-blue-100 px-1 font-mono text-blue-800"
				>
					{part}
				</span>
			);
		}

		return <span key={index}>{part}</span>;
	});
};
