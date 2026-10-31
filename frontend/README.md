# ProjectUp Frontend

Welcome to the frontend of **ProjectUp**! This is the user interface of ProjectUp, built using React + Typescript + Vite.

## Features
- User-friendly interface for project collaboration
- Seamless authentication and user profiles
- Real-time notifications and messaging
- Integration with the ProjectUp backend API

## Tech Stack
- **Framework**: React + Typescript
- **Styling**: Tailwind CSS / Material UI
- **State Management**: Redux
- **API Communication**: Fetch API
- **Build Tool**: Vite

## Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/project-up-hub/projectup-frontend.git
cd projectup-frontend
npm install
```

2. Run in Developement mode:

```bash
npm run dev
```

3. Build the project for production:

```bash
npm run build
```

## Git Workflow

1. Before starting new work, always fetch the latest changes:

```bash
git pull origin main
```

2. When adding a new feature, always create a new branch:

```bash
git checkout -b feature-branch
```

3. After making edits, stage and commit your changes:

```bash
git add .
git commit -m "Added new feature"
```

4. Before pushing, ensure your branch is up-to-date with the latest main changes:

```bash
git pull origin main --rebase
```

5. Push the branch to GitHub:

```bash
git push origin feature-branch
```

6. Create a pull request:

+ Go to the repository on GitHub
+ Click Pull Requests → New Pull Request
+ Select `feature-branch` and compare it to `main`
+ Click Create Pull Request and describe the changes