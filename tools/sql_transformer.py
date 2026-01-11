import re
from typing import List, Dict, Tuple, Optional

class SQLUpdateTransformer:
    def __init__(self):
        # Basic regex to capture components of an UPDATE query
        # Supports: UPDATE <table> SET <col> = <val> WHERE <col> = <val>
        # Note: This is a v1 parser intended for simple, single-assignment queries as per BRD
        self.pattern = re.compile(
            r"UPDATE\s+(?P<table>\w+)\s+SET\s+(?P<set_col>\w+)\s*=\s*(?P<set_val>'.*?'|\d+|NULL)\s+WHERE\s+(?P<where_clause>.*)",
            re.IGNORECASE | re.DOTALL
        )

    def validate_query(self, query: str) -> Dict:
        """
        Validates the structure and extracts key components.
        """
        query = query.strip().rstrip(';')
        
        # Check for blocked keywords
        blocked = ["DELETE", "DROP", "TRUNCATE", "INSERT", "ALTER", "CREATE"]
        for word in blocked:
            if re.search(rf"\b{word}\b", query, re.IGNORECASE):
                return {"success": False, "error": f"Keyword '{word}' is not allowed."}

        if "WHERE" not in query.upper():
            return {"success": False, "error": "Safety Block: UPDATE without WHERE clause is not allowed."}

        # Step 1: Split into UPDATE/SET part and WHERE part
        parts = re.split(r"\s+WHERE\s+", query, maxsplit=1, flags=re.IGNORECASE)
        if len(parts) < 2:
            return {"success": False, "error": "Could not identify WHERE clause."}
        
        upd_set_part = parts[0]
        where_clause = parts[1]

        # Step 2: Parse UPDATE and SET
        # UPDATE <table> SET <col> = <val>
        upd_match = re.search(r"UPDATE\s+(?P<table>\w+)\s+SET\s+(?P<col>\w+)\s*=\s*(?P<val>.*)", upd_set_part, re.IGNORECASE)
        if not upd_match:
            return {"success": False, "error": "Could not parse UPDATE/SET clause. Format: UPDATE table SET col = val"}
        
        upd_info = upd_match.groupdict()

        # Step 3: Parse WHERE structure
        # We look for the first '=' or 'IN' or 'LIKE' to find the value to replace
        where_match = re.search(r"(?P<prefix>.*?\s*=\s*)(?P<val>'.*?'|\".*?\"|[\w\-\.]+)(?P<suffix>.*)", where_clause, re.IGNORECASE)
        
        return {
            "success": True,
            "table": upd_info['table'],
            "set_col": upd_info['col'],
            "set_val": upd_info['val'],
            "where_base": where_clause,
            # We store the prefix and suffix so we can just sandwich the new value
            "where_prefix": where_match.group('prefix') if where_match else None,
            "where_val": where_match.group('val') if where_match else None,
            "where_suffix": where_match.group('suffix') if where_match else ""
        }

    def generate_batch(self, reference_query: str, set_values: List[str], where_values: List[str], mode: str = "pairwise") -> List[str]:
        validation = self.validate_query(reference_query)
        if not validation["success"]:
            return []

        results = []
        if mode == "pairwise":
            count = min(len(set_values), len(where_values))
            for i in range(count):
                results.append(self._build_query(validation, set_values[i], where_values[i]))
        else:
            for s_val in set_values:
                for w_val in where_values:
                    results.append(self._build_query(validation, s_val, w_val))

        return results

    def _build_query(self, v: Dict, s_val: str, w_val: str) -> str:
        def clean(v):
            v = v.strip()
            if not v: return "NULL"
            if v.upper() == "NULL": return "NULL"
            if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                return v
            if v.replace('.', '', 1).replace('-', '', 1).isdigit():
                return v
            return f"'{v}'"

        final_s = clean(s_val)
        final_w = clean(w_val)

        # Reconstruct WHERE
        if v['where_prefix']:
            new_where = f"{v['where_prefix']}{final_w}{v['where_suffix']}"
        else:
            # If we couldn't parse the WHERE parts, we just append (not ideal but safe fallback)
            new_where = v['where_base']

        return f"UPDATE {v['table']} SET {v['set_col']} = {final_s} WHERE {new_where};"
