import { ok } from "@/lib/api/wrappers";
import { extensionFailure, operationKey, requireExtensionPlatform } from "@/lib/extensions/http";
import { extensionRequestJson, installRequestSchema } from "@/lib/extensions/requests";
import { installExtension } from "@/lib/extensions/service";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // UpFlow: unificado em 300 — no plano Hobby da Vercel cada valor distinto vira uma função a mais, e o limite é 12 por deploy.

export async function POST(request: Request): Promise<Response> {
  try {
    const denied = await requireSupportWrite();
    if (denied) return denied;
    const authz = await requireExtensionPlatform();
    if (!authz.ok) return authz.response;
    const key = operationKey(request);
    const input = installRequestSchema.parse(await extensionRequestJson(request));
    return ok(await installExtension(authz.user.id, key, input));
  } catch (error) {
    return extensionFailure(error);
  }
}
