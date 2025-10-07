"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import WalletStatus from "@/components/dashboard/wallet-status";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Image
          src="/elementpay.png"
          alt="Element Pay Logo"
          width={32}
          height={32}
        />
        <span>Element Pay</span>
      </Link>

      <div className="flex items-center gap-4">
        <WalletStatus className="hidden md:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage
                  src="/placeholder-user.jpg"
                  alt={session?.user?.name || "User"}
                />
                <AvatarFallback>
                  {session?.user?.name ? session.user.name.charAt(0) : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {session?.user?.name || "My Account"}
              {session?.user?.email && (
                <div className="text-xs text-muted-foreground">
                  {session.user.email}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
