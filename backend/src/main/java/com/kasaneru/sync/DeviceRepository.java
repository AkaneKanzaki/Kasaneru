package com.kasaneru.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {
  Optional<Device> findByUserIdAndDeviceId(UUID userId, String deviceId);
}
