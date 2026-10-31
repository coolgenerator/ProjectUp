import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const Cookies: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Cookie Policy
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Last updated: {new Date().toLocaleDateString()}
                </Typography>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        1. What Are Cookies
                    </Typography>
                    <Typography paragraph>
                        Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        2. Types of Cookies We Use
                    </Typography>
                    <Typography paragraph>
                        We use the following types of cookies:
                    </Typography>
                    <ul>
                        <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
                        <li><strong>Authentication Cookies:</strong> Keep you logged in</li>
                        <li><strong>Preference Cookies:</strong> Remember your settings</li>
                        <li><strong>Analytics Cookies:</strong> Help us understand how you use our site</li>
                        <li><strong>Marketing Cookies:</strong> Track your online activity for targeted advertising</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        3. How We Use Cookies
                    </Typography>
                    <Typography paragraph>
                        We use cookies to:
                    </Typography>
                    <ul>
                        <li>Maintain your session and keep you logged in</li>
                        <li>Remember your preferences and settings</li>
                        <li>Analyze how you use our platform</li>
                        <li>Improve our services and user experience</li>
                        <li>Provide personalized content and recommendations</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        4. Third-Party Cookies
                    </Typography>
                    <Typography paragraph>
                        We may use cookies from third-party services such as:
                    </Typography>
                    <ul>
                        <li>Google Analytics for website analytics</li>
                        <li>Social media platforms for sharing features</li>
                        <li>Payment processors for transactions</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        5. Managing Cookies
                    </Typography>
                    <Typography paragraph>
                        You can control cookies through your browser settings:
                    </Typography>
                    <ul>
                        <li>Block all cookies</li>
                        <li>Delete existing cookies</li>
                        <li>Set preferences for different types of cookies</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        6. Impact of Disabling Cookies
                    </Typography>
                    <Typography paragraph>
                        Disabling certain cookies may affect:
                    </Typography>
                    <ul>
                        <li>Your ability to log in</li>
                        <li>Site functionality</li>
                        <li>Personalization features</li>
                        <li>Analytics and performance</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        7. Updates to Cookie Policy
                    </Typography>
                    <Typography paragraph>
                        We may update this cookie policy as our practices change. We will notify you of any significant changes.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        8. Contact Us
                    </Typography>
                    <Typography paragraph>
                        For questions about our cookie policy, please contact us at support@projectup.me
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default Cookies; 