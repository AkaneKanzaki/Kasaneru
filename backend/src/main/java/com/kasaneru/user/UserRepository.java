package com.kasaneru.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmailAndDeletedAtIsNull(String email);
  Optional<User> findByIdAndDeletedAtIsNull(UUID id);
  boolean existsByEmailAndDeletedAtIsNull(String email);
}
