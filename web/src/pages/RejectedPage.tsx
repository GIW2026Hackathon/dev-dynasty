import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ShieldAlert, LogOut, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function RejectedPage() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("No reason provided.");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchReason = async () => {
      if (!userData) return;
      const farmerRef = doc(db, "farmers", userData.id);
      const snap = await getDoc(farmerRef);
      // If the ID is the farmer document ID, but we use userId. Let's just query.
      if (snap.exists() && snap.data().rejectionReason) {
        setReason(snap.data().rejectionReason);
      }
    };
    fetchReason();
  }, [userData]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!userData) return;
    const confirm = window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.");
    if (!confirm) return;

    setIsDeleting(true);
    try {
      // Delete Firestore profile (Note: Auth account remains but they have no profile so they can't log in)
      await deleteDoc(doc(db, "farmers", userData.id));
      await deleteDoc(doc(db, "users", userData.id));
      
      toast.success("Account deleted permanently.");
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-red-200">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          
          <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
            Account Rejected
          </h2>
          <p className="text-center text-gray-500 mb-6">
            Your registration on Mkulima Market was rejected by an extension officer.
          </p>
          
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8">
            <p className="text-sm text-red-800 text-center">
              <strong>Reason for rejection:</strong><br />
              "{reason}"
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Account Permanently"}
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}