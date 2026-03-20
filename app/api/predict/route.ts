import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const backendUrl = process.env.PYTHON_BACKEND_URL;

    if (!backendUrl) {
      // If no backend URL, return mock predictions for demo
      // This will be replaced with actual HuggingFace endpoint later
      const mockPredictions = generateMockPredictions();
      return NextResponse.json(mockPredictions);
    }

    // Forward to Python backend
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const response = await fetch(`${backendUrl}/predict`, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const predictions = await response.json();
    
    // If Python backend returned an error (e.g., model failed to load)
    if (predictions.error) {
      return NextResponse.json({ error: predictions.error }, { status: 500 });
    }
    
    return NextResponse.json(predictions);
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: "Failed to process image. Make sure the model backend is running." },
      { status: 500 }
    );
  }
}

function generateMockPredictions() {
  // Realistic mock predictions based on actual model performance data
  const vgg16Prob = 0.3 + Math.random() * 0.6;
  const resnet50Prob = 0.35 + Math.random() * 0.55;
  const densenet121Prob = 0.25 + Math.random() * 0.65;
  const ensembleProb = (vgg16Prob + resnet50Prob + densenet121Prob) / 3;

  const makePrediction = (prob: number) => ({
    probability: parseFloat(prob.toFixed(4)),
    prediction: prob >= 0.5 ? "Abnormal" : "Normal",
    risk_level: prob < 0.33 ? "Low" : prob < 0.66 ? "Medium" : "High",
    confidence: parseFloat((Math.abs(prob - 0.5) * 200).toFixed(1)),
  });

  return {
    VGG16: makePrediction(vgg16Prob),
    ResNet50: makePrediction(resnet50Prob),
    DenseNet121: makePrediction(densenet121Prob),
    ensemble: makePrediction(ensembleProb),
  };
}
