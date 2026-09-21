import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { VentosSidebar } from "./VentosSidebar"
import { useAccess } from "../hooks/useAccess"
import { clearTokens } from "../lib/auth-storage"
import { useApolloClient } from "@apollo/client/react"
import { Toaster } from "@/components/ui/sonner"

// Map route paths → page titles for the header breadcrumb
const pageTitles: Record<string, string> = {
  "/": "Home",
  "/pos": "Point of Sale",
  "/sales": "Sales",
  "/customers": "Customers",
  "/returns": "Returns & refunds",
  "/products": "Products",
  "/inventory": "Inventory",
  "/purchases": "Purchasing",
  "/appointments": "Appointments",
  "/services": "Services",
  "/attendance": "Attendance",
  "/notifications": "Notifications",
  "/sync": "Offline sync",
  "/product-types": "Product types",
  "/product-metadata": "Metadata fields",
  "/media": "Media",
}

function useDesktopEmbed(): boolean {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.search)
  if (params.get("desktopEmbed") === "1") {
    sessionStorage.setItem("ventos_desktop_embed", "1")
    return true
  }
  return sessionStorage.getItem("ventos_desktop_embed") === "1"
}

export function AppShell() {
  const { pathname } = useLocation()
  const { user } = useAccess()
  const apollo = useApolloClient()
  const pageTitle = pageTitles[pathname] ?? "Ventos"
  const desktopEmbed = useDesktopEmbed()

  useEffect(() => {
    if (desktopEmbed) {
      document.documentElement.dataset.desktopEmbed = "1"
    }
  }, [desktopEmbed])

  if (desktopEmbed) {
    return (
      <>
        <main className="flex min-h-dvh flex-col overflow-y-auto bg-[radial-gradient(circle,rgba(249,115,22,0.01)_0%,rgba(245,240,240,0.01)_38%,rgba(249,115,22,0.01)_100%)] p-4 md:p-6">
          <Outlet />
        </main>
        <Toaster position="top-right" richColors />
      </>
    )
  }

  return (
    <SidebarProvider>
      <VentosSidebar />
      <SidebarInset>
        {/* Top header bar — AlignUI style matching maintenance app */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-stroke-soft-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-regular-xs">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <h1 className="text-paragraph-sm font-semibold text-text-strong-950">
              {pageTitle}
            </h1>
          </div>
          {/* Right side: user email + sign out */}
          <div className="flex items-center gap-3 pr-4">
            {user ? (
              <span className="text-paragraph-xs text-text-sub-600">
                {user.email}
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearTokens()
                void apollo.clearStore()
                window.location.href = "/login"
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        {/* Page content with maintenance app subtle radial gradient */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle,rgba(249,115,22,0.01)_0%,rgba(245,240,240,0.01)_38%,rgba(249,115,22,0.01)_100%)] p-4 md:p-6">
          <Outlet />
        </main>
        <Toaster position="top-right" richColors />
      </SidebarInset>
    </SidebarProvider>
  )
}
