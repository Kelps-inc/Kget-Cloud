"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, clearAuth, getUser } from "@/lib/auth";
import { FileText, MessageSquare, LogOut, Radar, Zap } from "lucide-react";

const NAV = [
  { href: "/monitor", label: "Monitor", icon: Radar },
  { href: "/files", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-5">
          <Zap size={20} className="text-blue-600" />
          <span className="font-bold text-gray-900">KGet Cloud</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-xs font-medium text-gray-700">
            {user?.name}
          </p>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
