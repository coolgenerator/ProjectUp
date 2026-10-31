import React, { useState, useEffect, useRef } from "react";
import { ShareIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import {
    FaFacebook,
    FaTwitter,
    FaInstagram,
    FaDiscord,
    FaWeixin,
} from "react-icons/fa";

interface SharePopupProps {
    shareLink: string;
    consistent?: boolean;
    // A small gray icon button, matching the action row on community post cards
    subtle?: boolean;
}

const SharePopup: React.FC<SharePopupProps> = ({ shareLink, consistent = false, subtle = false }) => {
    const [isShareSupported, setIsShareSupported] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            setIsShareSupported(true);
        }
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    url: shareLink,
                });
            } catch (error) {
                console.error("Error sharing:", error);
            }
        } else {
            alert("Your browser does not support native sharing.");
        }
    };

    // Close the popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsShareOpen(false);
            }
        };

        if (isShareOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isShareOpen]);

    return (
        <div className="relative" ref={popupRef}>
            {/* Share Button */}
            {subtle ? (
                <button
                    onClick={() => setIsShareOpen(!isShareOpen)}
                    className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                    aria-label="Share"
                >
                    <ShareIcon className="h-4 w-4" />
                </button>
            ) : consistent ? (
                <button
                    onClick={() => setIsShareOpen(!isShareOpen)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                >
                    <ShareIcon className="w-5 h-5 text-gray-700" />
                    <span>Share</span>
                </button>
            ) : (
                <button
                    onClick={() => setIsShareOpen(!isShareOpen)}
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                >
                    <ShareIcon className="h-6 w-6 text-green-500" />
                </button>
            )}

            {isShareOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white shadow-lg border rounded-lg p-4 w-64 z-50">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Share with Link</h3>
                    <div className="flex items-center border rounded overflow-hidden">
                        <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="w-full p-2 border-none bg-gray-100 text-sm"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-r"
                        >
                            <ClipboardIcon
                                className={`h-5 w-5 transition-colors ${copied ? "text-blue-500" : "text-gray-500"
                                    }`}
                            />
                        </button>

                    </div>
                    {copied && (
                        <p className="text-green-600 text-xs text-center mt-2">
                            Link copied successfully!
                        </p>
                    )}

                    {/* Social media share options */}
                    <div className="flex justify-between items-center mt-3 space-x-3">
                        <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                        >
                            <FaFacebook size={24} />
                        </a>
                        <a
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-600"
                        >
                            <FaTwitter size={24} />
                        </a>
                        <a
                            href={`https://www.instagram.com/?url=${encodeURIComponent(shareLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-800"
                        >
                            <FaInstagram size={24} />
                        </a>
                        <a
                            href={`https://discord.com/channels/@me?url=${encodeURIComponent(shareLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800"
                        >
                            <FaDiscord size={24} />
                        </a>
                        <a
                            href={`https://web.wechat.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                        >
                            <FaWeixin size={24} />
                        </a>
                    </div>

                    {/* Native share button for mobile */}
                    {isShareSupported && (
                        <button
                            onClick={handleNativeShare}
                            className="mt-3 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition text-sm"
                        >
                            Share via Other Apps
                        </button>
                    )}
                    {/* <button
                        onClick={() => setIsShareOpen(false)}
                        className="mt-2 text-gray-500 text-sm hover:text-gray-700"
                    >
                        Close
                    </button> */}
                </div>
            )}
        </div>
    );
};

export default SharePopup;
