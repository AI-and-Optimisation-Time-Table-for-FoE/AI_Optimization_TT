"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, requestPasswordReset, resetPasswordWithKey } from "./lib/api";
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, Lock, Mail, ShieldAlert } from "lucide-react";
import "./optimizer.css"; 

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = set new password
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [accountInfo, setAccountInfo] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        redirectUser(user.role);
      } catch (e) {
        localStorage.removeItem("user");
      }
    }

    // Load remembered email
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setUsername(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const redirectUser = (role) => {
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "student") {
      router.push("/student");
    } else if (role === "lecturer") {
      router.push("/lecturer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const universityEmailForKushan = "testDrkushan@university.edu";
      const trimmed = username.trim();
      const payloadUsername = trimmed.toLowerCase() === "kushan" ? universityEmailForKushan : trimmed;
      const data = await login(payloadUsername, password);
      
      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem("remembered_email", trimmed);
      } else {
        localStorage.removeItem("remembered_email");
      }

      localStorage.setItem("user", JSON.stringify(data));
      redirectUser(data.role);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotIdentify = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your university email or username.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    try {
      const resp = await requestPasswordReset(forgotIdentifier.trim());
      setAccountInfo(resp);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || "No account found matching this identifier.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setForgotError("Please enter and confirm your new password.");
      return;
    }
    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    try {
      const resp = await resetPasswordWithKey(forgotIdentifier.trim(), "direct_reset", newPassword);
      setForgotSuccess(resp.message || "Password reset successfully!");
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotIdentifier("");
    setAccountInfo(null);
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(22, 163, 74, 0.15)',
        width: '100%',
        maxWidth: '440px',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative top border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'var(--primary-600)' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <img src="/logo.jpg" alt="University Logo" style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '16px', borderRadius: '12px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#171717', margin: '0 0 8px 0', textAlign: 'center' }}>
            Faculty of Engineering
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0, textAlign: 'center' }}>
            Timetable Management System
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', textAlign: 'center', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              University Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="user@eng.ruh.ac.lk"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#404040', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => { setShowForgotModal(true); setForgotError(""); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
              Remember my email on this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              transition: 'transform 0.1s, background 0.2s',
              opacity: loading ? 0.8 : 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-700)')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-600)')}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '14px', color: '#737373' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary-600)', fontWeight: '600', textDecoration: 'none' }}>
            Create one now
          </Link>
        </div>
      </div>

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#ecfdf5', color: 'var(--primary-700)', padding: '10px', borderRadius: '12px' }}>
                <KeyRound size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Account Password Recovery
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Reset your university account password
                </p>
              </div>
            </div>

            {forgotError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ {forgotError}
              </div>
            )}

            {/* STEP 1: Enter email */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotIdentify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    University Email
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="user@eng.ruh.ac.lk"
                    disabled={forgotLoading}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
                    Enter your university email to verify your account and set a new password.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={resetForgotState}
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      padding: '11px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1.5,
                      padding: '11px',
                      background: 'var(--primary-600)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: forgotLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {forgotLoading ? "Finding Account..." : "Continue"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Set New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {accountInfo && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#334155' }}>
                    <div><strong>Account Identified:</strong> {forgotIdentifier}</div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', textTransform: 'capitalize' }}>Role: {accountInfo.role}</div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={forgotLoading}
                      style={{
                        width: '100%',
                        padding: '11px 40px 11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={forgotLoading}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-600)'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      padding: '11px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1.5,
                      padding: '11px',
                      background: 'var(--primary-600)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: forgotLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {forgotLoading ? "Resetting..." : "Save New Password"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success message */}
            {forgotStep === 3 && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>
                  Password Reset Complete!
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                  {forgotSuccess || "You can now sign in to your dashboard with your new password."}
                </p>
                <button
                  type="button"
                  onClick={resetForgotState}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
