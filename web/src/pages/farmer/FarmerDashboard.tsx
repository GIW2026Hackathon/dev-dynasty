import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { PlusCircle, ShieldCheck, Clock, Star, Package, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import type { ListingDocument } from "../../lib/types";

interface ReviewData {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function FarmerDashboard() {
  const { userData } = useAuth();
  const [listings, setListings] = useState<ListingDocument[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Real verification state from the database
  const [isVerified, setIsVerified] = useState(false); 

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData) return;
      try {
        // 1. Fetch Farmer's Verification Status
        const farmerProfileQuery = query(collection(db, "farmers"), where("userId", "==", userData.id));
        const farmerProfileSnap = await getDocs(farmerProfileQuery);
        
        if (!farmerProfileSnap.empty) {
          const profileData = farmerProfileSnap.docs[0].data();
          setIsVerified(profileData.verificationStatus === "verified");
        }

        // 2. Fetch Farmer's Listings
        const listingsQuery = query(
          collection(db, "listings"), 
          where("farmerId", "==", userData.id)
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const fetchedListings: ListingDocument[] = [];
        listingsSnapshot.forEach((doc) => {
          fetchedListings.push({ id: doc.id, ...doc.data() } as ListingDocument);
        });
        setListings(fetchedListings);

        // 3. Fetch Farmer's Reviews
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("farmerId", "==", userData.id)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const fetchedReviews: ReviewData[] = [];
        let totalRating = 0;

        reviewsSnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedReviews.push({ id: doc.id, ...data } as ReviewData);
          totalRating += data.rating;
        });
        
        setReviews(fetchedReviews);
        if (fetchedReviews.length > 0) {
          setRatingAvg(totalRating / fetchedReviews.length);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) return <div className="text-center mt-20 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Farm</h1>
          <p className="text-gray-500 mt-1">Manage your produce and listings</p>
        </div>
        
        {/* ONLY SHOW CREATE BUTTON IF VERIFIED */}
        {isVerified && (
          <Link
            to="/dashboard/farmer/new-listing"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Create Listing
          </Link>
        )}
      </div>

      {/* Verification Status Banner */}
      {isVerified ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-green-100 p-2 rounded-full text-green-700 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-green-800 font-semibold">Verified Farmer</h3>
            <p className="text-green-700 text-sm mt-1">
              Your account has been verified by an extension officer. Your listings are visible to buyers across Kenya.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-yellow-100 p-2 rounded-full text-yellow-700 mt-0.5">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-yellow-800 font-semibold">Verification Pending</h3>
            <p className="text-yellow-700 text-sm mt-1">
              An extension officer will contact you within 24 hours to verify your farm. You cannot create listings until you are verified.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Package className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Active Listings</p>
            <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.status === "active").length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-yellow-50 p-3 rounded-lg text-yellow-600"><Star className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{reviews.length > 0 ? ratingAvg.toFixed(1) : "New"}</p>
              {reviews.length > 0 && <span className="text-sm text-gray-500">({reviews.length} reviews)</span>}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isVerified ? 'bg-brand-50 text-brand-600' : 'bg-yellow-50 text-yellow-600'}`}>
            {isVerified ? <ShieldCheck className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className={`text-2xl font-bold ${isVerified ? 'text-gray-900' : 'text-yellow-600'}`}>
              {isVerified ? "Verified" : "Pending"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* LISTINGS COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Your Listings</h2>
          
          {listings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No listings yet</h3>
              <p className="text-gray-500 mt-1 mb-4">
                {isVerified ? "Get started by creating your first produce listing." : "You will be able to create listings once verified."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="relative">
                    <img src={listing.photoUrls[0]} alt={listing.title} className="w-full h-40 object-cover" />
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${listing.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {listing.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{listing.title}</h3>
                    <p className="text-brand-600 font-bold mb-2">KSh {listing.pricePerUnit} / {listing.unit}</p>
                    <div className="mt-auto text-sm text-gray-500">
                      {listing.quantity} {listing.unit} remaining
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVIEWS COLUMN */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Buyer Reviews</h2>
          
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No reviews yet. Complete a sale to get your first review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-900 text-sm">{review.buyerName}</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm italic">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}