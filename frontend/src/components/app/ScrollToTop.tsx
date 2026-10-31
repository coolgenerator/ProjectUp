import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "instant" // Using instant instead of smooth for a quicker reset
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop; 