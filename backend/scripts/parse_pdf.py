import re

with open("d:/ZECH SOFT/projects/deepika/dbtech erp/frontend/src/pages/PurchaseOrders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find generatePDF function
match = re.search(r"const generatePDF = \(po\) => \{(.*?)\n  \};", content, re.DOTALL)
if match:
    body = match.group(1)
    for line_num, line in enumerate(body.split("\n"), start=324):
        if "doc." in line:
            print(f"{line_num}: {line.strip()}")
else:
    print("generatePDF function not found")
