# projectup-backend

Welcome to the **backend** of ProjectUp! This backend powers the ProjectUp platform, handling authentication, data storage, real-time communication, and API services.


## Features
- **User Authentication & Authorization** – JWT-based authentication with automatic token refresh
- **REST API** – Built using Golang Gin framework
- **Database Management** – PostgreSQL on AWS RDS
- **Real-Time Communication** – WebSockets for live updates
- **File Storage** – AWS S3 for media storage
- **Deployment** – Hosted on AWS EC2 + RDS + S3
- **API Documentation** – Swagger
- **Future Enhancements**:
  - **Message Queue** – RabbitMQ for event-driven communication
  - **Caching** – Redis for optimized data retrieval
  - **Logging & Analytics** – Centralized monitoring

---

## Auth System
The authentication system uses JWT tokens with an automatic refresh mechanism:

- **Access Token** - Valid for 24 hours
- **Refresh Token** - Valid for 30 days, stored in database

When an access token expires, the system automatically:

1. **Server-side refresh**: The auth middleware detects expired tokens and attempts to refresh them using the stored refresh token
2. **Response headers**: If refresh is successful, new tokens are returned in response headers:
   - `X-Token-Refreshed: true`
   - `X-New-Access-Token: [new token]`
   - `X-New-Refresh-Token: [new refresh token]`
3. **Client handling**: The frontend's `fetchWithAuth` utility automatically detects these headers and updates the stored tokens

This provides a seamless user experience without session interruptions when tokens expire.

---

## Tech Stack
| Component | Technology |
|-----------|------------|
| **Backend Framework** | Golang + Gin |
| **Database** | PostgreSQL (AWS RDS) |
| **Authentication** | JWT |
| **Real-Time Communication** | WebSocket |
| **File Storage** | AWS S3 |
| **Deployment** | AWS EC2 + Docker |
| **API Documentation** | Swago |
| **Future Integrations** | RabbitMQ, Redis, Logging & Analytics |

---

## Install Golang
Download from: [Go Official Website](https://go.dev/dl/)

- **Check if Go is installed**:
  ```bash
  go version
  ```

## Installation Guide
### Clone the Repository
```bash
git clone https://github.com/project-up-hub/projectup-backend.git
cd projectup-backend
```

### Install Dependencies
```bash
go mod tidy
```

###  Set Up Environment Variables

### Run Database Migrations (Skip this when using cloud service)
```bash
go run migrate/migrate.go
```

### Start the Backend Server
```bash
go run main.go
```

## Building the Project for Production
To compile the backend for production, use the appropriate **GOOS** (Operating System) and **GOARCH** (Architecture) settings based on your server environment.

### **Example: Build for a Linux x86_64 (AMD64) Server**
For deployment on an **AWS EC2 instance running Linux**, compile with:
```bash
GOOS=linux GOARCH=amd64 GIN_MODE=release go build -o server main.go
```

## API Documentation
Run the following code to genereate the doc file
```bash
swag init --parseDependency --parseInternal -g main.go
```

Access the docs at: `http://localhost:8080/swagger/index.html`

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