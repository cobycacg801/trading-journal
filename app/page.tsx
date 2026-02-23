"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const handleLogin = async () => {
    setLoading(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setMsg("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setMsg(error.message);
      setLoading(false);
    } else {
      setMsg("✅ Check your email for the confirmation link!");
      setLoading(false);
    }
  };
const handleResetPassword = async () => {
    if (!email) {
      setMsg("⚠️ Please enter your email address first to reset your password.");
      return;
    }
    setLoading(true);
    setMsg("");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/dashboard`, 
    });
    
    if (error) {
      setMsg(error.message);
    } else {
      setMsg("✉️ Password reset instructions sent to your email!");
    }
    setLoading(false);
  };
  // Input style shared between email and password
  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    background: "rgba(0, 0, 0, 0.4)", // Dark semi-transparent background
    border: "1px solid rgba(255, 255, 255, 0.15)", // Subtle glowing border
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
    transition: "all 0.2s ease-in-out"
  };

 return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: "url('/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      {/* Glassmorphism Card Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(12px)", 
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center"
        }}
      >
        {/* Title & Branding Container */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: 700, 
            marginBottom: "4px", 
            color: "#fff",
            background: "linear-gradient(to right, #ffffff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Trading Journal
          </h1>
          <div style={{ 
            textAlign: "right", 
            fontSize: "12px", 
            color: "rgba(255, 255, 255, 0.5)", 
            paddingRight: "10px",
            fontStyle: "italic"
          }}>
            by Makai US Group LLC
          </div>
        </div>

        {msg && (
          <div style={{ marginBottom: 20, padding: "10px", borderRadius: "6px", background: msg.includes("✅") || msg.includes("✉️") ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: "#fff", fontSize: "14px" }}>
            {msg}
          </div>
        )}

        {/* Inputs Container */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#a5b4fc", fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="enter your email"
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#a5b4fc", fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
            
            {/* NEW: Forgot Password Button */}
            <div style={{ textAlign: "right", marginTop: "8px" }}>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(165, 180, 252, 0.8)",
                  fontSize: "12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>

        {/* Buttons Container */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)"
            }}
          >
            {loading ? "Processing..." : "Log In"}
          </button>

          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "transparent",
              color: "#a5b4fc",
              border: "1px solid rgba(165, 180, 252, 0.3)",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
} 