package com.boardgame.chat.domain;

public record ChatMessage(long id, ChatAuthor author, ChatBody body) {
}
