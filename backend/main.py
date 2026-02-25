import time
import httpx
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import logger, supabase_url, supabase_key
from backend.core.auth import set_http_client
from backend.routers import text, file_ops, merger, json_conv, template

@asynccontextmanager
async def lifespan(app: FastAPI):
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
    timeout = httpx.Timeout(5.0, connect=2.0)
    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        set_http_client(client)
        yield

app = FastAPI(
    title="DataRefinery API",
    version="1.2.0",
    lifespan=lifespan,
)

# =====================
# MIDDLEWARE
# =====================
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"Handled {request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Duration: {duration:.4f}s"
    )
    return response

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# =====================
# ERROR HANDLING
# =====================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    exc_type = type(exc).__name__
    tb = traceback.format_exc()
    logger.error(f"Unhandled error [{exc_type}] at {request.url.path}: {str(exc)}\n{tb}", exc_info=True)
    content = {
        "error": "An internal server error occurred.",
        "type": exc_type,
        "path": request.url.path
    }
    return JSONResponse(status_code=500, content=content)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

# =====================
# ROUTES
# =====================
app.include_router(text.router)
app.include_router(file_ops.router)
app.include_router(merger.router)
app.include_router(json_conv.router)
app.include_router(template.router)

@app.api_route("/api", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "DataRefinery API is running", "version": "1.2.0"}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "supabase_configured": bool(supabase_url and supabase_key)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
