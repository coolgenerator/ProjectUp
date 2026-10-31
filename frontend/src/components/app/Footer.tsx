import React from 'react';
import { Box, Container, Grid, Typography, Link } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const StyledFooter = styled('footer')(({ theme }) => ({
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: theme.spacing(8, 0),
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
    }
}));

const FooterLink = styled(Link)(() => ({
    color: '#ffffff',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
        color: '#6BC1FF',
        transform: 'translateX(5px)',
    }
}));

const FooterSection = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
}));

const FooterTitle = styled(Typography)(({ theme }) => ({
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: theme.spacing(3),
    color: '#ffffff',
    '&:hover': {
        color: '#6BC1FF',
    }
}));

const ComingSoonItem = styled(Box)(({ theme }) => ({
    color: 'rgba(255,255,255,0.6)',
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    cursor: 'default',
    minWidth: '180px',
    '& .label': {
        marginLeft: theme.spacing(1),
        fontSize: '0.7rem',
        backgroundColor: 'rgba(107, 193, 255, 0.2)',
        color: '#6BC1FF',
        padding: '2px 6px',
        borderRadius: '4px',
        textTransform: 'uppercase',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    }
}));

const Footer: React.FC = () => {
    const { t } = useTranslation();
    
    return (
        <StyledFooter>
            <Container maxWidth="xl" sx={{ width: '100%' }}>
                <Grid container spacing={6} justifyContent="space-between">
                    {/* About Section */}
                    <Grid item xs={12} lg={4}>
                        <FooterSection>
                            <FooterTitle>{t('footer.about.title')}</FooterTitle>
                            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
                                {t('footer.about.description1')}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                {t('footer.about.description2')}
                            </Typography>
                        </FooterSection>
                    </Grid>

                    {/* Middle Columns Container */}
                    <Grid item xs={12} lg={5}>
                        <Grid container spacing={4}>
                            {/* Platform Links */}
                            <Grid item xs={12} sm={6}>
                                <FooterSection>
                                    <FooterTitle>{t('footer.platform.title')}</FooterTitle>
                                    <Box component="ul" sx={{ listStyle: 'none', p: 0 }}>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/home">{t('footer.platform.dailyPost')}</FooterLink>
                                        </Box>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/projects">{t('footer.platform.exploreProjects')}</FooterLink>
                                        </Box>
                                        {/* Hidden for the matching demo
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/research">{t('footer.platform.research')}</FooterLink>
                                        </Box>
                                        */}
                                    </Box>
                                </FooterSection>
                            </Grid>

                            {/* Account Section */}
                            <Grid item xs={12} sm={6}>
                                <FooterSection>
                                    <FooterTitle>{t('footer.account.title')}</FooterTitle>
                                    <Box component="ul" sx={{ listStyle: 'none', p: 0 }}>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/my-profile">{t('footer.account.manageProfile')}</FooterLink>
                                        </Box>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/my-projects">{t('footer.account.manageProjects')}</FooterLink>
                                        </Box>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/my-posts">{t('footer.account.managePosts')}</FooterLink>
                                        </Box>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/saved">{t('footer.account.saved')}</FooterLink>
                                        </Box>
                                        <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="/account">{t('footer.account.accountSettings')}</FooterLink>
                                        </Box>
                                        {/* <Box component="li" sx={{ mb: 1.5 }}>
                                            <FooterLink href="#">Manage Schedules (Coming Soon)</FooterLink>
                                        </Box> */}
                                    </Box>
                                </FooterSection>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Contact Section */}
                    <Grid item xs={12} sm={6} lg={3}>
                        <FooterSection>
                            <FooterTitle>{t('footer.contact.title')}</FooterTitle>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EmailIcon sx={{ color: '#6BC1FF' }} />
                                    <FooterLink href="mailto:support@projectup.me">support@projectup.me</FooterLink>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PhoneIcon sx={{ color: '#6BC1FF' }} />
                                    <FooterLink href="tel:+16266670960">+1 626 667 0960</FooterLink>
                                </Box>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.8)' }}>
                                        {t('footer.contact.feedbackMessage')}
                                    </Typography>
                                    <Box
                                        component="a"
                                        href="https://discord.gg/6G2dMzyQ4P"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            backgroundColor: '#5865F2',
                                            color: '#ffffff',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            textDecoration: 'none',
                                            transition: 'background-color 0.2s',
                                            '&:hover': {
                                                backgroundColor: '#4752C4',
                                            }
                                        }}
                                    >
                                        <img
                                            src="/logo/discord-logo.svg"
                                            alt="Discord Logo"
                                            style={{ width: '20px', height: '20px' }}
                                        />
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {t('footer.contact.joinDiscord')}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </FooterSection>
                    </Grid>
                </Grid>

                {/* Footer Bottom */}
                <Box sx={{
                    mt: 8,
                    pt: 4,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 2 }}>
                        <FooterLink href="/terms">{t('footer.legal.termsOfService')}</FooterLink>
                        <FooterLink href="/privacy">{t('footer.legal.privacyPolicy')}</FooterLink>
                        <FooterLink href="/cookies">{t('footer.legal.cookiePolicy')}</FooterLink>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        &copy; {new Date().getFullYear()} Project Up. {t('footer.legal.allRightsReserved')}
                    </Typography>
                </Box>
            </Container>
        </StyledFooter>
    );
};

export default Footer;
