package com.kasaneru.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, UUID> {
  @Query("SELECT r FROM ReviewLog r WHERE r.userId = ?1 AND r.createdAt > ?2 ORDER BY r.reviewedAt ASC")
  List<ReviewLog> findByUserIdAndCreatedAfter(UUID userId, Instant since);

  @Query("SELECT r FROM ReviewLog r WHERE r.userId = ?1 AND r.cardId = ?2 ORDER BY r.reviewedAt DESC")
  List<ReviewLog> findByUserIdAndCardId(UUID userId, String cardId);

  @Query("SELECT COUNT(r) FROM ReviewLog r WHERE r.userId = ?1")
  long countByUserId(UUID userId);

  @Query("SELECT r FROM ReviewLog r WHERE r.userId = ?1 AND r.reviewedAt >= ?2 AND r.reviewedAt < ?3 ORDER BY r.reviewedAt ASC")
  List<ReviewLog> findByUserIdAndReviewedDateRange(UUID userId, Instant startDate, Instant endDate);

  @Query("SELECT COUNT(r) FROM ReviewLog r WHERE r.userId = ?1 AND r.reviewedAt >= ?2 AND r.reviewedAt < ?3")
  long countReviewsByUserIdAndDateRange(UUID userId, Instant startDate, Instant endDate);
}
