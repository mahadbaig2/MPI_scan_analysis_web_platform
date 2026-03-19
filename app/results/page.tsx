"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  ArrowLeft,
  Download,
  FileBarChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Shield,
  Printer,
} from "lucide-react";

interface ModelPrediction {
  probability: number;
  prediction: string;
  risk_level: string;
  confidence: number;
}

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

function GaugeChart({ value, size = 120, label, color }: { value: number; size?: number; label: string; color: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="8"
        />
        {/* Value ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="gauge-ring"
        />
      </svg>
      <div
        style={{
          marginTop: -size / 2 - 16,
          marginBottom: size / 2 - 24,
          fontSize: 22,
          fontWeight: 700,
          color,
        }}
      >
        {(value * 100).toFixed(1)}%
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const id = searchParams.get("id");

  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem("cardioscan_history");
    if (stored) {
      try {
        const history: AnalysisResult[] = JSON.parse(stored);
        const found = history.find((h) => h.id === id);
        if (found) setResult(found);
      } catch {
        // ignore
      }
    }
  }, [id]);

  const handleDownload = () => {
    if (!result || !reportRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CardioScan AI Report - ${result.filename}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #1a1a2e;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #06d6a0;
            padding-bottom: 20px;
            margin-bottom: 32px;
          }
          .logo { font-size: 24px; font-weight: 700; color: #0a0e1a; }
          .logo span { color: #06d6a0; }
          .meta { color: #666; font-size: 13px; }
          h2 { 
            color: #0a0e1a; 
            border-bottom: 1px solid #e2e8f0; 
            padding-bottom: 8px; 
            margin-top: 32px;
            font-size: 18px;
          }
          .predictions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 24px 0;
          }
          .pred-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .pred-name { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
          .pred-value { font-size: 28px; font-weight: 700; }
          .pred-label { font-size: 12px; color: #666; margin-top: 4px; }
          .risk-badge {
            display: inline-block;
            padding: 4px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
          }
          .risk-low { background: #d1fae5; color: #065f46; }
          .risk-medium { background: #fef3c7; color: #92400e; }
          .risk-high { background: #fee2e2; color: #991b1b; }
          .ensemble-box {
            background: #f0fdf4;
            border: 2px solid #06d6a0;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
          }
          .report-content p { margin: 8px 0; }
          .report-content ul { margin: 8px 0; padding-left: 24px; }
          .footer {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            color: #999;
            font-size: 11px;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Cardio<span>Scan</span> AI</div>
            <div class="meta">AI-Powered MPI Scan Analysis Report</div>
          </div>
          <div style="text-align: right;">
            <div class="meta">File: ${result.filename}</div>
            <div class="meta">Date: ${new Date(result.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            <div class="meta">Report ID: ${result.id}</div>
          </div>
        </div>

        <div class="ensemble-box">
          <div style="font-size: 14px; font-weight: 600; color: #666; margin-bottom: 8px;">ENSEMBLE PREDICTION</div>
          <div style="font-size: 36px; font-weight: 700; color: ${result.predictions.ensemble.prediction === 'Abnormal' ? '#dc2626' : '#059669'};">
            ${(result.predictions.ensemble.probability * 100).toFixed(1)}%
          </div>
          <div style="font-size: 16px; font-weight: 600; margin: 8px 0;">${result.predictions.ensemble.prediction}</div>
          <span class="risk-badge risk-${result.predictions.ensemble.risk_level.toLowerCase()}">
            ${result.predictions.ensemble.risk_level} Risk
          </span>
        </div>

        <h2>Individual Model Results</h2>
        <div class="predictions-grid">
          ${["VGG16", "ResNet50", "DenseNet121"]
            .map(
              (name) => `
            <div class="pred-card">
              <div class="pred-name">${name}</div>
              <div class="pred-value" style="color: ${(result.predictions as Record<string, ModelPrediction>)[name].prediction === 'Abnormal' ? '#dc2626' : '#059669'}">
                ${((result.predictions as Record<string, ModelPrediction>)[name].probability * 100).toFixed(1)}%
              </div>
              <div class="pred-label">${(result.predictions as Record<string, ModelPrediction>)[name].prediction} • ${(result.predictions as Record<string, ModelPrediction>)[name].risk_level} Risk</div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="report-content">
          ${result.report.replace(/## /g, "<h2>").replace(/\n/g, "<br>")}
        </div>

        <div class="footer">
          <p>Generated by CardioScan AI • AI-Powered MPI Scan Analyzer for Heart Disease Prediction</p>
          <p>This report is generated by artificial intelligence and is not a substitute for professional medical diagnosis.</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!result) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <AlertTriangle size={48} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Result not found</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          This analysis may have been deleted or doesn&apos;t exist.
        </p>
        <Link href="/dashboard" className="btn-primary" style={{ marginTop: 8 }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const ensemble = result.predictions.ensemble;
  const riskColor =
    ensemble.risk_level === "High"
      ? "var(--accent-red)"
      : ensemble.risk_level === "Medium"
      ? "var(--accent-amber)"
      : "var(--accent-cyan)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <header
        className="glass"
        style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Analysis Results</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{result.filename}</div>
          </div>
        </div>
        <button onClick={handleDownload} className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>
          <Download size={14} /> Download Report
        </button>
      </header>

      <div ref={reportRef} style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Ensemble result */}
        <div
          className="glass-card"
          style={{
            padding: "36px 40px",
            textAlign: "center",
            marginBottom: 24,
            borderColor: riskColor,
            boxShadow: `0 0 30px ${riskColor}22`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Activity size={14} /> Ensemble Prediction
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, color: riskColor, lineHeight: 1, marginBottom: 8 }}>
            {(ensemble.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
            {ensemble.prediction === "Abnormal" ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--accent-red)" }}>
                <AlertTriangle size={20} /> Abnormality Detected
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--accent-cyan)" }}>
                <CheckCircle size={20} /> Normal Scan
              </span>
            )}
          </div>
          <span className={`badge badge-${ensemble.risk_level.toLowerCase()}`} style={{ fontSize: 14, padding: "6px 20px" }}>
            <Shield size={14} /> {ensemble.risk_level} Risk
          </span>
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
            Confidence: {ensemble.confidence}%
          </div>
        </div>

        {/* Individual model results */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {(["VGG16", "ResNet50", "DenseNet121"] as const).map((name) => {
            const pred = result.predictions[name];
            const modelColor =
              name === "VGG16"
                ? "var(--accent-cyan)"
                : name === "ResNet50"
                ? "var(--accent-blue)"
                : "var(--accent-purple)";

            return (
              <div
                key={name}
                className="glass-card"
                style={{ padding: 24, textAlign: "center" }}
              >
                <GaugeChart
                  value={pred.probability}
                  size={100}
                  label={name}
                  color={modelColor}
                />
                <div style={{ marginTop: 12 }}>
                  <span className={`badge badge-${pred.risk_level.toLowerCase()}`}>
                    {pred.prediction} • {pred.risk_level}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  Confidence: {pred.confidence}%
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Report */}
        <div className="report-section" style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-blue-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileBarChart size={18} style={{ color: "var(--accent-blue)" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>AI-Generated Analysis Report</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Powered by Groq kimi-k2 • Generated{" "}
                {new Date(result.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--text-secondary)",
            }}
            dangerouslySetInnerHTML={{
              __html: result.report
                .replace(/## (.*)/g, '<h3 style="color: var(--text-primary); font-size: 16px; font-weight: 700; margin: 24px 0 12px 0;">$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>')
                .replace(/\n- /g, '<br>• ')
                .replace(/\n\d+\. /g, (match) => `<br>${match.trim()} `)
                .replace(/\n/g, "<br>"),
            }}
          />
        </div>

        {/* Meta info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>Report ID: {result.id}</span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleDownload}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-cyan)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Printer size={12} /> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Heart size={32} className="animate-heartbeat" style={{ color: "var(--accent-cyan)" }} />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
