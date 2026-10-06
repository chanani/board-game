package com.boardgame.chat.domain;

public record ChatAuthor(long memberId, String nickname, boolean spectator) {

    public ChatAuthor(long memberId, String nickname) {
        this(memberId, nickname, false);
    }
}
