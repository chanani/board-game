package com.boardgame.chat.domain;

import java.time.Instant;

public record ChatBody(ChatText text, Instant sentAt) {
}
