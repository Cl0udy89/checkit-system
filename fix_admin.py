
import os

file_path = 'frontend/src/pages/Admin.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Verify content at lines 180-182 (1-indexed 181-183)
# Expected:
# 181:                 </div>
# 182:     )
# 183: }

print(f"Line 181: {repr(lines[180])}")
print(f"Line 182: {repr(lines[181])}")
print(f"Line 183: {repr(lines[182])}")

# Replace line 181 with "            )}\n"
lines[180] = "            )}\n"
# Remove lines 182, 183
lines[181] = ""
lines[182] = ""

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File updated.")
