# Production Deployment Plan

This document outlines the steps and considerations for deploying the file-tracking application to a production environment. The plan is based on the existing Docker setup and the GitHub Actions workflow for automated deployments.

## 1. Prerequisites

Before deploying, ensure the following are set up:

- **Hosting Provider Accounts**: You will need accounts for the services you intend to deploy to (e.g., Railway, Render).
- **Docker Hub Account**: The deployment workflow pushes the application's Docker image to Docker Hub.
- **GitHub Secrets**: The automated deployment process relies on secrets configured in your GitHub repository. You must add the following secrets:
  - `DOCKER_USERNAME`: Your Docker Hub username.
  - `DOCKER_PASSWORD`: Your Docker Hub password or access token.
  - `RAILWAY_TOKEN`: Your Railway API token (for deploying to Railway).
  - `RENDER_SERVICE_ID`: The service ID for your application on Render.
  - `RENDER_API_KEY`: Your Render API key (for deploying to Render).
  - `SLACK_WEBHOOK`: A Slack webhook URL for deployment notifications.

## 2. Production Environment Variables

Your production environment requires the following environment variables. These should be set securely in your hosting provider's dashboard, not in a `.env` file.

- `MONGODB_URI`: The connection string for your production MongoDB database.
- `JWT_SECRET`: A long, complex, and randomly generated secret for signing JSON Web Tokens. It **must** be at least 32 characters long.
- `MONGO_ROOT_USERNAME`: The root username for your production MongoDB instance.
- `MONGO_ROOT_PASSWORD`: The root password for your production MongoDB instance.
- `NODE_ENV`: This should always be set to `production`.

## 3. Automated Deployment (CI/CD)

The project is configured with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automates the deployment process.

- **Trigger**: The workflow runs automatically on a `push` to the `main` branch or when a new tag starting with `v` (e.g., `v1.0.0`) is pushed.
- **Process**:
  1. The workflow builds a production-ready Docker image using `Dockerfile`.
  2. The image is pushed to Docker Hub with appropriate tags (e.g., `latest`, version number).
  3. If the push is to `main`, the application is deployed to **Railway**.
  4. If a version tag is pushed, the application is deployed to **Render**.
  5. A notification is sent to a Slack channel with the deployment status.

To deploy, simply push your changes to the `main` branch or create a new release tag.

## 4. Manual Deployment (Optional)

If you need to deploy the application manually, you can use the `docker-compose.prod.yml` file.

1.  **Create a `.env` file**: On your production server, create a `.env` file with the production environment variables listed in section 2.
2.  **Run Docker Compose**: From the project's root directory on the server, run the following command:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```
    This will start the application and the database in detached mode.

## 5. Security Best Practices

- **Never commit secrets**: Ensure that your `.env` files are in `.gitignore` and that no secrets are hardcoded in the source code.
- **Secure your JWT Secret**: Use a strong, randomly generated string for your `JWT_SECRET` and keep it secure.
- **Database Access**: Restrict access to your production database to only the necessary IP addresses (e.g., your application server).
- **Regularly update dependencies**: Keep your project's dependencies up to date to patch any security vulnerabilities.
