import React from 'react';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { SolidHeartIcon, OutlineHeartIcon, SolidBookmarkIcon, OutlineBookmarkIcon } from './icons';

interface PostCardProps {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    author: {
        name: string;
        avatar?: string;
    };
    createdAt: string;
    initialInteractions: {
        isSaved: boolean;
        isLoved: boolean;
        saveCount: number;
        loveCount: number;
    };
}

const PostCard: React.FC<PostCardProps> = ({
    id,
    title,
    content,
    imageUrl,
    author,
    createdAt,
    initialInteractions,
}) => {
    const { interactions, toggleSave, toggleLove } = usePostInteractions(id, initialInteractions);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-48 object-cover"
                />
            )}
            <div className="p-4">
                <div className="flex items-center mb-2">
                    {author.avatar && (
                        <img
                            src={author.avatar}
                            alt={author.name}
                            className="w-8 h-8 rounded-full mr-2"
                        />
                    )}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{author.name}</span>
                    <span className="text-gray-500 dark:text-slate-400 text-sm ml-2">
                        {new Date(createdAt).toLocaleDateString()}
                    </span>
                </div>
                <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">{title}</h2>
                <p className="text-gray-600 dark:text-slate-300 mb-4">{content}</p>
                <div className="flex justify-end items-center space-x-4">
                    <button
                        onClick={toggleLove}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition flex items-center"
                    >
                        {interactions.isLoved ? (
                            <SolidHeartIcon className="h-6 w-6 text-red-500" />
                        ) : (
                            <OutlineHeartIcon className="h-6 w-6 text-red-500" />
                        )}
                        {interactions.loveCount > 0 && (
                            <span className="ml-2 text-gray-700 dark:text-slate-300">{interactions.loveCount}</span>
                        )}
                    </button>
                    <button
                        onClick={toggleSave}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                    >
                        {interactions.isSaved ? (
                            <SolidBookmarkIcon className="h-6 w-6 text-blue-500" />
                        ) : (
                            <OutlineBookmarkIcon className="h-6 w-6 text-blue-500" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCard; 