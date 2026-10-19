package com.kasaneru.sync;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDeviceRequest {
  @NotBlank(message = "Device ID cannot be blank")
  private String deviceId;

  private String deviceName;
}
