import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="font-bold text-xl text-gray-900 hidden sm:block">Mkulima Market</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{userData?.fullName}</span>
                <span className="text-xs text-brand-600 font-semibold capitalize">{userData?.role}</span>
              </div>
              
              <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center border border-brand-200">
                <User className="h-5 w-5 text-brand-700" />
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}