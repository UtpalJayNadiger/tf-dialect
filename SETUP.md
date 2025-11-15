# GitHub Repository Setup Guide

## Creating a GitHub Repository

### 1. Initialize Git (if not already done)

```bash
cd /Users/utpalnadiger/tf-dialect
git init
```

### 2. Create Initial Commit

```bash
git add .
git commit -m "Initial commit: tf-dialect MCP server"
```

### 3. Create GitHub Repository

#### Option A: Using GitHub CLI (recommended)

```bash
# Install GitHub CLI if needed
brew install gh

# Login to GitHub
gh auth login

# Create the repository
gh repo create tf-dialect --public --source=. --remote=origin --push

# Or for a private repository
gh repo create tf-dialect --private --source=. --remote=origin --push
```

#### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `tf-dialect`
   - **Description**: "MCP server that exposes your organization's Terraform style guide to AI coding agents"
   - **Visibility**: Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"
4. Follow the instructions for "push an existing repository":

```bash
git remote add origin https://github.com/YOUR_USERNAME/tf-dialect.git
git branch -M main
git push -u origin main
```

### 4. Add Repository Topics (Optional)

On GitHub web:
- Go to your repository
- Click the gear icon next to "About"
- Add topics: `mcp`, `terraform`, `iac`, `infrastructure-as-code`, `ai`, `claude`, `style-guide`

### 5. Update README with Your Username

Replace `YOUR_USERNAME` in README.md with your actual GitHub username:

```bash
# If using macOS/Linux
sed -i '' 's/YOUR_USERNAME/your-actual-username/g' README.md

# If using Linux
sed -i 's/YOUR_USERNAME/your-actual-username/g' README.md

# Then commit
git add README.md
git commit -m "Update README with GitHub username"
git push
```

## Optional Enhancements

### Add a LICENSE file

```bash
# Create MIT License
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 YOUR_NAME

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

git add LICENSE
git commit -m "Add MIT License"
git push
```

### Add GitHub Actions (CI/CD)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Verify dist exists
      run: test -d dist
```

### Add Contributing Guidelines

Create `CONTRIBUTING.md`:

```markdown
# Contributing to tf-dialect

We love your input! We want to make contributing as easy as possible.

## Development Process

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Update README if adding features

## Adding New Validation Rules

1. Add rule logic to `src/validator.ts`
2. Update types in `src/config.ts` if needed
3. Add example to `terraform-style.example.yaml`
4. Document in README.md

## Questions?

Open an issue for discussion!
```

## Verify Your Repository

```bash
# Check git status
git status

# View remote
git remote -v

# View commit history
git log --oneline
```

Your repository should now be live at:
`https://github.com/YOUR_USERNAME/tf-dialect`
