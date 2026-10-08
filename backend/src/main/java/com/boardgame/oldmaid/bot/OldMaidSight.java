package com.boardgame.oldmaid.bot;

import com.boardgame.oldmaid.OldMaidEventType;
import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import java.time.Instant;
import java.util.Objects;

// R16: 컴퓨터 시야 = 그 자리 화면(viewFor(botId)) 그대로. 남의 손패·끼운 자리·조커 주인은 화면에 없다.
public record OldMaidSight(OldMaidView game) {

    public static OldMaidSight of(Object view) {
        return new OldMaidSight(((OldMaidSessionView) view).game());
    }

    public boolean canDiscard() {
        return game.canDiscard();
    }

    public boolean canShuffle() {
        return game.canShuffle();
    }

    public boolean isOpening() {
        return game.stage() == OldMaidStage.OPENING_DISCARD;
    }

    public boolean isDrawing() {
        return game.stage() == OldMaidStage.DRAW && Objects.equals(game.currentPlayerId(), game.viewerId());
    }

    public boolean isTargeted() {
        return game.stage() == OldMaidStage.DRAW && Objects.equals(game.targetId(), game.viewerId());
    }

    public int targetCardCount() {
        return game.players()
                .stream()
                .filter(player -> Objects.equals(player.playerId(), game.targetId()))
                .mapToInt(player -> player.cardCount())
                .findFirst()
                .orElse(0);
    }

    public boolean holdsJoker() {
        return game.hand()
                .stream()
                .anyMatch(card -> card.rank() != null && card.rank().isJoker());
    }

    public long turnSeq() {
        return game.turnSeq();
    }

    /** 이 화면의 공개 사건 중 내가 섞은 마지막 사건 번호(없으면 -1). */
    public long myLatestShuffleSeq() {
        return game.events()
                .stream()
                .filter(event -> event.type() == OldMaidEventType.SHUFFLE)
                .filter(event -> Objects.equals(event.actorId(), game.viewerId()))
                .mapToLong(event -> event.seq())
                .max()
                .orElse(-1L);
    }

    /** 화면을 만든 서버 시각. */
    public Instant serverNow() {
        return Instant.ofEpochMilli(game.serverNow());
    }
}
