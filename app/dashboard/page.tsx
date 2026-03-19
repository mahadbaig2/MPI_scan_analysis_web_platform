"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Heart,
  Upload,
  FileImage,
  Brain,
  LogOut,
  History,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";

interface AnalysisResult {
  id: string;
  date: string;
  filename: string;
  predictions: {
    VGG16: ModelPrediction;
    ResNet50: ModelPrediction;
    DenseNet121: ModelPrediction;
    ensemble: ModelPrediction;
  };
  report: string;
}

interface ModelPrediction {
  probability: number;
  prediction: string;
  risk_level: string;
  confidence: number;
}

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cardioscan_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".dcm") && !file.name.endsWith(".npy")) {
      setError("Please upload a valid image file (JPG, PNG, WebP, BMP, TIFF, DICOM, or NPY)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be under 50MB");
      return;
    }
    setSelectedFile(file);

    // Create preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError("");

    try {
      // Step 1: Send image to prediction endpoint
      const formData = new FormData();
      formData.append("file", selectedFile);

      const predictRes = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!predictRes.ok) {
        const errData = await predictRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get model predictions");
      }

      const predictions = await predictRes.json();

      // Step 2: Send predictions to Groq for analysis
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictions,
          filename: selectedFile.name,
        }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate analysis report");
      }

      const { report } = await analyzeRes.json();

      // Save result
      const result: AnalysisResult = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        filename: selectedFile.name,
        predictions,
        report,
      };

      const newHistory = [result, ...history];
      setHistory(newHistory);
      localStorage.setItem("cardioscan_history", JSON.stringify(newHistory));

      // Navigate to results
      router.push(`/results?id=${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter((h) => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem("cardioscan_history", JSON.stringify(newHistory));
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex" }}>
      {/* ===== SIDEBAR ===== */}
      <aside
        style={{
          width: 260,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 24,
            borderBottom: "1px solid var(--border-color)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Heart size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            Cardio<span style={{ color: "var(--accent-cyan)" }}>Scan</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <button
            onClick={() => setActiveTab("upload")}
            className={`sidebar-link ${activeTab === "upload" ? "active" : ""}`}
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <Upload size={18} /> New Analysis
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`sidebar-link ${activeTab === "history" ? "active" : ""}`}
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <History size={18} /> History
            {history.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "var(--accent-cyan-dim)",
                  color: "var(--accent-cyan)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {history.length}
              </span>
            )}
          </button>
        </nav>

        {/* User */}
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--gradient-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="sidebar-link"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--accent-red)",
            }}
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {activeTab === "upload" ? (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                New Analysis
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                Upload an MPI scan image to get AI-powered heart disease analysis.
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

            {/* Upload Zone */}
            {!selectedFile ? (
              <div
                className={`upload-zone ${dragActive ? "dragging" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ maxWidth: 680 }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.dcm,.npy"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                  style={{ display: "none" }}
                  id="file-upload"
                />
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--accent-cyan-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <Upload size={28} style={{ color: "var(--accent-cyan)" }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  Drag & drop your MPI scan here
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  or click to browse • JPG, PNG, WebP, DICOM, NPY • Max 50MB
                </p>
              </div>
            ) : (
              /* File Preview */
              <div
                className="glass-card"
                style={{
                  maxWidth: 680,
                  padding: 24,
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                }}
              >
                {/* Preview image */}
                <div
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-input)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="MPI Scan preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <FileImage size={48} style={{ color: "var(--text-muted)" }} />
                  )}
                </div>

                {/* File info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, wordBreak: "break-all" }}>
                        {selectedFile.name}
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                        {selectedFile.type || "Unknown type"}
                      </p>
                    </div>
                    <button
                      onClick={clearFile}
                      style={{
                        background: "var(--accent-red-dim)",
                        border: "none",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--accent-red)",
                        flexShrink: 0,
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 12,
                      padding: "8px 12px",
                      background: "var(--accent-cyan-dim)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      color: "var(--accent-cyan)",
                    }}
                  >
                    <CheckCircle size={14} />
                    File ready for analysis
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                      Your scan will be analyzed by 3 deep learning models (VGG16, ResNet50, DenseNet121)
                      and an AI report will be generated using the kimi-k2 model.
                    </p>
                  </div>

                  <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                    <button
                      onClick={handleAnalyze}
                      className="btn-primary"
                      disabled={analyzing}
                      style={{
                        opacity: analyzing ? 0.7 : 1,
                        padding: "12px 28px",
                      }}
                      id="analyze-btn"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain size={16} /> Analyze Scan
                        </>
                      )}
                    </button>
                    <button onClick={clearFile} className="btn-secondary" style={{ padding: "12px 20px" }}>
                      Change File
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Model info cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginTop: 40,
                maxWidth: 680,
              }}
            >
              {[
                { name: "VGG16", auc: "0.864", color: "var(--accent-cyan)" },
                { name: "ResNet50", auc: "0.840", color: "var(--accent-blue)" },
                { name: "DenseNet121", auc: "0.890", color: "var(--accent-purple)" },
              ].map((model) => (
                <div
                  key={model.name}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {model.name}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: model.color }}>
                    {model.auc}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>AUC Score</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ===== HISTORY TAB ===== */
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Analysis History</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                View your previous scan analyses and reports.
              </p>
            </div>

            {history.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 24px",
                  color: "var(--text-muted)",
                }}
              >
                <History size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                  No analyses yet
                </h3>
                <p style={{ fontSize: 14 }}>Upload an MPI scan to get started.</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="btn-primary"
                  style={{ marginTop: 20 }}
                >
                  <Upload size={16} /> New Analysis
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: "20px 24px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onClick={() => router.push(`/results?id=${item.id}`)}
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
                        }}
                      >
                        <FileImage size={20} style={{ color: "var(--accent-cyan)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.filename}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {new Date(item.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        className={`badge badge-${item.predictions.ensemble.risk_level.toLowerCase()}`}
                      >
                        {item.predictions.ensemble.risk_level} Risk
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
