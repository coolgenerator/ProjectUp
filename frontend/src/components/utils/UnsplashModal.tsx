// UnsplashModal.js
import React, { useState, useEffect } from "react";
import { UnsplashModalProps } from "../../types/utils/unsplash";
import { UnsplashImage } from "../../types/utils/unsplash";
import config from "../../config";

const { UNSPLASH_ACCESS_KEY } = config

const UnsplashModal: React.FC<UnsplashModalProps> = ({
    handleUnsplashImageSelect,
    setIsUnsplashModalOpen,
    target,
}) => {
    const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const handleFetchUnsplashImages = async (query: string = "") => {
        const endpoint = query
            ? `https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=9`
            : `https://api.unsplash.com/photos/random?count=9&client_id=${UNSPLASH_ACCESS_KEY}`;

        try {
            const response = await fetch(endpoint);
            const data = await response.json();

            // For search queries, Unsplash returns images in `data.results`.
            const images = query
                ? data.results.map((img: any) => ({
                    url: `${img.urls.raw}&w=600&h=400&fit=crop`,
                    photographer: img.user.name,
                    profile: img.user.links.html,
                    downloadLocation: img.links.download_location,
                }))
                : data.map((img: any) => ({
                    url: `${img.urls.raw}&w=600&h=400&fit=crop`,
                    photographer: img.user.name,
                    profile: img.user.links.html,
                    downloadLocation: img.links.download_location,
                }));

            setUnsplashImages(images);
        } catch (error) {
            console.error("Failed to fetch Unsplash images", error);
        }
    };

    const handleImageSelect = async (url: string, downloadLocation: string) => {
        try {
            // Trigger Unsplash download endpoint
            await fetch(`${downloadLocation}&client_id=${UNSPLASH_ACCESS_KEY}`, { method: "GET" });

            // Fetch the Unsplash image as a Blob
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], "unsplash-cover.jpg", { type: blob.type });

            // Pass the file back to the parent
            handleUnsplashImageSelect(file, url, target);
            setIsUnsplashModalOpen(false);
        } catch (err) {
            console.error("Failed to fetch Unsplash image or trigger download", err);
        }
    };

    useEffect(() => {
        handleFetchUnsplashImages();
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100]">
            <div className="bg-white p-4 rounded-lg max-w-3xl w-full overflow-auto">
                <h2 className="text-xl font-bold mb-4">Search Unsplash</h2>

                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search for images"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 mb-4 border rounded"
                />

                {/* Search Button */}
                <button
                    onClick={() => handleFetchUnsplashImages(searchQuery)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Search
                </button>

                {/* Image Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 mt-4">
                    {unsplashImages.map((img, index) => (
                        <div key={index} className="relative">
                            <img
                                src={img.url}
                                alt={`Photo by ${img.photographer}`}
                                className="cursor-pointer w-full h-32 object-cover rounded shadow hover:opacity-75"
                                onClick={() => handleImageSelect(img.url, img.downloadLocation)}
                            />
                            <div className="text-xs text-gray-600 mt-2">
                                Photo by{" "}
                                <a
                                    href={`${img.profile}?utm_source=projectup&utm_medium=social`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {img.photographer}
                                </a>{" "}
                                on{" "}
                                <a
                                    href={`https://unsplash.com/?utm_source=projectup&utm_medium=social`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    Unsplash
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setIsUnsplashModalOpen(false)}
                    className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default UnsplashModal;
