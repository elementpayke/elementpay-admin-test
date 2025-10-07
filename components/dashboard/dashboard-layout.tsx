"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Menu,
  LogOut,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LucideFastForward,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import EnvironmentBadgeDropdown from '@/components/dashboard/environment-badge-dropdown'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and quick stats',
  },
  {
    name: 'API Keys',
    href: '/dashboard/api-keys',
    icon: CreditCard,
    description: 'Manage your API keys',
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: ArrowLeftRight,
    description: 'Order history and creation',
  },
  {
    name: "Make Payment",
    href: "/dashboard/disbursement",
    icon: CreditCard,
    description: 'Make payment to your customers',
  }
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-3 flex-1">
          <div className="relative h-8 w-8">
            <Image
              src="/elementpay.png"
              alt="Element Pay"
              fill
              className="object-contain"
              priority
            />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Element Pay
            </span>
          )}
        </Link>

        {/* Collapse Toggle Button */}
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button> */}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                sidebarCollapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm'
                  : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'flex-shrink-0 transition-colors',
                  sidebarCollapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5',
                  isActive ? 'text-white dark:text-gray-900' : 'text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-gray-100'
                )}
              />
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 z-50",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <div className={cn(
          "flex flex-col flex-grow border-r bg-card transition-all duration-300 shadow-lg",
          sidebarCollapsed ? "w-16" : "w-64"
        )}>
          <NavContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        "flex flex-1 flex-col transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            {/* Desktop Collapse Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {sidebarCollapsed ? (
                <LucideFastForward className="h-4 w-4" />
              ) : (
                <LucideFastForward className="h-4 rotate-180 w-4" />
              )}
            </Button>

            {/* Breadcrumb or Page Title */}
            <div className={cn(
              "transition-all duration-300",
              sidebarCollapsed ? "lg:ml-2" : "ml-4 lg:ml-0"
            )}>
              <h1 className="text-lg font-semibold">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Environment Badge Dropdown */}
            <EnvironmentBadgeDropdown />
            
            {/* Theme Toggle */}
            <ThemeToggle />
            

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt={user?.name} />
                    <AvatarFallback>
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300 p-4 lg:p-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
