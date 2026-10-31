import React, { useEffect, useState } from "react";
import axios from "axios";
import { FormData } from "../../types/auth/formData";
import config from "../../config";

const { API_BASE_URL } = config

interface EmailVerificationProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    verified: boolean;
    setVerified: React.Dispatch<React.SetStateAction<boolean>>
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ formData, setFormData, verified, setVerified }) => {
    const [emailSent, setEmailSent] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [countdown, setCountdown] = useState(0);

    // Validate email format
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setEmailValid(emailRegex.test(formData.email));
    }, [formData.email]);

    // Handle sending the verification email
    const handleSendVerificationEmail = async () => {
        if (!emailValid || !formData.email) {
            return;
        }
        try {
            await axios.post(
                `${API_BASE_URL}/api/send-verification-email`,
                new URLSearchParams({ email: formData.email }).toString(),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                }
            );
            setEmailSent(true);
            setCountdown(60);
        } catch (error) {
            console.error("Error sending verification email:", error);
            alert("Failed to send verification email. Please try again.");
        }
    };

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown]);

    // Reset verified and emailSent when email input changes
    useEffect(() => {
        setVerified(false);
        setEmailSent(false);
        setCountdown(0); // Reset countdown
    }, [formData.email]);

    // Use SSE to check email verification status
    useEffect(() => {
        if (emailSent) {
            const eventSource = new EventSource(
                `${API_BASE_URL}/api/check-email-verified?email=${formData.email}`
            );

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.is_verified) {
                    setVerified(true);
                    eventSource.close(); // Close connection once verified
                }
            };

            eventSource.onerror = () => {
                console.error("SSE connection error");
                eventSource.close();
            };

            return () => eventSource.close();
        }
    }, [emailSent, formData.email]);

    return (
        <div>
            <label className="block font-medium text-left mb-1">Email:</label>
            <div className="flex items-center gap-2">
                <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                        }))
                    }
                    className="w-full px-4 py-2 border rounded-md"
                    required
                />
                <button
                    type="button"
                    onClick={handleSendVerificationEmail}
                    className={`px-4 py-2 rounded-md whitespace-nowrap ${emailSent && countdown > 0
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                    disabled={emailSent && countdown > 0 || !formData.email || emailValid === false}
                >
                    {emailSent ? (countdown > 0 ? `Email Sent (${countdown}s)` : "Send Again") : "Verify Email"}
                </button>
            </div>
            {emailSent && !verified && (
                <p className="text-sm text-gray-500 mt-2">
                    Verification email sent successfully. Please check your inbox or junk folder.
                </p>
            )}
            {verified && (
                <p className="text-sm text-green-500 mt-2">Email Verified!</p>
            )}
            {!emailSent && formData.email && emailValid === false && (
                <p className="text-sm text-red-500">Invalid email format.</p>
            )}
        </div>
    );
};

export default EmailVerification;
