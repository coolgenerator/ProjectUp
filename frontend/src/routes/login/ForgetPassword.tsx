import React, { useState } from "react";
import axios from "axios";
import config from "../../config";

const { API_BASE_URL } = config

const ForgetPassword: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset messages
        setMessage(null);
        setError(null);

        if (!email) {
            setError("Please enter your email.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/send-reset-password`,
                new URLSearchParams({ email }).toString(), // Converts to x-www-form-urlencoded format
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            // Backend returns a message field when successful
            if (response.data.message) {
                setMessage(response.data.message);
            } else if (response.data.error) {
                setError(response.data.error);
            }
        } catch (err: any) {
            // Handle error response from backend or network error
            setError(err.response?.data?.error || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Enter your email address below and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-200 focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full px-4 py-2 rounded-md text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                            }`}
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>
                {message && <p className="text-sm text-green-500 mt-4">{message}</p>}
                {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            </div>
        </div>
    );
};

export default ForgetPassword;
