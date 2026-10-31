import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction
}) => {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            {icon && (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 [&>svg]:h-7 [&>svg]:w-7">
                    {icon}
                </div>
            )}
            <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
            <p className="mb-5 max-w-md text-sm text-gray-500">{description}</p>
            <div className="flex flex-wrap justify-center gap-3">
                {actionLabel && onAction && (
                    <Button onClick={onAction} icon={<Plus className="h-4 w-4" />}>{actionLabel}</Button>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <Button variant="secondary" onClick={onSecondaryAction}>{secondaryActionLabel}</Button>
                )}
            </div>
        </div>
    );
};

export default EmptyState;