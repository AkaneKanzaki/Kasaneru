package com.kasaneru.sync;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardStateDto {
  private String cardId;
  private BigDecimal easeFactor;
  private Integer intervalDays;
  private Integer repetitions;
  private LocalDate dueDate;
  private long updatedAt;

  public static CardStateDto from(CardState state) {
    return CardStateDto.builder()
        .cardId(state.getId().getCardId())
        .easeFactor(state.getEaseFactor())
        .intervalDays(state.getIntervalDays())
        .repetitions(state.getRepetitions())
        .dueDate(state.getDueDate())
        .updatedAt(state.getUpdatedAt().toEpochMilli())
        .build();
  }
}
