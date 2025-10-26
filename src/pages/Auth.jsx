import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from '@/hooks/useForm';
import { validateEmail, validatePassword, validateName } from '@/utils/validation';
import api from '@/services/api';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  
  // Check for tab parameter in URL
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  
  const isLoginMode = tab !== 'register';
  
  const validationRules = {};
  
  // Add common validation rules
  validationRules.email = (value) => validateEmail(value) ? null : 'Please enter a valid email address';
  validationRules.password = (value) => validatePassword(value) ? null : 'Password must be at least 6 characters';
  
  // Add registration-specific validation rules
  if (!isLoginMode) {
    validationRules.name = (value) => validateName(value) ? null : 'Name must be at least 2 characters';
    validationRules.confirmPassword = (value, formValues) => {
      if (!value) return 'Please confirm your password';
      if (value !== formValues.password) return 'Passwords do not match';
      return null;
    };
  }
  
  const {
    values: formData,
    errors,
    handleChange,
    handleBlur,
    validateForm,
    resetForm
  } = useForm({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  }, validationRules);
  
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous API errors
    setApiError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isLoginMode) {
        const response = await login(formData.email, formData.password);
        // Check if user needs to verify email
        if (!response.user.isEmailVerified) {
          // Redirect to verification page
          navigate('/verify-email');
          return;
        }
        navigate('/dashboard');
      } else {
        await register(formData.name, formData.email, formData.password, 'tenant');
        // Show success message and redirect to verification page
        alert('Registration successful! Please verify your email to complete the registration.');
        // Navigate to verification page with email parameter
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (error) {
      console.error('Auth error:', error);
      // Show a more user-friendly error message
      let errorMessage = 'An error occurred. Please try again.';
      
      // Handle different types of errors
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Special handling for validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        errorMessage = Object.values(validationErrors).join(', ');
      }
      
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    resetForm();
    setApiError('');
    // Navigate to appropriate tab
    navigate(isLoginMode ? '/auth?tab=register' : '/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLoginMode 
              ? 'Sign in to your account to continue' 
              : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <Input
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
              </div>
            )}
            
            <div>
              <Input
                name="email"
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <PasswordInput
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>
            
            {!isLoginMode && (
              <div>
                <PasswordInput
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}
            
            {apiError && <p className="text-destructive text-sm mt-1">{apiError}</p>}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            {isLoginMode && (
              <p className="text-sm text-muted-foreground mb-2">
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </Button>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <Button 
                variant="link" 
                className="p-0 h-auto font-semibold"
                onClick={switchMode}
              >
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;