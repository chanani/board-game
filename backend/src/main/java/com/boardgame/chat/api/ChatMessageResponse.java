package com.boardgame.chat.api;

import com.boardgame.chat.domain.ChatMessage;
import java.time.Instant;

public record ChatMessageResponse(String roomCode, long id, long memberId, String nickname, String text, Instant sentAt) {

    public static ChatMessageResponse from(String roomCode, ChatMessage message) {
        return new ChatMessageResponse(roomCode, message.id(), message.author().memberId(), message.author().nickname(),
                message.body().text().value(), message.body().sentAt());
    }
}
