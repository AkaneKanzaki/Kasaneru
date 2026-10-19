package com.kasaneru.sync;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "review_logs", indexes = {
    @Index(name = "idx_review_logs_user_id", columnList = "user_id"),
    @Index(name = "idx_review_logs_user_updated", columnList = "user_id,reviewed_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewLog {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID userId;

  @Column(nullable = false)
  private String cardId;

  @Column(nullable = false)
  private Integer quality;

  @Column(nullable = false)
  private Instant reviewedAt;

  private String deviceId;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  protected void onCreate() {
    createdAt = Instant.now();
  }
}
