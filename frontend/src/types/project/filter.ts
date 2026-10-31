export interface Filters {
    searchQuery: string;
    selectedTopics: string[];
    selectedType: string;
    selectedLocation: string;
    selectedDate: string;
    selectedSpots: string;
    selectedLanguages: string[];
    nearbyRange: string;
    latitude?: number;
    longitude?: number;
}