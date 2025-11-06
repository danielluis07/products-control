import AdminClient from "@/components/main/admin";
import UserClient from "@/components/main/user";
import { useAuth } from "@/context/auth";

export default function DashboardScreen() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <AdminClient />;
  }

  return <UserClient />;
}
