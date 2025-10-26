import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Phone, 
  Edit2, 
  Save, 
  X,
  AlertCircle,
  Lock
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.put('/auth/updatedetails', formData);
      
      // Update user in context with the new data
      if (response.data.success && response.data.data) {
        // Update the user object in the context
        const updatedUser = response.data.data;
        // We need to trigger a re-fetch of user data
        window.location.reload(); // Simple solution - refresh the page
      }
      
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    setLoading(true);
    setPasswordError('');
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      await api.put('/auth/updatepassword', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      alert('Password updated successfully!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Name</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">{user.name}</h2>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      {user.bio && (
                        <p className="mt-2 text-muted-foreground">{user.bio}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Password Change Section */}
              {!isEditing && (
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Password & Security
                  </h3>
                  
                  {isChangingPassword ? (
                    <div className="space-y-4">
                      {passwordError && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {passwordError}
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Current Password</label>
                        <PasswordInput
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter current password"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">New Password</label>
                        <PasswordInput
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                        <PasswordInput
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          placeholder="Confirm new password"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                            setPasswordError('');
                          }}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          onClick={handlePasswordSave}
                          disabled={loading}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Last updated: Never</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsChangingPassword(true)}
                        className="gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user.name,
                          email: user.email,
                          bio: user.bio || ''
                        });
                      }}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;