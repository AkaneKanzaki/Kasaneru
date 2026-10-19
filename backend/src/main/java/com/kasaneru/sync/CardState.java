package com.kasaneru.sync;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "card_states", indexes = {
    @Index(name = "idx_card_states_user_updated", columnList = "user_id,updated_at"),
    @Index(name = "idx_card_states_user_due", columnList = "user_id,due_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardState {
  @EmbeddedId
  private CardStateId id;

  @Column(nullable = false)
  private BigDecimal easeFactor;

  @Column(nullable = false)
  private Integer intervalDays;

  @Column(nullable = false)
  private Integer repetitions;

  @Column(nullable = false)
  private LocalDate dueDate;

  @Column(nullable = false)
  private Instant updatedAt;

  @PrePersist
  @PreUpdate
  protected void onUpdate() {
    updatedAt = Instant.now();
  }

  public void applyReview(int quality) {
    // SM-2 algorithm
    if (quality >= 3) {
      if (repetitions == 0) {
        intervalDays = 1;
      } else if (repetitions == 1) {
        intervalDays = 3;
      } else {
        intervalDays = BigDecimal.valueOf(intervalDays)
            .multiply(easeFactor)
            .setScale(0, java.math.RoundingMode.HALF_UP)
            .intValue();
      }
      repetitions++;
    } else {
      repetitions = 0;
      intervalDays = 1;
    }

    easeFactor = easeFactor.add(BigDecimal.valueOf(0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    if (easeFactor.compareTo(BigDecimal.valueOf(1.3)) < 0) {
      easeFactor = BigDecimal.valueOf(1.3);
    }

    dueDate = LocalDate.now().plusDays(intervalDays);
    updatedAt = Instant.now();
  }
}
