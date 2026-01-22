import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, GoogleAuthProvider, signInWithPopup } from '../services/firebase';
import { Button } from '../components/ui/Button';

export default function LoginView() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!auth) {
      setError("Firebase not initialized.");
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">
          P
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-500 mb-8">Sign in to save your schedule and rewards.</p>
        
        <div className="space-y-4">
          <Button onClick={handleLogin} isLoading={isLoading} className="w-full py-3 text-lg">
            Sign in with Google
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}