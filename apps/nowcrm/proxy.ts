import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { auth } from "./auth";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const redirectMap: { [key: string]: string } = {
        "/": "/crm",
        "/en": "/crm",
        "/de": "/crm",
        "/it": "/crm",
        "/fr": "/crm"
    };

    if (redirectMap[pathname]) {
        return NextResponse.redirect(new URL(redirectMap[pathname], request.url));
    }

    if (pathname.includes("/crm")) {
        const session = await auth();
        if (!session) {
            return NextResponse.redirect(new URL("/auth", request.url));
        }
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: [
        // Enable a redirect to a matching locale at the root
        "/",

        // Set a cookie to remember the previous locale for
        // all requests that have a locale prefix
        "/(en|de|it|fr)/:path*",

        // Enable redirects that add missing locales
        // (e.g. `/pathnames` -> `/en/pathnames`)
        "/((?!_next|_vercel|api|.*\\..*).*)",

        // Protect the dashboard route
        "/crm/:path*",
    ],
};
