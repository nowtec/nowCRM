"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function UserGuideDisplay() {
	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>User Guide</CardTitle>
				<CardDescription>
					Access documentation and help resources
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="mb-4 text-muted-foreground text-sm">
					Find comprehensive documentation, tutorials, and FAQs in our official
					wiki portal.
				</p>
			</CardContent>
			<CardFooter>
				<Button asChild className="w-full gap-2">
					<a
						href="https://wiki.nowtec.solutions/"
						target="_blank"
						rel="noopener noreferrer"
					>
						Open User Guide
						<ExternalLink className="h-4 w-4" />
					</a>
				</Button>
			</CardFooter>
		</Card>
	);
}
