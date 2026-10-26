import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { KENYA_LOCATIONS, DEFAULT_COUNTY } from "../lib/locations";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  
  // Form state
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  // Location state
  const [county, setCounty] = useState(DEFAULT_COUNTY);
  const [ward, setWard] = useState(KENYA_LOCATIONS[DEFAULT_COUNTY][0]);
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle county change and reset ward to the first available in that county
  const handleCountyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCounty = e.target.value;
    setCounty(newCounty);
    setWard(KENYA_LOCATIONS[newCounty][0]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error("You must accept the Terms of Service to register.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        role: role,
        email: email,
        fullName: fullName,
        phone: phone,
        whatsapp: whatsapp,
        county: county,
        ward: ward,
        status: "active",
        termsAcceptedAt: serverTimestamp(),
        termsVersion: "1.0",
        createdAt: serverTimestamp(),
      });

      if (role === "farmer") {
        await setDoc(doc(db, "farmers", user.uid), {
          userId: user.uid,
          verificationStatus: "pending",
          verifiedBy: null,
          ratingAvg: 0,
          ratingCount: 0,
          reviewCountPending: 0
        });
      }

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the Kenyan agricultural marketplace
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am registering as a:</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRole("farmer")}
                className={`flex-1 py-2.5 rounded-lg border font-medium transition-colors ${role === "farmer" ? "bg-brand-50 border-brand-600 text-brand-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex-1 py-2.5 rounded-lg border font-medium transition-colors ${role === "buyer" ? "bg-brand-50 border-brand-600 text-brand-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                Buyer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., David Omwamba"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-brand-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Call Number</label>
              <input
                type="tel" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
              <input
                type="tel" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Same as call?"
              />
            </div>

            {/* NEW: Cascading County and Ward Dropdowns */}
            <div>
              <label className="block text-sm font-medium text-gray-700">County</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 bg-white"
                value={county} onChange={handleCountyChange}
              >
                {Object.keys(KENYA_LOCATIONS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ward</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 bg-white"
                value={ward} onChange={(e) => setWard(e.target.value)}
              >
                {KENYA_LOCATIONS[county].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start mt-4">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">
                I agree to the Terms of Service and Community Guidelines
              </label>
              <p className="text-gray-500">Fraudulent listings will result in account suspension.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}