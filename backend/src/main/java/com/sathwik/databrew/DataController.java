package com.sathwik.databrew;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/data")
public class DataController {
    private final DataBrewService service;

    public DataController(DataBrewService service) { this.service = service; }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try { return ResponseEntity.ok(service.upload(file)); }
        catch (Exception e) { return ResponseEntity.badRequest().body(error(e)); }
    }

    @PostMapping("/clean")
    public ResponseEntity<?> clean(@RequestParam String uploadedKey, @RequestParam String fileName) {
        try { return ResponseEntity.ok(service.startCleaning(uploadedKey, fileName)); }
        catch (Exception e) { return ResponseEntity.badRequest().body(error(e)); }
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestParam(required = false) String jobName) {
        try { return ResponseEntity.ok(service.status(jobName)); }
        catch (Exception e) { return ResponseEntity.badRequest().body(error(e)); }
    }

    @GetMapping("/download")
    public ResponseEntity<InputStreamResource> download() {
        InputStreamResource resource = new InputStreamResource(service.downloadStream());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + service.latestFileName() + "\"")
                .body(resource);
    }

    @GetMapping("/recipes")
    public ResponseEntity<?> recipes() {
        try { return ResponseEntity.ok(service.listRecipes()); }
        catch (Exception e) { return ResponseEntity.badRequest().body(error(e)); }
    }

    @GetMapping("/recipe-versions")
    public ResponseEntity<?> recipeVersions(@RequestParam(defaultValue = "customer-sales-cleaning-recipe") String name) {
        try { return ResponseEntity.ok(service.listRecipeVersions(name)); }
        catch (Exception e) { return ResponseEntity.badRequest().body(error(e)); }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(java.util.Map.of("status", "UP", "service", "DataBrew Backend", "awsRegion", "ap-south-1"));
    }

    private java.util.Map<String, String> error(Exception e) {
        String msg = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        return java.util.Map.of("error", msg);
    }
}
