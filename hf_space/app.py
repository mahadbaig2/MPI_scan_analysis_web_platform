import os
import io
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from huggingface_hub import hf_hub_download
import keras

class FeatureMaskingLayer(keras.layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def call(self, inputs):
        # Inputs: [features (from CNN), has_mask (0 or 1), original_mask]
        # Since we run standard inference without masks, we just pass features through.
        features, has_mask, mask = inputs
        return features

    def get_config(self):
        return super().get_config()

app = FastAPI(title="MPI Scan Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

models = {}

# User sets this in HuggingFace Space Settings -> Variables and Secrets
MODEL_REPO_ID = os.environ.get("MODEL_REPO_ID")

@app.on_event("startup")
def load_models():
    # Exact filenames observed in the user's HuggingFace Space
    model_files = [
        "VGG16_20260126_172001.keras",
        "ResNet50_20260126_182907.keras",
        "DenseNet121_20260126_220413.keras"
    ]
    
    for filename in model_files:
        name = filename.split(".")[0]
        local_path = f"models/{filename}"
        
        if not os.path.exists(local_path) and os.path.exists(filename):
            local_path = filename
        
        # If models were uploaded to a HuggingFace Model Hub (Option B)
        if MODEL_REPO_ID:
            print(f"Attempting to download {filename} from {MODEL_REPO_ID}...")
            try:
                local_path = hf_hub_download(repo_id=MODEL_REPO_ID, filename=filename)
            except Exception as e:
                print(f"⚠️ Failed to download {filename}: {e}")
        
        # Load the model
        if os.path.exists(local_path):
            try:
                # Compile=False is faster and sufficient for inference
                # Use explicit custom_objects dict to guarantee Keras finds the layer
                models[name] = keras.models.load_model(
                    local_path, 
                    compile=False,
                    custom_objects={'FeatureMaskingLayer': FeatureMaskingLayer}
                )
                print(f"✅ Loaded {name}")
            except Exception as e:
                print(f"⚠️ Error loading {name}: {e}")
        else:
            print(f"⚠️ Model file not found at {local_path} or ./{filename}. Please check file names and paths.")

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Convert uploaded image to model-ready format: (1, 224, 224, 1)"""
    # Open image in Grayscale
    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    image = image.resize((224, 224))
    
    # Convert to numpy
    img_array = np.array(image, dtype=np.float32)
    
    # Normalize to [0, 1]
    if img_array.max() > 1.0:
        img_array = img_array / 255.0
    
    # Reshape to (1, 224, 224, 1) (batch_size=1, height, width, channels)
    img_array = np.expand_dims(img_array, axis=(0, -1))
    
    return img_array

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not models:
        return {"error": "Models have not been loaded successfully on the server."}

    try:
        image_bytes = await file.read()
        img_array = preprocess_image(image_bytes)
    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}
    
    results = {}
    
    for name, model in models.items():
        try:
            # For the fallback "Proposed" models with feature masking inputs
            # In Keras functional models, multi-inputs are best passed as lists/tuples
            try:
                pred = model.predict(
                    [
                        img_array, 
                        np.array([[0.0]], dtype=np.float32), 
                        np.zeros((1, 224, 224, 1), dtype=np.float32)
                    ], 
                    verbose=0
                )
            except Exception as e1:
                # If it's a standard single-input model, fall back to pure image
                try:
                    pred = model.predict(img_array, verbose=0)
                except Exception as e2:
                    print(f"Fallback inference failed: {e2}")
                    raise e1
            
            probability = float(pred[0][0])
            results[name] = {
                "probability": probability,
                "prediction": "Abnormal" if probability >= 0.5 else "Normal",
                "risk_level": (
                    "Low" if probability < 0.33
                    else "Medium" if probability < 0.66
                    else "High"
                ),
                "confidence": round(abs(probability - 0.5) * 200, 1)
            }
        except Exception as e:
            print(f"Inference error on {name}: {e}")
            
    if not results:
        return {"error": "No model could successfully run inference."}
    
    # Ensemble (average of successful models)
    avg_prob = np.mean([r["probability"] for r in results.values()])
    results["ensemble"] = {
        "probability": float(avg_prob),
        "prediction": "Abnormal" if avg_prob >= 0.5 else "Normal",
        "risk_level": (
            "Low" if avg_prob < 0.33
            else "Medium" if avg_prob < 0.66
            else "High"
        ),
        "confidence": round(abs(avg_prob - 0.5) * 200, 1)
    }
    
    return results

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": list(models.keys())}
