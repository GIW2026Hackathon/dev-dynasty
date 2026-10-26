import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud, ArrowLeft } from "lucide-react";

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
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
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
          <p className="text-gray-500 mt-1">Fill in the details to list your produce.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produce Photo</label>
            <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-brand-500 transition-colors bg-gray-50 relative">
              {previewUrl ? (
                <div className="mb-4 relative w-full max-h-64 overflow-hidden rounded-md flex justify-center">
                  <img src={previewUrl} alt="Preview" className="object-contain h-48 rounded" />
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Listing Title</label>
              <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500" placeholder="e.g., Fresh Organic Tomatoes" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <optgroup label="GIW Priority Value Chains">
                  <option value="horticulture">Horticulture</option>
                  <option value="livestock">Livestock</option>
                  <option value="poultry">Poultry</option>
                  <option value="edible_oils">Edible Oils</option>
                  <option value="indigenous_crops">Indigenous Crops</option>
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
                <option value="kg">Kilograms (kg)</option>
                <option value="piece">Pieces</option>
                <option value="litre">Litres</option>
                <option value="bunch">Bunches</option>
                <option value="bag">Bags (e.g., 50kg)</option>
                <option value="crate">Crates</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
              {loading ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}