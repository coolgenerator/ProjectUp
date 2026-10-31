import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const Privacy: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Privacy Policy
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Last updated: {new Date().toLocaleDateString()}
                </Typography>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        1. Information We Collect
                    </Typography>
                    <Typography paragraph>
                        We collect information that you provide directly to us, including:
                    </Typography>
                    <ul>
                        <li>Account information (name, email, password)</li>
                        <li>Profile information (skills, interests, bio)</li>
                        <li>Project-related information</li>
                        <li>Communication preferences</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        2. How We Use Your Information
                    </Typography>
                    <Typography paragraph>
                        We use the collected information to:
                    </Typography>
                    <ul>
                        <li>Provide and maintain our services</li>
                        <li>Match you with relevant projects and collaborators</li>
                        <li>Send you important updates and notifications</li>
                        <li>Improve our platform and user experience</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        3. Information Sharing
                    </Typography>
                    <Typography paragraph>
                        We may share your information with:
                    </Typography>
                    <ul>
                        <li>Project collaborators (with your consent)</li>
                        <li>Service providers who assist our operations</li>
                        <li>Law enforcement when required by law</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        4. Data Security
                    </Typography>
                    <Typography paragraph>
                        We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        5. Your Rights
                    </Typography>
                    <Typography paragraph>
                        You have the right to:
                    </Typography>
                    <ul>
                        <li>Access your personal information</li>
                        <li>Correct inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Opt-out of marketing communications</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        6. Cookies and Tracking
                    </Typography>
                    <Typography paragraph>
                        We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        7. Children's Privacy
                    </Typography>
                    <Typography paragraph>
                        Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        8. Changes to Privacy Policy
                    </Typography>
                    <Typography paragraph>
                        We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        9. Contact Us
                    </Typography>
                    <Typography paragraph>
                        For any questions about our privacy policy or data practices, please contact us at support@projectup.me
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default Privacy; 