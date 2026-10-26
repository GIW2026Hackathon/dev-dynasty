import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Search, MapPin, Tag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { ListingDocument } from "../../lib/types";
import AiChatModal from "../../components/AiChatModal";

export default function BuyerDashboard() {
  const [listings, setListings] = useState<ListingDocument[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // AI Modal State
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, "listings"), where("status", "==", "active"));
        const querySnapshot = await getDocs(q);
        const fetchedListings: ListingDocument[] = [];
        
        querySnapshot.forEach((doc) => {
          fetchedListings.push({ id: doc.id, ...doc.data() } as ListingDocument);
        });
        
        setListings(fetchedListings);
        setFilteredListings(fetchedListings);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  useEffect(() => {
    let result = listings;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(l => {
        const titleMatch = l.title?.toLowerCase().includes(term) || false;
        const wardMatch = l.ward?.toLowerCase().includes(term) || false;
        const categoryMatch = l.category?.toLowerCase().includes(term) || false;
        
        return titleMatch || wardMatch || categoryMatch;
      });
    }

    if (selectedCategory !== "all") {
      result = result.filter(l => l.category === selectedCategory);
    }

    setFilteredListings(result);
  }, [searchTerm, selectedCategory, listings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-1">Browse fresh produce from verified farmers.</p>
        </div>
        
        {/* AI Button for Buyers */}
        <button 
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Ask AI
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by product, category, or ward..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[200px]"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <optgroup label="GIW Priority">
            <option value="horticulture">Horticulture</option>
            <option value="livestock">Livestock</option>
            <option value="poultry">Poultry</option>
            <option value="edible_oils">Edible Oils</option>
            <option value="indigenous_crops">Indigenous Crops</option>
            <option value="apiculture">Apiculture (Honey)</option>
          </optgroup>
          <optgroup label="Other Produce">
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="grains_cereals">Grains & Cereals</option>
            <option value="dairy_eggs">Dairy & Eggs</option>
            <option value="tubers_roots">Tubers & Roots</option>
            <option value="seeds_nursery">Seeds & Nursery</option>
            <option value="farm_inputs">Farm Inputs</option>
          </optgroup>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-10">Loading marketplace...</p>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Link 
              to={`/dashboard/listing/${listing.id}`}
              key={listing.id} 
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={listing.photoUrls[0]} 
                  alt={listing.title} 
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-gray-800 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-brand-600" />
                  {listing.category.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{listing.title}</h3>
                <p className="text-2xl font-bold text-brand-600 mb-3">KSh {listing.pricePerUnit} <span className="text-sm text-gray-500 font-normal">/ {listing.unit}</span></p>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {listing.ward}
                  </div>
                  <span className="font-medium text-gray-900">{listing.quantity} {listing.unit} left</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}