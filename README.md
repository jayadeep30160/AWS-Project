# DataBrew Full-Stack Live Integration

## What this version does

This is the live version of the academic AWS Glue DataBrew project.

**Flow:**
React → Spring Boot → Amazon S3 → AWS Glue DataBrew → Amazon S3 → React Download

### User experience
1. Login to the React application.
2. Choose a raw CSV.
3. Click **Upload & Start DataBrew**.
4. Spring Boot uploads the CSV to S3.
5. Spring Boot creates a DataBrew dataset for that uploaded S3 object.
6. Spring Boot creates and starts a DataBrew recipe job using your existing published recipe.
7. React polls the real AWS job status.
8. After `SUCCEEDED`, the cleaned CSV is available through the Download button.

## AWS resources expected
- Region: `ap-south-1`
- S3 bucket: `databrew-project-2026`
- DataBrew recipe: `customer-sales-cleaning-recipe`
- Recipe version: `1`
- DataBrew execution role: `DataBrewS3AccessRole`
- Role ARN configured in `backend/src/main/resources/application.properties`

## Important
The uploaded CSV should have the same column structure expected by the published recipe because the recipe contains column-specific transformations.

The React login is a demo UI login for the academic project. It is not production authentication.

AWS credentials are not placed in React. Spring Boot uses the AWS SDK default credential provider chain.

## Windows setup

### 1. Configure AWS CLI once
```powershell
aws configure
```
Enter your AWS access key, secret key, default region `ap-south-1`, and output format `json` locally. Never put these credentials in the React source code.

Check:
```powershell
aws sts get-caller-identity
```

### 2. Backend
Open a terminal in:
```text
backend
```
Run:
```powershell
mvn spring-boot:run
```

Test:
```powershell
curl.exe http://localhost:8080/api/data/health
```

### 3. Frontend
Open a second terminal in:
```text
frontend
```
Run:
```powershell
npm install
npm run dev
```
Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## API
- `POST /api/data/upload`
- `POST /api/data/clean`
- `GET /api/data/status?jobName=...`
- `GET /api/data/download`
- `GET /api/data/health`

## Current project limitation
The DataBrew recipe is intentionally your existing customer-sales recipe. It expects columns such as Customer_Name, Age, City, Quantity, Product and Rating. A future version can create recipes dynamically for arbitrary CSV schemas.
