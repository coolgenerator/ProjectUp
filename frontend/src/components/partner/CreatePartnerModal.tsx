import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel } from "@mui/material";

const availableTopics = ["Classmates", "Sports", "Music", "Outdoor", "Gaming", "Others"];
const timePreferences = ["Morning", "Afternoon", "Evening", "Anytime"];
const expirationOptions = [7, 30, 90];

const FindBuddyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [title, setTitle] = useState("");
    const [topic, setTopic] = useState("");
    const [customTopic, setCustomTopic] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [specificDate, setSpecificDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("");
    const [useSpecificDate, setUseSpecificDate] = useState(false);
    const [spotAlwaysAvailable, setSpotAlwaysAvailable] = useState(false);
    const [spotAvailability, setSpotAvailability] = useState<number | "">("");
    const [expirationPeriod, setExpirationPeriod] = useState<number | "">("");

    const handleSave = () => {
        const eventData = {
            title,
            topic: topic === "Others" ? customTopic : topic,
            description,
            location,
            date: useSpecificDate ? specificDate : preferredTime,
            spotAvailability: spotAlwaysAvailable ? "Always" : spotAvailability,
            expirationPeriod,
        };
        console.log("Event Created:", eventData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Find Your Buddy</DialogTitle>
            <DialogContent>
                <TextField fullWidth margin="dense" label="Title" variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} />
                <FormControl fullWidth margin="dense">
                    <InputLabel>Topic</InputLabel>
                    <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                        {availableTopics.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {topic === "Others" && (
                    <TextField fullWidth margin="dense" label="Custom Topic" variant="outlined" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} />
                )}
                <TextField fullWidth margin="dense" label="Description" variant="outlined" multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                <FormControlLabel control={<Checkbox checked={useSpecificDate} onChange={(e) => setUseSpecificDate(e.target.checked)} />} label="Use Exact Date & Time" />
                {useSpecificDate ? (
                    <TextField fullWidth margin="dense" label="Exact Date & Time" type="datetime-local" InputLabelProps={{ shrink: true }} value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
                ) : (
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Preferred Time</InputLabel>
                        <Select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                            <MenuItem value="">None</MenuItem>
                            {timePreferences.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                <TextField fullWidth margin="dense" label="Location" variant="outlined" value={location} onChange={(e) => setLocation(e.target.value)} />
                <FormControlLabel control={<Checkbox checked={spotAlwaysAvailable} onChange={(e) => setSpotAlwaysAvailable(e.target.checked)} />} label="Always Available" />
                {!spotAlwaysAvailable && (
                    <TextField fullWidth margin="dense" label="Spots Available" type="number" value={spotAvailability} onChange={(e) => setSpotAvailability(e.target.value === "" || Number(e.target.value) < 0 ? "" : Number(e.target.value))} />
                )}
                <FormControl fullWidth margin="dense">
                    <InputLabel>Post Expiration Period (Days)</InputLabel>
                    <Select value={expirationPeriod} onChange={(e) => setExpirationPeriod(Number(e.target.value))}>
                        {expirationOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option} Days</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Cancel</Button>
                <Button variant="contained" color="primary" onClick={handleSave}>Create</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FindBuddyModal;
