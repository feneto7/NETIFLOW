import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get("auth_session");
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Se não estiver logado e não estiver na página de login, redireciona para login
  if (!authSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se o frontend detectar token inválido e redirecionar com ?expired=1
  if (request.nextUrl.searchParams.has("expired")) {
    const response = NextResponse.next();
    response.cookies.delete("auth_session");
    return response;
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
