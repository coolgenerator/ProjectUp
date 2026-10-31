// Development mode check
const isDevelopment = import.meta.env.DEV;

// Helper to get required env var with dev fallback
// Note: Vite requires direct property access (not dynamic keys) for static replacement
const getEnvVar = (envValue: string | undefined, devFallback: string, varName: string): string => {
    if (envValue) return envValue;
    if (isDevelopment) return devFallback;
    // In production, log error but return fallback to avoid breaking the app
    console.error(`Missing required environment variable: ${varName}`);
    return devFallback;
};

// Base URLs are joined with relative keys ("covers/abc.png"), so keep a trailing slash.
const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);

const config = {
    // API URLs - required in production, fallback to localhost in development
    API_BASE_URL: getEnvVar(import.meta.env.VITE_API_URL, 'http://localhost:8080', 'VITE_API_URL'),
    WS_BASE_URL: getEnvVar(
        import.meta.env.VITE_WS_URL,
        'ws://localhost:8080',
        'VITE_WS_URL'
    ),
    AI_AGENT_URL: getEnvVar(import.meta.env.VITE_AI_SERVICE_URL, 'http://localhost:8888', 'VITE_AI_SERVICE_URL'),
    AI_WS_URL: getEnvVar(
        import.meta.env.VITE_AI_SERVICE_WS_URL,
        'ws://localhost:8888',
        'VITE_AI_SERVICE_WS_URL'
    ),

    // Public base URL for uploaded files: the AWS S3 bucket by default, or MinIO
    // (e.g. http://localhost:9000/projectup/) via VITE_FILE_BASE_URL.
    AWS_BASE_URL: withTrailingSlash(
        import.meta.env.VITE_FILE_BASE_URL || 'https://projectup.s3.us-west-1.amazonaws.com/'
    ),

    // Unsplash API key
    UNSPLASH_ACCESS_KEY: import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "",

    // Google Maps API key (optional)
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
};

export default config;