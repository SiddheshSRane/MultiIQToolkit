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
        Returns a dict with success status and components or error message.
        """
        query = query.strip()
        
        # Check for blocked keywords
        blocked = ["DELETE", "DROP", "TRUNCATE", "INSERT", "ALTER", "CREATE"]
        for word in blocked:
            if re.search(rf"\b{word}\b", query, re.IGNORECASE):
                return {"success": False, "error": f"Keyword '{word}' is not allowed in UPDATE Transformer."}

        if "WHERE" not in query.upper():
            return {"success": False, "error": "Safety Block: UPDATE without WHERE clause is not allowed."}

        match = self.pattern.search(query)
        if not match:
            return {
                "success": False, 
                "error": "Could not parse query. Ensure structure is: UPDATE table SET col = val WHERE condition"
            }

        components = match.groupdict()
        
        # Further refine WHERE clause to find the comparison value if it's simple
        # e.g., "id = 123" -> col: id, val: 123
        where_match = re.search(r"(?P<col>\w+)\s*=\s*(?P<val>'.*?'|\d+|NULL)", components['where_clause'], re.IGNORECASE)
        
        return {
            "success": True,
            "table": components['table'],
            "set_col": components['set_col'],
            "set_val": components['set_val'],
            "where_base": components['where_clause'],
            "where_var": where_match.groupdict() if where_match else None
        }

    def generate_batch(self, reference_query: str, set_values: List[str], where_values: List[str], mode: str = "pairwise") -> List[str]:
        """
        Generates a batch of SQL queries based on the reference and provided value lists.
        """
        validation = self.validate_query(reference_query)
        if not validation["success"]:
            return []

        table = validation['table']
        set_col = validation['set_col']
        where_base = validation['where_base']
        where_var = validation['where_var']

        results = []

        if mode == "pairwise":
            # Process in pairs (set[0] with where[0], etc.)
            count = min(len(set_values), len(where_values))
            for i in range(count):
                results.append(self._build_query(table, set_col, set_values[i], where_base, where_var, where_values[i]))
        else:
            # Cross product (all combinations)
            for s_val in set_values:
                for w_val in where_values:
                    results.append(self._build_query(table, set_col, s_val, where_base, where_var, w_val))

        return results

    def _build_query(self, table, set_col, s_val, where_base, where_var, w_val) -> str:
        # Standardize strings (wrap in single quotes if not already and not numeric/NULL)
        def clean(v):
            v = v.strip()
            if v.upper() == "NULL": return "NULL"
            if v.startswith("'") and v.endswith("'"): return v
            if v.replace('.', '', 1).isdigit(): return v
            return f"'{v}'"

        final_s = clean(s_val)
        final_w = clean(w_val)

        if where_var:
            # If we identified a specific variable in WHERE, replace it
            # Substitute the identified value in the where_base
            # This handles stuff like "id = 123" -> "id = 456"
            target = where_var['val']
            # Escape regex special chars in target
            pattern = re.escape(target)
            new_where = re.sub(pattern, final_w, where_base, count=1)
            return f"UPDATE {table} SET {set_col} = {final_s} WHERE {new_where};"
        else:
            # Fallback: Just return the query with the new SET value and original WHERE
            # (In a real app, we'd want more complex WHERE logic)
            return f"UPDATE {table} SET {set_col} = {final_s} WHERE {where_base};"
