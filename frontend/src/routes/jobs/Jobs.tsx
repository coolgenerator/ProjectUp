import React from "react";

interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string; // e.g., Full-time, Part-time, Internship
    description: string;
    postedDate: string;
    logoUrl: string;
    link: string; // Link to apply or view details
}

const Jobs: React.FC = () => {
    // Mock job data
    const jobs: Job[] = [
        {
            id: 1,
            title: "Software Engineer",
            company: "TechCorp Inc.",
            location: "San Francisco, CA",
            type: "Full-time",
            description: "Develop and maintain web applications.",
            postedDate: "2024-12-01",
            logoUrl: "https://via.placeholder.com/50",
            link: "/jobs/1",
        },
        {
            id: 2,
            title: "Marketing Intern",
            company: "Creative Solutions",
            location: "Remote",
            type: "Internship",
            description: "Assist in marketing campaigns and social media management.",
            postedDate: "2024-11-28",
            logoUrl: "https://via.placeholder.com/50",
            link: "/jobs/2",
        },
        {
            id: 3,
            title: "Data Analyst",
            company: "AnalyticsPro",
            location: "New York, NY",
            type: "Part-time",
            description: "Analyze data and provide insights for business strategies.",
            postedDate: "2024-11-30",
            logoUrl: "https://via.placeholder.com/50",
            link: "/jobs/3",
        },
    ];

    return (
        <div className="bg-gray-100 min-h-screen py-10 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Job Opportunities</h1>

                {jobs.length > 0 ? (
                    <div className="space-y-6">
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition"
                            >
                                <div className="flex items-center mb-4">
                                    <img
                                        src={job.logoUrl}
                                        alt={job.company}
                                        className="w-12 h-12 rounded-full mr-4"
                                    />
                                    <div>
                                        <h2 className="text-xl font-bold">{job.title}</h2>
                                        <p className="text-gray-600">{job.company}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-gray-600">
                                        <strong>Location:</strong> {job.location}
                                    </p>
                                    <p className="text-gray-600">
                                        <strong>Type:</strong> {job.type}
                                    </p>
                                    <p className="text-gray-600">
                                        <strong>Posted:</strong> {job.postedDate}
                                    </p>
                                </div>
                                <p className="text-gray-700 mb-4">{job.description}</p>
                                <a
                                    href={job.link}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                                >
                                    View Details
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600 text-center">
                        No job opportunities are available at the moment.
                    </p>
                )}
            </div>
        </div>
    );
};

export default Jobs;
