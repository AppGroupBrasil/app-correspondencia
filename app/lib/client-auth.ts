import { auth } from "@/app/lib/firebase";

export async function buildAuthenticatedJsonHeaders(init?: HeadersInit): Promise<Headers> {
  const headers = new Headers(init);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}