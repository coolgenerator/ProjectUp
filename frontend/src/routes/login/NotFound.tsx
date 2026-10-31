import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <motion.h1
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-6xl font-bold text-gray-800 mb-4"
            >
                404
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-lg text-gray-600 mb-6"
            >
                Oops! The page you are looking for doesn't exist.
            </motion.p>
            {/* Illustration using CSS */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-64 h-64 mb-6"
            >
                <div className="absolute inset-0 bg-gray-200 rounded-full shadow-lg"></div>
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gray-300 rounded-full"></div>
                <div className="absolute top-1/3 left-1/3 w-8 h-8 bg-gray-400 rounded-full"></div>
                <div className="absolute top-2/3 left-2/3 w-12 h-12 bg-blue-400 rounded-full"></div>
            </motion.div>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition"
            >
                Go Home
            </motion.button>
        </div>
    );
};

export default NotFoundPage;
