import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Shield, Users, Package, Activity, PlusCircle, Phone, MapPin } from "lucide-react";
import CreateOfficerModal from "./CreateOfficerModal";
import AdminActionModal from "./AdminActionModal"; // Import the new modal

export default function AdminDashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Data State
  const [farmers, setFarmers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [pendingFarmers, setPendingFarmers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"farmers" | "listings" | "officers">("farmers");
  const [actionData, setActionData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch All Farmers
      const farmersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "farmer")));
      const farmersData = farmersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFarmers(farmersData);

      // Fetch All Active Listings
      const listingsSnap = await getDocs(query(collection(db, "listings"), where("status", "==", "active")));
      const listingsData = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListings(listingsData);

      // Fetch Officers
      const officersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "officer")));
      const officersData = officersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOfficers(officersData);

      // Fetch Pending Farmers
      const pendingSnap = await getDocs(query(collection(db, "farmers"), where("verificationStatus", "==", "pending")));
      const pendingData = [];
      for (const docSnap of pendingSnap.docs) {
        const farmerProfile = docSnap.data();
        const userDoc = await getDocs(query(collection(db, "users"), where("id", "==", farmerProfile.userId)));
        if (!userDoc.empty) pendingData.push({ id: docSnap.id, ...farmerProfile, ...userDoc.docs[0].data() });
      }
      setPendingFarmers(pendingData);

      // Fetch Audit Logs
      const logsSnap = await getDocs(collection(db, "audit_log"));
      const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logsData.sort((a: any, b: any) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      setAuditLogs(logsData.slice(0, 15));

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openActionModal = (type: "farmers" | "listings" | "officers", data: any[]) => {
    setActionType(type);
    setActionData(data);
    setActionModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center mt-20">Loading Admin Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Command Center</h1>
          <p className="text-gray-500 mt-1">Manage officers and monitor platform activity.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <PlusCircle className="w-5 h-5" /> Add Officer
        </button>
      </div>

      {/* CLICKABLE ANALYTICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => openActionModal("farmers", farmers)} className="cursor-pointer bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-500 transition-all flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Farmers</p>
            <p className="text-2xl font-bold text-gray-900">{farmers.length}</p>
            <p className="text-xs text-brand-600 mt-1">Click to manage</p>
          </div>
        </div>
        
        <div onClick={() => openActionModal("listings", listings)} className="cursor-pointer bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-500 transition-all flex items-center gap-4">
          <div className="bg-brand-50 p-3 rounded-lg text-brand-600"><Package className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Listings</p>
            <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
            <p className="text-xs text-brand-600 mt-1">Click to manage</p>
          </div>
        </div>

        <div onClick={() => openActionModal("officers", officers)} className="cursor-pointer bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-500 transition-all flex items-center gap-4">
          <div className="bg-yellow-50 p-3 rounded-lg text-yellow-600"><Shield className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Extension Officers</p>
            <p className="text-2xl font-bold text-gray-900">{officers.length}</p>
            <p className="text-xs text-brand-600 mt-1">Click to manage</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PENDING VERIFICATIONS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-600" /> Pending Verifications
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {pendingFarmers.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending farmers at the moment.</p>
            ) : (
              pendingFarmers.map(farmer => (
                <div key={farmer.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{farmer.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" /> {farmer.ward}, {farmer.county}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                     <Phone className="w-3 h-3 text-brand-600" /> Contact: {farmer.phone || "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AUDIT LOG */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" /> System Audit Log
          </h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity logged yet.</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="text-sm border-l-2 border-brand-500 pl-3 py-1">
                  <p className="text-gray-800">
                    <strong>{log.targetName}</strong> was {log.action === "verify_farmer" ? "verified" : "rejected"}.
                  </p>
                  {log.reason && <p className="text-xs text-red-600 mt-0.5">Reason: {log.reason}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateOfficerModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); fetchData(); }} />
      <AdminActionModal 
        isOpen={actionModalOpen} 
        onClose={() => setActionModalOpen(false)} 
        type={actionType} 
        data={actionData} 
        onRefresh={fetchData} 
      />
    </div>
  );
}