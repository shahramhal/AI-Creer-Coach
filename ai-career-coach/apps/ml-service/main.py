# apps/ml-service/main.py

from fastapi import FastAPI

app = FastAPI(title="AI Career Coach - ML Service")

@app.get("/")
def read_root():
    return {"message": "ML Service is running!"}

@app.post("/api/predict-salary")
def predict_salary(data: dict):
    # dummy placeholder logic
    skills = data.get("skills", [])
    base_salary = 50000
    bonus = len(skills) * 1000
    return {"predicted_salary": base_salary + bonus}
