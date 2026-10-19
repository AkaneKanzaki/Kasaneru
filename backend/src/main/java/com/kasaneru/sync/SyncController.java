package com.kasaneru.sync;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {
  private final SyncService syncService;

  @PostMapping("/push")
  public ResponseEntity<Void> push(@RequestBody SyncPushRequest request) {
    UUID userId = extractUserId();
    syncService.push(userId, request);
    return ResponseEntity.status(HttpStatus.ACCEPTED).build();
  }

  @GetMapping("/pull")
  public ResponseEntity<SyncPullResponse> pull(@RequestParam(value = "since", defaultValue = "0") long since) {
    UUID userId = extractUserId();
    SyncPullResponse response = syncService.pull(userId, since);
    return ResponseEntity.ok(response);
  }

  @PostMapping("/devices")
  public ResponseEntity<Void> registerDevice(@RequestBody RegisterDeviceRequest request) {
    UUID userId = extractUserId();
    syncService.registerDevice(userId, request.getDeviceId(), request.getDeviceName());
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  private UUID extractUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return UUID.fromString((String) auth.getPrincipal());
  }
}
