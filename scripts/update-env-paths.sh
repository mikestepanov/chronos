#!/bin/bash

# Update all .env path references to point to root
echo "Updating .env paths to point to project root..."

# Update dotenv.config paths
find . -name "*.js" -type f ! -path "./node_modules/*" | while read file; do
    # Update paths like '../.env' to '../../.env'
    sed -i "s|dotenv\.config({ path: require('path')\.join(__dirname, '\.\./\.env') })|dotenv.config({ path: require('path').join(__dirname, '../../.env') })|g" "$file"
    
    # Update paths like '../../.env' to '../../../.env'
    sed -i "s|dotenv\.config({ path: require('path')\.join(__dirname, '\.\./\.\./\.env') })|dotenv.config({ path: require('path').join(__dirname, '../../../.env') })|g" "$file"
    
    # Update paths like path.join(__dirname, '../../.env') to path.join(__dirname, '../../../.env')
    sed -i "s|path\.join(__dirname, '\.\./\.\./\.env')|path.join(__dirname, '../../../.env')|g" "$file"
done

echo "Updated all .env path references!"

# Show the results
echo -e "\nCurrent .env references:"
grep -r "\.env" --include="*.js" . | grep -E "dotenv|\.env" | grep -v node_modules | grep -v "\.env\." | head -10