import React from "react";

interface Schedule {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
}

const MySchedules: React.FC = () => {
    // Mock schedule data
    const schedules: Schedule[] = [
        {
            id: 1,
            title: "AI Research Meeting",
            date: "2024-01-15",
            time: "10:00 AM - 11:30 AM",
            location: "Room 101, UCSD",
            description: "Discuss progress on the AI research project.",
        },
        {
            id: 2,
            title: "Marketing Strategy Session",
            date: "2024-01-20",
            time: "02:00 PM - 03:30 PM",
            location: "Online (Zoom)",
            description: "Plan the marketing campaign for the upcoming event.",
        },
        {
            id: 3,
            title: "Web Development Workshop",
            date: "2024-01-25",
            time: "01:00 PM - 03:00 PM",
            location: "Library Conference Hall",
            description: "A hands-on workshop on React and TailwindCSS.",
        },
    ];

    return (
        <div className="bg-gray-100 min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">My Schedules</h1>

                {schedules.length > 0 ? (
                    <div className="space-y-6">
                        {schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                            >
                                <h2 className="text-xl font-bold mb-2">{schedule.title}</h2>
                                <p className="text-gray-600 mb-2">
                                    <strong>Date:</strong> {schedule.date}
                                </p>
                                <p className="text-gray-600 mb-2">
                                    <strong>Time:</strong> {schedule.time}
                                </p>
                                <p className="text-gray-600 mb-2">
                                    <strong>Location:</strong> {schedule.location}
                                </p>
                                <p className="text-gray-700">{schedule.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600 text-center">You have no scheduled events.</p>
                )}
            </div>
        </div>
    );
};

export default MySchedules;
