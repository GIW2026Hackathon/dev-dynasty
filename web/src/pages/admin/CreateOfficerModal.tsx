import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { KENYA_LOCATIONS, DEFAULT_COUNTY } from "../../lib/locations";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOfficerModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [county, setCounty] = useState(DEFAULT_COUNTY);
  const [ward, setWard] = useState(KENYA_LOCATIONS[DEFAULT_COUNTY][0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle cascading dropdown
  const handleCountyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCounty = e.target.value;
    setCounty(newCounty);
    setWard(KENYA_LOCATIONS[newCounty][0]); // Reset ward to the first in the new county
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newOfficer = userCredential.user;

      // 2. Save the Profile to Firestore
      await setDoc(doc(db, "users", newOfficer.uid), {
        id: newOfficer.uid,
        role: "officer",
        fullName: name,
        email: email,
        phone: "0700000000", // Default or add to form
        whatsapp: "0700000000",
        county: county,
        ward: ward,
        status: "active",
        termsAcceptedAt: serverTimestamp(),
        termsVersion: "1.0",
        createdAt: serverTimestamp(),
      });

      toast.success("Officer account created successfully!");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create officer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Extension Officer</h2>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Officer Jane Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="w-full px-3 py-2 border rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@mkulima.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          
          {/* CASCADING LOCATION DROPDOWNS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <select className="w-full px-3 py-2 border rounded-lg bg-white" value={county} onChange={handleCountyChange}>
                {Object.keys(KENYA_LOCATIONS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg bg-white" 
                value={ward} 
                onChange={(e) => setWard(e.target.value)}
              >
                {KENYA_LOCATIONS[county].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg font-medium mt-4 disabled:opacity-50">
            {loading ? "Creating..." : "Create Officer Account"}
          </button>
        </form>
      </div>
    </div>
  );
}