import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud, ArrowLeft, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { verifyFarmImage } from "../../lib/aiImageVerifier";

const CLOUDINARY_CLOUD_NAME = "ujquukt8"; 
const CLOUDINARY_UPLOAD_PRESET = "giw_unsigned"; 

export default function NewListingPage() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("horticulture");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // AI Verification State
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<{ isValid: boolean; reason: string } | null>(null);

  const [isVerified, setIsVerified] = useState(true); 
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      if (!userData) return;
      const q = query(collection(db, "farmers"), where("userId", "==", userData.id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setIsVerified(snap.docs[0].data().verificationStatus === "verified");
      }
      setCheckingAuth(false);
    };
    checkVerification();
  }, [userData]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAiResult(null);

    setIsAiChecking(true);
    const result = await verifyFarmImage(file);
    setAiResult(result);
    setIsAiChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) {
      toast.error("User data not found. Please log in again.");
      return;
    }
    
    if (!photo) {
      toast.error("Please upload a photo of your produce.");
      return;
    }

    if (aiResult && !aiResult.isValid) {
      toast.error("Cannot publish: AI detected this is not a farming product.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", photo);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!cloudinaryResponse.ok) throw new Error("Failed to upload image to Cloudinary");

      const cloudinaryData = await cloudinaryResponse.json();
      const photoUrl = cloudinaryData.secure_url;

      await addDoc(collection(db, "listings"), {
        farmerId: userData.id,
        category,
        title,
        quantity: Number(quantity),
        unit,
        pricePerUnit: Number(price),
        county: userData.county,
        ward: userData.ward,
        photoUrls: [photoUrl],
        status: "active", 
        createdAt: serverTimestamp(),
      });

      toast.success("Listing created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("PUBLISH ERROR:", error);
      toast.error(error.message || "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className="p-8 text-center mt-20">Checking verification status...</div>;
  if (!isVerified) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
            <p className="text-gray-500 mt-1">Fill in the details to list your produce.</p>
          </div>
          <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold">
            <Sparkles className="w-4 h-4" /> AI Protected
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produce Photo</label>
            <div className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${aiResult && !aiResult.isValid ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-brand-500'}`}>
              
              {previewUrl ? (
                <div className="mb-4 relative w-full max-h-64 overflow-hidden rounded-md flex justify-center">
                  <img src={previewUrl} alt="Preview" className={`object-contain h-48 rounded ${aiResult && !aiResult.isValid ? 'opacity-50 grayscale' : ''}`} />
                </div>
              ) : (
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              )}

              <div className="space-y-1 text-center">
                <div className="flex text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                    <span>{previewUrl ? "Change photo" : "Click to upload a photo"}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">{photo ? photo.name : "PNG, JPG up to 10MB"}</p>
              </div>

              {isAiChecking && (
                <div className="mt-4 flex items-center gap-2 text-purple-600 text-sm font-medium bg-purple-50 px-3 py-1.5 rounded-full animate-pulse">
                  <Sparkles className="w-4 h-4" /> AI is scanning image...
                </div>
              )}
              
              {aiResult && !isAiChecking && (
                <div className={`mt-4 flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${aiResult.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {aiResult.isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {aiResult.reason}
                </div>
              )}

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Listing Title</label>
              <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500" placeholder="e.g., Fresh Organic Tomatoes" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                <optgroup label="GIW Priority Value Chains">
                  <option value="horticulture">Horticulture</option>
                  <option value="livestock">Livestock</option>
                  <option value="poultry">Poultry</option>
                  <option value="edible_oils">Edible Oils</option>
                  <option value="indigenous_crops">Indigenous Crops</option>
                  <option value="apiculture">Apiculture (Honey)</option>
                </optgroup>
                <optgroup label="Other Farm Produce">
                  <option value="vegetables">Vegetables</option>
                  <option value="fruits">Fruits</option>
                  <option value="grains_cereals">Grains & Cereals</option>
                  <option value="dairy_eggs">Dairy & Eggs</option>
                  <option value="tubers_roots">Tubers & Roots</option>
                  <option value="seeds_nursery">Seeds & Nursery</option>
                  <option value="farm_inputs">Farm Inputs (Fertilizer/Feed)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Price (KSh)</label>
              <input type="number" required min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500" placeholder="e.g., 150" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity Available</label>
              <input type="number" required min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500" placeholder="e.g., 50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <optgroup label="Weight & Volume">
                  <option value="kg">Kilograms (kg)</option>
                  <option value="gram">Grams (g)</option>
                  <option value="tonne">Tonnes</option>
                  <option value="litre">Litres (L)</option>
                  <option value="ml">Millilitres (ml)</option>
                </optgroup>
                <optgroup label="Livestock & Poultry">
                  <option value="head">Heads (Animals)</option>
                  <option value="bird">Birds (Chickens/Ducks)</option>
                </optgroup>
                <optgroup label="Eggs & Dairy">
                  <option value="tray">Trays (30 Eggs)</option>
                  <option value="egg">Single Eggs</option>
                  <option value="crate">Crates</option>
                  <option value="bottle">Bottles (Milk/Honey)</option>
                  <option value="jerrycan">Jerrycans</option>
                </optgroup>
                <optgroup label="Packaging & Counts">
                  <option value="bag">Bags (e.g., 50kg)</option>
                  <option value="sack">Sacks</option>
                  <option value="bunch">Bunches (e.g., Kales, Bananas)</option>
                  <option value="piece">Pieces</option>
                  <option value="bucket">Buckets</option>
                  <option value="debe">Debe (Tins)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={loading || isAiChecking || (aiResult !== null && !aiResult.isValid)} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}