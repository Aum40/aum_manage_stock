import Sidebar from "@/components/layout/Sidebar";
import { getNavSections } from "@/components/layout/nav-config";

// Hardcoded to "superadmin" so the "จัดการ Admin" nav item is visible for
// this scaffolding pass — swap for the real session role once auth-resource
// lands. Regular "admin" accounts should not see that item (see nav-config).
const role = "superadmin" as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar wordmarkSuffix="Admin" sections={getNavSections(role)} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
