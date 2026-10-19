package com.kasaneru.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatsResponse {
  private long totalCards;
  private long dueCards;
  private long learnedCards;
  private double averageEase;
  private long totalReviews;
  private long reviewsToday;
  private List<DailyStatsDto> last30Days;
}
