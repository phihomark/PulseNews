import React, { useState } from 'react';
import {
  Mail,
  Key,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  LogIn,
  KeyRound
} from 'lucide-react';
import { AdminUser } from '../types';
import { getSupabaseClient } from '../services/supabaseService';
import { syncAuthenticatedGmailUser } from '../services/userService';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

type AuthMode = 'login' | 'register' | 'verify_otp' | 'magic_otp';

export const AdminLogin: React.FC<AdminLoginProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpType, setOtpType] = useState<'signup' | 'email'>('signup');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchMode = (nextMode: AuthMode) => {
    resetMessages();
    setMode(nextMode);
  };

  /**
   * Finalizes login after Supabase Auth verification & syncs with managed_users RBAC
   */
  const finalizeGmailSession = async (authUser: {
    id: string;
    email: string;
    displayName?: string;
    avatar?: string;
  }) => {
    const { user: managedUser, isSuspended } = await syncAuthenticatedGmailUser(authUser);

    if (isSuspended) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setErrorMsg(
        'Tài khoản Gmail của bạn hiện đang bị tạm khóa (Suspended). Vui lòng liên hệ Quản trị viên (Super Admin) để được cấp quyền.'
      );
      return;
    }

    const adminUser: AdminUser = {
      id: managedUser.id,
      username: managedUser.username,
      displayName: managedUser.displayName,
      email: managedUser.email,
      avatar: managedUser.avatar,
      role: managedUser.role,
      status: managedUser.status,
      permissions: managedUser.permissions
    };

    localStorage.setItem('tintuc_admin_session', JSON.stringify(adminUser));
    onLoginSuccess(adminUser);
  };

  /**
   * 1. Sign in with Gmail & Password via Supabase Auth
   */
  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setOtpType('signup');
            setMode('verify_otp');
            setSuccessMsg(
              'Tài khoản Gmail này chưa hoàn tất xác thực. Vui lòng nhập mã xác thực trong Gmail hoặc bấm Gửi lại mã.'
            );
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMsg(
              'Email hoặc mật khẩu không chính xác. Nếu bạn chưa có tài khoản, vui lòng chuyển sang tab "Đăng ký Gmail".'
            );
          } else {
            setErrorMsg(`Lỗi xác thực: ${error.message}`);
          }
          return;
        }

        if (data.user) {
          await finalizeGmailSession({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            displayName:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              cleanEmail.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url
          });
        }
      } else {
        // Fallback when Supabase URL/Key is not yet configured in local environment
        await finalizeGmailSession({
          id: `gmail-${Date.now()}`,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0]
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đã xảy ra lỗi kết nối khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Register new account with Gmail & Password via Supabase Auth
   */
  const handleGmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị của bạn.');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng sử dụng địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: {
              full_name: cleanName
            }
          }
        });

        if (error) {
          setErrorMsg(`Đăng ký không thành công: ${error.message}`);
          return;
        }

        // Check if Supabase auto-logged in (Email Confirmation disabled in Supabase)
        if (data.session && data.user) {
          await finalizeGmailSession({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            displayName: cleanName,
            avatar: data.user.user_metadata?.avatar_url
          });
          return;
        }

        // Email Confirmation enabled in Supabase -> Prompt user to verify via Gmail OTP or Link
        setOtpType('signup');
        setMode('verify_otp');
        setSuccessMsg(
          `Đã gửi email xác thực tới ${cleanEmail}! Vui lòng kiểm tra hộp thư Gmail (hoặc mục Spam) để lấy mã OTP hoặc nhấp vào link xác nhận.`
        );
      } else {
        // Fallback when Supabase is not yet connected locally
        await finalizeGmailSession({
          id: `gmail-${Date.now()}`,
          email: cleanEmail,
          displayName: cleanName
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể đăng ký tài khoản vào lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 3. Send Passwordless OTP / Magic Link to Gmail
   */
  const handleSendGmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail của bạn.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErrorMsg('Cần kết nối Supabase để gửi mã xác thực OTP qua Gmail.');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) {
        setErrorMsg(`Không thể gửi mã xác thực: ${error.message}`);
        return;
      }

      setOtpType('email');
      setMode('verify_otp');
      setSuccessMsg(
        `Đã gửi mã xác thực & link đăng nhập tới ${cleanEmail}. Vui lòng kiểm tra hộp thư Gmail của bạn!`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi gửi mã xác thực Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 4. Verify 6-digit OTP code from Gmail
   */
  const handleVerifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!cleanToken) {
      setErrorMsg('Vui lòng nhập mã xác thực OTP từ hộp thư Gmail.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErrorMsg('Chưa kết nối Supabase.');
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: otpType
      });

      if (error) {
        setErrorMsg(`Mã xác thực không hợp lệ hoặc đã hết hạn: ${error.message}`);
        return;
      }

      if (data.user) {
        await finalizeGmailSession({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          displayName:
            displayName.trim() ||
            data.user.user_metadata?.full_name ||
            cleanEmail.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Xác thực OTP thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 5. Resend verification email to Gmail
   */
  const handleResendConfirmation = async () => {
    resetMessages();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      if (otpType === 'signup') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });
        if (error) {
          setErrorMsg(`Không thể gửi lại mã: ${error.message}`);
        } else {
          setSuccessMsg(`Đã gửi lại email xác thực tới ${cleanEmail}!`);
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });
        if (error) {
          setErrorMsg(`Không thể gửi lại mã: ${error.message}`);
        } else {
          setSuccessMsg(`Đã gửi lại mã OTP đăng nhập tới ${cleanEmail}!`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 6. 1-Click Google OAuth Sign-In via Supabase
   */
  const handleGoogleOAuthSignIn = async () => {
    resetMessages();
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErrorMsg('Vui lòng cấu hình kết nối Supabase trước khi dùng Google OAuth.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) {
        setErrorMsg(`Lỗi kết nối Google OAuth: ${error.message}`);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể khởi tạo đăng nhập Google.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto font-sans">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center transition"
          >
            ✕
          </button>

          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="font-extrabold text-lg text-white tracking-tight">
            Xác Thực Quản Trị Viên & Nhân Sự
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Đăng ký & Xác thực bảo mật qua tài khoản Gmail
          </p>
        </div>

        {/* Mode Switcher Tabs (Login vs Register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                mode === 'login'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập Gmail</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                mode === 'register'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký bằng Gmail</span>
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN WITH GMAIL */}
          {mode === 'login' && (
            <>
              <form onSubmit={handleGmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Địa chỉ Gmail *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="tenban@gmail.com"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Mật khẩu *
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('magic_otp')}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Quên mật khẩu / Đăng nhập bằng OTP?
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase font-semibold">
                  Hoặc xác thực nhanh
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleOAuthSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2.5 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
                  />
                </svg>
                <span>Tiếp tục với tài khoản Google (Gmail)</span>
              </button>
            </>
          )}

          {/* MODE 2: REGISTER NEW ACCOUNT WITH GMAIL */}
          {mode === 'register' && (
            <form onSubmit={handleGmailRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Họ và tên nhân sự *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Địa chỉ Gmail đăng ký *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tenban@gmail.com"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống sẽ gửi mã/link xác thực trực tiếp về hộp thư Gmail này.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Xác nhận MK *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Đang khởi tạo tài khoản...' : 'Đăng ký & Gửi xác thực Gmail'}</span>
              </button>
            </form>
          )}

          {/* MODE 3: PASSWORDLESS OTP / MAGIC LINK VIA GMAIL */}
          {mode === 'magic_otp' && (
            <form onSubmit={handleSendGmailOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nhập Gmail nhận mã xác thực OTP *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tenban@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Một mã OTP 6 số và đường dẫn xác thực sẽ được gửi thẳng về Gmail của bạn.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Đang gửi mã...' : 'Gửi mã xác thực tới Gmail'}</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                ← Quay lại đăng nhập bằng mật khẩu
              </button>
            </form>
          )}

          {/* MODE 4: VERIFY OTP CODE OR EMAIL LINK */}
          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtpCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Mã xác thực OTP trong Gmail ({email})
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Nhập mã 6 số (nếu có)..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Mở hộp thư <strong>{email}</strong>: Bạn có thể nhập mã số OTP ở trên <strong>HOẶC</strong> nhấp trực tiếp vào nút/link xác nhận trong thư Gmail rồi bấm Đăng nhập.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Đang kiểm tra...' : 'Xác nhận mã OTP & Đăng nhập'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gửi lại thư xác thực</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                >
                  Đã nhấn link? Đăng nhập →
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
          Bảo mật xác thực Gmail bởi Supabase Auth & RBAC Permission Engine
        </div>
      </div>
    </div>
  );
};
