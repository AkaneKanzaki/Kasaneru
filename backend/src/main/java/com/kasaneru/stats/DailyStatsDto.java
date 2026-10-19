package com.kasaneru.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyStatsDto {
  private LocalDate date;
  private long reviewCount;
  private long cardsLearned;
  private long cardsReviewed;
  private double averageEase;
}
