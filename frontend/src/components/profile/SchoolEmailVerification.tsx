import React, { useState, useEffect } from 'react';
import type { FormData } from '../../types/profile/formData.ts';
import axios from 'axios';
import config from '../../config.ts';

const { API_BASE_URL } = config;

interface SchoolEmailVerificationProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

const SchoolEmailVerification: React.FC<SchoolEmailVerificationProps> = ({ formData, setFormData }) => {
    const [emailSent, setEmailSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const [emailValid, setEmailValid] = useState(false);
    const [schoolEmailValid, setSchoolEmailValid] = useState(true);
    const [countdown, setCountdown] = useState(0);

    const extractDomainKeyword = (email: string): string | null => {
        if (!email) return null;

        const domainRegex = /^[^@]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
        const match = email.match(domainRegex);
        if (match) {
            const domainParts = match[1].split('.');
            return domainParts.length > 1 ? domainParts[0] : null;
        }
        return null;
    };

    const isEmailValidForSchool = (email: string, school: string): boolean => {
        if (!email || !school) return false;

        const domainKeyword = extractDomainKeyword(email);
        if (!domainKeyword) return false;

        // Normalize the school name by removing spaces and converting to lowercase
        const normalizedSchool = school.toLowerCase().replace(/\s+/g, '');

        // Check if the domainKeyword matches as the abbrev in the normalized school name
        let keywordIndex = 0;

        for (const char of normalizedSchool) {
            if (char === domainKeyword[keywordIndex])
                keywordIndex++;
            if (keywordIndex === domainKeyword.length)
                return true;
        }
        return false;
    };

    // Validate `formData.email` on initial render and updates
    useEffect(() => {
        if (!formData.email || !formData.school) {
            setEmailValid(false);
            return;
        }

        const valid = isEmailValidForSchool(formData.email, formData.school);
        setEmailValid(valid);
        setFormData((prev) => ({
            ...prev,
            school_email_verified: valid,
            school_email: valid ? formData.email : "",
        }));
    }, [formData.email, formData.school]);

    const handleSendVerificationEmail = async () => {
        if (!formData.school_email) {
            alert("Please enter a valid school/organization email.");
            return;
        }

        if (!isEmailValidForSchool(formData.school_email, formData.school)) {
            setSchoolEmailValid(false);
            return;
        }

        setSchoolEmailValid(true);

        try {
            await axios.post(
                `${API_BASE_URL}/api/send-verification-email`,
                new URLSearchParams({ email: formData.school_email }).toString(),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                }
            );

            setEmailSent(true);
            setVerified(false);
            setFormData((prev) => ({
                ...prev,
                school_email_verified: false,
            }));

            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Error sending verification email:", error);
            alert("Failed to send verification email. Please try again.");
        }
    };

    // Use SSE to check email verification status
    useEffect(() => {
        if (emailSent && formData.school_email) {
            const eventSource = new EventSource(
                `${API_BASE_URL}/api/check-email-verified?email=${encodeURIComponent(formData.school_email)}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.is_verified) {
                        setVerified(true);
                        setFormData((prev) => ({
                            ...prev,
                            school_email_verified: true,
                        }));
                        eventSource.close();
                    }
                } catch (error) {
                    console.error("Error parsing SSE data:", error);
                }
            };

            eventSource.onerror = () => {
                console.error("SSE connection error");
                eventSource.close();
            };

            return () => eventSource.close();
        }
    }, [emailSent, formData.school_email]);

    return (
        <div>
            {emailValid ? (
                <p className="text-sm text-green-500 mt-2">School/Organization Verified!</p>
            ) : (
                <div>
                    <label className="block mb-2">School/Organization Email</label>
                    <div className="flex items-center space-x-4">
                        <input
                            type="email"
                            name="school_email"
                            value={formData.school_email}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    school_email: e.target.value,
                                }))
                            }
                            className="border p-2 w-full rounded"
                            disabled={formData.school_email_verified}
                        />
                        <button
                            type="button"
                            onClick={handleSendVerificationEmail}
                            className={`px-4 py-2 rounded-md whitespace-nowrap ${emailSent
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            disabled={emailSent && countdown > 0}
                        >
                            {emailSent ? (countdown > 0 ? `Email Sent (${countdown}s)` : 'Send Again') : 'Verify Email'}
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
                    {!emailSent && formData.school_email && !schoolEmailValid && (
                        <p className="text-sm text-red-500">Email domain does not match the school name.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SchoolEmailVerification;
