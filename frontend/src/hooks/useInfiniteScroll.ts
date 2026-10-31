import { useEffect, useState, useRef } from "react";

const useInfiniteScroll = (loadMore: () => void) => {
    const [isFetching, setIsFetching] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!chatContainerRef.current) return;

            // Check if scrolled to the top
            if (chatContainerRef.current.scrollTop === 0 && !isFetching) {
                setIsFetching(true);
                loadMore();
            }
        };

        if (chatContainerRef.current) {
            chatContainerRef.current.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (chatContainerRef.current) {
                chatContainerRef.current.removeEventListener("scroll", handleScroll);
            }
        };
    }, [isFetching]);

    return { chatContainerRef, setIsFetching };
};

export default useInfiniteScroll;
