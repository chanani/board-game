package com.boardgame.common.security;

import com.boardgame.common.websocket.WebSocketSessions;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * 회원마다 지금 로그인된 HTTP 세션 하나를 기억한다.
 * 같은 회원이 다른 세션으로 로그인하면 이전 세션과 그 WebSocket 연결을 끊는다.
 */
@Component
public class ActiveSessions {

    private final Map<Long, HttpSession> sessionsByMember = new ConcurrentHashMap<>();
    private final ReplacedSessions replacedSessions;
    private final WebSocketSessions webSocketSessions;

    public ActiveSessions(ReplacedSessions replacedSessions, WebSocketSessions webSocketSessions) {
        this.replacedSessions = replacedSessions;
        this.webSocketSessions = webSocketSessions;
    }

    public void replace(long memberId, HttpSession current) {
        HttpSession previous = sessionsByMember.put(memberId, current);
        if (previous == null || previous == current) {
            return;
        }
        retire(previous);
    }

    public void forget(HttpSession session) {
        if (session == null) {
            return;
        }
        sessionsByMember.forEach((memberId, current) -> forgetIfCurrent(memberId, current, session));
    }

    private void forgetIfCurrent(Long memberId, HttpSession current, HttpSession session) {
        if (current != session) {
            return;
        }
        sessionsByMember.remove(memberId, session);
    }

    private void retire(HttpSession previous) {
        String previousId = previous.getId();
        replacedSessions.record(previousId);
        // 세션을 먼저 무효화하면 Tomcat이 그 세션의 WebSocket을 1008로 닫아 버리므로 4001로 먼저 닫는다
        webSocketSessions.closeAll(previousId);
        invalidateQuietly(previous);
    }

    private void invalidateQuietly(HttpSession session) {
        try {
            session.invalidate();
        } catch (IllegalStateException alreadyInvalidated) {
            // 이미 만료된 세션이면 끊을 것이 없다
        }
    }
}
