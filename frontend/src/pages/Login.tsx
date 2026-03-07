// Login page stub
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { login, register } from '@/api/auth';
import { useState } from 'react';

export function Login() {
  const { setTokens } = useAuthStore();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    
    try {
      if (isLogin) {
        const data = await login(email, password);
        setTokens(data.access_token, data.refresh_token);
        navigate('/');
      } else {
        const username = form.get('username') as string;
        await register(email, username, password);
        // After successful registration, log them in automatically
        const data = await login(email, password);
        setTokens(data.access_token, data.refresh_token);
        navigate('/');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">{isLogin ? 'Login' : 'Sign Up'}</h1>
        
        {!isLogin && (
          <input name="username" type="text" placeholder="Username" className="border p-2 rounded" required />
        )}
        
        <input name="email" type="email" placeholder="Email" className="border p-2 rounded" required />
        <input name="password" type="password" placeholder="Password" className="border p-2 rounded" required />
        
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
        
        <button 
          type="button" 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-sm text-blue-500 hover:text-blue-700 mt-2"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </form>
    </div>
  );
}
