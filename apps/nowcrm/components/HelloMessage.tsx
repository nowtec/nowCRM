"use client";

import { Ban, X } from "lucide-react";
import type React from "react";
import { type JSX, useEffect, useState } from "react";
import { findRandomContact } from "@/lib/actions/contacts/find-contact-by-unsubscribe";
import { RouteConfig } from "@/lib/config/RoutesConfig";

type Phrase = {
	text: string;
	color: string;
};

type TimeBlock = "morning" | "afternoon" | "evening" | "night";

const phrasesByTime: Record<TimeBlock, Phrase[]> = {
	morning: [
		{
			text: "The wind stirs gently this morning. It’s a good time to reconnect with {contact_name}.",
			color: "#fcd34d",
		},
		{
			text: "You’ve been in stealth mode for 3 days… maybe {contact_name} is ready for your ping.",
			color: "#4ade80",
		},
		{
			text: "{contact_name} might just open the day right. Start with a message to {email}.",
			color: "#60a5fa",
		},
		{
			text: "The day begins. Shine some light on {contact_name} – their last update was a while ago.",
			color: "#86efac",
		},
		{
			text: "Morning Mode: The Seeker – maybe {contact_name} has the answers you’re looking for.",
			color: "#5eead4",
		},
		{
			text: "A fresh start. Say hi to {contact_name} at {phone}.",
			color: "#38bdf8",
		},
		{
			text: "Feel that openness? Now's a good time to check in on {link}.",
			color: "#67e8f9",
		},
	],
	afternoon: [
		{
			text: "This is the hour of review. {contact_name} crossed your path earlier this quarter.",
			color: "#fde047",
		},
		{
			text: "Your words carry weight today. Why not aim them at {contact_name}?",
			color: "#14b8a6",
		},
		{
			text: "{contact_name} spoke of new markets — revisit at {link}",
			color: "#fb7185",
		},
		{
			text: "Today’s good for courage. Maybe try calling {phone}.",
			color: "#f97316",
		},
		{
			text: "An untapped thread: {contact_name}, last heard via {email}.",
			color: "#38bdf8",
		},
		{
			text: "In another timeline, you looped back to {contact_name}… this one’s still open.",
			color: "#facc15",
		},
	],
	evening: [
		{
			text: "Evening brings reflection. {contact_name} hasn’t heard from you in a while.",
			color: "#e879f9",
		},
		{
			text: "Sort, reflect, close. Consider ending the day with a message to {contact_name}.",
			color: "#c084fc",
		},
		{
			text: "That golden hour glint? Might be the perfect moment to DM {contact_name}.",
			color: "#fb923c",
		},
		{
			text: "Messages sent now carry meaning. {contact_name} awaits on the other end.",
			color: "#f472b6",
		},
		{
			text: "Your calendar forgot {contact_name}. You don't have to.",
			color: "#a78bfa",
		},
		{ text: "Evening check-in? {link} still lights up.", color: "#f9a8d4" },
	],
	night: [
		{
			text: "The moon’s up. You still haven’t messaged {contact_name} since Q1.",
			color: "#64748b",
		},
		{
			text: "Night Mode: Reflect and reloop — maybe {contact_name}?",
			color: "#4b5563",
		},
		{
			text: "One line tonight could relight the path to {contact_name}.",
			color: "#7c3aed",
		},
		{ text: "Their email is still open: {email}.", color: "#6366f1" },
		{
			text: "Ghosts don’t always haunt. {link} might still be alive.",
			color: "#475569",
		},
		{
			text: "Some signals only work in silence. Try texting {phone}.",
			color: "#818cf8",
		},
	],
};
const backgroundByTime: Record<TimeBlock, string> = {
	morning: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='100' r='80' fill='%23fde68a'/%3E%3C/svg%3E")`,

	afternoon: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='100' r='90' fill='%23facc15'/%3E%3C/svg%3E")`,

	evening: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3ClinearGradient id='grad' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%23fb7185'/%3E%3Cstop offset='100%' stop-color='%23f472b6'/%3E%3C/linearGradient%3E%3Cellipse cx='100' cy='100' rx='90' ry='60' fill='url(%23grad)'/%3E%3C/svg%3E")`,

	night: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='140' cy='60' r='50' fill='%234b5563'/%3E%3Ccircle cx='60' cy='140' r='4' fill='%23a5b4fc'/%3E%3Ccircle cx='80' cy='120' r='3' fill='%239ca3af'/%3E%3C/svg%3E")`,
};

function getTimeBlock(): TimeBlock {
	const hour = new Date().getHours();
	if (hour >= 6 && hour < 12) return "morning";
	if (hour >= 12 && hour < 17) return "afternoon";
	if (hour >= 17 && hour < 22) return "evening";
	return "night";
}

function getTodayKey(time: TimeBlock) {
	const today = new Date().toISOString().slice(0, 10);
	return `mysticPhraseDismissed_${time}_${today}`;
}

export const HelloMessage: React.FC = () => {
	const [visible, setVisible] = useState(false);
	const [phrase, setPhrase] = useState<string | null>(null);
	const [color, setColor] = useState("#999");
	const [icon] = useState<JSX.Element | null>(null);
	const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

	useEffect(() => {
		const timeBlock = getTimeBlock();
		const disabled = localStorage.getItem("mysticPhraseDisabled");
		const dismissedToday = localStorage.getItem(getTodayKey(timeBlock));
		if (disabled || dismissedToday) return;

		const options = phrasesByTime[timeBlock];
		const selected = options[Math.floor(Math.random() * options.length)];
		setColor(selected.color);
		setBackgroundImage(backgroundByTime[timeBlock]);

		(async () => {
			try {
				const contact = await findRandomContact();
				const link = `${RouteConfig.contacts.single.base(contact?.id || 1)}`;

				const replacements: Record<string, string> = {
					"{contact_name}":
						`${contact?.first_name ?? "Someone"} ${contact?.last_name ?? ""}`.trim(),
					"{email}": contact?.email ?? "no email",
					"{phone}": contact?.phone ?? "no phone",
					"{link}": `<a href="${link}" target="_blank" class="underline transition">${contact?.first_name ?? "View"}</a>`,
				};

				let finalPhrase = selected.text;
				for (const [key, value] of Object.entries(replacements)) {
					finalPhrase = finalPhrase.replace(new RegExp(key, "g"), value);
				}

				setPhrase(finalPhrase);
				setVisible(true);
			} catch (err) {
				console.error("Failed to fetch contact:", err);
				setPhrase(selected.text.replace(/{contact_name}/g, "someone"));
				setVisible(true);
			}
		})();
	}, []);

	const dismissToday = () => {
		localStorage.setItem(getTodayKey(getTimeBlock()), "true");
		setVisible(false);
	};

	const dismissForever = () => {
		localStorage.setItem("mysticPhraseDisabled", "true");
		setVisible(false);
	};

	if (!visible || !phrase) return null;

	return (
		<div
			className={`mx-auto mt-8 flex max-w-3xl items-center justify-between gap-4 rounded-2xl px-6 py-4 shadow-xl transition duration-300`}
			style={{
				backgroundColor: color,
				backgroundImage: backgroundImage ?? undefined,
				backgroundRepeat: "no-repeat",
				backgroundPosition: "right bottom",
				backgroundSize: "150px auto",
			}}
		>
			<div className="flex flex-1 items-center gap-4">
				{icon}
				<div
					className="font-medium text-base text-black leading-snug"
					dangerouslySetInnerHTML={{ __html: phrase }}
				/>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={dismissToday}
					title="Dismiss for today"
					className="transition hover:opacity-70"
				>
					<X className="h-5 w-5 text-black" />
				</button>
				<button
					type="button"
					onClick={dismissForever}
					title="Never show again"
					className="transition hover:text-red-500"
				>
					<Ban className="h-5 w-5 text-black" />
				</button>
			</div>
		</div>
	);
};
