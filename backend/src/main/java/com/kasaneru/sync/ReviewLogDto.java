package com.kasaneru.sync;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewLogDto {
  private String id;
  private String cardId;
  private Integer quality;
  private long reviewedAt;
  private String deviceId;

  public static ReviewLogDto from(ReviewLog log) {
    return ReviewLogDto.builder()
        .id(log.getId().toString())
        .cardId(log.getCardId())
        .quality(log.getQuality())
        .reviewedAt(log.getReviewedAt().toEpochMilli())
        .deviceId(log.getDeviceId())
        .build();
  }
}
