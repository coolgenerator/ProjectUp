export type UnsplashImage = {
    url: string;
    photographer: string;
    profile: string;
    downloadLocation: string;
};

export type UnsplashModalProps = {
    handleUnsplashImageSelect: (file: File, downloadLocation: string, target: string) => void;
    setIsUnsplashModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    target: string;
};

export type HandleFetchUnsplashImagesParams = {
    query: string;
    setUnsplashImages: React.Dispatch<React.SetStateAction<UnsplashImage[]>>;
    UNSPLASH_ACCESS_KEY: string;
};

export type HandleUnsplashImageSelectParams<T> = {
    url: string;
    downloadLocation: string;
    setState: React.Dispatch<React.SetStateAction<T>>;
    setSavedCover: React.Dispatch<React.SetStateAction<string | null>>;
    UNSPLASH_ACCESS_KEY: string;
};
