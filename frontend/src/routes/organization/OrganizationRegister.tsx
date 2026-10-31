import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Stepper,
    Step,
    StepLabel,
    Alert,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    CircularProgress
} from '@mui/material';
import {
    Business,
    Email,
    Phone,
    LocationOn,
    Person,
    Lock,
    CheckCircle
} from '@mui/icons-material';
import config from '../../config';

const { API_BASE_URL } = config;

const steps = ['Organization Info', 'Contact Details', 'Create Account'];

interface OrganizationData {
    organizationName: string;
    organizationType: string;
    organizationSize: string;
    website: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone: string;
    adminTitle: string;
    username: string;
    password: string;
    confirmPassword: string;
}

const OrganizationRegister: React.FC = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<OrganizationData>({
        organizationName: '',
        organizationType: '',
        organizationSize: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPhone: '',
        adminTitle: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (field: keyof OrganizationData) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
    ) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0:
                return !!(
                    formData.organizationName &&
                    formData.organizationType &&
                    formData.organizationSize
                );
            case 1:
                return !!(
                    formData.adminFirstName &&
                    formData.adminLastName &&
                    formData.adminEmail &&
                    formData.adminTitle
                );
            case 2:
                return !!(
                    formData.username &&
                    formData.password &&
                    formData.password === formData.confirmPassword &&
                    formData.password.length >= 8
                );
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setError(null);
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        } else {
            setError('Please fill in all required fields');
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            // TODO: Implement actual API call
            const response = await fetch(`${API_BASE_URL}/api/organization/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Success - redirect to login with success message
            navigate('/login?organization=registered');
        } catch (err: any) {
            setError('Organization registration is coming soon. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Organization Name"
                                value={formData.organizationName}
                                onChange={handleChange('organizationName')}
                                InputProps={{
                                    startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Organization Type</InputLabel>
                                <Select
                                    value={formData.organizationType}
                                    onChange={handleChange('organizationType')}
                                    label="Organization Type"
                                >
                                    <MenuItem value="university">University/College</MenuItem>
                                    <MenuItem value="highschool">High School</MenuItem>
                                    <MenuItem value="company">Company</MenuItem>
                                    <MenuItem value="nonprofit">Non-Profit</MenuItem>
                                    <MenuItem value="government">Government</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Organization Size</InputLabel>
                                <Select
                                    value={formData.organizationSize}
                                    onChange={handleChange('organizationSize')}
                                    label="Organization Size"
                                >
                                    <MenuItem value="1-50">1-50 members</MenuItem>
                                    <MenuItem value="51-200">51-200 members</MenuItem>
                                    <MenuItem value="201-500">201-500 members</MenuItem>
                                    <MenuItem value="501-1000">501-1000 members</MenuItem>
                                    <MenuItem value="1000+">1000+ members</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Website (Optional)"
                                value={formData.website}
                                onChange={handleChange('website')}
                                placeholder="https://www.example.edu"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                value={formData.address}
                                onChange={handleChange('address')}
                                InputProps={{
                                    startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="City"
                                value={formData.city}
                                onChange={handleChange('city')}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="State/Province"
                                value={formData.state}
                                onChange={handleChange('state')}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="ZIP/Postal Code"
                                value={formData.zipCode}
                                onChange={handleChange('zipCode')}
                            />
                        </Grid>
                    </Grid>
                );

            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Please provide details for the primary administrator
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                required
                                fullWidth
                                label="First Name"
                                value={formData.adminFirstName}
                                onChange={handleChange('adminFirstName')}
                                InputProps={{
                                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                required
                                fullWidth
                                label="Last Name"
                                value={formData.adminLastName}
                                onChange={handleChange('adminLastName')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Email Address"
                                type="email"
                                value={formData.adminEmail}
                                onChange={handleChange('adminEmail')}
                                InputProps={{
                                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                                }}
                                helperText="This will be the primary contact email"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                value={formData.adminPhone}
                                onChange={handleChange('adminPhone')}
                                InputProps={{
                                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                required
                                fullWidth
                                label="Job Title"
                                value={formData.adminTitle}
                                onChange={handleChange('adminTitle')}
                                placeholder="e.g., Director, Principal, Manager"
                            />
                        </Grid>
                    </Grid>
                );

            case 2:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Create your organization's login credentials
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Organization Username"
                                value={formData.username}
                                onChange={handleChange('username')}
                                helperText="This will be your organization's login ID"
                                InputProps={{
                                    startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange('password')}
                                InputProps={{
                                    startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
                                }}
                                helperText="Must be at least 8 characters"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Confirm Password"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange('confirmPassword')}
                                error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                                helperText={
                                    formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                                        ? "Passwords don't match"
                                        : ''
                                }
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Alert severity="info">
                                Once registered, you'll receive an organization code that your members can use to join.
                            </Alert>
                        </Grid>
                    </Grid>
                );

            default:
                return null;
        }
    };

    return (
        <Container component="main" maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography component="h1" variant="h4" align="center" gutterBottom>
                        Register Your Organization
                    </Typography>
                    <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                        Join ProjectUp to manage your organization's projects and collaborations
                    </Typography>

                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {activeStep === steps.length ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom>
                                Registration Complete!
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Redirecting to login page...
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {renderStepContent(activeStep)}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                                <Button
                                    disabled={activeStep === 0}
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                                    disabled={loading}
                                    startIcon={loading && <CircularProgress size={20} />}
                                >
                                    {activeStep === steps.length - 1 ? 'Complete Registration' : 'Next'}
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default OrganizationRegister;