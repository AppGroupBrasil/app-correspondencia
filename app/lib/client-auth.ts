import { supabase } from "@/app/lib/supabase";

export async function buildAuthenticatedJsonHeaders(init?: HeadersInit): Promise<Headers> {
  const headers = new Headers(init);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return headers;
}