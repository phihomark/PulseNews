import React, { useState } from 'react';
import {
  User,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  LogIn,
  Clock,
  Lock,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AdminUser } from '../types';
import {
  signInWithGoogleOAuthPopup,
  syncAuthenticatedGmailUser,
  updateUser,
} from '../services/userService';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

type AuthMode = 'login' | 'register' | 'pending_approval';

export const AdminLogin: React.FC<AdminLoginProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
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
   * Real Google OAuth Sign-In / Registration via Firebase Auth Popup
   */
  const handleGoogleOAuth = async (isRegisterFlow: boolean) => {
    resetMessages();

    if (isRegisterFlow && !displayName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên nhân sự trước khi bấm xác thực Google (Gmail).');
      return;
    }

    setIsLoading(true);
    try {
      sessionStorage.setItem('suppress_auto_auth_listener', 'true');
      const { user: managedUser, isSuspended, isPendingApproval } =
        await signInWithGoogleOAuthPopup();

      // If registering with a custom staff display name, update it in Firestore
      let finalUser = managedUser;
      if (isRegisterFlow && displayName.trim()) {
        const cleanName = displayName.trim().slice(0, 120);
        if (auth.currentUser) {
          const synced = await syncAuthenticatedGmailUser({
            id: auth.currentUser.uid,
            email: managedUser.email,
            displayName: cleanName,
            avatar: managedUser.avatar,
          });
          finalUser = synced.user;
        } else {
          updateUser(managedUser.id, { displayName: cleanName });
          finalUser = { ...managedUser, displayName: cleanName };
        }
      }

      setVerifiedEmail(finalUser.email);

      if (isSuspended) {
        await signOut(auth);
        sessionStorage.removeItem('suppress_auto_auth_listener');
        setErrorMsg(
          `Tài khoản Gmail (${finalUser.email}) hiện đang bị khóa (Suspended). Vui lòng liên hệ Super Admin (honguyen6492@gmail.com) để mở khóa.`
        );
        return;
      }

      if (isPendingApproval) {
        await signOut(auth);
        sessionStorage.removeItem('suppress_auto_auth_listener');
        setMode('pending_approval');
        return;
      }

      sessionStorage.removeItem('suppress_auto_auth_listener');

      const adminUser: AdminUser = {
        id: finalUser.id,
        username: finalUser.username,
        displayName: finalUser.displayName,
        email: finalUser.email,
        avatar: finalUser.avatar,
        role: finalUser.role,
        status: finalUser.status,
        emailVerified: true,
        permissions: finalUser.permissions,
      };

      localStorage.setItem('tintuc_admin_session', JSON.stringify(adminUser));
      onLoginSuccess(adminUser);
    } catch (err: any) {
      sessionStorage.removeItem('suppress_auto_auth_listener');
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Bạn đã đóng cửa sổ xác thực Google trước khi hoàn tất đăng nhập.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(
          'Trình duyệt đã chặn cửa sổ bật lên (Popup). Vui lòng cho phép Popup để xác thực tài khoản Google (Gmail).'
        );
      } else {
        setErrorMsg(err?.message || 'Xác thực Google OAuth thất bại. Vui lòng thử lại.');
      }
    } finally {
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
            Xác thực trực tiếp bằng Google OAuth (Gmail) & Phân quyền RBAC
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

          {/* MODE 1: LOGIN WITH GOOGLE OAUTH */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Đăng nhập bảo mật bằng Google OAuth 2.0</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hệ thống sử dụng liên kết xác thực chính thức của Google (Firebase Auth) để kiểm tra tài khoản Gmail thật và đối chiếu quyền hạn trong CSDL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleOAuth(false)}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 transition disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0">
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
                </div>
                <span>
                  {isLoading
                    ? 'Đang mở cửa sổ xác thực Google...'
                    : 'Đăng nhập với tài khoản Google (Gmail)'}
                </span>
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Chưa có hồ sơ nhân sự? Chuyển sang tab{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Đăng ký bằng Gmail
                </button>
              </p>
            </div>
          )}

          {/* MODE 2: REGISTER NEW STAFF ACCOUNT VIA GOOGLE OAUTH */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Họ và tên nhân sự đăng ký *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Nhập họ và tên của bạn (VD: Nguyễn Văn A)"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Sau khi nhập họ tên, bấm nút bên dưới để chọn và xác thực tài khoản Gmail thật của bạn qua Google OAuth.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleOAuth(true)}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-3 transition disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0">
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
                </div>
                <span>
                  {isLoading
                    ? 'Đang xác thực với Google...'
                    : 'Xác thực & Đăng ký bằng Google (Gmail)'}
                </span>
              </button>
            </div>
          )}

          {/* MODE 3: PENDING ADMIN APPROVAL */}
          {mode === 'pending_approval' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Đã xác thực Google OAuth — Chờ Admin Phê Duyệt
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tài khoản Gmail <strong>{verifiedEmail}</strong> của bạn đã được xác thực thành công qua Google OAuth và lưu vào danh sách nhân sự trên Cloud Firestore.
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
          Bảo mật xác thực bởi Google OAuth (Firebase Auth) & Cloud Firestore RBAC
        </div>
      </div>
    </div>
  );
};
