import bcrypt from "bcryptjs";
import { fail, ok, parseBody, route } from "@/lib/api";
import { homeFor } from "@/lib/roles";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import User from "@/models/User";

// Hash tiruan agar waktu respons email-tidak-terdaftar ≈ kata-sandi-salah.
const DUMMY_HASH = "$2b$10$6ior4DJ.FZWSLJ0Fa25HmekHG9x5KIk7iKmfOuBg.up2lY/Cd2HGe";

export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, loginSchema);
  if (error) return error;

  const user = await User.findOne({ email: data.email, isActive: true }).select("+passwordHash").lean();
  const valid = await bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return fail(401, "Email atau kata sandi salah.");

  await createSession(user);
  return ok({ name: user.name, role: user.role, home: homeFor(user.role) });
});
