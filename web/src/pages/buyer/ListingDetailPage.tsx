import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ArrowLeft, MapPin, ShieldCheck, Phone, MessageCircle, Tag, AlertCircle, Star, CheckCircle, ShoppingCart } from "lucide-react";
import type { ListingDocument } from "../../lib/types";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";

interface ReviewData {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [listing, setListing] = useState<ListingDocument | null>(null);
  const [farmerName, setFarmerName] = useState<string>("Farmer");
  const [farmerPhone, setFarmerPhone] = useState<string>("");
  const [farmerWhatsApp, setFarmerWhatsApp] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Reviews State
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number>(0);

  // Transaction State
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  
  // Review Form State (For after purchase)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchListingAndFarmer = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const listingData = { id: docSnap.id, ...docSnap.data() } as ListingDocument;
          setListing(listingData);

          // Fetch Farmer Info
          const farmerRef = doc(db, "users", listingData.farmerId);
          const farmerSnap = await getDoc(farmerRef);
          if (farmerSnap.exists()) {
            const data = farmerSnap.data();
            setFarmerName(data.fullName || "Unknown Farmer");
            if (data.phone) setFarmerPhone(data.phone);
            if (data.whatsapp) setFarmerWhatsApp(data.whatsapp);
          }

          // Fetch Farmer Reviews
          const reviewsQuery = query(
            collection(db, "reviews"), 
            where("farmerId", "==", listingData.farmerId)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          
          const fetchedReviews: ReviewData[] = [];
          let totalRating = 0;
          
          reviewsSnap.forEach((doc) => {
            const data = doc.data();
            fetchedReviews.push({ id: doc.id, ...data } as ReviewData);
            totalRating += data.rating;
          });

          setReviews(fetchedReviews);
          if (fetchedReviews.length > 0) {
            setRatingAvg(totalRating / fetchedReviews.length);
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListingAndFarmer();
  }, [id]);

  const handleInitiatePurchase = async () => {
    if (!userData || !listing) return;
    if (buyQuantity <= 0 || buyQuantity > listing.quantity) {
      toast.error(`Please enter a valid quantity between 1 and ${listing.quantity}`);
      return;
    }

    setIsPurchasing(true);
    try {
      const remainingQuantity = listing.quantity - buyQuantity;
      const newStatus = remainingQuantity === 0 ? "sold" : "active";

      const txnRef = await addDoc(collection(db, "transactions"), {
        listingId: listing.id,
        farmerId: listing.farmerId,
        buyerId: userData.id,
        quantityBought: buyQuantity,
        totalPrice: listing.pricePerUnit * buyQuantity,
        status: "pending",
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "listings", listing.id), {
        quantity: remainingQuantity,
        status: newStatus
      });

      toast.success(`Order initiated! Contact the farmer to arrange delivery.`);
      setActiveTransactionId(txnRef.id); 
      setListing({ ...listing, quantity: remainingQuantity, status: newStatus } as ListingDocument);

    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error("Failed to record purchase.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleConfirmReceived = () => {
    setShowReviewModal(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !listing || !activeTransactionId) return;
    setSubmittingReview(true);

    try {
      await updateDoc(doc(db, "transactions", activeTransactionId), {
        status: "completed"
      });

      await addDoc(collection(db, "reviews"), {
        listingId: listing.id,
        farmerId: listing.farmerId,
        buyerId: userData.id,
        buyerName: userData.fullName,
        rating: Number(rating),
        comment: comment,
        moderationState: "approved", 
        createdAt: serverTimestamp()
      });

      // Update Farmer Rating
      const farmerProfileQuery = query(collection(db, "farmers"), where("userId", "==", listing.farmerId));
      const farmerProfileSnap = await getDocs(farmerProfileQuery);
      
      if (!farmerProfileSnap.empty) {
        const profileRef = doc(db, "farmers", farmerProfileSnap.docs[0].id);
        const currentData = farmerProfileSnap.docs[0].data();
        const currentCount = currentData.ratingCount || 0;
        const currentAvg = currentData.ratingAvg || 0;
        
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + Number(rating)) / newCount;

        await updateDoc(profileRef, {
          ratingCount: newCount,
          ratingAvg: newAvg
        });
      }

      toast.success("Review submitted! Thank you.");
      setShowReviewModal(false);
      
      // Refresh page to show new review
      window.location.reload();
      
    } catch (error: any) {
      console.error("Review error:", error);
      toast.error("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500">Loading details...</div>;
  if (!listing) return <div className="text-center mt-20 text-gray-500">Listing not found.</div>;

  const formatWhatsApp = (phone: string) => {
    if (!phone || phone.length < 9) return "";
    return phone.startsWith("0") ? `254${phone.slice(1)}` : phone;
  };

  const cleanWhatsApp = formatWhatsApp(farmerWhatsApp);
  const isSoldOut = listing.status === "sold" || listing.quantity === 0;

  return (
    <div className="max-w-4xl mx-auto relative">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left Side - Image */}
        <div className="md:w-1/2 bg-gray-100 relative">
          <img src={listing.photoUrls[0]} alt={listing.title} className={`w-full h-full object-cover max-h-[500px] ${isSoldOut ? 'grayscale opacity-70' : ''}`} />
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-bold text-gray-800 flex items-center gap-1.5 shadow-sm">
            <Tag className="w-4 h-4 text-brand-600" />
            {listing.category.replace('_', ' ').toUpperCase()}
          </div>
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-xl transform -rotate-12 border-4 border-white shadow-xl">SOLD OUT</span>
            </div>
          )}
        </div>

        {/* Right Side - Details */}
        <div className="md:w-1/2 p-8 flex flex-col">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
            <MapPin className="w-4 h-4" /> {listing.ward}, {listing.county} County
          </div>

          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <p className="text-3xl font-bold text-brand-600">KSh {listing.pricePerUnit} <span className="text-lg text-gray-500 font-normal">/ {listing.unit}</span></p>
            <p className="text-sm text-gray-600 mt-1">{listing.quantity} {listing.unit} available</p>
          </div>

          {/* Farmer Info & Reviews */}
          <div className="border-t border-gray-100 pt-6 mb-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sold By</h3>
              <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {reviews.length > 0 ? `${ratingAvg.toFixed(1)} (${reviews.length} reviews)` : "New Farmer"}
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xl">{farmerName.charAt(0)}</div>
              <div>
                <p className="font-bold text-gray-900">{farmerName}</p>
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1"><ShieldCheck className="w-4 h-4" /> Verified Farmer</div>
              </div>
            </div>

            {/* Display Recent Reviews */}
            {reviews.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg mt-2 max-h-32 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-2">What buyers are saying:</p>
                {reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-xs font-bold text-gray-700 ml-1">{review.buyerName}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto space-y-4">
            {!isSoldOut && !activeTransactionId && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to buy:</label>
                <div className="flex gap-3">
                  <input type="number" min="1" max={listing.quantity} value={buyQuantity} onChange={(e) => setBuyQuantity(Number(e.target.value))} className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 font-bold text-center" />
                  <button onClick={handleInitiatePurchase} disabled={isPurchasing} className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-bold transition-colors disabled:opacity-50">
                    <ShoppingCart className="w-5 h-5" /> {isPurchasing ? "Processing..." : "Initiate Purchase"}
                  </button>
                </div>
              </div>
            )}

            {activeTransactionId && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4">
                <p className="text-sm text-green-800 font-medium text-center mb-3">Order Initiated! Please contact {farmerName} to arrange payment and delivery.</p>
                {cleanWhatsApp && (
                  <a href={`https://wa.me/${cleanWhatsApp}?text=Hi ${farmerName}, I just initiated a purchase for ${buyQuantity} ${listing.unit}(s) of ${listing.title} on Mkulima Market.`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-lg font-bold transition-colors shadow-sm mb-2">
                    <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
                  </a>
                )}
                {farmerPhone && (
                  <a href={`tel:${farmerPhone}`} className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-lg font-bold transition-colors shadow-sm mb-3">
                    <Phone className="w-5 h-5" /> Call {farmerPhone}
                  </a>
                )}
                <button onClick={handleConfirmReceived} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg font-bold transition-colors">
                  <CheckCircle className="w-5 h-5" /> I Have Received the Goods
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Leave a Review</h2>
            <p className="text-gray-500 text-sm mb-6 text-center">How was your experience buying from {farmerName}?</p>
            <form onSubmit={submitReview}>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                    <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Comment</label>
                <textarea required rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500" placeholder="Was the produce fresh? Was the farmer easy to communicate with?" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <button type="submit" disabled={submittingReview} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50">
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}