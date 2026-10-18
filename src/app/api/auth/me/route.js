import { ok, requireUser } from "@/lib/api";
import { homeFor } from "@/lib/roles";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return ok({ ...user, home: homeFor(user.role) });
}
