import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/activities/:path*",
    "/schedule/:path*",
    "/plan/:path*",
    "/progress/:path*",
  ],
};
