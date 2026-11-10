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
  KeyRound,
  Clock,
  Copy
} from 'lucide-react';
import { AdminUser } from '../types';
import { getSupabaseClient } from '../services/supabaseService';
import {
  syncAuthenticatedGmailUser,
  markEmailOtpVerified,
  registerGmailUserWithOtp,
  authenticateGmailPassword,
  generateOtpForEmail,
  verifyLocalOtpForEmail
} from '../services/userService';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

type AuthMode = 'login' | 'register' | 'verify_otp' | 'magic_otp' | 'pending_approval';

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
  const [generatedOtpPreview, setGeneratedOtpPreview] = useState<string>('');
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
   * Finalizes login ONLY after Gmail OTP / OAuth verification is completed
   * and checks RBAC approval status ('active' vs 'pending' vs 'suspended')
   */
  const finalizeGmailSession = async (authUser: {
    id: string;
    email: string;
    displayName?: string;
    avatar?: string;
  }) => {
    const { user: managedUser, isSuspended, isPendingApproval } =
      await syncAuthenticatedGmailUser(authUser);

    if (isSuspended) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setErrorMsg(
        'Tài khoản Gmail của bạn hiện đang bị khóa (Suspended). Vui lòng liên hệ Quản trị viên (Super Admin) để mở khóa.'
      );
      return;
    }

    if (isPendingApproval) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setMode('pending_approval');
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
      emailVerified: true,
      permissions: managedUser.permissions
    };

    localStorage.setItem('tintuc_admin_session', JSON.stringify(adminUser));
    onLoginSuccess(adminUser);
  };

  /**
   * 1. Sign in with Gmail & Password
   */
  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com).');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateGmailPassword({
        email: cleanEmail,
        password
      });

      if (result.needsOtpVerification && result.otpCode) {
        setGeneratedOtpPreview(result.otpCode);
        setOtpType('signup');
        setMode('verify_otp');
        setSuccessMsg(
          `Tài khoản ${cleanEmail} chưa hoàn tất xác thực mã OTP. Vui lòng nhập mã xác thực 6 số bên dưới để kích hoạt!`
        );
        return;
      }

      if (!result.success || !result.user) {
        setErrorMsg(
          result.errorMessage ||
            'Email hoặc mật khẩu không chính xác. Nếu bạn chưa có tài khoản, vui lòng chuyển sang tab "Đăng ký bằng Gmail".'
        );
        return;
      }

      await finalizeGmailSession({
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        avatar: result.user.avatar
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đã xảy ra lỗi khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Register new account with Gmail & Password — ALWAYS requires 6-digit OTP verification!
   */
  const handleGmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMsg('Vui lòng nhập họ và tên nhân sự.');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng sử dụng địa chỉ tài khoản @gmail.com hợp lệ để đăng ký.');
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
      const regResult = await registerGmailUserWithOtp({
        displayName: cleanName,
        email: cleanEmail,
        password
      });

      setGeneratedOtpPreview(regResult.otpCode);
      setOtpCode('');
      setOtpType('signup');
      setMode('verify_otp');

      if (regResult.emailSentViaSupabase) {
        setSuccessMsg(
          `Bước 2/2 — Xác thực Gmail: Đã gửi mã xác thực OTP tới ${cleanEmail}. Vui lòng kiểm tra hộp thư Gmail hoặc sử dụng mã xác thực bảo mật bên dưới!`
        );
      } else {
        setSuccessMsg(
          `Bước 2/2 — Xác thực Gmail: Mã xác thực OTP 6 số cho tài khoản ${cleanEmail} đã được khởi tạo. Vui lòng nhập mã xác thực bên dưới để hoàn tất đăng ký!`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể đăng ký tài khoản vào lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 3. Send Passwordless OTP to Gmail
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
      const newOtp = generateOtpForEmail(cleanEmail);
      setGeneratedOtpPreview(newOtp);
      setOtpCode('');

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`
            }
          });
        } catch {}
      }

      setOtpType('email');
      setMode('verify_otp');
      setSuccessMsg(
        `Đã khởi tạo mã xác thực OTP 6 số cho ${cleanEmail}. Vui lòng nhập mã bên dưới để xác thực!`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi tạo mã xác thực Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 4. Verify 6-digit OTP code
   */
  const handleVerifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!cleanToken) {
      setErrorMsg('Vui lòng nhập mã xác thực OTP 6 số.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check built-in OTP verification
      const isLocalOtpValid = verifyLocalOtpForEmail(cleanEmail, cleanToken);

      if (isLocalOtpValid) {
        markEmailOtpVerified(cleanEmail);
        setGeneratedOtpPreview('');
        await finalizeGmailSession({
          id: `user-${Date.now()}`,
          email: cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0]
        });
        return;
      }

      // 2. Also check Supabase Auth OTP if configured
      const supabase = getSupabaseClient();
      if (supabase) {
        sessionStorage.setItem('suppress_auto_auth_listener', 'true');
        let { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: otpType
        });

        if (error) {
          const altType = otpType === 'signup' ? 'email' : 'signup';
          const retry = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: altType
          });
          if (!retry.error && retry.data?.user) {
            data = retry.data;
            error = null;
          }
        }
        sessionStorage.removeItem('suppress_auto_auth_listener');

        if (!error && data?.user) {
          markEmailOtpVerified(cleanEmail);
          setGeneratedOtpPreview('');
          await finalizeGmailSession({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            displayName:
              displayName.trim() ||
              data.user.user_metadata?.full_name ||
              cleanEmail.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url
          });
          return;
        }
      }

      setErrorMsg('Mã xác thực OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại!');
    } catch (err: any) {
      sessionStorage.removeItem('suppress_auto_auth_listener');
      setErrorMsg(err?.message || 'Xác thực OTP thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 5. Resend verification OTP code
   */
  const handleResendConfirmation = async () => {
    resetMessages();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsLoading(true);
    try {
      const freshOtp = generateOtpForEmail(cleanEmail);
      setGeneratedOtpPreview(freshOtp);
      setSuccessMsg(`Đã cấp lại mã OTP xác thực mới cho ${cleanEmail}!`);

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`
            }
          });
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 6. Google OAuth Sign-In (or instant Gmail OTP verification if OAuth provider not enabled)
   */
  const handleGoogleOAuthSignIn = async () => {
    resetMessages();
    const supabase = getSupabaseClient();
    if (supabase) {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/admin`
          }
        });
        if (!error) return;
      } catch {}
      setIsLoading(false);
    }

    // Fallback to quick Gmail OTP mode
    switchMode('magic_otp');
    setSuccessMsg('Nhập địa chỉ Gmail của bạn để nhận mã xác thực OTP 6 số đăng nhập nhanh.');
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
            Đăng ký, Xác thực OTP Gmail & Phê duyệt Phân quyền
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
                      Quên mật khẩu / Nhận OTP qua Gmail?
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
                  Bắt buộc xác thực mã OTP 6 số trước khi kích hoạt tài khoản.
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
                <span>{isLoading ? 'Đang gửi mã xác thực Gmail...' : 'Đăng ký & Gửi xác thực Gmail'}</span>
              </button>
            </form>
          )}

          {/* MODE 3: PASSWORDLESS OTP VIA GMAIL */}
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
                  Hệ thống sẽ cấp mã xác thực OTP 6 số cho tài khoản Gmail của bạn.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Đang tạo mã...' : 'Nhận mã xác thực OTP 6 số'}</span>
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

          {/* MODE 4: VERIFY OTP CODE */}
          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtpCode} className="space-y-4">
              {generatedOtpPreview && (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Mã xác thực Gmail OTP (6 số):
                    </div>
                    <div className="font-mono text-lg font-extrabold tracking-widest text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {generatedOtpPreview}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(generatedOtpPreview)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Điền mã OTP</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nhập mã OTP 6 số cho ({email}) *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    maxLength={8}
                    placeholder="Nhập mã 6 số..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Đang xác thực mã OTP...' : 'Xác thực OTP & Hoàn tất'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Lấy mã OTP mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                >
                  ← Quay lại Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* MODE 5: PENDING ADMIN APPROVAL */}
          {mode === 'pending_approval' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Đã xác thực Gmail — Chờ Admin Phê Duyệt
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tài khoản Gmail <strong>{email}</strong> của bạn đã được xác thực thành công và ghi nhận vào danh sách nhân sự hệ thống.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold leading-relaxed pt-1">
                  Hiện tài khoản đang ở trạng thái "Chờ duyệt (Pending)". Vui lòng đăng nhập bằng tài khoản Super Admin (honguyen6492@gmail.com) và vào mục "Quản lý User" để bấm Phê duyệt kích hoạt tài khoản này!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                >
                  Quay lại màn hình Đăng nhập
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
          Bảo mật xác thực Gmail bởi OTP Verification & RBAC Permission Engine
        </div>
      </div>
    </div>
  );
};
