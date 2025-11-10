package com.rapidphoto.application.query.user;

import com.rapidphoto.application.dto.UserDto;
import com.rapidphoto.application.query.QueryHandler;
import com.rapidphoto.domain.user.User;
import com.rapidphoto.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetUserByIdQueryHandler implements QueryHandler<GetUserByIdQuery, UserDto> {

    private final UserRepository userRepository;

    public GetUserByIdQueryHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto handle(GetUserByIdQuery query) {
        User user = userRepository.findById(query.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + query.getUserId()));

        return mapToDto(user);
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId().getValue());
        dto.setEmail(user.getEmail().getValue());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setStorageQuotaBytes(user.getStorageQuota().getQuotaBytes());
        dto.setStorageUsedBytes(user.getStorageQuota().getUsedBytes());
        dto.setStatus(user.getStatus().name());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}

