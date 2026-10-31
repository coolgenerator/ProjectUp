import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const Terms: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Terms of Service
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Last updated: {new Date().toLocaleDateString()}
                </Typography>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        1. Acceptance of Terms
                    </Typography>
                    <Typography paragraph>
                        By accessing and using ProjectUp, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our platform.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        2. User Accounts
                    </Typography>
                    <Typography paragraph>
                        You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        3. User Conduct
                    </Typography>
                    <Typography paragraph>
                        Users must:
                    </Typography>
                    <ul>
                        <li>Provide accurate and complete information</li>
                        <li>Respect other users' rights and privacy</li>
                        <li>Not engage in any harmful or malicious activities</li>
                        <li>Not violate any applicable laws or regulations</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        4. Project Collaboration
                    </Typography>
                    <Typography paragraph>
                        ProjectUp facilitates collaboration between users. Users are responsible for:
                    </Typography>
                    <ul>
                        <li>Setting clear project goals and expectations</li>
                        <li>Communicating effectively with team members</li>
                        <li>Respecting intellectual property rights</li>
                        <li>Maintaining professional conduct</li>
                    </ul>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        5. Intellectual Property
                    </Typography>
                    <Typography paragraph>
                        Users retain ownership of their content. By posting content on ProjectUp, you grant us a license to use, display, and distribute your content within the platform.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        6. Termination
                    </Typography>
                    <Typography paragraph>
                        We reserve the right to terminate or suspend accounts that violate these terms or engage in harmful behavior.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        7. Disclaimer
                    </Typography>
                    <Typography paragraph>
                        ProjectUp is provided "as is" without warranties of any kind. We are not responsible for any damages arising from your use of the platform.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        8. Changes to Terms
                    </Typography>
                    <Typography paragraph>
                        We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        9. Contact Us
                    </Typography>
                    <Typography paragraph>
                        If you have any questions about these Terms, please contact us at support@projectup.me
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default Terms; 