package com.boardgame.common.security;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.stereotype.Component;

/** 만료되거나 무효화된 세션을 현재 로그인 세션 목록에서 뺀다. */
@Component
public class SessionCleanupListener implements HttpSessionListener {

    private final ActiveSessions activeSessions;

    public SessionCleanupListener(ActiveSessions activeSessions) {
        this.activeSessions = activeSessions;
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent event) {
        activeSessions.forget(event.getSession());
    }
}
