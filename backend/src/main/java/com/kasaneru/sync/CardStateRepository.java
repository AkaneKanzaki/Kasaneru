package com.kasaneru.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface CardStateRepository extends JpaRepository<CardState, CardStateId> {
  @Query("SELECT c FROM CardState c WHERE c.id.userId = ?1 AND c.updatedAt > ?2 ORDER BY c.updatedAt ASC")
  List<CardState> findByUserIdAndUpdatedAfter(UUID userId, Instant since);

  @Query("SELECT c FROM CardState c WHERE c.id.userId = ?1")
  List<CardState> findByUserId(UUID userId);

  @Query("SELECT COUNT(c) FROM CardState c WHERE c.id.userId = ?1")
  long countByUserId(UUID userId);

  @Query("SELECT COUNT(c) FROM CardState c WHERE c.id.userId = ?1 AND c.dueDate <= CURRENT_DATE")
  long countDueCardsByUserId(UUID userId);

  @Query("SELECT COUNT(c) FROM CardState c WHERE c.id.userId = ?1 AND c.repetitions > 0")
  long countLearnedCardsByUserId(UUID userId);

  @Query("SELECT AVG(c.easeFactor) FROM CardState c WHERE c.id.userId = ?1")
  Double getAverageEaseFactorByUserId(UUID userId);
}
