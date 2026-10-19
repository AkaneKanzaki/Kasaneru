package com.kasaneru.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshRequest {
  @NotBlank(message = "Refresh token cannot be blank")
  private String refreshToken;
}
