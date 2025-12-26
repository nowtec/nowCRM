export const renderWithMentions = (text: string, mentions: string[]) => {
	if (!text) return null;

	// Escape mentions for regex usage
	const escapedMentions = mentions.map((m) =>
		m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	);

	// Match #text_block.<message>
	const textBlockPattern = "#text_block\\.[A-Za-z0-9_-]+";

	const combinedPattern = new RegExp(
		`(${escapedMentions.join("|")}|${textBlockPattern})`,
		"g"
	);

	return text.split(combinedPattern).map((part, index) => {
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

		if (part.startsWith("#text_block.")) {
			return (
				<span
					key={index}
					className="rounded bg-green-100 px-1 font-mono text-green-800"
				>
					{part}
				</span>
			);
		}

		return <span key={index}>{part}</span>;
	});
};
