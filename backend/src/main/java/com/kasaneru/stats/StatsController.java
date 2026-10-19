package com.kasaneru.stats;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/stats")
@RequiredArgsConstructor
@Slf4j
public class StatsController {
  private final StatsService statsService;

  @GetMapping
  public ResponseEntity<StatsResponse> getStats() {
    String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
    UUID userId = UUID.fromString(userIdStr);

    log.info("Fetching stats for user: {}", userId);
    StatsResponse stats = statsService.getStats(userId);

    return ResponseEntity.ok(stats);
  }
}
