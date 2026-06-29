import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authSecret } from "@/lib/auth-secret";

const COOKIE = "zema_session";

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, authSecret);
    return true;
  } catch {
    return false;
  }
}

// Corre em TODAS as rotas (páginas e POSTs de Server Actions) exceto /login e
// os assets do Next. Sem sessão válida → redireciona para /login, o que também
// impede que as Server Actions sejam invocadas sem autenticação.
export async function middleware(req: NextRequest) {
  if (await isAuthed(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Tudo menos: /login, rotas internas do Next, e ficheiros estáticos.
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|ico|webp|woff2?|ttf|css|js|map)$).*)",
  ],
};
