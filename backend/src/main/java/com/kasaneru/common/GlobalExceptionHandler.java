package com.kasaneru.common;

import com.kasaneru.auth.AuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
  @ExceptionHandler(AuthException.class)
  public ResponseEntity<ProblemDetail> handleAuthException(AuthException ex, WebRequest request) {
    log.warn("Auth exception: {}", ex.getMessage());
    ProblemDetail detail = ProblemDetail.of(
        HttpStatus.UNAUTHORIZED.value(),
        "auth-error",
        "Authentication Error",
        ex.getMessage()
    );
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(detail);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetail> handleValidationException(MethodArgumentNotValidException ex, WebRequest request) {
    String detail = ex.getBindingResult().getFieldErrors().stream()
        .map(error -> error.getField() + ": " + error.getDefaultMessage())
        .reduce((a, b) -> a + ", " + b)
        .orElse("Validation failed");

    ProblemDetail problemDetail = ProblemDetail.of(
        HttpStatus.BAD_REQUEST.value(),
        "validation-error",
        "Validation Error",
        detail
    );
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problemDetail);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetail> handleGenericException(Exception ex, WebRequest request) {
    log.error("Unexpected exception", ex);
    ProblemDetail detail = ProblemDetail.of(
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        "internal-error",
        "Internal Server Error",
        "An unexpected error occurred"
    );
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(detail);
  }
}
