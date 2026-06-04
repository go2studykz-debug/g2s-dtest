import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-scope min-h-screen dark:bg-[#090e1a] dark:text-[#d0d8e4]">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
