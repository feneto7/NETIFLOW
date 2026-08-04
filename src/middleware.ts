import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get("auth_session");
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Se não estiver logado e não estiver na página de login, redireciona para login
  if (!authSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se estiver logado e tentar acessar o login, redireciona para a raiz
  if (authSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Ignora rotas de api, arquivos estáticos do next, favicon e imagens públicas
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img/).*)"],
};
