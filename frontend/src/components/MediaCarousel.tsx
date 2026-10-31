import React, { useState } from "react";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import config from "../config";

const { AWS_BASE_URL } = config;

interface MediaCarouselProps {
    media: any[];
    cover: string | null;
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ media = [], cover }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Filter out any null or undefined items and ensure proper URL formatting
    const filterAndFormatMedia = (mediaItems: any[], coverImage: string | null) => {
        const result = [];

        // Add cover if it exists
        if (coverImage) {
            // Check if the cover already includes the AWS base URL
            const coverUrl = coverImage.startsWith('http')
                ? coverImage
                : `${AWS_BASE_URL}${coverImage}`;
            result.push(coverUrl);
        }

        // Add media items if they exist
        if (Array.isArray(mediaItems)) {
            mediaItems.forEach(item => {
                if (item) {
                    // Handle both string URLs and objects with url property
                    const mediaUrl = typeof item === 'string'
                        ? (item.startsWith('http') ? item : `${AWS_BASE_URL}${item}`)
                        : (item.url ? (item.url.startsWith('http') ? item.url : `${AWS_BASE_URL}${item.url}`) : null);

                    if (mediaUrl) {
                        result.push(mediaUrl);
                    }
                }
            });
        }

        return result;
    };

    const allMedia = filterAndFormatMedia(media, cover);

    // If no media, show a placeholder
    if (allMedia.length === 0) {
        return (
            <div className="relative w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No media available</p>
            </div>
        );
    }

    const handlePrevious = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? allMedia.length - 1 : prevIndex - 1
        );
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === allMedia.length - 1 ? 0 : prevIndex + 1
        );
    };

    return (
        <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden group">
            {/* Media Image */}
            <img
                src={allMedia[currentIndex]}
                alt={`Media ${currentIndex + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/500x300?text=Image+Not+Available';
                }}
            />

            {/* Navigation Buttons - Only show if there are multiple media items */}
            {allMedia.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-opacity-75"
                    >
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-opacity-75"
                    >
                        <ChevronRightIcon className="h-6 w-6" />
                    </button>

                    {/* Indicator Dots */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {allMedia.map((_, index) => (
                            <span
                                key={index}
                                className={`w-3 h-3 rounded-full ${index === currentIndex ? "bg-white" : "bg-gray-400"} transition`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MediaCarousel;
