import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/env";
import { isDemoMode } from "@/features/demo/mode";
import { DEMO_SESSION_COOKIE } from "@/features/demo/config";

import { validDemoSessionDirectory } from "@/features/demo/session-registry";

function copySessionState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);

    if (value) {
      target.headers.set(header, value);
    }
  }

  return target;
}

function loginRedirect(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  if (reason) {
    url.searchParams.set("auth_error", reason);
  }

  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  if (isDemoMode()) {
    return validDemoSessionDirectory(request.cookies.get(DEMO_SESSION_COOKIE)?.value)
      ? NextResponse.next({ request })
      : loginRedirect(request);
  }

  if (!hasSupabasePublicEnv()) {
    return loginRedirect(request, "configuration");
  }

  let supabaseResponse = NextResponse.next({ request });
  const { publishableKey, url } = getSupabasePublicEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, options, value }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headersToSet).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return copySessionState(supabaseResponse, loginRedirect(request));
  }

  return supabaseResponse;
}
