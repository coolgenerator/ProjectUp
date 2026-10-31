import React, { useState, useEffect } from "react";
import PartnerPostCard from "../../components/partner/PartnerPostCard";
import CreatePartnerModal from "../../components/partner/CreatePartnerModal";
import InfiniteScroll from "react-infinite-scroll-component";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import LoadingPage from "../../components/app/Loading";
import withAuth from "../../hooks/withAuth";
import { Filters } from "../../types/partner/filter";

const { API_BASE_URL } = config;
const availableInterests = ["Study", "Travel", "Outdoor", "Games", "Sports", "Music", "Tech", "Social"];

const Partners: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInterest, setSelectedInterest] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [partners, setPartners] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [appliedFilters, setAppliedFilters] = useState<Filters>({
        searchQuery: "",
        selectedInterest: [],
        selectedLocation: ""
    });

    const fetchPartners = async (currentPage: number) => {
        try {
            const queryParams = new URLSearchParams();
            if (appliedFilters.searchQuery) queryParams.append("search", appliedFilters.searchQuery);
            if (appliedFilters.selectedLocation) queryParams.append("location", appliedFilters.selectedLocation);
            if (appliedFilters.selectedInterest.length > 0) {
                queryParams.append("interests", appliedFilters.selectedInterest.join(","));
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/api/partner-posts?page=${currentPage}&limit=10&${queryParams.toString()}`);
            const data = await response.json();
            console.log(data);

            setPartners((prev) => (currentPage === 1 ? data.partners || [] : [...prev, ...(data.partners || [])]));
            setHasMore(data.has_more);
        } catch (error) {
            console.error("Failed to fetch partners:", error);
        }
    };

    useEffect(() => {
        fetchPartners(page);
    }, [page]);

    const loadMorePartners = () => {
        setPage((prevPage) => prevPage + 1);
    };

    const handleOpenPostModal = () => setIsPostModalOpen(true);
    const handleClosePostModal = () => setIsPostModalOpen(false);
    const toggleFilterVisibility = () => setIsFilterVisible(!isFilterVisible);

    const applyFilters = () => {
        setAppliedFilters({ searchQuery, selectedInterest, selectedLocation });
        setPage(1);
    };

    return (
        <div className="bg-gray-100 min-h-screen flex">
            {isFilterVisible && (
                <aside className="w-full md:w-1/4 bg-white p-4 shadow-lg rounded-lg">
                    <h2 className="text-lg font-bold mb-4">Filter Partners</h2>
                    <input
                        type="text"
                        placeholder="Search an Activity or Partner..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    <div className="space-y-4 mt-4">
                        <label className="block font-medium mb-1">Interests</label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableInterests.map((interest) => (
                                <label key={interest} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        value={interest}
                                        checked={selectedInterest.includes(interest)}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setSelectedInterest((prev) =>
                                                isChecked ? [...prev, interest] : prev.filter((i) => i !== interest)
                                            );
                                        }}
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                    />
                                    <span className="text-gray-700">{interest}</span>
                                </label>
                            ))}
                        </div>
                        <label className="block font-medium mb-1">Location</label>
                        <input
                            type="text"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Enter location"
                        />
                        <button onClick={applyFilters} className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 mt-4 w-full">
                            Apply Filters
                        </button>
                    </div>
                </aside>
            )}

            <main className={`w-full ${isFilterVisible ? "md:w-3/4" : "md:w-full"} p-8`}>
                {/* Page Header */}
                <div className="relative bg-white/80 backdrop-blur-md shadow-md p-4 rounded-lg mb-6">
                    {/* Mobile View: First row - Filter icon and Title */}
                    <div className="flex items-center justify-between mb-4 md:hidden">
                        <button
                            onClick={toggleFilterVisibility}
                            className="p-2 rounded-md hover:bg-gray-200 transition duration-300"
                        >
                            {/* SVG Hamburger Icon */}
                            <svg className="w-6 h-6 text-gray-600 hover:text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7"></path>
                            </svg>
                        </button>

                        <h1 className="text-2xl font-bold">
                            <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                                Find a Buddy/Partner
                            </span>
                        </h1>

                        {/* Empty div for flex spacing */}
                        <div className="w-6"></div>
                    </div>

                    {/* Mobile View: Second row - Buttons */}
                    <div className="flex justify-center md:hidden">
                        <button
                            onClick={handleOpenPostModal}
                            className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 w-full max-w-[200px]"
                        >
                            Create a Post
                        </button>
                    </div>

                    {/* Desktop View - With Absolute Positioned Title */}
                    <div className="hidden md:flex items-center justify-between relative h-16">
                        {/* Filter Icon (Left Side) */}
                        <div>
                            <button
                                onClick={toggleFilterVisibility}
                                className="p-3 rounded-md hover:bg-gray-200 transition duration-300"
                            >
                                {/* SVG Hamburger Icon */}
                                <svg className="w-6 h-6 text-gray-600 hover:text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Absolutely Positioned Title (Centered) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <h1 className="text-3xl font-bold relative pb-2">
                                <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-transparent bg-clip-text inline-block">
                                    Find a Buddy/Partner
                                </span>
                                <span className="absolute left-1/2 bottom-0 h-0.5 w-40 bg-gradient-to-r from-blue-600 to-purple-500 transform -translate-x-1/2 rounded-full"></span>
                            </h1>
                        </div>

                        {/* Create Post Button (Right Side) */}
                        <div className="z-10">
                            <button
                                onClick={handleOpenPostModal}
                                className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
                            >
                                Create a Post
                            </button>
                        </div>
                    </div>
                </div>

                <InfiniteScroll dataLength={partners.length} next={loadMorePartners} hasMore={hasMore} loader={<LoadingPage />}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {partners.map((partner) => (
                            <PartnerPostCard key={partner.post_id} partner={partner} />
                        ))}
                    </div>
                </InfiniteScroll>
            </main>

            <CreatePartnerModal isOpen={isPostModalOpen} onClose={handleClosePostModal} />
        </div>
    );
};

export default withAuth(Partners);
