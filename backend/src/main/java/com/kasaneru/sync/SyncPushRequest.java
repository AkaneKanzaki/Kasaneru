package com.kasaneru.sync;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncPushRequest {
  private String deviceId;
  private List<CardStateDto> cardStates;
  private List<ReviewLogDto> reviewLogs;
}
