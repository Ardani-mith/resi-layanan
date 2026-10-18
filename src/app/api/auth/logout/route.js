import { ok } from "@/lib/api";
import { deleteSession } from "@/lib/session";

export async function POST() {
  await deleteSession();
  return ok({ loggedOut: true });
}
