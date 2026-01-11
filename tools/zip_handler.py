import zipfile
import io
import os
from typing import List, Tuple, Callable, Any

def process_zip_file(zip_bytes: bytes, processor: Callable[[io.BytesIO, str], Tuple[io.BytesIO, str]]) -> io.BytesIO:
    """
    Extracts a ZIP, processes each file using the provided function, 
    and returns a new ZIP containing the modified files.
    """
    input_zip = io.BytesIO(zip_bytes)
    output_zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(input_zip, 'r') as z_in:
        with zipfile.ZipFile(output_zip_buffer, 'w', zipfile.ZIP_DEFLATED) as z_out:
            for filename in z_in.namelist():
                # Skip directories
                if filename.endswith('/'):
                    continue
                
                # Check extension (we only process CSV and Excel)
                ext = os.path.splitext(filename)[1].lower()
                if ext not in ['.csv', '.xlsx', '.xls']:
                    # Pass through other files unchanged? 
                    # For now, let's keep it simple and only include processed ones
                    # or keep original if not processed. 
                    # Decision: Keep original for non-data files.
                    z_out.writestr(filename, z_in.read(filename))
                    continue

                file_data = z_in.read(filename)
                file_buffer = io.BytesIO(file_data)
                
                try:
                    # Process the file
                    processed_buffer, processed_filename = processor(file_buffer, filename)
                    
                    if processed_buffer:
                        z_out.writestr(processed_filename, processed_buffer.getvalue())
                    else:
                        # If error in processing, we'll just log it and maybe keep original
                        # For now, keep original to avoid data loss
                        z_out.writestr(filename, file_data)
                except Exception as e:
                    import logging
                    logging.getLogger("MiniIQ").error(f"Error processing {filename} in zip: {e}", exc_info=True)
                    z_out.writestr(filename, file_data)
                    
    output_zip_buffer.seek(0)
    return output_zip_buffer

def is_zip(filename: str) -> bool:
    return filename.lower().endswith('.zip')
