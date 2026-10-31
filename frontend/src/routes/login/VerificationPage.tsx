import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import config from "../../config";

const { API_BASE_URL } = config

const VerificationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<string>("Verifying..."); // Initial status message

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("Invalid request. No token provided.");
            return;
        }

        // Send verification request to backend
        const verifyEmail = async () => {
            try {
                const response = await axios.get<{ message: string }>(`${API_BASE_URL}/api/verify?token=${token}`);
                setStatus(response.data.message);
            } catch (error: any) {
                setStatus(
                    error.response?.data?.error || "An error occurred during verification. Please try again."
                );
            }
        };

        verifyEmail();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center">
                <h1 className="text-xl font-bold mb-4">Email Verification</h1>
                <p className="text-gray-600">{status}</p>
            </div>
        </div>
    );
};

export default VerificationPage;
