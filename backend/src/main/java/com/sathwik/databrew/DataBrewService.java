package com.sathwik.databrew;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.databrew.DataBrewClient;
import software.amazon.awssdk.services.databrew.model.*;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;


import java.io.InputStream;
import java.time.Instant;
import java.util.UUID;

@Service
public class DataBrewService {
    private final S3Client s3;
    private final DataBrewClient dataBrew;

    @Value("${aws.region}") private String region;
    @Value("${aws.s3.bucket}") private String bucket;
    @Value("${aws.s3.upload-prefix:frontend-uploads/}") private String uploadPrefix;
    @Value("${aws.s3.output-prefix:frontend-cleaned/}") private String outputPrefix;
    @Value("${aws.databrew.role-arn}") private String roleArn;
    @Value("${aws.databrew.recipe-name}") private String recipeName;
    @Value("${aws.databrew.recipe-version:1}") private String recipeVersion;

    private volatile String latestJobName;
    private volatile String latestRunId;
    private volatile String latestOutputKey;
    private volatile String latestFileName;
    private volatile String latestDatasetName;
    private final java.util.concurrent.ConcurrentHashMap<String, String> jobRunIds = new java.util.concurrent.ConcurrentHashMap<>();

    public DataBrewService(S3Client s3, DataBrewClient dataBrew) {
        this.s3 = s3;
        this.dataBrew = dataBrew;
    }

    public UploadResult upload(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Please select a CSV file.");
        String original = file.getOriginalFilename() == null ? "dataset.csv" : file.getOriginalFilename();
        if (!original.toLowerCase().endsWith(".csv")) throw new IllegalArgumentException("Only CSV files are supported.");

        String id = Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = uploadPrefix + id + "-" + safe;

        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType("text/csv").build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return new UploadResult(original, key, "s3://" + bucket + "/" + key);
    }

    public CleanStartResult startCleaning(String uploadedKey, String originalFileName) {
        String id = Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String datasetName = "frontend-dataset-" + id;
        String jobName = "frontend-cleaning-" + id;
        String outputKey = outputPrefix + id + "/";

        dataBrew.createDataset(CreateDatasetRequest.builder()
                .name(datasetName)
                .format("CSV")
                .input(Input.builder()
                        .s3InputDefinition(S3Location.builder().bucket(bucket).key(uploadedKey).build())
                        .build())
                .build());

        String resolvedVersion = (recipeVersion == null || recipeVersion.isBlank()) ? "1.0" : recipeVersion.trim();
        if (!resolvedVersion.contains(".")) {
            resolvedVersion = resolvedVersion + ".0";
        }

        dataBrew.createRecipeJob(CreateRecipeJobRequest.builder()
                .name(jobName)
                .datasetName(datasetName)
                .roleArn(roleArn)
                .recipeReference(RecipeReference.builder().name(recipeName).recipeVersion(resolvedVersion).build())
                .outputs(Output.builder()
                        .location(S3Location.builder().bucket(bucket).key(outputKey).build())
                        .format("CSV")
                        .maxOutputFiles(1)
                        .overwrite(true)
                        .build())
                .build());

        StartJobRunResponse startResp = dataBrew.startJobRun(StartJobRunRequest.builder().name(jobName).build());
        String runId = startResp.runId();

        latestJobName = jobName;
        latestRunId = runId;
        latestOutputKey = outputKey;
        latestFileName = baseName(originalFileName) + "_cleaned.csv";
        latestDatasetName = datasetName;
        if (runId != null) {
            jobRunIds.put(jobName, runId);
        }

        return new CleanStartResult(jobName, datasetName, uploadedKey, outputKey, "RUNNING");
    }

    public StatusResult status(String jobName) {
        String name = (jobName == null || jobName.isBlank()) ? latestJobName : jobName;
        if (name == null) throw new IllegalArgumentException("No DataBrew job has been started yet.");

        String runId = jobRunIds.get(name);
        if (runId == null && name.equals(latestJobName)) {
            runId = latestRunId;
        }
        if (runId == null) {
            try {
                var runs = dataBrew.listJobRuns(ListJobRunsRequest.builder().name(name).maxResults(1).build()).jobRuns();
                if (!runs.isEmpty()) {
                    runId = runs.get(0).runId();
                    jobRunIds.put(name, runId);
                }
            } catch (Exception e) {
                // Ignore and fall through to check runId
            }
        }
        if (runId == null) throw new IllegalArgumentException("No run found for DataBrew job: " + name);

        DescribeJobRunResponse response = dataBrew.describeJobRun(DescribeJobRunRequest.builder().name(name).runId(runId).build());
        String state = response.stateAsString();
        String outputKey = latestOutputKey;
        if (outputKey == null || outputKey.endsWith("/")) {
            try {
                var listed = s3.listObjectsV2(ListObjectsV2Request.builder().bucket(bucket).prefix(outputPrefix + extractJobFolder(name) + "/").build());
                outputKey = listed.contents().stream()
                        .map(o -> o.key())
                        .filter(k -> k.toLowerCase().endsWith(".csv"))
                        .findFirst().orElse(outputKey);
                latestOutputKey = outputKey;
            } catch (Exception ignored) {}
        }
        String outputUrl = "https://" + bucket + ".s3." + region + ".amazonaws.com/" + (outputKey == null ? "" : outputKey);
        return new StatusResult(name, state, latestDatasetName, latestFileName, outputKey, outputUrl);
    }

    public InputStream downloadStream() {
        String key = latestOutputKey;
        if ((key == null || key.endsWith("/")) && latestJobName != null) {
            try {
                var listed = s3.listObjectsV2(ListObjectsV2Request.builder().bucket(bucket).prefix(outputPrefix + extractJobFolder(latestJobName) + "/").build());
                key = listed.contents().stream()
                        .map(o -> o.key())
                        .filter(k -> k.toLowerCase().endsWith(".csv"))
                        .findFirst().orElse(key);
                latestOutputKey = key;
            } catch (Exception ignored) {}
        }
        if (key == null || key.endsWith("/")) throw new IllegalArgumentException("No cleaned output is available yet.");
        return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
    }

    public String latestFileName() { return latestFileName == null ? "cleaned-data.csv" : latestFileName; }

    private String extractJobFolder(String jobName) {
        return jobName.startsWith("frontend-cleaning-") ? jobName.substring("frontend-cleaning-".length()) : jobName;
    }

    public java.util.List<java.util.Map<String, String>> listRecipes() {
        return dataBrew.listRecipes(ListRecipesRequest.builder().maxResults(50).build())
                .recipes().stream()
                .map(r -> java.util.Map.of("name", r.name(), "recipeVersion", r.recipeVersion() == null ? "" : r.recipeVersion()))
                .toList();
    }

    public java.util.List<java.util.Map<String, String>> listRecipeVersions(String name) {
        return dataBrew.listRecipeVersions(ListRecipeVersionsRequest.builder().name(name).maxResults(50).build())
                .recipes().stream()
                .map(r -> java.util.Map.of("name", r.name(), "recipeVersion", r.recipeVersion() == null ? "" : r.recipeVersion()))
                .toList();
    }

    private String baseName(String file) {
        String f = file == null ? "dataset.csv" : file;
        if (f.toLowerCase().endsWith(".csv")) f = f.substring(0, f.length() - 4);
        return f.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public record UploadResult(String fileName, String s3Key, String s3Uri) {}
    public record CleanStartResult(String jobName, String datasetName, String inputKey, String outputKey, String status) {}
    public record StatusResult(String jobName, String status, String datasetName, String fileName, String outputKey, String outputUrl) {}
}
