import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin için iyimser kontrol: oturum çerezi yoksa giriş sayfasına yönlendir.
 * Asıl yetki kontrolü her sayfa ve eylemde requireAdmin() ile veritabanında yapılır.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/giris") return NextResponse.next();
  if (!request.cookies.has("hera_admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/giris";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
