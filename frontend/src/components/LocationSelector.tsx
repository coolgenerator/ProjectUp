import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { StandaloneSearchBox } from '@react-google-maps/api';
import config from '../config';

interface LocationSelectorProps {
    value: string;
    onChange: (location: string) => void;
    onCoordinatesChange?: (coordinates: { lat: number; lng: number }) => void;
    error?: string;
}

const defaultCenter = {
    lat: 40.7128,
    lng: -74.0060
};

const LocationSelector: React.FC<LocationSelectorProps> = ({
    value,
    onChange,
    onCoordinatesChange,
    error
}) => {
    const [searchValue, setSearchValue] = useState(value);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
    const [locationType, setLocationType] = useState<'physical' | 'online'>('physical');
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle location type change
    const handleLocationTypeChange = (type: 'physical' | 'online') => {
        setLocationType(type);
        if (type === 'online') {
            onChange('Online');
            setCoordinates(null);
            onCoordinatesChange?.({ lat: 0, lng: 0 });
        }
    };

    // Get user's current location
    const getCurrentLocation = useCallback(() => {
        if (locationType === 'online') return;

        setIsLoadingLocation(true);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = { lat: latitude, lng: longitude };
                    setUserLocation(newLocation);
                    setCoordinates(newLocation);
                    onChange(`Custom Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
                    onCoordinatesChange?.(newLocation);
                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error('Error getting user location:', error);
                    setIsLoadingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            setIsLoadingLocation(false);
        }
    }, [onChange, locationType, onCoordinatesChange]);

    const onSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => {
        setSearchBox(ref);
    }, []);

    const onPlacesChanged = useCallback(() => {
        if (searchBox && searchBox.getPlaces()) {
            const places = searchBox.getPlaces();
            if (!places || places.length === 0) return;

            const place = places[0];
            if (!place.geometry || !place.geometry.location) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const newCoords = { lat, lng };

            setCoordinates(newCoords);
            onChange(place.formatted_address || '');
            onCoordinatesChange?.(newCoords);
        }
    }, [searchBox, onChange, onCoordinatesChange]);

    const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;

        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const newCoords = { lat, lng };

        setCoordinates(newCoords);
        onChange(`Custom Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        onCoordinatesChange?.(newCoords);
    }, [onChange, onCoordinatesChange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (locationType === 'online') {
            onChange('Online');
            return;
        }

        if (searchValue) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: searchValue }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();
                    const newCoords = { lat, lng };

                    setCoordinates(newCoords);
                    onChange(results[0].formatted_address || searchValue);
                    onCoordinatesChange?.(newCoords);
                }
            });
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="radio"
                            name="locationType"
                            value="physical"
                            checked={locationType === 'physical'}
                            onChange={() => handleLocationTypeChange('physical')}
                            className="form-radio text-blue-500"
                        />
                        <span>Physical Location</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="radio"
                            name="locationType"
                            value="online"
                            checked={locationType === 'online'}
                            onChange={() => handleLocationTypeChange('online')}
                            className="form-radio text-blue-500"
                        />
                        <span>Online</span>
                    </label>
                </div>
            </div>

            {locationType === 'physical' ? (
                <>
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <div className="flex-grow">
                            <form onSubmit={handleSubmit} className="flex">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search for a location"
                                    className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition duration-200 min-w-[80px]"
                                >
                                    Search
                                </button>
                            </form>
                        </div>
                        <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={isLoadingLocation}
                            className={`w-full sm:w-auto min-w-[180px] md:min-w-[220px] text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 ${isLoadingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoadingLocation ? 'Loading...' : 'Use Current Location'}
                        </button>
                    </div>

                    {/* Temporarily disabled Google Maps */}
                    {/* <LoadScript
                        googleMapsApiKey={config.googleMapsApiKey}
                        libraries={['places']}
                    >
                        <GoogleMap
                            mapContainerClassName="w-full h-64 rounded-md border border-gray-300 mb-4"
                            center={coordinates || userLocation || defaultCenter}
                            zoom={15}
                            onClick={onMapClick}
                        >
                            <StandaloneSearchBox
                                onLoad={onSearchBoxLoad}
                                onPlacesChanged={onPlacesChanged}
                            >
                                <input
                                    type="text"
                                    placeholder="Search for a location"
                                    className="hidden"
                                />
                            </StandaloneSearchBox>
                            {coordinates && (
                                <Marker
                                    position={coordinates}
                                    draggable={true}
                                    onDragEnd={(e) => {
                                        if (e.latLng) {
                                            const lat = e.latLng.lat();
                                            const lng = e.latLng.lng();
                                            const newCoords = { lat, lng };
                                            setCoordinates(newCoords);
                                            onChange(`Custom Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
                                            onCoordinatesChange?.(newCoords);
                                        }
                                    }}
                                />
                            )}
                        </GoogleMap>
                    </LoadScript> */}
                </>
            ) : (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-300 mb-4">
                    <p className="text-gray-600">This is an online project</p>
                </div>
            )}

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default LocationSelector; 