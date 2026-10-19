package com.kasaneru.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
@Slf4j
public class JwtProvider {
  @Value("${jwt.secret}")
  private String jwtSecret;

  @Value("${jwt.access-token-expiration}")
  private long accessTokenExpiration;

  @Value("${jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  public String generateAccessToken(UUID userId, String email) {
    return buildToken(userId, email, accessTokenExpiration);
  }

  public String generateRefreshToken(UUID userId, String email) {
    return buildToken(userId, email, refreshTokenExpiration);
  }

  private String buildToken(UUID userId, String email, long expiration) {
    Instant now = Instant.now();
    Instant expiryTime = now.plusMillis(expiration);

    return Jwts.builder()
        .subject(userId.toString())
        .claim("email", email)
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiryTime))
        .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS512)
        .compact();
  }

  public Claims extractClaims(String token) {
    try {
      return Jwts.parser()
          .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
          .build()
          .parseSignedClaims(token)
          .getPayload();
    } catch (Exception e) {
      log.error("Failed to extract claims from token", e);
      return null;
    }
  }

  public UUID extractUserId(String token) {
    Claims claims = extractClaims(token);
    return claims != null ? UUID.fromString(claims.getSubject()) : null;
  }

  public String extractEmail(String token) {
    Claims claims = extractClaims(token);
    return claims != null ? (String) claims.get("email") : null;
  }

  public boolean isTokenValid(String token) {
    Claims claims = extractClaims(token);
    return claims != null && claims.getExpiration().after(new Date());
  }
}
