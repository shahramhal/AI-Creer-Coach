from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers import cv, health, matching, skills
from salary_prediction.salary_predictor import router as salary_router

app = FastAPI(
    title="AI Career Coach ML Service",
    description="ML microservice for CV parsing and job matching",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cv.router)
app.include_router(matching.router)
app.include_router(skills.router)
app.include_router(salary_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
