package com.foe.timetable.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.foe.timetable.model.UserAccount;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Integer> {
    Optional<UserAccount> findByUsername(String username);
    List<UserAccount> findByBatchId(Integer batchId);
    List<UserAccount> findByBatchIdAndRole(Integer batchId, UserAccount.Role role);
}
