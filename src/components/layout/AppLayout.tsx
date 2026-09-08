import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import PageTransition from "./PageTransition";

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen lg:mr-[288px]">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="px-4 pb-10 md:px-8">
        <TopHeader onOpenMenu={() => setMenuOpen(true)} />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
