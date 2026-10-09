package com.boardgame.oldmaid.bot;

import com.boardgame.oldmaid.OldMaidEventType;
import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import java.time.Instant;
import java.util.Objects;

// R16: 컴퓨터 시야 = 그 자리 화면(viewFor(botId)) 그대로. 남의 손패·끼운 자리·조커 주인은 화면에 없다.
public record OldMaidSight(OldMaidView game) {

    private static final int SUDDEN_DEATH_HOLDERS = 2;

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
        return cardCountOf(game.targetId());
    }

    /**
     * 서든데스: 카드 가진 사람이 둘뿐이고 뽑는 사람 1장·뽑히는 사람 2장이라 이번 뽑기에 승부가 걸렸다.
     * 짝이 없는 카드는 조커 하나뿐이므로 2장 손에 조커가 있다(장수만 보고 정하니 조커 위치를 몰라도 된다).
     */
    public boolean isSuddenDeath() {
        if (game.stage() != OldMaidStage.DRAW || holderCount() != SUDDEN_DEATH_HOLDERS) {
            return false;
        }
        return cardCountOf(game.currentPlayerId()) == 1 && cardCountOf(game.targetId()) == 2;
    }

    private long holderCount() {
        return game.players()
                .stream()
                .filter(player -> player.cardCount() > 0)
                .count();
    }

    private int cardCountOf(Long playerId) {
        return game.players()
                .stream()
                .filter(player -> Objects.equals(player.playerId(), playerId))
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
