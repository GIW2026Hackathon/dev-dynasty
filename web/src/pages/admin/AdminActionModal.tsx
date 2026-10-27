import { useState } from "react";
import { X, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { KENYA_LOCATIONS } from "../../lib/locations";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: "farmers" | "listings" | "officers";
  data: any[];
  onRefresh: () => void;
}

export default function AdminActionModal({ isOpen, onClose, type, data, onRefresh }: Props) {
  const [editingOfficer, setEditingOfficer] = useState<any | null>(null);
  const [editCounty, setEditCounty] = useState("");
  const [editWard, setEditWard] = useState("");

  if (!isOpen) return null;

  // --- ACTIONS ---
  const handleDeleteFarmer = async (userId: string) => {
    if (!window.confirm("Are you sure? This will delete the user profile permanently.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      await deleteDoc(doc(db, "farmers", userId));
      toast.success("Farmer deleted.");
      onRefresh();
    } catch (e) { toast.error("Failed to delete."); }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm("Are you sure? This will remove the listing from the marketplace.")) return;
    try {
      await updateDoc(doc(db, "listings", listingId), { status: "removed" });
      toast.success("Listing removed.");
      onRefresh();
    } catch (e) { toast.error("Failed to remove."); }
  };

  const handleToggleSuspend = async (officer: any) => {
    const newStatus = officer.status === "suspended" ? "active" : "suspended";
    try {
      await updateDoc(doc(db, "users", officer.id), { status: newStatus });
      toast.success(`Officer ${newStatus === "suspended" ? "suspended" : "activated"}.`);
      onRefresh();
    } catch (e) { toast.error("Failed to update status."); }
  };

  const handleUpdateOfficerLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficer) return;
    try {
      await updateDoc(doc(db, "users", editingOfficer.id), {
        county: editCounty,
        ward: editWard
      });
      toast.success("Officer location updated.");
      setEditingOfficer(null);
      onRefresh();
    } catch (e) { toast.error("Failed to update location."); }
  };

  const startEditOfficer = (officer: any) => {
    setEditingOfficer(officer);
    setEditCounty(officer.county);
    setEditWard(officer.ward);
  };

  // --- RENDER LISTS ---
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">{type} Management</h2>
        
        <div className="overflow-y-auto flex-1 pr-2">
          {/* FARMERS LIST */}
          {type === "farmers" && data.map(farmer => (
            <div key={farmer.id} className="flex justify-between items-center p-3 border-b">
              <div>
                <p className="font-bold">{farmer.fullName}</p>
                <p className="text-xs text-gray-500">{farmer.ward}, {farmer.county} | {farmer.phone}</p>
              </div>
              <button onClick={() => handleDeleteFarmer(farmer.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {/* LISTINGS LIST */}
          {type === "listings" && data.map(listing => (
            <div key={listing.id} className="flex justify-between items-center p-3 border-b">
              <div className="flex items-center gap-3">
                <img src={listing.photoUrls[0]} className="w-10 h-10 rounded object-cover" />
                <div>
                  <p className="font-bold">{listing.title}</p>
                  <p className="text-xs text-gray-500">KSh {listing.pricePerUnit} | {listing.farmerId}</p>
                </div>
              </div>
              <button onClick={() => handleDeleteListing(listing.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {/* OFFICERS LIST */}
          {type === "officers" && !editingOfficer && data.map(officer => (
            <div key={officer.id} className="flex justify-between items-center p-3 border-b">
              <div>
                <p className="font-bold">{officer.fullName}</p>
                <p className="text-xs text-gray-500">{officer.ward}, {officer.county}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${officer.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {officer.status || "active"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditOfficer(officer)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Edit Location</button>
                <button onClick={() => handleToggleSuspend(officer)} className="text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-3 py-1 rounded">
                  {officer.status === "suspended" ? "Activate" : "Suspend"}
                </button>
              </div>
            </div>
          ))}

          {/* EDIT OFFICER FORM */}
          {type === "officers" && editingOfficer && (
            <form onSubmit={handleUpdateOfficerLocation} className="bg-gray-50 p-4 rounded-xl border">
              <h3 className="font-bold mb-3">Edit Location: {editingOfficer.fullName}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select className="p-2 border rounded" value={editCounty} onChange={(e) => { setEditCounty(e.target.value); setEditWard(KENYA_LOCATIONS[e.target.value][0]); }}>
                  {Object.keys(KENYA_LOCATIONS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="p-2 border rounded" value={editWard} onChange={(e) => setEditWard(e.target.value)}>
                  {KENYA_LOCATIONS[editCounty]?.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded text-sm flex-1">Save Changes</button>
                <button type="button" onClick={() => setEditingOfficer(null)} className="bg-gray-200 px-4 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}