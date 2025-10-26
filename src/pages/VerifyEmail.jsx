import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get email from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setStep('otp'); // Skip email entry if email is provided
    }
  }, [location]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Request OTP for email verification
      await api.post('/auth/verify-email-otp', { email });
      setStep('otp');
    } catch (err) {
      console.error('Error requesting OTP:', err);
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (err.response?.data?.error?.includes('already verified')) {
          setError('Email is already verified. You can now log in.');
          // Optionally redirect to login page
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        } else if (err.response?.data?.error?.includes('Invalid email')) {
          setError('No account found with this email. Please check the email address or register first.');
        } else {
          setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify OTP
      const response = await api.post('/auth/verify-email-otp', { email, otp });
      
      // Store token and login user
      localStorage.setItem('token', response.data.token);
      
      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      // Send request with email but without OTP to trigger resend
      await api.post('/auth/verify-email-otp', { email });
      setError('OTP sent successfully!');
    } catch (err) {
      console.error('Error resending OTP:', err);
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (err.response?.data?.error?.includes('already verified')) {
          setError('Email is already verified. You can now log in.');
        } else if (err.response?.data?.error?.includes('Invalid email')) {
          setError('No account found with this email. Please check the email address.');
        } else {
          setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Email Verified Successfully!</CardTitle>
            <CardDescription>
              Your email has been verified and you are now logged in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="text-5xl text-green-500">✓</div>
              <p>Redirecting to your dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Enter your email to receive verification OTP'
              : 'Enter the OTP sent to your email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  OTP sent to {email}
                </p>
              </div>
              
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={resendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setStep('email')}
                  disabled={loading}
                >
                  Change Email
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;