#!/bin/bash

# Remove all .gitkeep files recursively
echo "Cleaning up .gitkeep files..."
find . -type f -name ".gitkeep" -delete

# Remove .git directory
echo "Removing .git directory..."
rm -rf .git

# install dependencies
echo "Installing dependencies..."
npm i

echo -e "\n\033[1;32mSetup complete!\033[0m Next steps:"
echo "1. Initialize a new Git repository:"
echo "   git init"
echo "2. Add all files to the initial commit:"
echo "   git add ."
echo "3. Create your first commit:"
echo "   git commit -m 'Initial commit'"
echo "4. (Optional) Add a remote repository:"
echo "   git remote add origin <your-repo-url>"
echo "5. (Optional) Push your code:"
echo "   git push -u origin main"
