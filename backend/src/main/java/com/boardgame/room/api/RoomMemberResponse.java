package com.boardgame.room.api;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.domain.Participant;

// R15: bot·difficulty를 더했다(사람은 false·null). 기존 필드는 그대로.
public record RoomMemberResponse(long id, String nickname, String avatar, boolean host, boolean connected,
                                 long offlineSeconds, boolean ready, boolean bot, BotDifficulty difficulty) {

    public static RoomMemberResponse human(long id, String nickname, String avatar, boolean host, boolean connected,
                                           long offlineSeconds, boolean ready) {
        return new RoomMemberResponse(id, nickname, avatar, host, connected, offlineSeconds, ready, false, null);
    }

    // R5·R6: 컴퓨터는 늘 연결·준비된 것으로 보이고 방장이 아니다(R12).
    public static RoomMemberResponse bot(Participant bot) {
        BotProfile profile = bot.bot();
        String avatar = profile.avatar().key();
        return new RoomMemberResponse(bot.memberId(), bot.nickname(), avatar, false, true, 0, true, true,
                profile.difficulty());
    }
}
