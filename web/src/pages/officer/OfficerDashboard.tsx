import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { ShieldCheck, MapPin, Check, X, Clock, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { UserDocument } from "../../lib/types";

export default function OfficerDashboard() {
  const { userData } = useAuth();
  const [pendingFarmers, setPendingFarmers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // State for the Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string, name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const fetchPendingFarmers = async () => {
      if (!userData) return;
      try {
        // Fetch ALL farmers
        const q = query(
          collection(db, "users"), 
          where("role", "==", "farmer")
        );
        const querySnapshot = await getDocs(q);
        
        const pending: UserDocument[] = [];
        
        for (const document of querySnapshot.docs) {
          const farmerData = document.data();
          
          // THE LOCATION FILTER: Only process if the farmer is in the same ward and county
          if (
            farmerData.ward?.toLowerCase() === userData.ward?.toLowerCase() && 
            farmerData.county?.toLowerCase() === userData.county?.toLowerCase()
          ) {
            const farmerProfileSnap = await getDocs(query(collection(db, "farmers"), where("userId", "==", document.id)));
            
            if (!farmerProfileSnap.empty) {
              const profile = farmerProfileSnap.docs[0].data();
              if (profile.verificationStatus === "pending") {
                pending.push({ id: document.id, ...farmerData } as UserDocument);
              }
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
      const farmerProfileQuery = query(collection(db, "farmers"), where("userId", "==", farmerId));
      const farmerProfileSnap = await getDocs(farmerProfileQuery);
      
      if (!farmerProfileSnap.empty) {
        const profileDocId = farmerProfileSnap.docs[0].id;
        
        await updateDoc(doc(db, "farmers", profileDocId), {
          verificationStatus: "verified",
          verifiedBy: userData?.fullName || "Officer",
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "audit_log"), {
          actorId: userData?.id,
          action: "verify_farmer",
          targetId: farmerId,
          targetName: farmerName,
          timestamp: serverTimestamp()
        });

        toast.success(`${farmerName} has been verified!`);
        setPendingFarmers(prev => prev.filter(f => f.id !== farmerId));
      }
    } catch (error) {
      console.error("Error verifying farmer:", error);
      toast.error("Failed to verify farmer.");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (farmerId: string, farmerName: string) => {
    setRejectTarget({ id: farmerId, name: farmerName });
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setProcessingId(rejectTarget.id);
    setIsRejectModalOpen(false);

    try {
      const farmerProfileQuery = query(collection(db, "farmers"), where("userId", "==", rejectTarget.id));
      const farmerProfileSnap = await getDocs(farmerProfileQuery);
      
      if (!farmerProfileSnap.empty) {
        const profileDocId = farmerProfileSnap.docs[0].id;
        
        await updateDoc(doc(db, "farmers", profileDocId), {
          verificationStatus: "rejected",
          verifiedBy: userData?.fullName || "Officer",
          rejectionReason: rejectReason,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "audit_log"), {
          actorId: userData?.id,
          action: "reject_farmer",
          targetId: rejectTarget.id,
          targetName: rejectTarget.name,
          reason: rejectReason,
          timestamp: serverTimestamp()
        });

        toast.error(`${rejectTarget.name} has been rejected.`);
        setPendingFarmers(prev => prev.filter(f => f.id !== rejectTarget.id));
      }
    } catch (error) {
      console.error("Error rejecting farmer:", error);
      toast.error("Failed to reject farmer.");
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-gray-500 mt-1">
          Reviewing farmers in <strong>{userData?.ward}, {userData?.county}</strong>.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading pending farmers...</div>
      ) : pendingFarmers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">There are no pending verifications in your ward.</p>
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
                    {farmer.ward}, {farmer.county} County
                  </div>

                  <div className="flex flex-col gap-1 mt-2">
                    {farmer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-brand-600" /> Call: {farmer.phone}
                      </div>
                    )}
                    {farmer.whatsapp && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" /> WhatsApp: {farmer.whatsapp}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium mt-3 bg-yellow-50 px-2 py-1 rounded-md w-fit">
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
                  {processingId === farmer.id ? "Processing..." : "Approve"}
                </button>
                <button 
                  onClick={() => openRejectModal(farmer.id, farmer.fullName)}
                  disabled={processingId === farmer.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> 
                  {processingId === farmer.id ? "Processing..." : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CUSTOM REJECT MODAL */}
      {isRejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reject Farmer</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejecting <strong>{rejectTarget.name}</strong>. This will be saved in the audit log.
            </p>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 mb-4"
              rows={3}
              placeholder="e.g., Could not locate the farm, invalid phone number..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}