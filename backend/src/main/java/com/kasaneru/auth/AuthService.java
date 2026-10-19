package com.kasaneru.auth;

import com.kasaneru.user.User;
import com.kasaneru.user.UserRepository;
import com.kasaneru.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final JwtProvider jwtProvider;
  private final PasswordEncoder passwordEncoder;

  @Transactional
  public AuthResponse register(String email, String password) {
    if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
      throw new AuthException("Email already registered");
    }

    User user = User.builder()
        .email(email)
        .passwordHash(passwordEncoder.encode(password))
        .role(UserRole.USER)
        .build();

    user = userRepository.save(user);
    log.info("User registered: {}", email);

    String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getEmail());
    String refreshToken = generateAndSaveRefreshToken(user.getId(), user.getEmail(), "web");

    return AuthResponse.builder()
        .accessToken(accessToken)
        .refreshToken(refreshToken)
        .userId(user.getId().toString())
        .email(user.getEmail())
        .build();
  }

  @Transactional
  public AuthResponse login(String email, String password) {
    User user = userRepository.findByEmailAndDeletedAtIsNull(email)
        .orElseThrow(() -> new AuthException("Invalid credentials"));

    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw new AuthException("Invalid credentials");
    }

    String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getEmail());
    String refreshToken = generateAndSaveRefreshToken(user.getId(), user.getEmail(), "web");

    log.info("User logged in: {}", email);

    return AuthResponse.builder()
        .accessToken(accessToken)
        .refreshToken(refreshToken)
        .userId(user.getId().toString())
        .email(user.getEmail())
        .build();
  }

  @Transactional
  public AuthResponse refreshAccessToken(String refreshToken) {
    RefreshToken token = refreshTokenRepository.findByTokenHash(hashToken(refreshToken))
        .orElseThrow(() -> new AuthException("Invalid refresh token"));

    if (!token.isValid()) {
      throw new AuthException("Refresh token expired or revoked");
    }

    User user = userRepository.findByIdAndDeletedAtIsNull(token.getUserId())
        .orElseThrow(() -> new AuthException("User not found"));

    String newAccessToken = jwtProvider.generateAccessToken(user.getId(), user.getEmail());
    String newRefreshToken = generateAndSaveRefreshToken(user.getId(), user.getEmail(), token.getDeviceId());

    log.debug("Access token refreshed for user: {}", user.getId());

    return AuthResponse.builder()
        .accessToken(newAccessToken)
        .refreshToken(newRefreshToken)
        .userId(user.getId().toString())
        .email(user.getEmail())
        .build();
  }

  @Transactional
  public void logout(UUID userId, String deviceId) {
    refreshTokenRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    log.info("User logged out: {} on device: {}", userId, deviceId);
  }

  @Transactional
  public void changePassword(UUID userId, String oldPassword, String newPassword) {
    User user = userRepository.findByIdAndDeletedAtIsNull(userId)
        .orElseThrow(() -> new AuthException("User not found"));

    if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
      throw new AuthException("Current password is incorrect");
    }

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    userRepository.save(user);
    log.info("Password changed for user: {}", userId);
  }

  @Transactional
  public void deleteAccount(UUID userId) {
    User user = userRepository.findByIdAndDeletedAtIsNull(userId)
        .orElseThrow(() -> new AuthException("User not found"));

    user.setDeletedAt(Instant.now());
    userRepository.save(user);
    refreshTokenRepository.deleteByUserIdAndDeviceId(userId, null);
    log.info("Account deleted: {}", userId);
  }

  private String generateAndSaveRefreshToken(UUID userId, String email, String deviceId) {
    String token = jwtProvider.generateRefreshToken(userId, email);
    RefreshToken refreshToken = RefreshToken.builder()
        .userId(userId)
        .tokenHash(hashToken(token))
        .deviceId(deviceId)
        .expiresAt(Instant.now().plusSeconds(2592000)) // 30 days
        .build();

    refreshTokenRepository.save(refreshToken);
    return token;
  }

  private String hashToken(String token) {
    return Integer.toHexString(token.hashCode());
  }
}
