import { Link, useLocation } from "wouter";
import { Bell, Pill, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Alarms", icon: Bell },
    { href: "/medicines", label: "Medicines", icon: Pill },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">PA Alarm</h1>
        <p className="text-blue-200 text-sm">Your Personal Assistant</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-black/5"
                    : "text-blue-100 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-[#00204d] rounded-xl p-4 mb-4 border border-white/5">
          <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Current Plan</p>
          <div className="flex justify-between items-center">
             <span className="text-white font-bold">{user?.subscriptionStatus === 'active' ? 'Premium' : 'Free Trial'}</span>
             <span className="text-[#00BAF2] text-xs font-bold px-2 py-0.5 bg-[#00BAF2]/10 rounded-full border border-[#00BAF2]/20">Active</span>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 text-red-300 hover:text-red-200 hover:bg-red-500/10 py-2 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-serif">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed h-full z-20 royal-gradient shadow-2xl">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 h-16 royal-gradient flex items-center justify-between px-4 shadow-md">
        <h1 className="text-xl font-bold text-white">PA Alarm</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-10 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full royal-gradient flex flex-col pt-16" onClick={e => e.stopPropagation()}>
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main 
        className="flex-1 lg:ml-72 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto"
        onClick={() => {
          // Unlock audio/speech on first user interaction
          if (!window.speechSynthesis.speaking) {
            const dummy = new SpeechSynthesisUtterance("");
            window.speechSynthesis.speak(dummy);
          }
        }}
      >
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
