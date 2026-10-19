package com.kasaneru.sync;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {
  private final CardStateRepository cardStateRepository;
  private final ReviewLogRepository reviewLogRepository;
  private final DeviceRepository deviceRepository;

  @Transactional
  public void push(UUID userId, SyncPushRequest request) {
    // Register/update device
    Device device = deviceRepository.findByUserIdAndDeviceId(userId, request.getDeviceId())
        .orElseGet(() -> Device.builder()
            .userId(userId)
            .deviceId(request.getDeviceId())
            .build());

    device.setLastSyncAt(Instant.now());
    deviceRepository.save(device);

    // Push card states (last-write-wins by updatedAt)
    if (request.getCardStates() != null) {
      for (CardStateDto dto : request.getCardStates()) {
        CardStateId id = new CardStateId(userId, dto.getCardId());
        Optional<CardState> existing = cardStateRepository.findById(id);

        // Conflict resolution: keep if incoming is newer
        if (existing.isEmpty() || Instant.ofEpochMilli(dto.getUpdatedAt()).isAfter(existing.get().getUpdatedAt())) {
          CardState state = CardState.builder()
              .id(id)
              .easeFactor(dto.getEaseFactor())
              .intervalDays(dto.getIntervalDays())
              .repetitions(dto.getRepetitions())
              .dueDate(dto.getDueDate())
              .updatedAt(Instant.ofEpochMilli(dto.getUpdatedAt()))
              .build();
          cardStateRepository.save(state);
        }
      }
    }

    // Push review logs (append-only, no duplicates by UUID)
    if (request.getReviewLogs() != null) {
      for (ReviewLogDto dto : request.getReviewLogs()) {
        UUID logId = UUID.fromString(dto.getId());
        if (!reviewLogRepository.existsById(logId)) {
          ReviewLog log = ReviewLog.builder()
              .id(logId)
              .userId(userId)
              .cardId(dto.getCardId())
              .quality(dto.getQuality())
              .reviewedAt(Instant.ofEpochMilli(dto.getReviewedAt()))
              .deviceId(dto.getDeviceId())
              .build();
          reviewLogRepository.save(log);
        }
      }
    }

    log.info("Sync push completed for user: {} from device: {}", userId, request.getDeviceId());
  }

  @Transactional(readOnly = true)
  public SyncPullResponse pull(UUID userId, long since) {
    Instant sinceInstant = Instant.ofEpochMilli(since);

    List<CardState> cardStates = cardStateRepository.findByUserIdAndUpdatedAfter(userId, sinceInstant);
    List<ReviewLog> reviewLogs = reviewLogRepository.findByUserIdAndCreatedAfter(userId, sinceInstant);

    return SyncPullResponse.builder()
        .cardStates(cardStates.stream().map(CardStateDto::from).collect(Collectors.toList()))
        .reviewLogs(reviewLogs.stream().map(ReviewLogDto::from).collect(Collectors.toList()))
        .lastSyncAt(Instant.now().toEpochMilli())
        .build();
  }

  @Transactional
  public void registerDevice(UUID userId, String deviceId, String deviceName) {
    Device device = deviceRepository.findByUserIdAndDeviceId(userId, deviceId)
        .orElseGet(() -> Device.builder()
            .userId(userId)
            .deviceId(deviceId)
            .build());

    device.setDeviceName(deviceName);
    device.setLastSyncAt(Instant.now());
    deviceRepository.save(device);
    log.info("Device registered for user: {} - {}", userId, deviceName);
  }

  @Transactional(readOnly = true)
  public List<Device> listDevices(UUID userId) {
    return deviceRepository.findAll().stream()
        .filter(d -> d.getUserId().equals(userId))
        .collect(Collectors.toList());
  }
}
