package com.kasaneru.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProblemDetail {
  private String type;
  private String title;
  private int status;
  private String detail;
  private Instant timestamp;

  public static ProblemDetail of(int status, String type, String title, String detail) {
    return ProblemDetail.builder()
        .status(status)
        .type(type)
        .title(title)
        .detail(detail)
        .timestamp(Instant.now())
        .build();
  }
}
