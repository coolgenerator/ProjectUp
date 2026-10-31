/**
 * Shared building blocks for the team-matching flow (workbench, open projects,
 * project detail, apply, application board, team pulse), so those pages share
 * one look: indigo primary, rounded-xl surfaces, soft borders and small,
 * consistent motion. New pages should build on these rather than MUI.
 */
import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, MotionProps } from "framer-motion";
import { Loader2, X } from "lucide-react";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-500",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-indigo-500",
    ghost: "text-indigo-700 hover:bg-indigo-50 focus-visible:ring-indigo-500",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-500",
    success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
    sm: "gap-1.5 rounded-lg px-2.5 py-1 text-xs",
    md: "gap-2 rounded-lg px-4 py-2 text-sm",
    lg: "gap-2 rounded-xl px-5 py-2.5 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={cx(
                "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                BUTTON_VARIANTS[variant],
                BUTTON_SIZES[size],
                className
            )}
            {...props}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    )
);
Button.displayName = "Button";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    // Lift slightly on hover; use for cards that are clickable
    interactive?: boolean;
    padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ interactive, padded = true, className, ...props }) => (
    <div
        className={cx(
            "rounded-xl border border-gray-200 bg-white shadow-sm",
            padded && "p-5 sm:p-6",
            interactive && "transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md",
            className
        )}
        {...props}
    />
);

type BadgeTone = "neutral" | "indigo" | "green" | "amber" | "red" | "blue";

const BADGE_TONES: Record<BadgeTone, string> = {
    neutral: "bg-gray-100 text-gray-700",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
};

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }> = ({ tone = "neutral", className, ...props }) => (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONES[tone], className)} {...props} />
);

// Tag is a quieter chip for skills and topics.
export const Tag: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...props }) => (
    <span className={cx("rounded-md bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200", className)} {...props} />
);

// PAGE_WIDTH is the column every top-level page and the nav bar share, so
// their left and right edges line up from page to page.
export const PAGE_WIDTH = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

// PageContainer is the standard page shell: gray background and the shared column.
export const PageContainer: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
    <div className="min-h-screen bg-gray-50">
        <div className={cx(PAGE_WIDTH, "py-8 sm:py-10", className)}>{children}</div>
    </div>
);

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
    <FadeIn as="header" className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-gray-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </FadeIn>
);

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
    <FadeIn className={cx("rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center", className)}>
        {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">{icon}</div>}
        <p className="font-medium text-gray-900">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
    </FadeIn>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={cx("animate-pulse rounded-lg bg-gray-100", className)} />;

export const Alert: React.FC<{ tone?: "error" | "success" | "info"; children: React.ReactNode; className?: string }> = ({ tone = "error", children, className }) => (
    <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        role={tone === "error" ? "alert" : "status"}
        className={cx(
            "rounded-lg p-3 text-sm",
            tone === "error" && "border border-red-200 bg-red-50 text-red-700",
            tone === "success" && "border border-emerald-200 bg-emerald-50 text-emerald-800",
            tone === "info" && "border border-indigo-100 bg-indigo-50 text-indigo-800",
            className
        )}
    >
        {children}
    </motion.div>
);

type FadeInProps = MotionProps & {
    as?: "div" | "section" | "header" | "li" | "article";
    className?: string;
    delay?: number;
    children?: React.ReactNode;
    style?: React.CSSProperties;
};

// FadeIn is the standard entrance: a short fade-and-rise.
export const FadeIn: React.FC<FadeInProps> = ({ as = "div", delay = 0, children, ...props }) => {
    const Component = motion[as];
    return (
        <Component initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut", delay }} {...props}>
            {children}
        </Component>
    );
};

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    size?: "md" | "lg";
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, description, children, footer, size = "md" }) => {
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    // Portal to <body> so page layers (cards, motion wrappers) can never stack above the dialog
    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[1300] flex items-center justify-center bg-gray-900/50 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className={cx("relative w-full rounded-2xl bg-white p-6 shadow-xl", size === "lg" ? "max-w-2xl" : "max-w-lg")}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
                            <X className="h-4 w-4" />
                        </button>
                        <h2 className="pr-8 text-lg font-semibold text-gray-900">{title}</h2>
                        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                        {children && <div className="mt-4">{children}</div>}
                        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Fields fill their container unless the caller sets a width (w-*) of its own,
// since Tailwind resolves conflicting width classes by stylesheet order, not class order.
const fieldClass = (className?: string, extra?: string) =>
    cx(FIELD_CLASS, !/(^|\s)(w-|max-w-none)/.test(className || "") && "w-full", extra, className);

const FIELD_CLASS = "mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-50";

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea ref={ref} className={fieldClass(className, "min-h-[88px]")} {...props} />
));
TextArea.displayName = "TextArea";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input ref={ref} className={fieldClass(className)} {...props} />
));
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
    <select ref={ref} className={fieldClass(className, "pr-8")} {...props} />
));
Select.displayName = "Select";

export const Label: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, hint, children, className }) => (
    <label className={cx("block text-sm font-medium text-gray-700", className)}>
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">{hint}</span>}
        {children}
    </label>
);

// ProgressBar shows completion, e.g. profile fields or thinking lenses covered.
export const ProgressBar: React.FC<{ value: number; max: number; className?: string }> = ({ value, max, className }) => (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-gray-100", className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        <motion.div
            className="h-full rounded-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        />
    </div>
);
