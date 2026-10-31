import React, { useEffect } from "react";
import MediaCarousel from "../MediaCarousel";
import { Position } from "../../types/project/positions";

interface ProjectInfoProps {
    project: any;
    showFullDetails?: boolean;
    showActions?: boolean;
    showPositions?: boolean;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({
    project,
    showPositions = true,
}) => {
    // Debug project type information
    useEffect(() => {
        console.log("Project type info:", {
            project_type: project.project_type,
            style: project.style,
            title: project.title
        });
    }, [project.project_type, project.style, project.title]);

    // Format topics to handle different data structures
    const getTopics = () => {
        if (Array.isArray(project.topics)) {
            return project.topics;
        } else if (Array.isArray(project.topic)) {
            return project.topic;
        } else if (typeof project.topics === 'string') {
            try {
                return JSON.parse(project.topics);
            } catch (e) {
                return [];
            }
        } else if (typeof project.topic === 'string') {
            try {
                return JSON.parse(project.topic);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    // Get proper media for carousel
    const getMedia = () => {
        if (Array.isArray(project.medias)) {
            return project.medias;
        } else if (Array.isArray(project.media)) {
            return project.media;
        }
        return [];
    };

    // Parse positions/spots data regardless of format
    const getPositions = (): Position[] => {
        // If we have a positions array that's already properly formatted
        if (Array.isArray(project.positions) && project.positions.length > 0) {
            return project.positions.map((pos: any): Position => ({
                title: pos.title || pos.name,
                name: pos.name,
                description: pos.description || pos.responsibility,
                responsibility: pos.responsibility,
                spots: pos.spots || 1
            }));
        }

        // If we have a spots array
        if (Array.isArray(project.spots) && project.spots.length > 0) {
            return project.spots.map((spot: any): Position => ({
                title: spot.title || spot.name,
                name: spot.name,
                description: spot.description || spot.responsibility,
                responsibility: spot.responsibility,
                spots: spot.spots || 1
            }));
        }

        // If spots is a JSON string
        if (typeof project.spots === 'string') {
            try {
                const parsed = JSON.parse(project.spots);
                if (Array.isArray(parsed)) {
                    return parsed.map((spot: any): Position => ({
                        title: spot.title || spot.name,
                        name: spot.name,
                        description: spot.description || spot.responsibility,
                        responsibility: spot.responsibility,
                        spots: spot.spots || 1
                    }));
                }
            } catch (e) {
                return [];
            }
        }

        return [];
    };

    const topics = getTopics();
    const media = getMedia();
    const positions = getPositions();

    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            {/* Project Title */}
            <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">{project.title}</h2>

            {/* Project Type Badge */}
            {(project.project_type || project.style) && (
                <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium 
                        ${(project.project_type || project.style) === 'School Work' ? 'bg-blue-100 text-blue-700' :
                            (project.project_type || project.style) === 'Research' ? 'bg-emerald-100 text-emerald-700' :
                                (project.project_type || project.style) === 'Personal Project' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-700'}`}>
                        {project.project_type || project.style}
                    </span>
                </div>
            )}

            {/* Media Carousel */}
            <div className="mb-6">
                <MediaCarousel media={media} cover={project.cover} />
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">Description</h3>
                    <p className="text-gray-600">
                        {project.description || "No description available."}
                    </p>
                </div>

                <div className="space-y-2">
                    <div>
                        <p className="text-gray-700">
                            <span className="font-medium">Start Time:</span>{" "}
                            {project.start_time ? new Date(project.start_time).toLocaleDateString() : "N/A"}
                        </p>
                    </div>
                    {project.deadline && (
                        <div>
                            <p className="text-gray-700">
                                <span className="font-medium">Deadline:</span>{" "}
                                {new Date(project.deadline).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-700">
                            <span className="font-medium">Location:</span>{" "}
                            {project.location || "N/A"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Topics */}
            {topics && topics.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                        {topics.map((topic: string, index: number) => (
                            <span
                                key={index}
                                className="inline-block bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Positions */}
            {showPositions && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">Positions</h3>
                    {positions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {positions.map((position: Position, index: number) => (
                                <div key={index} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-medium text-gray-800">{position.title || position.name}</h4>
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                            {position.spots} spot{position.spots !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1">{position.description || position.responsibility || 'No description available'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded p-4 bg-gray-50 text-center">
                            <p className="text-gray-600">
                                <span className="font-medium">No positions are currently listed for this project.</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Contact the project owner for more information about joining.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectInfo; 