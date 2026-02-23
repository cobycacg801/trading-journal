"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/");
      } else {
        setUserEmail(data.user.email ?? "");
      }
    };
    getUser();
  }, [router, supabase]);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setMsg("⚠️ Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMsg("❌ Error: " + error.message);
    } else {
      setMsg("✅ Password updated successfully!");
      setNewPassword("");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px",
    color: "#fff", fontSize: "16px", outline: "none", transition: "all 0.2s ease-in-out"
  };

  return (
    <main style={{
      minHeight: "100vh", width: "100%", backgroundImage: "url('/login-bg.png')",
      backgroundSize: "cover", backgroundPosition: "center", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        width: "100%", maxWidth: "420px", background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "20px",
        padding: "40px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", textAlign: "center"
      }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "#fff" }}>Settings</h1>
        <p style={{ color: "#a5b4fc", fontSize: "14px", marginBottom: "24px" }}>Logged in as: {userEmail}</p>

        {msg && (
          <div style={{ marginBottom: 20, padding: "10px", borderRadius: "6px", background: msg.includes("✅") ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: "#fff", fontSize: "14px" }}>
            {msg}
          </div>
        )}

        <div style={{ textAlign: "left", marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#a5b4fc", fontSize: "14px", fontWeight: 600 }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
            placeholder="Enter new password"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={handleUpdatePassword} disabled={loading} style={{
            width: "100%", padding: "14px", background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer"
          }}>
            {loading ? "Updating..." : "Update Password"}
          </button>

          <button onClick={() => router.push("/dashboard")} style={{
            width: "100%", padding: "14px", background: "transparent", color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", fontSize: "16px",
            fontWeight: "600", cursor: "pointer"
          }}>
            Back to Dashboard
          </button>

          <button onClick={handleLogout} style={{
            width: "100%", padding: "14px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", fontSize: "16px",
            fontWeight: "600", cursor: "pointer", marginTop: "12px"
          }}>
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}