#!/bin/bash

# Replace worker?.active with worker?.is_active
find src/app/api -name "*.ts" -type f -exec sed -i '' 's/worker?\.active/worker?.is_active/g' {} \;

# Replace employee?.active with employee?.is_active
find src/app/api -name "*.ts" -type f -exec sed -i '' 's/employee?\.active/employee?.is_active/g' {} \;

echo "Replacements complete!"