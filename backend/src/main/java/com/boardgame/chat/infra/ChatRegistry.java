package com.boardgame.chat.infra;

import com.boardgame.chat.domain.ChatLog;
import com.boardgame.chat.domain.ChatMessage;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// 로그는 append 때만 만든다. 읽기는 로그를 만들지 않는다.
@Component
public class ChatRegistry {

    private final Map<String, ChatLog> logs = new ConcurrentHashMap<>();

    public void append(String code, ChatMessage message) {
        logs.computeIfAbsent(code, key -> new ChatLog()).append(message);
    }

    public List<ChatMessage> messages(String code) {
        return Optional.ofNullable(logs.get(code)).map(ChatLog::asList).orElse(List.of());
    }

    public boolean contains(String code) {
        return logs.containsKey(code);
    }

    public void remove(String code) {
        logs.remove(code);
    }
}
