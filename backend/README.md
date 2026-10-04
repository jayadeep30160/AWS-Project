# AWS DataBrew Full-Stack Live Project

React + Spring Boot + Amazon S3 + AWS Glue DataBrew.

## Real workflow
1. User logs into the React UI.
2. User uploads a CSV.
3. Spring Boot uploads the CSV to S3 under `frontend-uploads/`.
4. Spring Boot creates a DataBrew dataset pointing to that uploaded S3 object.
5. Spring Boot creates and starts a DataBrew recipe job using `customer-sales-cleaning-recipe` version 1.
6. DataBrew writes the cleaned CSV to `frontend-cleaned/`.
7. React polls the job status.
8. When the job succeeds, React enables Download Cleaned CSV.

## Prerequisites
- AWS CLI configured locally (`aws configure`) or another AWS credential provider.
- IAM role `DataBrewS3AccessRole` must allow DataBrew to read/write the S3 bucket.
- Existing DataBrew recipe `customer-sales-cleaning-recipe` version 1.
- Uploaded CSV should use the same column structure expected by that recipe.
- Java 21+ and Maven.

## Run backend
```powershell
mvn spring-boot:run
```
Health:
```powershell
curl.exe http://localhost:8080/api/data/health
```

## Run frontend
```powershell
npm install
npm run dev
```

The login is a demo UI authentication layer for the academic project. AWS credentials are never placed in React.
