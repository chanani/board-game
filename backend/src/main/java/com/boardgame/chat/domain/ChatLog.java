package com.boardgame.chat.domain;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

public class ChatLog {

    private static final int CAPACITY = 100;

    private final Deque<ChatMessage> messages = new ArrayDeque<>();

    public synchronized void append(ChatMessage message) {
        messages.addLast(message);
        if (messages.size() > CAPACITY) {
            messages.removeFirst();
        }
    }

    public synchronized List<ChatMessage> asList() {
        return List.copyOf(messages);
    }
}
