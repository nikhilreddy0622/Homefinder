import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Search, Bookmark, Building2, MessageCircle, User, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const debounceTimeoutRef = useRef(null);

  // Fetch unread message count with rate limiting
  const fetchUnreadCount = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const response = await api.get('/chats/unread-count');
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Set up interval to refresh every 30 seconds
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchUnreadCount();
      }
    }, 30000);

    // Listen for custom events to update unread count
    const handleUnreadCountUpdate = () => {
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Debounce the update
      debounceTimeoutRef.current = setTimeout(() => {
        fetchUnreadCount();
      }, 300);
    };

    window.addEventListener('unreadCountUpdated', handleUnreadCountUpdate);

    // Clean up interval and event listeners
    return () => {
      clearInterval(interval);
      window.removeEventListener('unreadCountUpdated', handleUnreadCountUpdate);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Browse Properties', href: '/browse-properties', icon: Search },
    { name: 'My Bookings', href: '/my-bookings', icon: Bookmark, authRequired: true },
    { name: 'My Property Bookings', href: '/my-property-bookings', icon: Building2, authRequired: true },
    { name: 'My Properties', href: '/my-properties', icon: Building2, authRequired: true },
    { name: 'Messages', href: '/chat', icon: MessageCircle, authRequired: true },
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Home className="h-6 w-6 text-primary" />
            <span>Homefinder</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              if (item.authRequired && !isAuthenticated) return null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary relative ${
                    location.pathname === item.href.split('#')[0] ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {user?.name || 'Profile'}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="flex items-center gap-1">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-2 mb-4">
              {navItems.map((item) => {
                if (item.authRequired && !isAuthenticated) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium relative ${
                      location.pathname === item.href.split('#')[0] 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                    {item.name === 'Messages' && unreadCount > 0 && (
                      <span className="absolute top-1 right-2 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Link to="/chat" className="relative" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Messages
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-3 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start flex items-center gap-2"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="default" className="w-full flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;