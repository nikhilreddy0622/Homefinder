import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'

// Import pages
import Home from './pages/Home'
import Properties from './pages/Properties'
import PropertyDetails from './pages/PropertyDetails'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PostProperty from './pages/PostProperty'
import EditProperty from './pages/EditProperty'
import Booking from './pages/Booking'
import Chat from './pages/Chat'
import NotFound from './pages/NotFound'
import MyProperties from './pages/MyProperties'
import MyBookings from './pages/MyBookings'
import MyPropertyBookings from './pages/MyPropertyBookings'
import BrowseProperties from './pages/BrowseProperties'
// Removed Messages import since we're consolidating to /chat
import VerifyEmail from './pages/VerifyEmail'
import Profile from './pages/Profile'
import CreateBooking from './pages/CreateBooking'
import ForgotPassword from './pages/ForgotPassword'
// Removed ResetPassword import

// Import context
import { AuthProvider } from './contexts/AuthContext'

// Import components
import { ProtectedRoute, Header } from './components'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/browse-properties" element={<BrowseProperties />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/properties/:id/book" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Removed ResetPassword route */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/my-properties" element={<ProtectedRoute><MyProperties /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/my-property-bookings" element={<ProtectedRoute><MyPropertyBookings /></ProtectedRoute>} />
          <Route path="/post-property" element={<ProtectedRoute><PostProperty /></ProtectedRoute>} />
          <Route path="/edit-property/:id" element={<ProtectedRoute><EditProperty /></ProtectedRoute>} />
          <Route path="/booking/:id" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          {/* Removed /messages route since we're consolidating to /chat */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App