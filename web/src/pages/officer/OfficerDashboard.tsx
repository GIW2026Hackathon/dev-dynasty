import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { ShieldCheck, MapPin, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import type { UserDocument } from "../../lib/types";

export default function OfficerDashboard() {
  const { userData } = useAuth();
  const [pendingFarmers, setPendingFarmers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingFarmers = async () => {
      if (!userData) return;
      try {
        // Fetch users who are farmers
        const q = query(
          collection(db, "users"), 
          where("role", "==", "farmer")
        );
        const querySnapshot = await getDocs(q);
        
        const pending: UserDocument[] = [];
        
        // Check the 'farmers' collection to see if they are pending
        for (const document of querySnapshot.docs) {
          const farmerData = document.data();
          const farmerProfileSnap = await getDocs(query(collection(db, "farmers"), where("userId", "==", document.id)));
          
          if (!farmerProfileSnap.empty) {
            const profile = farmerProfileSnap.docs[0].data();
            if (profile.verificationStatus === "pending") {
              pending.push({ id: document.id, ...farmerData } as UserDocument);
            }
          }
        }
        
        setPendingFarmers(pending);
      } catch (error) {
        console.error("Error fetching pending farmers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingFarmers();
  }, [userData]);

  const handleApprove = async (farmerId: string, farmerName: string) => {
    setProcessingId(farmerId);
    try {
      // 1. Find the farmer profile document
      const farmerProfileQuery = query(collection(db, "farmers"), where("userId", "==", farmerId));
      const farmerProfileSnap = await getDocs(farmerProfileQuery);
      
      if (!farmerProfileSnap.empty) {
        const profileDocId = farmerProfileSnap.docs[0].id;
        
        // 2. Update their status to verified
        await updateDoc(doc(db, "farmers", profileDocId), {
          verificationStatus: "verified",
          verifiedBy: userData?.fullName || "Officer",
          updatedAt: serverTimestamp()
        });

        // 3. Log this action in the audit log
        await addDoc(collection(db, "audit_log"), {
          actorId: userData?.id,
          action: "verify_farmer",
          targetId: farmerId,
          targetName: farmerName,
          timestamp: serverTimestamp()
        });

        toast.success(`${farmerName} has been verified!`);
        
        // 4. Remove them from the local list so the UI updates instantly
        setPendingFarmers(prev => prev.filter(f => f.id !== farmerId));
      }
    } catch (error) {
      console.error("Error verifying farmer:", error);
      toast.error("Failed to verify farmer.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-gray-500 mt-1">Review and verify new farmers in your ward.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading pending farmers...</div>
      ) : pendingFarmers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">There are no pending verifications in your queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingFarmers.map((farmer) => (
            <div key={farmer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
                  {farmer.fullName?.charAt(0) || "F"}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{farmer.fullName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    {farmer.ward}, {farmer.county}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium mt-2 bg-yellow-50 px-2 py-1 rounded-md w-fit">
                    <Clock className="w-3 h-3" /> Pending Verification
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => handleApprove(farmer.id, farmer.fullName)}
                  disabled={processingId === farmer.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> 
                  {processingId === farmer.id ? "Approving..." : "Approve"}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}