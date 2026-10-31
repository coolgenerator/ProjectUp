import React from "react";
import { Card, CardContent, CardActions, Typography, Button, Chip, Stack } from "@mui/material";

interface PartnerPostProps {
    partner: {
        title: string;
        topic: string;
        description: string;
        location: string;
        date?: string;
        preferredTime?: string;
        spotAvailability: number | "Always";
        expirationPeriod: number;
    };
}

const PartnerPostCard: React.FC<PartnerPostProps> = ({ partner }) => {
    return (
        <Card variant="outlined" className="shadow-md rounded-lg">
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {partner.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {partner.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    <strong>Topic:</strong> {partner.topic}
                </Typography>
                {partner.date ? (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Date:</strong> {partner.date}
                    </Typography>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Preferred Time:</strong> {partner.preferredTime || "Anytime"}
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Location:</strong> {partner.location}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    <strong>Spots Available:</strong> {partner.spotAvailability === "Always" ? "Always Available" : partner.spotAvailability}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Expires In:</strong> {partner.expirationPeriod} Days
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Chip label={partner.topic} variant="outlined" />
                </Stack>
            </CardContent>
            <CardActions>
                <Button size="small" variant="contained" color="primary">
                    Join
                </Button>
                <Button size="small" variant="outlined" color="secondary">
                    Details
                </Button>
            </CardActions>
        </Card>
    );
};

export default PartnerPostCard;
