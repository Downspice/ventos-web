import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Home,
  ShoppingCart,
  Package,
  Calendar,
  Users,
  Receipt,
  Truck,
  Scissors,
  Clock,
  Bell,
  RotateCcw,
  CloudUpload,
  Tag,
  Images,
  Layers,
  Shapes,
} from "lucide-react"
import { useAccess } from "@/hooks/useAccess"
import { resolveAvatarSrc } from "@/lib/avatar-presets"

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Home", icon: Home }],
  },
  {
    label: "Sales",
    items: [
      { to: "/pos", label: "POS", icon: ShoppingCart, permission: "sales.pos.access" },
      { to: "/sales", label: "Sales", icon: Receipt, permission: "sales.read" },
      { to: "/customers", label: "Customers", icon: Users, permission: "customers.read" },
      { to: "/returns", label: "Returns", icon: RotateCcw, permission: "sales.refund.create" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/products", label: "Products", icon: Tag, permission: "inventory.read" },
      { to: "/product-types", label: "Product types", icon: Shapes, permission: "inventory.read" },
      { to: "/product-metadata", label: "Metadata fields", icon: Layers, permission: "inventory.read" },
      { to: "/inventory", label: "Stock", icon: Package, permission: "inventory.read" },
      { to: "/purchases", label: "Purchasing", icon: Truck, permission: "purchases.read" },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/appointments", label: "Appointments", icon: Calendar, permission: "appointments.read" },
      { to: "/services", label: "Services", icon: Scissors, permission: "appointments.read" },
    ],
  },
  {
    label: "Team",
    items: [{ to: "/attendance", label: "Attendance", icon: Clock, permission: "employees.read" }],
  },
  {
    label: "System",
    items: [
      { to: "/media", label: "Media", icon: Images, permission: "media.read" },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/sync", label: "Offline sync", icon: CloudUpload },
    ],
  },
]

export function VentosSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { business, user, can } = useAccess()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 p-1 border border-primary/20 shadow-regular-xs">
                <img
                  src="/icon-square.png"
                  alt="Ventos"
                  className="size-full object-contain filter drop-shadow-2xs"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Ventos</span>
                {business ? (
                  <span className="truncate text-xs text-muted-foreground">{business.name}</span>
                ) : null}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.permission && !can(item.permission)) return null
                  const isActive = pathname === item.to
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link to={item.to}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {user ? (
          <NavUser
            user={{
              name: user.name?.trim() || user.email.split("@")[0],
              email: user.email,
              avatar: resolveAvatarSrc(user.avatarUrl) ?? "",
            }}
            profileUser={user}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  )
}
