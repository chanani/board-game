package com.boardgame.room.domain;

import com.boardgame.game.bot.BotDifficulty;

// 방 참가자. bot이 null이면 사람(회원), 있으면 컴퓨터(R1, 음수 번호).
public record Participant(long memberId, String nickname, BotProfile bot) {

    public Participant(long memberId, String nickname) {
        this(memberId, nickname, null);
    }

    public static Participant bot(long botId, BotProfile profile) {
        BotNumber number = profile.number();
        return new Participant(botId, number.nickname(), profile);
    }

    public boolean isBot() {
        return bot != null;
    }

    public boolean isHuman() {
        return bot == null;
    }

    public Participant withDifficulty(BotDifficulty difficulty) {
        return new Participant(memberId, nickname, bot.withDifficulty(difficulty));
    }
}
