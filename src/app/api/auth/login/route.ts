import { fail, ok, parseBody, route } from "@/lib/api";
import { homeFor, PASSWORD_PATH } from "@/lib/roles";
import { createSession } from "@/lib/session";
import { authenticate } from "@/lib/users";
import { loginSchema } from "@/lib/validators";

export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, loginSchema);
  if (error) return error;

  const user = await authenticate(data.email, data.password);
  if (!user) return fail(401, "Email atau kata sandi salah.");

  await createSession(user);
  return ok({
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    home: user.mustChangePassword ? PASSWORD_PATH : homeFor(user.role),
  });
});
