/**
 * D2Com Survey — Login Page
 * Google OAuth login with @react-oauth/google.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError('Google không trả về token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await authApi.loginGoogle(response.credential);
      login(data.access_token, data.user);
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login thất bại. Thử lại sau.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4 animate-fadeIn">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-white text-2xl font-bold">D2</span>
            </div>
            <h1 className="text-2xl font-bold text-white">D2Com Survey</h1>
            <p className="text-sm text-blue-200/60 mt-1">Hệ thống khảo sát ADG</p>
          </div>

          {/* Google login button */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-white" size={24} />
              <span className="ml-2 text-white text-sm">Đang đăng nhập...</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_blue"
                size="large"
                width="360"
                text="signin_with"
                shape="pill"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {/* Security note */}
          <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Shield size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-200/70 leading-relaxed">
              Chỉ tài khoản được admin cấp quyền mới đăng nhập được.
              Liên hệ quản trị viên nếu chưa có quyền truy cập.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
