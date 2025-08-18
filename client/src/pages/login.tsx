import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAdmin, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && isAdmin) {
      window.location.href = '/admin';
    } else if (user) {
      window.location.href = '/';
    }
  }, [user, isAdmin]);
  
  const [loginType, setLoginType] = useState<'guest' | 'admin'>('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginResult = await login(email, password);
      toast({
        title: "Login Successful",
        description: `Welcome ${loginResult?.role === 'admin' ? 'Admin' : 'Guest'}!`,
      });
      
      // Force redirect based on user role
      setTimeout(() => {
        if (loginResult?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="page-login">
      <Card className="w-full max-w-md" data-testid="card-login">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 logo-gradient rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-xl">P</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">PALANIAPPA JEWELLERS</h1>
              <p className="text-xs text-gray-500">Since 2025</p>
            </div>
          </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <p className="text-gray-600">Choose your account type</p>
        </CardHeader>
        
        <CardContent>
          {/* Login Type Selector */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  loginType === 'guest' 
                    ? 'bg-white shadow-sm text-black' 
                    : 'text-gray-600 hover:text-black'
                }`}
                onClick={() => setLoginType('guest')}
                data-testid="button-guest-login"
              >
                Guest User
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  loginType === 'admin' 
                    ? 'bg-white shadow-sm text-black' 
                    : 'text-gray-600 hover:text-black'
                }`}
                onClick={() => setLoginType('admin')}
                data-testid="button-admin-login"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Admin Credentials Hint */}
          {loginType === 'admin' && (
            <Alert className="mb-4" data-testid="alert-admin-credentials">
              <AlertDescription>
                <p className="text-sm">
                  <strong>Admin Credentials:</strong><br />
                  Email: jewelerypalaniappa@gmail.com<br />
                  Password: P@lani@ppA@321
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4" data-testid="form-login">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
                data-testid="button-submit-login"
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setLocation('/')}
                data-testid="button-cancel-login"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
