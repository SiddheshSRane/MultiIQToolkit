from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import pandas as pd
from tools.add_modify import bulk_rename_columns, remove_columns, replace_blank_values
from tools.list_tools import convert_column_advanced
from tools.file_merger import merge_files_advanced

app = FastAPI(
    title="MiniIQ API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "MiniIQ API is running"}

# =====================
# TEXT CONVERTER
# =====================

class ConvertRequest(BaseModel):
    text: str
    delimiter: str = ", "
    item_prefix: str = ""
    item_suffix: str = ""
    result_prefix: str = ""
    result_suffix: str = ""
    remove_duplicates: bool = False
    sort_items: bool = False
    reverse_items: bool = False
    ignore_comments: bool = True
    strip_quotes: bool = False
    trim_items: bool = True
    case_transform: str = "none"


@app.post("/convert")
def convert(payload: ConvertRequest):
    result = convert_column_advanced(
        payload.text,
        delimiter=payload.delimiter,
        item_prefix=payload.item_prefix,
        item_suffix=payload.item_suffix,
        result_prefix=payload.result_prefix,
        result_suffix=payload.result_suffix,
        remove_duplicates=payload.remove_duplicates,
        sort_items=payload.sort_items,
        reverse_items=payload.reverse_items,
        ignore_comments=payload.ignore_comments,
        strip_quotes=payload.strip_quotes,
        trim_items=payload.trim_items,
        case_transform=payload.case_transform,
    )

    lines = payload.text.splitlines()
    non_empty = [l for l in lines if l.strip()]

    return {
        "result": result,
        "stats": {
            "total_lines": len(lines),
            "non_empty": len(non_empty),
            "unique": len(set(non_empty)),
        }
    }


@app.post("/convert/export-xlsx")
def export_xlsx(payload: ConvertRequest):
    result = convert_column_advanced(
        payload.text,
        delimiter="\n", # For XLSX we usually want one item per row
        item_prefix=payload.item_prefix,
        item_suffix=payload.item_suffix,
        remove_duplicates=payload.remove_duplicates,
        sort_items=payload.sort_items,
        reverse_items=payload.reverse_items,
        ignore_comments=payload.ignore_comments,
        strip_quotes=payload.strip_quotes,
        trim_items=payload.trim_items,
        case_transform=payload.case_transform,
    )
    
    items = result.splitlines()
    df = pd.DataFrame({"Items": items})
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="ConvertedData")
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="conversion.xlsx"'
        }
    )

# =====================
# FILE PREVIEW
# =====================

@app.post("/file/preview-columns")
async def preview_columns(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
):
    try:
        contents = await file.read()
        buffer = io.BytesIO(contents)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")

        if is_csv:
            df = pd.read_csv(buffer, nrows=1)
            return {
                "columns": list(df.columns),
                "sheets": None,
            }

        # Excel file
        # Use dtype=str to allow safe preview even if data is mixed
        xls = pd.ExcelFile(buffer)
        active_sheet = sheet_name or xls.sheet_names[0]

        df = pd.read_excel(xls, sheet_name=active_sheet, nrows=1, dtype=str)

        return {
            "columns": list(df.columns),
            "sheets": xls.sheet_names,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

# ... (existing endpoints)

@app.post("/file/remove-columns")
async def remove_columns_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        columns_list = [c.strip() for c in columns.split(",") if c.strip()]
        is_csv = file.filename.lower().endswith(".csv")

        output, error_msg = remove_columns(
            buffer,
            columns_list,
            sheet_name,
            apply_all_sheets=all_sheets,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        filename = f"{error_msg}_cleaned{ext}"  # base_name is returned in error_msg position on success

        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/file/rename-columns")
async def rename_columns_api(
    file: UploadFile = File(...),
    mapping: str = Form(...),  # JSON string
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")

        import json
        try:
            rename_map = json.loads(mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON mapping provided.")

        output, error_msg = bulk_rename_columns(
            buffer,
            rename_map,
            sheet_name,
            apply_all_sheets=all_sheets,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        # error_msg variable holds base_name on success
        
        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{error_msg}_renamed{ext}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/file/replace-blanks")
async def replace_blanks_api(
    file: UploadFile = File(...),
    columns: str = Form(...),
    replacement: str = Form(""),
    sheet_name: str = Form(None),
    all_sheets: bool = Form(False),
):
    try:
        data = await file.read()
        buffer = io.BytesIO(data)
        buffer.name = file.filename

        is_csv = file.filename.lower().endswith(".csv")
        
        # Parse columns
        columns_list = [c.strip() for c in columns.split(",") if c.strip()]

        output, error_msg = replace_blank_values(
            buffer,
            replacement,
            sheet_name,
            apply_all_sheets=all_sheets,
            target_columns=columns_list,
            is_csv=is_csv,
        )

        if output is None:
            raise HTTPException(status_code=400, detail=error_msg)

        output.seek(0)
        ext = ".csv" if is_csv else ".xlsx"
        # error_msg variable holds base_name on success
        
        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{error_msg}_filled{ext}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# FILE MERGER
# =====================

@app.post("/file/preview-common-columns")
async def preview_common_columns(
    files: List[UploadFile] = File(...),
    strategy: str = Form("intersection"),
    case_insensitive: bool = Form(False),
    all_sheets: bool = Form(False),
):
    try:
        all_column_sets = []
        first_file_cols_ordered = []
        sample_data = []

        for i, file in enumerate(files):
            contents = await file.read()
            buffer = io.BytesIO(contents)
            is_csv = file.filename.lower().endswith(".csv")

            if is_csv:
                # Get columns
                df_cols = pd.read_csv(io.BytesIO(contents), nrows=0)
                # Get sample
                df_sample = pd.read_csv(io.BytesIO(contents), nrows=3, dtype=str)
            else:
                xls = pd.ExcelFile(io.BytesIO(contents))
                sheet = xls.sheet_names[0] # Preview usually just first sheet
                df_cols = pd.read_excel(xls, sheet_name=sheet, nrows=0)
                df_sample = pd.read_excel(xls, sheet_name=sheet, nrows=3, dtype=str)
            
            cols = [str(c).strip() for c in df_cols.columns]
            if i == 0:
                first_file_cols_ordered = cols
                sample_data = df_sample.values.tolist()
                sample_headers = list(df_sample.columns)
            
            if case_insensitive:
                all_column_sets.append({c.lower() for c in cols})
            else:
                all_column_sets.append(set(cols))

        if not all_column_sets:
            return {"columns": [], "sample": [], "file_count": 0}

        if strategy == "intersection":
            shared = set.intersection(*all_column_sets)
            if case_insensitive:
                common_cols = [c for c in first_file_cols_ordered if c.lower() in shared]
            else:
                common_cols = [c for c in first_file_cols_ordered if c in shared]
        else:
            # Union - simplified for preview
            seen = set()
            common_cols = []
            for s in all_column_sets:
                for c in s:
                    if c not in seen:
                        common_cols.append(c)
                        seen.add(c)

        return {
            "columns": common_cols,
            "sample": {
                "headers": sample_headers,
                "rows": sample_data
            },
            "file_count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to preview files: {str(e)}")


@app.post("/file/merge-common-columns")
async def merge_advanced_api(
    files: List[UploadFile] = File(...),
    strategy: str = Form("intersection"),
    case_insensitive: bool = Form(False),
    remove_duplicates: bool = Form(False),
    all_sheets: bool = Form(False),
    selected_columns: str = Form(None), # Comma-separated list
    trim_whitespace: bool = Form(False),
    casing: str = Form("none"),
    include_source_col: bool = Form(True),
):
    try:
        file_data = []
        for file in files:
            contents = await file.read()
            buffer = io.BytesIO(contents)
            file_data.append((buffer, file.filename))

        columns_list = None
        if selected_columns:
            columns_list = [c.strip() for c in selected_columns.split(",") if c.strip()]

        output, columns, filename = merge_files_advanced(
            file_data,
            strategy=strategy,
            case_insensitive=case_insensitive,
            remove_duplicates=remove_duplicates,
            all_sheets=all_sheets,
            selected_columns=columns_list,
            trim_whitespace=trim_whitespace,
            casing=casing,
            include_source_col=include_source_col
        )

        if output is None:
            raise HTTPException(status_code=400, detail=filename)

        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
