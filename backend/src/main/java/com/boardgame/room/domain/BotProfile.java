package com.boardgame.room.domain;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;

// R1·R3·R4: 방 안에서만 사는 컴퓨터의 이름 번호·난이도·프로필 그림. 회원 테이블과 상관없다.
public record BotProfile(BotNumber number, BotDifficulty difficulty, Avatar avatar) {

    public BotProfile withDifficulty(BotDifficulty changed) {
        return new BotProfile(number, changed, avatar);
    }
}
