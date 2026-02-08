import os
import logging
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv()

# =====================
# LOGGING SETUP
# =====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("DataRefinery")

# Supabase Configuration
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials missing from environment variables.")

# Shared thread pool for CPU-bound tasks (pandas, zipping)
executor = ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) + 4))

# Auth Cache Config
TOKEN_CACHE = {} 
CACHE_TTL = 3600 # 1 hour
