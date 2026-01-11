import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from tools.list_tools import convert_dates_text

sample_data = """2024-09-21 14:30:00
21/09/2024 09:15
September 23, 2024 10:00 AM

2024-09-24"""

formats_to_test = ["%Y-%m-%d", "%d/%m/%Y", "ISO 8601"]

for fmt in formats_to_test:
    print(f"\n--- Testing Format: {fmt} ---")
    result = convert_dates_text(sample_data, fmt)
    print(result)
