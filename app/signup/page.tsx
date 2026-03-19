"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await signup(name, email, password);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Signup failed");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gradient-hero)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          right: "20%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card animate-fade-in-up"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "48px 40px",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text-primary)",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--gradient-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Heart size={20} color="#000" fill="#000" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              Cardio<span style={{ color: "var(--accent-cyan)" }}>Scan</span> AI
            </span>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Start analyzing MPI scans with AI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "var(--accent-red-dim)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-md)",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--accent-red)",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ paddingLeft: 40 }}
                id="signup-name"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 40 }}
                id="signup-email"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 40 }}
                id="signup-password"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingLeft: 40 }}
                id="signup-confirm-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 8,
              padding: "14px 28px",
              opacity: loading ? 0.7 : 1,
            }}
            id="signup-submit"
          >
            {loading ? "Creating account..." : "Create Account"} <ArrowRight size={16} />
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 28,
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--accent-cyan)", fontWeight: 600, textDecoration: "none" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
