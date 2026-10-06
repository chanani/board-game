package com.boardgame.chat.infra;

import com.boardgame.chat.domain.ChatLog;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class ChatRegistry {

    private final Map<String, ChatLog> logs = new ConcurrentHashMap<>();

    public ChatLog logOf(String code) {
        return logs.computeIfAbsent(code, key -> new ChatLog());
    }

    public void remove(String code) {
        logs.remove(code);
    }
}
