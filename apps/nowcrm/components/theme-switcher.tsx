"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { themeActions } from "reactjs-tiptap-editor/theme";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Prevent hydration mismatch by only rendering after mount
	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted && theme === "dark";

	const toggleTheme = () => {
		setTheme(isDark ? "light" : "dark");
		themeActions.setTheme(isDark ? "light" : "dark");
	};

	// Render a placeholder with the same dimensions during SSR
	if (!mounted) {
		return (
			<div
				className={cn("relative inline-flex rounded-full border", className)}
			>
				<div className="h-6 w-11 rounded-full p-0.5">
					<div className="invisible">
						<span className="sr-only">Toggle theme</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("relative inline-flex rounded-full border", className)}>
			<motion.button
				onClick={toggleTheme}
				className={cn(
					"relative h-6 w-11 cursor-pointer rounded-full p-0.5",
					isDark ? "bg-sidebar-accent" : "bg-sidebar-accent",
				)}
				transition={{ type: "spring", duration: 0.12 }}
				aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			>
				<span className="sr-only">Toggle theme</span>

				{/* Track icons with motion */}
				<motion.div
					animate={{ opacity: isDark ? 0.5 : 1 }}
					transition={{ type: "spring", duration: 0.12 }}
					className="absolute top-1 left-1"
				>
					<Sun className="h-4 w-4 text-current" />
				</motion.div>

				<motion.div
					animate={{ opacity: isDark ? 1 : 0.5 }}
					transition={{ type: "spring", duration: 0.12 }}
					className="absolute top-1 right-1"
				>
					<Moon className="h-4 w-4 text-current" />
				</motion.div>

				{/* Slider thumb with motion */}
				<motion.span
					className="absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow-md"
					animate={{
						x: isDark ? 20 : 0,
					}}
					transition={{
						type: "spring",
						duration: 0.12,
					}}
				/>
			</motion.button>
		</div>
	);
}
