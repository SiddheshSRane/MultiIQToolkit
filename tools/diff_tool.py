import difflib
from typing import List, Dict, Any, Tuple

def compute_diff(
    text1: str, 
    text2: str, 
    ignore_whitespace: bool = False,
    ignore_case: bool = False
) -> Dict[str, Any]:
    """
    Computes a line-by-line diff between two text sources.
    Returns a structure suitable for rendering a side-by-side or unified view.
    """
    
    # Pre-processing
    lines1 = text1.splitlines()
    lines2 = text2.splitlines()
    
    # Normalization for comparison (if requested)
    proc_lines1 = lines1
    proc_lines2 = lines2
    
    if ignore_whitespace or ignore_case:
        proc_lines1 = []
        for line in lines1:
            l = line
            if ignore_case: l = l.lower()
            if ignore_whitespace: l = " ".join(l.split())
            proc_lines1.append(l)
            
        proc_lines2 = []
        for line in lines2:
            l = line
            if ignore_case: l = l.lower()
            if ignore_whitespace: l = " ".join(l.split())
            proc_lines2.append(l)

    # Use difflib.SequenceMatcher for powerful granular comparison
    matcher = difflib.SequenceMatcher(None, proc_lines1, proc_lines2)
    
    diff_rows = []
    
    # Helper for char-level diff of two strings
    def get_line_diffs(s1, s2):
        s_matcher = difflib.SequenceMatcher(None, s1, s2)
        parts1 = []
        parts2 = []
        
        for tag, i1, i2, j1, j2 in s_matcher.get_opcodes():
            if tag == 'equal':
                text = s1[i1:i2]
                parts1.append({"text": text, "type": "equal"})
                parts2.append({"text": text, "type": "equal"})
            elif tag == 'replace':
                parts1.append({"text": s1[i1:i2], "type": "delete"})
                parts2.append({"text": s2[j1:j2], "type": "insert"})
            elif tag == 'delete':
                parts1.append({"text": s1[i1:i2], "type": "delete"})
            elif tag == 'insert':
                parts2.append({"text": s2[j1:j2], "type": "insert"})
                
        return parts1, parts2

    # opcodes returns list of (tag, i1, i2, j1, j2)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Lines are identical
            for k in range(i2 - i1):
                diff_rows.append({
                    "type": "equal",
                    "left": {"num": i1 + k + 1, "text": lines1[i1 + k]},
                    "right": {"num": j1 + k + 1, "text": lines2[j1 + k]}
                })
        elif tag == 'replace':
            # Block mismatch - iterate through max length key
            len1 = i2 - i1
            len2 = j2 - j1
            max_len = max(len1, len2)
            
            for k in range(max_len):
                left_content = None
                right_content = None
                
                l_text = ""
                r_text = ""
                
                # Check if we have a pair to compare for easy diff
                has_pair = False
                
                if k < len1:
                    l_text = lines1[i1 + k]
                    left_content = {"num": i1 + k + 1, "text": l_text}
                
                if k < len2:
                    r_text = lines2[j1 + k]
                    right_content = {"num": j1 + k + 1, "text": r_text}
                
                if k < len1 and k < len2:
                    has_pair = True
                    parts1, parts2 = get_line_diffs(l_text, r_text)
                    left_content["parts"] = parts1
                    right_content["parts"] = parts2

                diff_rows.append({
                    "type": "replace",
                    "left": left_content,
                    "right": right_content
                })
                
        elif tag == 'delete':
            # Lines only in left (removed in right)
            for k in range(i2 - i1):
                diff_rows.append({
                    "type": "delete",
                    "left": {"num": i1 + k + 1, "text": lines1[i1 + k]},
                    "right": None
                })
        elif tag == 'insert':
            # Lines only in right (added in right)
            for k in range(j2 - j1):
                diff_rows.append({
                    "type": "insert",
                    "left": None,
                    "right": {"num": j1 + k + 1, "text": lines2[j1 + k]}
                })

    stats = {
        "additions": sum(1 for r in diff_rows if r["type"] == "insert"),
        "deletions": sum(1 for r in diff_rows if r["type"] == "delete"),
        "changes": sum(1 for r in diff_rows if r["type"] == "replace"),
        "identical": sum(1 for r in diff_rows if r["type"] == "equal"),
        "total_rows": len(diff_rows)
    }

    return {
        "diffs": diff_rows,
        "stats": stats
    }
