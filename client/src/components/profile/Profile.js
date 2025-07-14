import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Person, 
  Settings, 
  Save, 
  Edit, 
  Camera,
  Email,
  Phone,
  LocationOn,
  Security,
  Visibility,
  VisibilityOff,
  ArrowBack
} from '@mui/icons-material';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Divider
} from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    virtualPhoneNumber: '',
    bio: '',
    location: '',
    avatar: null
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/profile');
      setProfile(response.data.user);
      setFormData({
        firstName: response.data.user.firstName || '',
        lastName: response.data.user.lastName || '',
        email: response.data.user.email || '',
        phoneNumber: response.data.user.phoneNumber || '',
        virtualPhoneNumber: response.data.user.virtualPhoneNumber || '',
        bio: response.data.user.bio || '',
        location: response.data.user.location || '',
        avatar: null
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        avatar: file
      }));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Send as JSON instead of FormData
      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber
      };

      console.log('Sending profile data:', profileData);

      const response = await axios.put('/api/users/profile', profileData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile update response:', response.data);

      updateUser(response.data.user);
      setProfile(response.data.user);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await axios.put('/api/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVirtualNumber = async () => {
    try {
      setSaving(true);
      const response = await axios.post('/api/users/virtual-number');
      
      if (response.data.virtualNumber) {
        setFormData(prev => ({
          ...prev,
          virtualPhoneNumber: response.data.virtualNumber
        }));
        toast.success('Virtual number assigned successfully!');
        fetchProfile(); // Refresh profile data
      }
    } catch (error) {
      console.error('Error assigning virtual number:', error);
      toast.error('Failed to assign virtual number');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Profile Settings
          </Typography>
          <IconButton color="inherit">
            <Settings />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Grid container spacing={3}>
          {/* Profile Picture */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    src={profile?.avatar}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      mx: 'auto',
                      bgcolor: 'primary.main'
                    }}
                  >
                    {profile?.firstName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <Camera />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </IconButton>
                </Box>
                <Typography variant="h5" gutterBottom>
                  {profile?.firstName} {profile?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  @{profile?.username}
                </Typography>
                {profile?.bio && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {profile.bio}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Profile Forms */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 3 }}
                >
                  <Tab label="Profile Information" />
                  <Tab label="Security" />
                </Tabs>

                {activeTab === 0 && (
                  <Box component="form" onSubmit={handleProfileUpdate}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          InputProps={{
                            startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Personal Phone"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Your personal phone number"
                          InputProps={{
                            startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="SMS Phone (Virtual)"
                          name="virtualPhoneNumber"
                          value={formData.virtualPhoneNumber}
                          disabled
                          helperText="Your assigned Twilio number for sending SMS messages"
                          InputProps={{
                            startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                        {!formData.virtualPhoneNumber && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleAssignVirtualNumber}
                            sx={{ mt: 1 }}
                          >
                            Assign Twilio Number
                          </Button>
                        )}
                        {formData.virtualPhoneNumber && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            This is your assigned Twilio number for SMS messaging
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          InputProps={{
                            startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          multiline
                          rows={4}
                          placeholder="Tell us about yourself..."
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={saving}
                          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                          sx={{ mt: 2 }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box component="form" onSubmit={handlePasswordUpdate}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Current Password"
                          name="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                          InputProps={{
                            startAdornment: <Security sx={{ mr: 1, color: 'text.secondary' }} />,
                            endAdornment: (
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="New Password"
                          name="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                          InputProps={{
                            startAdornment: <Security sx={{ mr: 1, color: 'text.secondary' }} />,
                            endAdornment: (
                              <IconButton
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                edge="end"
                              >
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Confirm New Password"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          InputProps={{
                            startAdornment: <Security sx={{ mr: 1, color: 'text.secondary' }} />,
                            endAdornment: (
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={saving}
                          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                          sx={{ mt: 2 }}
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Profile; 