import { NavLink, useLocation } from "react-router-dom";
import { Home, Coins, Zap, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/earnings", icon: Coins, label: "Earnings" },
  { to: "/activities", icon: Zap, label: "Activities" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  // Hide on landing/auth/admin routes
  const hidden = ["/", "/auth", "/admin", "/become-admin"].includes(pathname);
  if (hidden) return null;

  return (
    <>
      {/* spacer so content doesn't sit under the bar on mobile */}
      <div className="h-20 md:hidden" aria-hidden />
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-background/85 border-t border-border/60">
        <ul className="grid grid-cols-4 h-16">
          {items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "h-full flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium tracking-wide">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
