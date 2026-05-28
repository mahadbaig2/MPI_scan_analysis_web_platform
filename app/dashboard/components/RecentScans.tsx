"use client";

import React from "react";
import { FileImage, ChevronRight, Trash2, Calendar, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface Scan {
  id: string;
  date: string;
  filename: string;
  predictions: {
    ensemble: {
      risk_level: string;
      probability: number;
    };
  };
}

interface RecentScansProps {
  scans: Scan[];
  onDelete: (id: string) => void;
}

export default function RecentScans({ scans, onDelete }: RecentScansProps) {
  const router = useRouter();

  if (scans.length === 0) {
    return (
      <div className="glass-card" style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <FileImage size={48} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No activity history</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 200 }}>Upload a scan to see your analysis history here.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: "24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h3>
        <span style={{ fontSize: 12, color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>View All</span>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {scans.slice(0, 5).map((scan) => (
          <div
            key={scan.id}
            onClick={() => router.push(`/results?id=${scan.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "var(--bg-card-hover)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(4px)";
              e.currentTarget.style.borderColor = "var(--border-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateX(0)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-input)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                  border: "1px solid var(--border-color)"
                }}
              >
                <FileImage size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{scan.filename}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} /> {new Date(scan.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Shield size={12} /> {scan.predictions.ensemble.risk_level} Risk
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                  {(scan.predictions.ensemble.probability * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Prob.</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(scan.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 8,
                  borderRadius: "50%",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-red)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Trash2 size={14} />
              </button>
              <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
