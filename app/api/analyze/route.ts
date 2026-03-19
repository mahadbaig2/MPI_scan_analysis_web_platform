import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { predictions, filename } = await request.json();

    if (!predictions) {
      return NextResponse.json({ error: "No predictions provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured. Please add it to .env.local" },
        { status: 500 }
      );
    }

    // Build the prompt for Groq
    const prompt = buildAnalysisPrompt(predictions, filename);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a senior cardiology AI assistant specialized in analyzing Myocardial Perfusion Imaging (MPI) scan results. You analyze outputs from deep learning models (VGG16, ResNet50, DenseNet121) that classify MPI scans as normal or abnormal for heart disease detection.

Your task is to generate a comprehensive, professional medical analysis report based on the model prediction outputs. The report should be informative, clear, and suitable for both medical professionals and patients.

IMPORTANT: While you provide AI-powered analysis, always include a disclaimer that this is not a substitute for professional medical diagnosis.

Format your response using the following structure with these exact section headers:
## Summary
## Model Analysis
## Risk Assessment  
## Clinical Findings
## Recommendations
## Disclaimer`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.3,
      max_tokens: 2000,
    });

    const report = chatCompletion.choices[0]?.message?.content || "Unable to generate report.";

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildAnalysisPrompt(
  predictions: Record<string, { probability: number; prediction: string; risk_level: string; confidence: number }>,
  filename: string
): string {
  const modelEntries = Object.entries(predictions)
    .filter(([key]) => key !== "ensemble")
    .map(
      ([name, pred]) =>
        `- **${name}**: Probability = ${pred.probability.toFixed(4)} (${pred.prediction}), Risk Level = ${pred.risk_level}, Confidence = ${pred.confidence}%`
    )
    .join("\n");

  const ensemble = predictions.ensemble;

  return `Please analyze the following MPI (Myocardial Perfusion Imaging) scan prediction results and generate a detailed medical report.

**Scan File**: ${filename}
**Date of Analysis**: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

### Individual Model Predictions:
${modelEntries}

### Ensemble Prediction (Average of all models):
- **Overall Probability**: ${ensemble.probability.toFixed(4)}
- **Classification**: ${ensemble.prediction}
- **Risk Level**: ${ensemble.risk_level}
- **Confidence**: ${ensemble.confidence}%

### Model Background:
- VGG16: AUC = 0.864, Accuracy = 84.1%, trained on multi-source MPI datasets
- ResNet50: AUC = 0.840, Accuracy = 83.4%, trained on multi-source MPI datasets  
- DenseNet121: AUC = 0.890, Accuracy = 87.4%, trained on multi-source MPI datasets (best performing model)

Please provide a comprehensive analysis covering:
1. A clear summary of findings
2. Detailed per-model analysis and agreement between models
3. Risk level assessment with clinical context
4. Potential clinical findings based on the prediction patterns
5. Recommended next steps for the patient
6. Appropriate medical disclaimers`;
}
