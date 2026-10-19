package com.kasaneru.stats;

import com.kasaneru.sync.CardStateRepository;
import com.kasaneru.sync.ReviewLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatsService {
  private final CardStateRepository cardStateRepository;
  private final ReviewLogRepository reviewLogRepository;

  @Transactional(readOnly = true)
  public StatsResponse getStats(UUID userId) {
    LocalDate today = LocalDate.now();
    LocalDate thirtyDaysAgo = today.minusDays(30);
    ZoneId zoneId = ZoneId.systemDefault();

    // Query aggregates directly from DB
    long totalCards = cardStateRepository.countByUserId(userId);
    long dueCards = cardStateRepository.countDueCardsByUserId(userId);
    long learnedCards = cardStateRepository.countLearnedCardsByUserId(userId);
    Double averageEaseDb = cardStateRepository.getAverageEaseFactorByUserId(userId);
    double averageEase = averageEaseDb != null ? averageEaseDb : 2.5;

    long totalReviews = reviewLogRepository.countByUserId(userId);

    // Today's reviews
    Instant todayStart = today.atStartOfDay(zoneId).toInstant();
    Instant todayEnd = today.plusDays(1).atStartOfDay(zoneId).toInstant();
    long reviewsToday = reviewLogRepository.countReviewsByUserIdAndDateRange(userId, todayStart, todayEnd);

    // Build 30-day breakdown
    List<DailyStatsDto> last30Days = new ArrayList<>();
    for (LocalDate date = thirtyDaysAgo; !date.isAfter(today); date = date.plusDays(1)) {
      Instant dayStart = date.atStartOfDay(zoneId).toInstant();
      Instant dayEnd = date.plusDays(1).atStartOfDay(zoneId).toInstant();
      long dayCount = reviewLogRepository.countReviewsByUserIdAndDateRange(userId, dayStart, dayEnd);

      last30Days.add(DailyStatsDto.builder()
          .date(date)
          .reviewCount(dayCount)
          .cardsLearned(learnedCards)
          .cardsReviewed(totalCards)
          .averageEase(averageEase)
          .build());
    }

    return StatsResponse.builder()
        .totalCards(totalCards)
        .dueCards(dueCards)
        .learnedCards(learnedCards)
        .averageEase(averageEase)
        .totalReviews(totalReviews)
        .reviewsToday(reviewsToday)
        .last30Days(last30Days)
        .build();
  }
}
