package com.rapidphoto.application.query.user;

import com.rapidphoto.application.dto.StorageStatsDto;
import com.rapidphoto.application.query.QueryHandler;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetUserStorageStatsQueryHandler implements QueryHandler<GetUserStorageStatsQuery, StorageStatsDto> {

    private final UserRepository userRepository;

    public GetUserStorageStatsQueryHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public StorageStatsDto handle(GetUserStorageStatsQuery query) {
        User user = userRepository.findById(query.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + query.getUserId()));

        return new StorageStatsDto(
            user.getStorageQuota().getQuotaBytes(),
            user.getStorageQuota().getUsedBytes()
        );
    }
}

