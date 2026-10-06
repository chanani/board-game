package com.boardgame.common.security;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.error.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    private final ReplacedSessions replacedSessions;

    public JsonAuthenticationEntryPoint(ObjectMapper objectMapper, ReplacedSessions replacedSessions) {
        this.objectMapper = objectMapper;
        this.replacedSessions = replacedSessions;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        ErrorCode errorCode = errorCodeFor(request);
        response.setStatus(errorCode.statusCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), ErrorResponse.of(errorCode));
    }

    private ErrorCode errorCodeFor(HttpServletRequest request) {
        if (replacedSessions.contains(request.getRequestedSessionId())) {
            return ErrorCode.SESSION_REPLACED;
        }
        return ErrorCode.UNAUTHORIZED;
    }
}
