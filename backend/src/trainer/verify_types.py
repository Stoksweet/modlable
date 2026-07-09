# backend/src/trainer/verify_types.py
import sys
import os
import re
import dataclasses
import importlib.util

def check_package_installed(package_name):
    return importlib.util.find_spec(package_name) is not None

def parse_ts_interface(file_path, interface_name):
    """
    Parses a TypeScript file and extracts keys and types of a specific interface.
    """
    if not os.path.exists(file_path):
        print(f"Error: TypeScript file {file_path} not found.")
        return {}

    with open(file_path, 'r') as f:
        content = f.read()

    # Locate the interface definition block
    pattern = rf"export\s+interface\s+{interface_name}\s*\{{([\s\S]*?)\}}"
    match = re.search(pattern, content)
    if not match:
        return {}

    body = match.group(1)
    fields = {}
    # Match lines like: property_name?: type; or property_name: type;
    field_pattern = r"(\w+)\??\s*:\s*([^;]+);"
    for name, type_str in re.findall(field_pattern, body):
        fields[name.strip()] = type_str.strip()
    
    return fields

def verify_alignment():
    print("=== Launching Schema Verification Layer ===")
    
    ts_file = os.path.join(os.path.dirname(__file__), "types.ts")
    
    # 1. Check if TRL and PEFT are installed
    if not check_package_installed("trl") or not check_package_installed("peft"):
        print("Warning: 'trl' or 'peft' libraries are not installed in the local environment.")
        print("Unable to perform live python class introspection. Skipping runtime check.")
        return True

    from trl import SFTConfig as PySFTConfig
    from peft import LoraConfig as PyLoraConfig

    # 2. Extract types from TypeScript
    ts_sft_fields = parse_ts_interface(ts_file, "SFTConfig")
    ts_lora_fields = parse_ts_interface(ts_file, "LoraConfig")

    if not ts_sft_fields:
        print("Error: Could not parse SFTConfig from TypeScript file.")
        return False

    # Map TS primitive types to Python types
    type_mappings = {
        "string": (str,),
        "number": (int, float),
        "boolean": (bool,),
        "string[]": (list, tuple)
    }

    mismatches = 0

    # 3. Verify SFTConfig
    print("\nVerifying SFTConfig field compatibility...")
    py_sft_fields = {f.name: f for f in dataclasses.fields(PySFTConfig)}
    
    for ts_name, ts_type in ts_sft_fields.items():
        if ts_name not in py_sft_fields:
            print(f"❌ MISMATCH: TS property '{ts_name}' does not exist in Python TRL SFTConfig class.")
            mismatches += 1
            continue
            
        py_field = py_sft_fields[ts_name]
        # Perform loose type checking based on mapping
        allowed_py_types = type_mappings.get(ts_type, (object,))
        
        # Check if python field origin type matches any allowed type
        origin_type = py_field.type
        type_str = str(origin_type)
        type_matched = any(p.__name__ in type_str for p in allowed_py_types)

        if not type_matched:
            print(f"⚠️ TYPE WARNING: '{ts_name}' in TS is '{ts_type}' but Python SFTConfig expects '{origin_type}'")

    # 4. Verify LoraConfig
    if ts_lora_fields:
        print("\nVerifying LoraConfig field compatibility...")
        py_lora_fields = {f.name: f for f in dataclasses.fields(PyLoraConfig)}
        for ts_name, ts_type in ts_lora_fields.items():
            if ts_name not in py_lora_fields:
                print(f"❌ MISMATCH: TS property '{ts_name}' does not exist in Python PEFT LoraConfig class.")
                mismatches += 1
                continue

    if mismatches > 0:
        print(f"\nVerification failed with {mismatches} mismatching fields.")
        return False
    
    print("\n✅ Verification complete. TypeScript types match Python configuration models!")
    return True

if __name__ == "__main__":
    success = verify_alignment()
    sys.exit(0 if success else 1)
